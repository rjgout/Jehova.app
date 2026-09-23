import type { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "@/lib/db";
import { answerMatches, type PuzzleData, type QuestionData, type TopicData } from "@/lib/alleskenner/content";
import { ensureAlleskennerContent, markSeen, pickItems, verseTextByRef } from "@/lib/alleskenner/pool";
import {
  AK_369_POINTS,
  AK_369_THINK_MS,
  AK_FINALE_PENALTY,
  AK_MIN_PLAYERS,
  AK_PUZZLE_POINTS,
  AK_PUZZLE_TURN_MS,
  AK_START_SECONDS,
  type AkPhase,
  type AkRole,
  type AkStateView,
} from "@/lib/alleskenner/types";

// Spelserver voor De Alleskenner (zie docs/ALLESKENNER.md). Wordt geladen via
// gameServer.ts en valt dus onder de eager-importketen van server.ts: hier
// nooit request-scoped Next-API's importeren (zie CLAUDE.md). De spelstatus
// leeft in het geheugen van deze ene instantie, net als bij de andere
// live-spellen; de server is de enige bron van waarheid voor beurten, klokken
// en seconden.

const TICK_MS = 200;
const BROADCAST_EVERY_MS = 1000;
const REVEAL_369_MS = 2500;
const BETWEEN_TURNS_MS = 1200;
const REVEAL_ROUND_ITEM_MS = 4000;
const INTERMISSION_MS = 3500;
const ROOM_TTL_AFTER_FINISH_MS = 30 * 60 * 1000;
const QUESTIONS_369 = 15;
const FINALE_TOPICS = 6;
const FINALE_ANSWERS = 5;
const FINALE_GRID_SIZE = 12;

interface Participant {
  userId: string;
  name: string;
  role: AkRole;
}

interface Room {
  code: string;
  gameId: string;
  hostId: string;
  quizmasterId: string | null;
  participants: Map<string, Participant>;
  sockets: Map<string, Set<string>>;
  phase: AkPhase;
  order: string[];
  seconds: Map<string, number>;
  activeId: string | null;
  clockRunning: boolean;
  turnDeadline: number | null;
  intermission: { title: string; subtitle: string } | null;
  pending: { at: number; run: () => void } | null;
  r369: {
    items: { id: string; data: QuestionData; listenText: string | null }[];
    index: number;
    reveal: { correct: boolean | null } | null;
  } | null;
  puzzle: {
    items: { id: string; data: PuzzleData; clues: { text: string; group: number }[] }[];
    index: number;
    found: boolean[];
    queue: string[];
    owners: string[];
    revealed: boolean;
  } | null;
  finale: {
    finalists: [string, string];
    items: { id: string; data: TopicData; grid: string[] }[];
    index: number;
    found: boolean[];
    wrong: Set<string>;
    tried: Set<string>;
    revealed: boolean;
  } | null;
  winnerId: string | null;
  feedback: AkStateView["feedback"];
  starting: boolean;
  lastTick: number;
  lastBroadcast: number;
  timer: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();
let io: SocketIOServer | null = null;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function players(room: Room): string[] {
  return room.phase === "LOBBY"
    ? [...room.participants.values()].filter((p) => p.role === "player").map((p) => p.userId)
    : room.order;
}

function nameOf(room: Room, userId: string): string {
  return room.participants.get(userId)?.name ?? "Speler";
}

function secondsOf(room: Room, userId: string): number {
  return room.seconds.get(userId) ?? 0;
}

function addSeconds(room: Room, userId: string, delta: number) {
  room.seconds.set(userId, Math.max(0, secondsOf(room, userId) + delta));
}

/** Spelers oplopend op seconden; bij gelijke stand de volgorde van aanmelden. */
function byFewestSeconds(room: Room, ids: string[]): string[] {
  return [...ids].sort((a, b) => secondsOf(room, a) - secondsOf(room, b) || room.order.indexOf(a) - room.order.indexOf(b));
}

function feedback(room: Room, userId: string, text: string, kind: "good" | "bad" | "info") {
  room.feedback = { userId, text, kind, at: Date.now() };
}

function schedule(room: Room, delayMs: number, run: () => void) {
  room.pending = { at: Date.now() + delayMs, run };
}

// --- Weergave per deelnemer -------------------------------------------------

function buildView(room: Room, viewerId: string): AkStateView {
  const viewer = room.participants.get(viewerId);
  const isQuizmaster = room.quizmasterId === viewerId;
  const tapMode = room.quizmasterId === null;

  let r369: AkStateView["r369"] = null;
  if (room.phase === "R369" && room.r369 && room.r369.index < room.r369.items.length) {
    const current = room.r369.items[room.r369.index];
    const number = room.r369.index + 1;
    r369 = {
      number,
      total: room.r369.items.length,
      isPointQuestion: number % 3 === 0,
      prompt: current.data.prompt,
      listenText: current.listenText,
      options: tapMode ? current.data.options : null,
      reveal: room.r369.reveal ? { correct: room.r369.reveal.correct, answer: current.data.answer } : null,
    };
  }

  let puzzle: AkStateView["puzzle"] = null;
  if (room.phase === "PUZZLE" && room.puzzle && room.puzzle.index >= 0 && room.puzzle.index < room.puzzle.items.length) {
    const current = room.puzzle.items[room.puzzle.index];
    const { found, revealed } = room.puzzle;
    puzzle = {
      number: room.puzzle.index + 1,
      total: room.puzzle.items.length,
      clues: current.clues.map((c) => ({ text: c.text, group: found[c.group] || revealed ? c.group : null })),
      found: current.data.groups
        .map((g, group) => ({ group, answer: g.answer }))
        .filter(({ group }) => found[group] || revealed),
      revealed,
    };
  }

  let finale: AkStateView["finale"] = null;
  if (room.phase === "FINALE" && room.finale && room.finale.index >= 0 && room.finale.index < room.finale.items.length) {
    const current = room.finale.items[room.finale.index];
    const answers = current.data.answers.slice(0, FINALE_ANSWERS);
    const { found, wrong, revealed } = room.finale;
    finale = {
      number: room.finale.index + 1,
      total: room.finale.items.length,
      subject: current.data.subject,
      found: answers.filter((_, i) => found[i]).map((a) => a.text),
      answerCount: answers.length,
      grid: tapMode
        ? current.grid.map((text) => {
            const answerIndex = answers.findIndex((a) => a.text === text);
            const state: "open" | "found" | "wrong" =
              answerIndex >= 0 && found[answerIndex] ? "found" : wrong.has(text) ? "wrong" : "open";
            return { text, state };
          })
        : null,
      revealed: revealed ? answers.map((a) => a.text) : null,
    };
  }

  let quizmaster: AkStateView["quizmaster"] = null;
  if (isQuizmaster) {
    const q = room.phase === "R369" && room.r369 ? room.r369.items[room.r369.index] : null;
    const p = room.phase === "PUZZLE" && room.puzzle ? room.puzzle.items[room.puzzle.index] : null;
    const f = room.phase === "FINALE" && room.finale ? room.finale.items[room.finale.index] : null;
    quizmaster = {
      answer369: q?.data.answer ?? null,
      puzzleGroups: p
        ? p.data.groups.map((g, i) => ({ answer: g.answer, accept: g.accept, clues: g.clues, found: room.puzzle!.found[i] }))
        : null,
      finaleAnswers: f
        ? f.data.answers.slice(0, FINALE_ANSWERS).map((a, i) => ({ text: a.text, accept: a.accept, found: room.finale!.found[i] }))
        : null,
    };
  }

  return {
    code: room.code,
    phase: room.phase,
    me: { userId: viewerId, role: viewer?.role ?? "spectator", isHost: room.hostId === viewerId },
    hostId: room.hostId,
    quizmasterId: room.quizmasterId,
    participants: [...room.participants.values()].map((p) => ({
      userId: p.userId,
      name: p.name,
      role: p.role,
      online: (room.sockets.get(p.userId)?.size ?? 0) > 0,
    })),
    players: players(room).map((userId) => ({
      userId,
      name: nameOf(room, userId),
      seconds: Math.round(secondsOf(room, userId) * 10) / 10,
    })),
    finalists: room.finale?.finalists ?? null,
    activeId: room.activeId,
    clockRunning: room.clockRunning,
    turnDeadline: room.turnDeadline,
    serverNow: Date.now(),
    intermission: room.intermission,
    r369,
    puzzle,
    finale,
    quizmaster,
    winnerId: room.winnerId,
    feedback: room.feedback,
  };
}

function broadcast(room: Room) {
  room.lastBroadcast = Date.now();
  if (!io) return;
  for (const userId of room.participants.keys()) {
    io.to(`user:${userId}`).emit("ak:state", buildView(room, userId));
  }
}

// --- Klok en geplande stappen -----------------------------------------------

function ensureTicking(room: Room) {
  if (room.timer) return;
  room.lastTick = Date.now();
  room.timer = setInterval(() => tick(room), TICK_MS);
}

function tick(room: Room) {
  const now = Date.now();
  const elapsed = now - room.lastTick;
  room.lastTick = now;

  if (room.clockRunning && room.activeId) {
    const remaining = secondsOf(room, room.activeId) - elapsed / 1000;
    room.seconds.set(room.activeId, Math.max(0, remaining));
    if (remaining <= 0) onClockZero(room);
  }
  if (room.turnDeadline !== null && now >= room.turnDeadline) {
    room.turnDeadline = null;
    onTurnTimeout(room);
  }
  if (room.pending && now >= room.pending.at) {
    const { run } = room.pending;
    room.pending = null;
    run();
    broadcast(room);
    return;
  }
  const live = room.clockRunning || room.turnDeadline !== null || room.pending !== null;
  if (live && now - room.lastBroadcast >= BROADCAST_EVERY_MS) broadcast(room);
}

function onClockZero(room: Room) {
  const active = room.activeId;
  if (!active) return;
  if (room.phase === "PUZZLE") {
    feedback(room, active, "Je seconden zijn op", "bad");
    endPuzzleTurn(room);
  } else if (room.phase === "FINALE" && room.finale) {
    const [a, b] = room.finale.finalists;
    finish(room, active === a ? b : a);
  }
  broadcast(room);
}

function onTurnTimeout(room: Room) {
  if (room.phase === "R369") answer369(room, false, "De tijd is om");
  else if (room.phase === "PUZZLE") endPuzzleTurn(room);
  broadcast(room);
}

// --- Start ------------------------------------------------------------------

async function startGame(room: Room): Promise<string | null> {
  const playerIds = players(room);
  if (playerIds.length < AK_MIN_PLAYERS) return `Er zijn minstens ${AK_MIN_PLAYERS} spelers nodig.`;

  await ensureAlleskennerContent();
  const everyone = [...room.participants.keys()];
  const listen = await pickItems("QUESTION", 1, everyone, (d) => Boolean(d.listen));
  const normal = await pickItems("QUESTION", QUESTIONS_369 - listen.length, everyone, (d) => !d.listen);
  if (normal.length + listen.length < 3) return "Er zijn nog te weinig vragen om te spelen.";
  const questions = [...normal];
  // De luistervraag nooit als eerste: dan is iedereen er nog niet klaar voor.
  if (listen[0]) questions.splice(1 + Math.floor(Math.random() * Math.max(1, questions.length - 1)), 0, listen[0]);

  const puzzles = await pickItems("PUZZLE", playerIds.length, everyone);
  const topics = await pickItems("TOPIC", FINALE_TOPICS, everyone, (d) => d.answers.length >= FINALE_ANSWERS);
  if (topics.length === 0) return "Er zijn nog geen onderwerpen voor de finale.";

  await markSeen([...questions, ...puzzles, ...topics].map((i) => i.id), everyone);

  room.r369 = {
    items: await Promise.all(
      questions.map(async (q) => ({
        id: q.id,
        data: q.data,
        listenText: q.data.listen ? await verseTextByRef(q.data.listen.ref) : null,
      }))
    ),
    index: 0,
    reveal: null,
  };
  room.puzzle = {
    items: puzzles.map((p) => ({
      id: p.id,
      data: p.data,
      clues: shuffle(p.data.groups.flatMap((g, group) => g.clues.map((text) => ({ text, group })))),
    })),
    index: -1,
    found: [],
    queue: [],
    owners: [],
    revealed: false,
  };
  room.finale = {
    finalists: [playerIds[0], playerIds[1]],
    items: topics.map((t) => ({
      id: t.id,
      data: t.data,
      grid: shuffle([
        ...t.data.answers.slice(0, FINALE_ANSWERS).map((a) => a.text),
        ...shuffle(t.data.distractors).slice(0, FINALE_GRID_SIZE - FINALE_ANSWERS),
      ]),
    })),
    index: -1,
    found: [],
    wrong: new Set(),
    tried: new Set(),
    revealed: false,
  };

  room.order = playerIds;
  room.seconds = new Map(playerIds.map((id) => [id, AK_START_SECONDS]));
  room.phase = "R369";
  room.intermission = { title: "Ronde 1: 3-6-9", subtitle: "Iedereen begint met 60 seconden. Punten bij vraag 3, 6, 9, 12 en 15." };
  schedule(room, INTERMISSION_MS, () => {
    room.intermission = null;
    room.activeId = room.order[0];
    ask369(room);
  });

  await prisma.liveGame.update({ where: { id: room.gameId }, data: { status: "IN_PROGRESS" } }).catch(() => {});
  await revokeOpenInvites(room).catch(() => {});
  ensureTicking(room);
  return null;
}

// Uitgenodigden die niet zijn toegetreden: uitnodiging vervalt (zie InviteListener).
async function revokeOpenInvites(room: Room) {
  const invites = await prisma.liveGameInvite.findMany({ where: { gameId: room.gameId }, select: { userId: true } });
  for (const invite of invites) {
    if (!room.participants.has(invite.userId)) io?.to(`user:${invite.userId}`).emit("game_invite_revoked", { code: room.code });
  }
}

// --- Ronde 1: 3-6-9 -----------------------------------------------------------

function ask369(room: Room) {
  if (!room.r369) return;
  room.r369.reveal = null;
  room.clockRunning = false;
  room.turnDeadline = Date.now() + AK_369_THINK_MS;
}

function answer369(room: Room, correct: boolean, note?: string) {
  const state = room.r369;
  const active = room.activeId;
  if (!state || state.reveal || !active) return;
  const number = state.index + 1;
  room.turnDeadline = null;
  state.reveal = { correct };
  if (correct && number % 3 === 0) {
    addSeconds(room, active, AK_369_POINTS);
    feedback(room, active, `Goed! +${AK_369_POINTS} seconden`, "good");
  } else if (correct) {
    feedback(room, active, "Goed! Je mag door", "good");
  } else {
    feedback(room, active, note ?? "Helaas", "bad");
  }
  schedule(room, REVEAL_369_MS, () => {
    state.index++;
    if (state.index >= state.items.length) {
      beginPuzzleRound(room);
      return;
    }
    if (!correct) room.activeId = nextInOrder(room, active);
    ask369(room);
  });
}

function nextInOrder(room: Room, userId: string): string {
  const index = room.order.indexOf(userId);
  return room.order[(index + 1) % room.order.length];
}

// --- Ronde 2: Puzzel ----------------------------------------------------------

function beginPuzzleRound(room: Room) {
  room.activeId = null;
  room.clockRunning = false;
  if (!room.puzzle || room.puzzle.items.length === 0) {
    beginFinale(room);
    return;
  }
  room.phase = "PUZZLE";
  room.intermission = { title: "Ronde 2: Puzzel", subtitle: "Vind de drie groepen van vier. Je klok loopt terwijl jij aan de beurt bent." };
  schedule(room, INTERMISSION_MS, () => {
    room.intermission = null;
    nextPuzzle(room);
  });
}

function nextPuzzle(room: Room) {
  const state = room.puzzle!;
  state.index++;
  if (state.index >= state.items.length) {
    beginFinale(room);
    return;
  }
  const candidates = room.order.filter((id) => !state.owners.includes(id));
  const owner = byFewestSeconds(room, candidates.length > 0 ? candidates : room.order)[0];
  state.owners.push(owner);
  state.found = [false, false, false];
  state.revealed = false;
  state.queue = [owner, ...byFewestSeconds(room, room.order.filter((id) => id !== owner))];
  startPuzzleTurn(room, state.queue.shift()!);
}

function startPuzzleTurn(room: Room, userId: string) {
  room.activeId = userId;
  room.clockRunning = secondsOf(room, userId) > 0;
  room.turnDeadline = Date.now() + AK_PUZZLE_TURN_MS;
  if (!room.clockRunning) endPuzzleTurn(room);
}

function puzzleFound(room: Room, group: number) {
  const state = room.puzzle;
  const active = room.activeId;
  if (!state || !active || state.revealed || state.found[group] === undefined || state.found[group]) return;
  state.found[group] = true;
  addSeconds(room, active, AK_PUZZLE_POINTS);
  feedback(room, active, `${state.items[state.index].data.groups[group].answer}! +${AK_PUZZLE_POINTS} seconden`, "good");
  if (state.found.every(Boolean)) endPuzzleTurn(room);
}

function endPuzzleTurn(room: Room) {
  const state = room.puzzle;
  if (!state || room.pending) return;
  room.clockRunning = false;
  room.turnDeadline = null;
  const done = state.found.every(Boolean);
  const next = done ? undefined : state.queue.shift();
  if (next) {
    room.activeId = null;
    schedule(room, BETWEEN_TURNS_MS, () => startPuzzleTurn(room, next));
    return;
  }
  room.activeId = null;
  state.revealed = true;
  schedule(room, REVEAL_ROUND_ITEM_MS, () => nextPuzzle(room));
}

// --- Finale -------------------------------------------------------------------

function beginFinale(room: Room) {
  const state = room.finale!;
  const ranked = [...room.order].sort(
    (a, b) => secondsOf(room, b) - secondsOf(room, a) || room.order.indexOf(a) - room.order.indexOf(b)
  );
  state.finalists = [ranked[0], ranked[1]];
  room.phase = "FINALE";
  room.activeId = null;
  room.clockRunning = false;
  room.intermission = {
    title: "Finale",
    subtitle: `${nameOf(room, ranked[0])} tegen ${nameOf(room, ranked[1])}. Elk goed antwoord kost je tegenstander ${AK_FINALE_PENALTY} seconden.`,
  };
  schedule(room, INTERMISSION_MS + 1000, () => {
    room.intermission = null;
    nextTopic(room);
  });
}

function nextTopic(room: Room) {
  const state = room.finale!;
  state.index++;
  if (state.index >= state.items.length) {
    const [a, b] = state.finalists;
    finish(room, secondsOf(room, a) >= secondsOf(room, b) ? a : b);
    return;
  }
  state.found = Array(Math.min(FINALE_ANSWERS, state.items[state.index].data.answers.length)).fill(false);
  state.wrong = new Set();
  state.tried = new Set();
  state.revealed = false;
  startFinaleTurn(room, byFewestSeconds(room, state.finalists)[0]);
}

function startFinaleTurn(room: Room, userId: string) {
  room.finale!.tried.add(userId);
  room.activeId = userId;
  room.clockRunning = true;
  room.turnDeadline = null;
}

function opponentOf(room: Room, userId: string): string {
  const [a, b] = room.finale!.finalists;
  return userId === a ? b : a;
}

function finaleFound(room: Room, index: number) {
  const state = room.finale;
  const active = room.activeId;
  if (!state || !active || state.revealed || state.found[index] === undefined || state.found[index]) return;
  state.found[index] = true;
  const opponent = opponentOf(room, active);
  addSeconds(room, opponent, -AK_FINALE_PENALTY);
  feedback(room, active, `Goed! ${nameOf(room, opponent)} −${AK_FINALE_PENALTY} seconden`, "good");
  if (secondsOf(room, opponent) <= 0) {
    finish(room, active);
    return;
  }
  if (state.found.every(Boolean)) endFinaleTurn(room);
}

function endFinaleTurn(room: Room) {
  const state = room.finale;
  const active = room.activeId;
  if (!state || !active || room.pending) return;
  room.clockRunning = false;
  const other = opponentOf(room, active);
  room.activeId = null;
  if (!state.found.every(Boolean) && !state.tried.has(other)) {
    schedule(room, BETWEEN_TURNS_MS, () => startFinaleTurn(room, other));
    return;
  }
  state.revealed = true;
  schedule(room, REVEAL_ROUND_ITEM_MS, () => nextTopic(room));
}

// --- Einde --------------------------------------------------------------------

function finish(room: Room, winnerId: string | null) {
  room.phase = "FINISHED";
  room.winnerId = winnerId;
  room.activeId = null;
  room.clockRunning = false;
  room.turnDeadline = null;
  room.pending = null;
  room.intermission = null;
  if (room.timer) clearInterval(room.timer);
  room.timer = null;
  broadcast(room);

  prisma.liveGame.update({ where: { id: room.gameId }, data: { status: "FINISHED" } }).catch(() => {});
  for (const userId of room.order) {
    prisma.liveGamePlayer
      .updateMany({ where: { gameId: room.gameId, userId }, data: { score: Math.round(secondsOf(room, userId)) } })
      .catch(() => {});
  }
  setTimeout(() => {
    if (rooms.get(room.code) === room) rooms.delete(room.code);
  }, ROOM_TTL_AFTER_FINISH_MS);
}

// --- Aanmelden en lobby ---------------------------------------------------------

async function joinRoom(socket: Socket, user: { id: string; handle: string }, code: string): Promise<Room | string> {
  const upper = code.toUpperCase();
  let room = rooms.get(upper);
  if (!room) {
    const game = await prisma.liveGame.findUnique({ where: { code: upper }, select: { id: true, hostId: true, mode: true, status: true } });
    if (!game || game.mode !== "ALLESKENNER") return "Dit spel bestaat niet (meer).";
    if (game.status !== "LOBBY") return "Dit spel is al afgelopen.";
    const host = await prisma.user.findUnique({ where: { id: game.hostId }, select: { handle: true } });
    room = {
      code: upper,
      gameId: game.id,
      hostId: game.hostId,
      quizmasterId: game.hostId,
      participants: new Map([[game.hostId, { userId: game.hostId, name: host?.handle ?? "Host", role: "quizmaster" as AkRole }]]),
      sockets: new Map(),
      phase: "LOBBY",
      order: [],
      seconds: new Map(),
      activeId: null,
      clockRunning: false,
      turnDeadline: null,
      intermission: null,
      pending: null,
      r369: null,
      puzzle: null,
      finale: null,
      winnerId: null,
      feedback: null,
      starting: false,
      lastTick: Date.now(),
      lastBroadcast: 0,
      timer: null,
    };
    rooms.set(upper, room);
  }

  if (!room.participants.has(user.id)) {
    room.participants.set(user.id, { userId: user.id, name: user.handle, role: room.phase === "LOBBY" ? "player" : "spectator" });
    await prisma.liveGamePlayer
      .upsert({
        where: { gameId_userId: { gameId: room.gameId, userId: user.id } },
        create: { gameId: room.gameId, userId: user.id },
        update: {},
      })
      .catch(() => {});
  }
  const sockets = room.sockets.get(user.id) ?? new Set<string>();
  sockets.add(socket.id);
  room.sockets.set(user.id, sockets);
  socket.data.akCode = upper;
  return room;
}

/** Aangeroepen vanuit cancel_game in gameServer.ts: de lobby is verwijderd. */
export function forgetAlleskennerRoom(code: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return;
  if (room.timer) clearInterval(room.timer);
  rooms.delete(room.code);
}

export function registerAlleskennerHandlers(server: SocketIOServer, socket: Socket, user: { id: string; handle: string }) {
  io = server;

  const current = (): Room | null => {
    const code = socket.data.akCode as string | undefined;
    return code ? (rooms.get(code) ?? null) : null;
  };
  const fail = (message: string) => socket.emit("ak:error", { message });

  socket.on("ak:join", async ({ code }: { code?: unknown }) => {
    if (typeof code !== "string") return;
    const result = await joinRoom(socket, user, code).catch(() => "Kon niet deelnemen aan dit spel.");
    if (typeof result === "string") {
      fail(result);
      return;
    }
    broadcast(result);
  });

  socket.on("disconnect", () => {
    const room = current();
    if (!room) return;
    room.sockets.get(user.id)?.delete(socket.id);
    broadcast(room);
  });

  // Lobby: alleen de host, alleen vóór de start.
  const hostInLobby = (): Room | null => {
    const room = current();
    if (!room || room.hostId !== user.id || room.phase !== "LOBBY") return null;
    return room;
  };

  socket.on("ak:set_role", ({ userId, role }: { userId?: unknown; role?: unknown }) => {
    const room = hostInLobby();
    if (!room || typeof userId !== "string" || (role !== "player" && role !== "spectator")) return;
    const participant = room.participants.get(userId);
    if (!participant) return;
    if (room.quizmasterId === userId) room.quizmasterId = null;
    participant.role = role;
    broadcast(room);
  });

  socket.on("ak:set_quizmaster", ({ userId }: { userId?: unknown }) => {
    const room = hostInLobby();
    if (!room) return;
    if (room.quizmasterId) {
      const previous = room.participants.get(room.quizmasterId);
      if (previous) previous.role = "player";
    }
    if (typeof userId === "string" && room.participants.has(userId)) {
      room.quizmasterId = userId;
      room.participants.get(userId)!.role = "quizmaster";
    } else {
      room.quizmasterId = null;
    }
    broadcast(room);
  });

  socket.on("ak:start", async () => {
    const room = hostInLobby();
    // Starten kiest en registreert inhoud (async): een tweede tik mag niet
    // intussen een tweede start beginnen.
    if (!room || room.starting) return;
    room.starting = true;
    const error = await startGame(room).catch((e) => {
      console.error("Alleskenner starten mislukt:", e);
      return "Kon het spel niet starten.";
    });
    room.starting = false;
    if (error) fail(error);
    broadcast(room);
  });

  socket.on("ak:stop", () => {
    const room = current();
    if (!room || room.hostId !== user.id || room.phase === "LOBBY" || room.phase === "FINISHED") return;
    finish(room, null);
  });

  // Tijdens het spel. Tikken en passen alleen door wie aan de beurt is;
  // beoordelen alleen door de quizmaster.
  const activeRoom = (): Room | null => {
    const room = current();
    if (!room || room.pending || room.intermission) return null;
    return room;
  };
  const isActive = (room: Room) => room.activeId === user.id;
  const isQuizmaster = (room: Room) => room.quizmasterId === user.id;

  socket.on("ak:pass", () => {
    const room = activeRoom();
    if (!room || !(isActive(room) || isQuizmaster(room)) || !room.activeId) return;
    if (room.phase === "R369") answer369(room, false, "Gepast");
    else if (room.phase === "PUZZLE") endPuzzleTurn(room);
    else if (room.phase === "FINALE") endFinaleTurn(room);
    broadcast(room);
  });

  socket.on("ak:tap_369", ({ option }: { option?: unknown }) => {
    const room = activeRoom();
    if (!room || room.quizmasterId || !isActive(room) || room.phase !== "R369" || typeof option !== "string") return;
    const current369 = room.r369!.items[room.r369!.index];
    answer369(room, option === current369.data.answer);
    broadcast(room);
  });

  socket.on("ak:type_puzzle", ({ text }: { text?: unknown }) => {
    const room = activeRoom();
    if (!room || room.quizmasterId || !isActive(room) || room.phase !== "PUZZLE" || typeof text !== "string") return;
    const state = room.puzzle!;
    const group = state.items[state.index].data.groups.findIndex(
      (g, i) => !state.found[i] && answerMatches(text, [g.answer, ...g.accept])
    );
    if (group >= 0) puzzleFound(room, group);
    else feedback(room, user.id, `"${text.slice(0, 40)}" is niet goed`, "bad");
    broadcast(room);
  });

  socket.on("ak:tap_finale", ({ text }: { text?: unknown }) => {
    const room = activeRoom();
    if (!room || room.quizmasterId || !isActive(room) || room.phase !== "FINALE" || typeof text !== "string") return;
    const state = room.finale!;
    const answers = state.items[state.index].data.answers.slice(0, FINALE_ANSWERS);
    const index = answers.findIndex((a) => a.text === text);
    if (index >= 0 && !state.found[index]) {
      finaleFound(room, index);
    } else if (state.items[state.index].grid.includes(text) && index < 0) {
      state.wrong.add(text);
      feedback(room, user.id, "Fout! Je beurt is voorbij", "bad");
      endFinaleTurn(room);
    }
    broadcast(room);
  });

  socket.on("ak:qm_369", ({ correct }: { correct?: unknown }) => {
    const room = activeRoom();
    if (!room || !isQuizmaster(room) || room.phase !== "R369" || typeof correct !== "boolean") return;
    answer369(room, correct);
    broadcast(room);
  });

  socket.on("ak:qm_puzzle", ({ group }: { group?: unknown }) => {
    const room = activeRoom();
    if (!room || !isQuizmaster(room) || room.phase !== "PUZZLE" || typeof group !== "number") return;
    puzzleFound(room, group);
    broadcast(room);
  });

  socket.on("ak:qm_finale", ({ index }: { index?: unknown }) => {
    const room = activeRoom();
    if (!room || !isQuizmaster(room) || room.phase !== "FINALE" || typeof index !== "number") return;
    finaleFound(room, index);
    broadcast(room);
  });
}
