import type { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "@/lib/db";
import {
  answerMatches,
  bookOfRef,
  type GalleryData,
  type PuzzleData,
  type QuestionData,
  type TopicAnswer,
} from "@/lib/alleskenner/content";
import {
  ensureAlleskennerContent,
  kidsStory,
  markSeen,
  passageVerses,
  pickItems,
  siblingBookNames,
  verseTextByRef,
} from "@/lib/alleskenner/pool";
import {
  AK_369_POINTS,
  AK_369_THINK_MS,
  AK_FINALE_PENALTY,
  AK_GALLERY_POINTS,
  AK_MAX_TEAMS,
  AK_MEMORY_READ_MS,
  AK_MEMORY_STEP,
  AK_MIN_PLAYERS,
  AK_MIN_TEAM_PLAYERS,
  AK_OPEN_DEUR_POINTS,
  AK_PUZZLE_POINTS,
  AK_PUZZLE_TURN_MS,
  AK_ROUND_TITLES,
  AK_ROUNDS,
  AK_START_SECONDS,
  AK_TEAM_NAMES,
  type AkGridCell,
  type AkLength,
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
//
// Alles wat punten krijgt of aan de beurt is, is een "deelnemer": een losse
// speler of een team. Bij een team handelt alleen de teamleider; de andere
// leden kiezen stil mee voor hun persoonlijke punten, die pas bij de
// onthulling worden beoordeeld (anders zouden ze het antwoord kunnen
// doorfluisteren).

const TICK_MS = 200;
const BROADCAST_EVERY_MS = 1000;
const REVEAL_369_MS = 2500;
const BETWEEN_TURNS_MS = 1200;
const REVEAL_ROUND_ITEM_MS = 4000;
const INTERMISSION_MS = 3500;
const STANDINGS_MS = 3000;
const CHOOSE_DOOR_MS = 30_000;
const ROOM_TTL_AFTER_FINISH_MS = 30 * 60 * 1000;
const QUESTIONS_369 = 15;
const FINALE_TOPICS = 6;
const FINALE_ANSWERS = 5;
const OPEN_DEUR_ANSWERS = 4;
const MEMORY_ANSWERS = 5;
const GRID_SIZE = 12;
const OPEN_DEUR_GRID_SIZE = 10;
const PUZZLE_SILENT_GUESSES = 3;

interface Participant {
  userId: string;
  name: string;
  role: AkRole;
  team: number | null; // lobby: teamindex bij teamspel
}

interface Contestant {
  id: string;
  name: string;
  members: string[];
  leaderId: string;
  color: number;
}

interface GridItem {
  id: string;
  subject: string;
  answers: TopicAnswer[];
  grid: string[];
  passage?: string;
  verses?: { number: number; text: string }[];
}

// Gedeeld door Open Deur, Collectief Geheugen en de Finale: een onderwerp met
// een aantal goede antwoorden, tikvakjes, en een wachtrij van deelnemers die
// na elkaar mogen aanvullen.
interface GridRound {
  items: GridItem[];
  index: number;
  found: boolean[];
  foundOrder: { index: number; value: number }[];
  wrong: Set<string>;
  queue: string[];
  revealed: boolean;
  picks: Map<string, Set<string>>;
}

interface GalleryEntry {
  text: string | null;
  image: string | null;
  answer: string;
  options: string[];
}

interface Room {
  code: string;
  gameId: string;
  hostId: string;
  quizmasterId: string | null;
  participants: Map<string, Participant>;
  sockets: Map<string, Set<string>>;
  length: AkLength;
  teamMode: boolean;
  lobbyTeams: { leaderId: string | null }[];
  phase: AkPhase;
  rounds: AkPhase[];
  roundIndex: number;
  contestants: Contestant[];
  seconds: Map<string, number>;
  personal: Map<string, number>;
  activeId: string | null;
  clockRunning: boolean;
  turnDeadline: number | null;
  intermission: { title: string; subtitle: string; standings: boolean } | null;
  pending: { at: number; run: () => void } | null;
  r369: {
    items: { id: string; data: QuestionData; listenText: string | null }[];
    index: number;
    reveal: { correct: boolean | null } | null;
    picks: Map<string, string>;
  } | null;
  openDeur: (GridRound & { owners: string[]; taken: boolean[]; choosing: boolean }) | null;
  puzzle: {
    items: { id: string; data: PuzzleData; clues: { text: string; group: number }[] }[];
    index: number;
    found: boolean[];
    queue: string[];
    owners: string[];
    revealed: boolean;
    picks: Map<string, Set<number>>;
    guesses: Map<string, string[]>;
  } | null;
  gallery: {
    items: { id: string; variant: "QUOTES" | "IMAGES"; entries: GalleryEntry[] }[];
    index: number;
    owners: string[];
    found: boolean[];
    queue: string[];
    turnEntries: number[];
    turnPos: number;
    revealed: boolean;
    picks: Map<string, Map<number, string>>;
  } | null;
  memory: (GridRound & { owners: string[]; reading: boolean }) | null;
  finale: (GridRound & { finalists: [string, string] }) | null;
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

function nameOf(room: Room, userId: string): string {
  return room.participants.get(userId)?.name ?? "Speler";
}

function lobbyPlayers(room: Room): Participant[] {
  return [...room.participants.values()].filter((p) => p.role === "player");
}

function contestantById(room: Room, id: string | null): Contestant | null {
  return id ? (room.contestants.find((c) => c.id === id) ?? null) : null;
}

function contestantOf(room: Room, userId: string): Contestant | null {
  return room.contestants.find((c) => c.members.includes(userId)) ?? null;
}

function contestantIds(room: Room): string[] {
  return room.contestants.map((c) => c.id);
}

function contestantName(room: Room, id: string): string {
  return contestantById(room, id)?.name ?? "Speler";
}

function secondsOf(room: Room, id: string): number {
  return room.seconds.get(id) ?? 0;
}

function addSeconds(room: Room, id: string, delta: number) {
  room.seconds.set(id, Math.max(0, secondsOf(room, id) + delta));
}

function addPersonal(room: Room, userId: string, points: number) {
  if (!room.teamMode || points === 0) return;
  room.personal.set(userId, (room.personal.get(userId) ?? 0) + points);
}

function orderIndex(room: Room, id: string): number {
  return room.contestants.findIndex((c) => c.id === id);
}

/** Deelnemers oplopend op seconden; bij gelijke stand de startvolgorde. */
function byFewestSeconds(room: Room, ids: string[]): string[] {
  return [...ids].sort((a, b) => secondsOf(room, a) - secondsOf(room, b) || orderIndex(room, a) - orderIndex(room, b));
}

function byMostSeconds(room: Room, ids: string[]): string[] {
  return [...ids].sort((a, b) => secondsOf(room, b) - secondsOf(room, a) || orderIndex(room, a) - orderIndex(room, b));
}

function feedback(room: Room, contestantId: string | null, text: string, kind: "good" | "bad" | "info") {
  room.feedback = { contestantId, text, kind, at: Date.now() };
}

function schedule(room: Room, delayMs: number, run: () => void) {
  room.pending = { at: Date.now() + delayMs, run };
}

function standingsText(room: Room): string {
  return byMostSeconds(room, contestantIds(room))
    .map((id) => `${contestantName(room, id)} ${Math.round(secondsOf(room, id))}`)
    .join(" · ");
}

// --- Wie mag wat ------------------------------------------------------------

/**
 * "team": deze tik telt als antwoord van de deelnemer die aan de beurt is.
 * "silent": stil meekiezen voor persoonlijke punten (alleen bij teams).
 * null: negeren. Met quizmaster antwoordt de teamleider hardop, dus dan telt
 * zijn tik niet — de quizmaster beoordeelt.
 */
function actorKind(room: Room, userId: string): "team" | "silent" | null {
  if (room.participants.get(userId)?.role !== "player") return null;
  const active = contestantById(room, room.activeId);
  if (active && active.leaderId === userId) return room.quizmasterId ? null : "team";
  return room.teamMode ? "silent" : null;
}

function leaderOfActive(room: Room): string | null {
  return contestantById(room, room.activeId)?.leaderId ?? null;
}

// --- Weergave per deelnemer -------------------------------------------------

function gridCells(room: Room, round: GridRound, viewerId: string, answerCount: number): AkGridCell[] | null {
  const showGrid = room.quizmasterId === null || room.teamMode;
  if (!showGrid) return null;
  const item = round.items[round.index];
  const answers = item.answers.slice(0, answerCount);
  const mine = round.picks.get(viewerId);
  return item.grid.map((text) => {
    const answerIndex = answers.findIndex((a) => a.text === text);
    const state: AkGridCell["state"] =
      answerIndex >= 0 && round.found[answerIndex] ? "found" : round.wrong.has(text) ? "wrong" : "open";
    return { text, state, mine: mine?.has(text) ?? false };
  });
}

function currentGridItem(round: GridRound | null): GridItem | null {
  if (!round || round.index < 0 || round.index >= round.items.length) return null;
  return round.items[round.index];
}

function foundTexts(round: GridRound): string[] {
  const item = round.items[round.index];
  return round.foundOrder.map((f) => item.answers[f.index].text);
}

function buildView(room: Room, viewerId: string): AkStateView {
  const viewer = room.participants.get(viewerId);
  const isQuizmaster = room.quizmasterId === viewerId;
  const showOptions = room.quizmasterId === null || room.teamMode;
  const myContestant = contestantOf(room, viewerId);

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
      options: showOptions ? current.data.options : null,
      myPick: room.r369.picks.get(viewerId) ?? null,
      reveal: room.r369.reveal ? { correct: room.r369.reveal.correct, answer: current.data.answer } : null,
    };
  }

  let openDeur: AkStateView["openDeur"] = null;
  if (room.phase === "OPEN_DEUR" && room.openDeur && room.openDeur.owners.length > 0) {
    const state = room.openDeur;
    const item = state.choosing ? null : currentGridItem(state);
    openDeur = {
      number: state.owners.length,
      total: Math.min(state.items.length, room.contestants.length),
      choosing: state.choosing,
      doors: state.items.map((it, index) => ({ index, subject: it.subject, taken: state.taken[index] })),
      subject: item?.subject ?? null,
      found: item ? foundTexts(state) : [],
      answerCount: OPEN_DEUR_ANSWERS,
      grid: item && !state.revealed ? gridCells(room, state, viewerId, OPEN_DEUR_ANSWERS) : null,
      revealed: item && state.revealed ? item.answers.slice(0, OPEN_DEUR_ANSWERS).map((a) => a.text) : null,
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
      myGuesses: room.teamMode ? (room.puzzle.guesses.get(viewerId) ?? []) : null,
    };
  }

  let gallery: AkStateView["gallery"] = null;
  if (room.phase === "GALLERY" && room.gallery && room.gallery.index >= 0 && room.gallery.index < room.gallery.items.length) {
    const state = room.gallery;
    const current = state.items[state.index];
    const entryIndex = state.turnEntries[state.turnPos] ?? -1;
    const entry = room.activeId && entryIndex >= 0 ? current.entries[entryIndex] : null;
    gallery = {
      number: state.index + 1,
      total: state.items.length,
      variant: current.variant,
      itemIndex: entryIndex,
      itemCount: current.entries.length,
      item: entry ? { text: entry.text, image: entry.image } : null,
      options: entry && showOptions ? entry.options : null,
      myPick: entryIndex >= 0 ? (state.picks.get(viewerId)?.get(entryIndex) ?? null) : null,
      results: current.entries.map((e, i) => ({
        found: state.found[i],
        answer: state.found[i] || state.revealed ? e.answer : null,
      })),
      revealed: state.revealed
        ? current.entries.map((e, i) => ({ text: e.text, image: e.image, answer: e.answer, found: state.found[i] }))
        : null,
    };
  }

  let memory: AkStateView["memory"] = null;
  if (room.phase === "MEMORY" && room.memory) {
    const state = room.memory;
    const item = currentGridItem(state);
    if (item) {
      memory = {
        number: state.owners.length,
        total: Math.min(state.items.length, room.contestants.length),
        title: item.subject,
        passage: item.passage ?? "",
        reading: state.reading,
        verses: state.reading ? (item.verses ?? []) : null,
        nextValue: (state.foundOrder.length + 1) * AK_MEMORY_STEP,
        found: state.foundOrder.map((f) => ({ text: item.answers[f.index].text, value: f.value })),
        answerCount: MEMORY_ANSWERS,
        grid: !state.reading && !state.revealed ? gridCells(room, state, viewerId, MEMORY_ANSWERS) : null,
        revealed: state.revealed ? item.answers.slice(0, MEMORY_ANSWERS).map((a) => a.text) : null,
      };
    }
  }

  let finale: AkStateView["finale"] = null;
  if (room.phase === "FINALE" && room.finale) {
    const state = room.finale;
    const item = currentGridItem(state);
    if (item) {
      finale = {
        number: state.index + 1,
        total: state.items.length,
        subject: item.subject,
        found: foundTexts(state),
        answerCount: Math.min(FINALE_ANSWERS, item.answers.length),
        grid: !state.revealed ? gridCells(room, state, viewerId, FINALE_ANSWERS) : null,
        revealed: state.revealed ? item.answers.slice(0, FINALE_ANSWERS).map((a) => a.text) : null,
      };
    }
  }

  let quizmaster: AkStateView["quizmaster"] = null;
  if (isQuizmaster) {
    const q = room.phase === "R369" && room.r369 ? room.r369.items[room.r369.index] : null;
    const p = room.phase === "PUZZLE" && room.puzzle ? room.puzzle.items[room.puzzle.index] : null;
    const gridRound =
      room.phase === "OPEN_DEUR" && room.openDeur && !room.openDeur.choosing
        ? { round: room.openDeur as GridRound, count: OPEN_DEUR_ANSWERS }
        : room.phase === "MEMORY" && room.memory
          ? { round: room.memory as GridRound, count: MEMORY_ANSWERS }
          : room.phase === "FINALE" && room.finale
            ? { round: room.finale as GridRound, count: FINALE_ANSWERS }
            : null;
    const gridItem = gridRound ? currentGridItem(gridRound.round) : null;
    const g = room.phase === "GALLERY" && room.gallery ? room.gallery : null;
    const galleryEntry = g && g.index >= 0 && g.index < g.items.length ? g.items[g.index].entries[g.turnEntries[g.turnPos]] : null;
    quizmaster = {
      answer369: q?.data.answer ?? null,
      puzzleGroups: p
        ? p.data.groups.map((group, i) => ({ answer: group.answer, accept: group.accept, clues: group.clues, found: room.puzzle!.found[i] }))
        : null,
      answers:
        gridRound && gridItem
          ? gridItem.answers
              .slice(0, gridRound.count)
              .map((a, i) => ({ text: a.text, accept: a.accept, found: gridRound.round.found[i] }))
          : null,
      galleryAnswer: galleryEntry?.answer ?? null,
    };
  }

  const personalRanking =
    room.teamMode && room.phase === "FINISHED"
      ? room.contestants
          .flatMap((c) => c.members)
          .map((userId) => ({ userId, name: nameOf(room, userId), points: room.personal.get(userId) ?? 0 }))
          .sort((a, b) => b.points - a.points)
      : null;

  return {
    code: room.code,
    phase: room.phase,
    me: {
      userId: viewerId,
      role: viewer?.role ?? "spectator",
      isHost: room.hostId === viewerId,
      contestantId: myContestant?.id ?? null,
      actsForContestant: myContestant?.leaderId === viewerId,
    },
    hostId: room.hostId,
    quizmasterId: room.quizmasterId,
    length: room.length,
    teamMode: room.teamMode,
    lobbyTeams: room.teamMode ? room.lobbyTeams.map((t, i) => ({ name: AK_TEAM_NAMES[i], leaderId: t.leaderId })) : null,
    participants: [...room.participants.values()].map((p) => ({
      userId: p.userId,
      name: p.name,
      role: p.role,
      online: (room.sockets.get(p.userId)?.size ?? 0) > 0,
      teamIndex: room.teamMode ? p.team : null,
    })),
    contestants: room.contestants.map((c) => ({
      id: c.id,
      name: c.name,
      seconds: Math.round(secondsOf(room, c.id) * 10) / 10,
      color: c.color,
      leaderId: c.leaderId,
      members: c.members.map((userId) => ({ userId, name: nameOf(room, userId) })),
    })),
    finalists: room.finale && (room.phase === "FINALE" || room.phase === "FINISHED") ? room.finale.finalists : null,
    activeId: room.activeId,
    clockRunning: room.clockRunning,
    turnDeadline: room.turnDeadline,
    serverNow: Date.now(),
    round: { number: room.roundIndex + 1, total: room.rounds.length },
    intermission: room.intermission,
    r369,
    openDeur,
    puzzle,
    gallery,
    memory,
    finale,
    quizmaster,
    winnerId: room.winnerId,
    personal: room.teamMode
      ? { mine: myContestant ? (room.personal.get(viewerId) ?? 0) : null, ranking: personalRanking }
      : null,
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
  room.clockRunning = false;
  if (room.phase === "FINALE" && room.finale) {
    const [a, b] = room.finale.finalists;
    finish(room, active === a ? b : a);
    return;
  }
  feedback(room, active, "Je seconden zijn op", "bad");
  endTurn(room);
  broadcast(room);
}

function onTurnTimeout(room: Room) {
  if (room.phase === "R369") answer369(room, false, "De tijd is om");
  else if (room.phase === "PUZZLE") endPuzzleTurn(room);
  else if (room.phase === "OPEN_DEUR" && room.openDeur?.choosing) {
    chooseDoor(room, room.openDeur.taken.findIndex((t) => !t));
  } else if (room.phase === "MEMORY" && room.memory?.reading) startMemoryAnswering(room);
  broadcast(room);
}

/** Beurt beëindigen (passen, klok op nul) in de ronde die nu loopt. */
function endTurn(room: Room) {
  if (room.phase === "R369") answer369(room, false, "Gepast");
  else if (room.phase === "PUZZLE") endPuzzleTurn(room);
  else if (room.phase === "OPEN_DEUR" && room.openDeur && !room.openDeur.choosing) endGridTurn(room, room.openDeur);
  else if (room.phase === "MEMORY" && room.memory && !room.memory.reading) endGridTurn(room, room.memory);
  else if (room.phase === "FINALE" && room.finale) endGridTurn(room, room.finale);
  else if (room.phase === "GALLERY") endGalleryTurn(room);
}

// --- Start ------------------------------------------------------------------

function buildContestants(room: Room): Contestant[] | string {
  const players = lobbyPlayers(room);
  if (!room.teamMode) {
    if (players.length < AK_MIN_PLAYERS) return `Er zijn minstens ${AK_MIN_PLAYERS} spelers nodig.`;
    return players.map((p, i) => ({ id: p.userId, name: p.name, members: [p.userId], leaderId: p.userId, color: i }));
  }
  if (players.length < AK_MIN_TEAM_PLAYERS) return `Teams kan vanaf ${AK_MIN_TEAM_PLAYERS} spelers.`;
  normalizeTeams(room);
  const teams = room.lobbyTeams
    .map((team, index) => ({
      id: `team-${index}`,
      name: AK_TEAM_NAMES[index],
      members: players.filter((p) => p.team === index).map((p) => p.userId),
      leaderId: team.leaderId ?? "",
      color: index,
    }))
    .filter((t) => t.members.length > 0);
  if (teams.length < 2) return "Verdeel de spelers over minstens twee teams.";
  return teams;
}

function gridItem(id: string, subject: string, answers: TopicAnswer[], distractors: string[], answerCount: number, size: number): GridItem {
  const used = answers.slice(0, answerCount);
  return {
    id,
    subject,
    answers: used,
    grid: shuffle([...used.map((a) => a.text), ...shuffle(distractors).slice(0, size - used.length)]),
  };
}

function emptyGridRound(items: GridItem[]): GridRound {
  return { items, index: -1, found: [], foundOrder: [], wrong: new Set(), queue: [], revealed: false, picks: new Map() };
}

async function buildGallery(id: string, data: GalleryData) {
  const entries: GalleryEntry[] = [];
  if (data.variant === "QUOTES") {
    const books = await siblingBookNames(bookOfRef(data.refs[0]) ?? "");
    for (const ref of data.refs) {
      const answer = bookOfRef(ref);
      const text = await verseTextByRef(ref);
      if (!answer || !text) continue;
      const pool = books.length >= 4 ? books : data.refs.map((r) => bookOfRef(r) ?? "").filter(Boolean);
      const others = shuffle([...new Set(pool)].filter((b) => b !== answer)).slice(0, 3);
      entries.push({ text, image: null, answer, options: shuffle([answer, ...others]) });
    }
  } else {
    const stories = data.stories
      .map((s) => ({ story: kidsStory(s.number), image: s.image }))
      .filter((s): s is { story: { title: string; images: string[] }; image: number } => Boolean(s.story?.images[s.image]));
    for (const { story, image } of stories) {
      const others = shuffle(stories.map((s) => s.story.title).filter((t) => t !== story.title)).slice(0, 3);
      entries.push({ text: null, image: story.images[image], answer: story.title, options: shuffle([story.title, ...others]) });
    }
  }
  return { id, variant: data.variant, entries };
}

async function startGame(room: Room): Promise<string | null> {
  const contestants = buildContestants(room);
  if (typeof contestants === "string") return contestants;
  const n = contestants.length;
  const full = room.length === "FULL";

  await ensureAlleskennerContent();
  const everyone = [...room.participants.keys()];
  const listen = await pickItems("QUESTION", 1, everyone, (d) => Boolean(d.listen));
  const normal = await pickItems("QUESTION", QUESTIONS_369 - listen.length, everyone, (d) => !d.listen);
  if (normal.length + listen.length < 3) return "Er zijn nog te weinig vragen om te spelen.";
  const questions = [...normal];
  // De luistervraag nooit als eerste: dan is iedereen er nog niet klaar voor.
  if (listen[0]) questions.splice(1 + Math.floor(Math.random() * Math.max(1, questions.length - 1)), 0, listen[0]);

  const puzzles = await pickItems("PUZZLE", n, everyone);
  const topics = await pickItems("TOPIC", (full ? n : 0) + FINALE_TOPICS, everyone, (d) => d.answers.length >= FINALE_ANSWERS);
  // Open Deur krijgt één onderwerp per deelnemer, maar de finale gaat voor:
  // die houdt er altijd minstens drie over.
  const doorCount = full ? Math.min(n, Math.max(0, topics.length - 3)) : 0;
  const doors = topics.slice(0, doorCount);
  const finaleTopics = topics.slice(doorCount, doorCount + FINALE_TOPICS);
  if (finaleTopics.length === 0) return "Er zijn nog geen onderwerpen voor de finale.";
  const galleries = full ? await pickItems("GALLERY", n, everyone) : [];
  const memories = full ? await pickItems("MEMORY", n, everyone) : [];

  await markSeen([...questions, ...puzzles, ...doors, ...finaleTopics, ...galleries, ...memories].map((i) => i.id), everyone);

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
    picks: new Map(),
  };
  room.openDeur = {
    ...emptyGridRound(
      doors.map((t) => gridItem(t.id, t.data.subject, t.data.answers, t.data.distractors, OPEN_DEUR_ANSWERS, OPEN_DEUR_GRID_SIZE))
    ),
    owners: [],
    taken: doors.map(() => false),
    choosing: false,
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
    picks: new Map(),
    guesses: new Map(),
  };
  const galleryItems = (await Promise.all(galleries.map((g) => buildGallery(g.id, g.data)))).filter((g) => g.entries.length > 0);
  room.gallery = {
    items: galleryItems,
    index: -1,
    owners: [],
    found: [],
    queue: [],
    turnEntries: [],
    turnPos: 0,
    revealed: false,
    picks: new Map(),
  };
  const memoryItems: GridItem[] = [];
  for (const m of memories) {
    const verses = await passageVerses(m.data.passage);
    if (verses.length === 0) continue;
    memoryItems.push({
      ...gridItem(m.id, m.data.title, m.data.answers, m.data.distractors, MEMORY_ANSWERS, GRID_SIZE),
      passage: m.data.passage,
      verses,
    });
  }
  room.memory = { ...emptyGridRound(memoryItems), owners: [], reading: false };
  room.finale = {
    ...emptyGridRound(
      finaleTopics.map((t) => gridItem(t.id, t.data.subject, t.data.answers, t.data.distractors, FINALE_ANSWERS, GRID_SIZE))
    ),
    finalists: [contestants[0].id, contestants[1].id],
  };

  room.contestants = contestants;
  room.seconds = new Map(contestants.map((c) => [c.id, AK_START_SECONDS]));
  room.personal = new Map();
  // Rondes zonder inhoud (bv. nog geen galerijen in de database) vallen weg.
  room.rounds = AK_ROUNDS[room.length].filter(
    (phase) =>
      (phase !== "OPEN_DEUR" || room.openDeur!.items.length > 0) &&
      (phase !== "PUZZLE" || room.puzzle!.items.length > 0) &&
      (phase !== "GALLERY" || room.gallery!.items.length > 0) &&
      (phase !== "MEMORY" || room.memory!.items.length > 0)
  );
  room.roundIndex = -1;
  nextRound(room);

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

const ROUND_SUBTITLES: Partial<Record<AkPhase, string>> = {
  R369: `Iedereen begint met ${AK_START_SECONDS} seconden. Punten bij vraag 3, 6, 9, 12 en 15.`,
  OPEN_DEUR: `Wie de minste seconden heeft, kiest als eerste een onderwerp. Vier antwoorden, elk +${AK_OPEN_DEUR_POINTS} seconden. Je klok loopt.`,
  PUZZLE: `Vind de drie groepen van vier. Elke groep +${AK_PUZZLE_POINTS} seconden. Je klok loopt.`,
  GALLERY: `Noem bij elk citaat het boek, of bij elke illustratie het verhaal. Elk goed antwoord +${AK_GALLERY_POINTS} seconden.`,
  MEMORY: `Lees de passage goed: je hebt ${AK_MEMORY_READ_MS / 1000} seconden. Daarna vijf antwoorden, elk volgend antwoord is meer waard.`,
};

function nextRound(room: Room) {
  room.roundIndex++;
  room.activeId = null;
  room.clockRunning = false;
  room.turnDeadline = null;
  const phase = room.rounds[room.roundIndex];
  if (!phase) {
    finish(room, byMostSeconds(room, contestantIds(room))[0] ?? null);
    return;
  }
  if (phase === "FINALE") {
    beginFinale(room);
    return;
  }
  room.phase = phase;
  room.intermission = {
    title: `Ronde ${room.roundIndex + 1}: ${AK_ROUND_TITLES[phase]}`,
    subtitle: ROUND_SUBTITLES[phase] ?? "",
    standings: room.roundIndex > 0,
  };
  schedule(room, INTERMISSION_MS, () => {
    room.intermission = null;
    if (phase === "R369") {
      room.activeId = room.contestants[0].id;
      ask369(room);
    } else if (phase === "OPEN_DEUR") nextDoor(room);
    else if (phase === "PUZZLE") nextPuzzle(room);
    else if (phase === "GALLERY") nextGallery(room);
    else if (phase === "MEMORY") nextMemory(room);
  });
}

// --- 3-6-9 ----------------------------------------------------------------------

function ask369(room: Room) {
  if (!room.r369) return;
  room.r369.reveal = null;
  room.r369.picks = new Map();
  room.clockRunning = false;
  room.turnDeadline = Date.now() + AK_369_THINK_MS;
}

function answer369(room: Room, correct: boolean, note?: string) {
  const state = room.r369;
  const active = room.activeId;
  if (!state || state.reveal || !active) return;
  const number = state.index + 1;
  const answer = state.items[state.index].data.answer;
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
  // Persoonlijke punten: de keuze van de teamleider is het teamantwoord.
  const leader = leaderOfActive(room);
  if (leader) addPersonal(room, leader, correct ? 1 : 0);
  for (const [userId, pick] of state.picks) {
    if (userId !== leader && pick === answer) addPersonal(room, userId, 1);
  }
  schedule(room, REVEAL_369_MS, () => {
    state.index++;
    if (state.index >= state.items.length) {
      nextRound(room);
      return;
    }
    if (!correct) room.activeId = nextInOrder(room, active);
    ask369(room);
  });
}

function nextInOrder(room: Room, id: string): string {
  const index = orderIndex(room, id);
  return room.contestants[(index + 1) % room.contestants.length].id;
}

// --- Gedeelde beurtlogica (Open Deur, Collectief Geheugen, Finale) --------------

function startGridItem(room: Room, round: GridRound, index: number, queue: string[]) {
  round.index = index;
  round.found = round.items[index].answers.map(() => false);
  round.foundOrder = [];
  round.wrong = new Set();
  round.revealed = false;
  round.picks = new Map();
  round.queue = queue;
  startGridTurn(room, round);
}

function startGridTurn(room: Room, round: GridRound) {
  // Wie geen seconden meer heeft, slaat zijn beurt over (behalve in de finale:
  // daar is 0 seconden al het einde van het spel).
  let next = round.queue.shift();
  while (next && room.phase !== "FINALE" && secondsOf(room, next) <= 0) next = round.queue.shift();
  if (!next) {
    revealGrid(room, round);
    return;
  }
  room.activeId = next;
  room.clockRunning = true;
  room.turnDeadline = null;
}

function gridFound(room: Room, round: GridRound, index: number) {
  const active = room.activeId;
  if (!active || round.revealed || round.found[index] === undefined || round.found[index]) return;
  round.found[index] = true;
  const text = round.items[round.index].answers[index].text;
  const leader = leaderOfActive(room);
  if (leader) {
    const picks = round.picks.get(leader) ?? new Set<string>();
    picks.add(text);
    round.picks.set(leader, picks);
  }

  if (room.phase === "FINALE" && room.finale) {
    round.foundOrder.push({ index, value: AK_FINALE_PENALTY });
    const [a, b] = room.finale.finalists;
    const opponent = active === a ? b : a;
    addSeconds(room, opponent, -AK_FINALE_PENALTY);
    feedback(room, active, `Goed! ${contestantName(room, opponent)} −${AK_FINALE_PENALTY} seconden`, "good");
    if (secondsOf(room, opponent) <= 0) {
      finish(room, active);
      return;
    }
  } else {
    const value = room.phase === "MEMORY" ? (round.foundOrder.length + 1) * AK_MEMORY_STEP : AK_OPEN_DEUR_POINTS;
    round.foundOrder.push({ index, value });
    addSeconds(room, active, value);
    feedback(room, active, `${text}! +${value} seconden`, "good");
  }
  if (round.found.every(Boolean)) endGridTurn(room, round);
}

function gridWrong(room: Room, round: GridRound, text: string) {
  const active = room.activeId;
  if (!active) return;
  round.wrong.add(text);
  const leader = leaderOfActive(room);
  if (leader) {
    const picks = round.picks.get(leader) ?? new Set<string>();
    picks.add(text);
    round.picks.set(leader, picks);
  }
  feedback(room, active, "Fout! De beurt is voorbij", "bad");
  endGridTurn(room, round);
}

function endGridTurn(room: Room, round: GridRound) {
  if (room.pending || round.revealed) return;
  room.clockRunning = false;
  room.activeId = null;
  if (!round.found.every(Boolean) && round.queue.length > 0) {
    schedule(room, BETWEEN_TURNS_MS, () => startGridTurn(room, round));
    return;
  }
  revealGrid(room, round);
}

function revealGrid(room: Room, round: GridRound) {
  room.clockRunning = false;
  room.activeId = null;
  round.revealed = true;
  const answers = new Set(round.items[round.index].answers.map((a) => a.text));
  for (const [userId, picks] of round.picks) {
    addPersonal(room, userId, [...picks].filter((t) => answers.has(t)).length);
  }
  schedule(room, REVEAL_ROUND_ITEM_MS, () => {
    if (room.phase === "OPEN_DEUR") nextDoor(room);
    else if (room.phase === "MEMORY") {
      // Tussenstand na elk fragment.
      room.intermission = { title: "Tussenstand", subtitle: standingsText(room), standings: true };
      schedule(room, STANDINGS_MS, () => {
        room.intermission = null;
        nextMemory(room);
      });
    } else if (room.phase === "FINALE") nextTopic(room);
  });
}

function silentGridPick(room: Room, round: GridRound, userId: string, text: string, answerCount: number) {
  const item = round.items[round.index];
  if (round.revealed || !item.grid.includes(text) || round.wrong.has(text)) return;
  const answerIndex = item.answers.findIndex((a) => a.text === text);
  if (answerIndex >= 0 && round.found[answerIndex]) return;
  const picks = round.picks.get(userId) ?? new Set<string>();
  if (picks.has(text)) picks.delete(text);
  else if (picks.size < answerCount) picks.add(text);
  round.picks.set(userId, picks);
}

// --- Open Deur -----------------------------------------------------------------

function nextDoor(room: Room) {
  const state = room.openDeur!;
  const waiting = contestantIds(room).filter((id) => !state.owners.includes(id));
  const free = state.taken.filter((t) => !t).length;
  if (waiting.length === 0 || free === 0) {
    nextRound(room);
    return;
  }
  const chooser = byFewestSeconds(room, waiting)[0];
  state.owners.push(chooser);
  state.choosing = true;
  state.index = -1;
  state.revealed = false;
  room.activeId = chooser;
  room.clockRunning = false;
  room.turnDeadline = Date.now() + CHOOSE_DOOR_MS;
  // De laatste deur hoeft niet gekozen te worden.
  if (free === 1) chooseDoor(room, state.taken.findIndex((t) => !t));
}

function chooseDoor(room: Room, door: number) {
  const state = room.openDeur;
  if (!state || !state.choosing || door < 0 || state.taken[door] !== false || !room.activeId) return;
  const owner = room.activeId;
  state.taken[door] = true;
  state.choosing = false;
  // Onderwerp meteen tonen; de beurt begint na een korte pauze.
  state.index = door;
  state.found = state.items[door].answers.map(() => false);
  state.foundOrder = [];
  state.wrong = new Set();
  state.picks = new Map();
  room.turnDeadline = null;
  feedback(room, owner, `Kiest: ${state.items[door].subject}`, "info");
  room.activeId = null;
  schedule(room, BETWEEN_TURNS_MS, () =>
    startGridItem(room, state, door, [owner, ...byFewestSeconds(room, contestantIds(room).filter((id) => id !== owner))])
  );
}

// --- Puzzel --------------------------------------------------------------------

function nextPuzzle(room: Room) {
  const state = room.puzzle!;
  state.index++;
  if (state.index >= state.items.length) {
    nextRound(room);
    return;
  }
  const candidates = contestantIds(room).filter((id) => !state.owners.includes(id));
  const owner = byFewestSeconds(room, candidates.length > 0 ? candidates : contestantIds(room))[0];
  state.owners.push(owner);
  state.found = [false, false, false];
  state.revealed = false;
  state.picks = new Map();
  state.guesses = new Map();
  state.queue = [owner, ...byFewestSeconds(room, contestantIds(room).filter((id) => id !== owner))];
  startPuzzleTurn(room, state.queue.shift()!);
}

function startPuzzleTurn(room: Room, id: string) {
  room.activeId = id;
  room.clockRunning = secondsOf(room, id) > 0;
  room.turnDeadline = Date.now() + AK_PUZZLE_TURN_MS;
  if (!room.clockRunning) endPuzzleTurn(room);
}

function puzzleFound(room: Room, group: number) {
  const state = room.puzzle;
  const active = room.activeId;
  if (!state || !active || state.revealed || state.found[group] === undefined || state.found[group]) return;
  state.found[group] = true;
  addSeconds(room, active, AK_PUZZLE_POINTS);
  const leader = leaderOfActive(room);
  if (leader) {
    const picks = state.picks.get(leader) ?? new Set<number>();
    picks.add(group);
    state.picks.set(leader, picks);
  }
  feedback(room, active, `${state.items[state.index].data.groups[group].answer}! +${AK_PUZZLE_POINTS} seconden`, "good");
  if (state.found.every(Boolean)) endPuzzleTurn(room);
}

function endPuzzleTurn(room: Room) {
  const state = room.puzzle;
  if (!state || room.pending || state.revealed) return;
  room.clockRunning = false;
  room.turnDeadline = null;
  const done = state.found.every(Boolean);
  const next = done ? undefined : state.queue.shift();
  room.activeId = null;
  if (next) {
    schedule(room, BETWEEN_TURNS_MS, () => startPuzzleTurn(room, next));
    return;
  }
  state.revealed = true;
  for (const [userId, groups] of state.picks) addPersonal(room, userId, groups.size);
  schedule(room, REVEAL_ROUND_ITEM_MS, () => nextPuzzle(room));
}

// --- Galerij -------------------------------------------------------------------

function nextGallery(room: Room) {
  const state = room.gallery!;
  const waiting = contestantIds(room).filter((id) => !state.owners.includes(id));
  state.index++;
  if (state.index >= state.items.length || waiting.length === 0) {
    nextRound(room);
    return;
  }
  const owner = byFewestSeconds(room, waiting)[0];
  state.owners.push(owner);
  state.found = state.items[state.index].entries.map(() => false);
  state.revealed = false;
  state.picks = new Map();
  state.queue = [owner, ...byFewestSeconds(room, contestantIds(room).filter((id) => id !== owner))];
  startGalleryTurn(room);
}

function startGalleryTurn(room: Room) {
  const state = room.gallery!;
  let next = state.queue.shift();
  while (next && secondsOf(room, next) <= 0) next = state.queue.shift();
  const open = state.found.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
  if (!next || open.length === 0) {
    revealGallery(room);
    return;
  }
  state.turnEntries = open;
  state.turnPos = 0;
  room.activeId = next;
  room.clockRunning = true;
}

/** Antwoord op het onderdeel dat nu in beeld is; fout of passen = volgende. */
function galleryAnswer(room: Room, correct: boolean) {
  const state = room.gallery;
  const active = room.activeId;
  if (!state || !active || state.revealed) return;
  const entryIndex = state.turnEntries[state.turnPos];
  if (entryIndex === undefined) return;
  const entry = state.items[state.index].entries[entryIndex];
  const leader = leaderOfActive(room);
  if (leader) {
    const picks = state.picks.get(leader) ?? new Map<number, string>();
    picks.set(entryIndex, correct ? entry.answer : "");
    state.picks.set(leader, picks);
  }
  if (correct) {
    state.found[entryIndex] = true;
    addSeconds(room, active, AK_GALLERY_POINTS);
    feedback(room, active, `${entry.answer}! +${AK_GALLERY_POINTS} seconden`, "good");
  }
  state.turnPos++;
  if (state.turnPos >= state.turnEntries.length || state.found.every(Boolean)) endGalleryTurn(room);
}

function endGalleryTurn(room: Room) {
  const state = room.gallery;
  if (!state || room.pending || state.revealed) return;
  room.clockRunning = false;
  room.activeId = null;
  if (!state.found.every(Boolean) && state.queue.length > 0) {
    schedule(room, BETWEEN_TURNS_MS, () => startGalleryTurn(room));
    return;
  }
  revealGallery(room);
}

function revealGallery(room: Room) {
  const state = room.gallery!;
  room.clockRunning = false;
  room.activeId = null;
  state.revealed = true;
  const entries = state.items[state.index].entries;
  for (const [userId, picks] of state.picks) {
    addPersonal(room, userId, [...picks].filter(([i, pick]) => entries[i]?.answer === pick).length);
  }
  schedule(room, REVEAL_ROUND_ITEM_MS + 2000, () => nextGallery(room));
}

// --- Collectief Geheugen ---------------------------------------------------------

function nextMemory(room: Room) {
  const state = room.memory!;
  const waiting = contestantIds(room).filter((id) => !state.owners.includes(id));
  const index = state.index + 1;
  if (index >= state.items.length || waiting.length === 0) {
    nextRound(room);
    return;
  }
  const owner = byFewestSeconds(room, waiting)[0];
  state.owners.push(owner);
  state.index = index;
  state.found = state.items[index].answers.map(() => false);
  state.foundOrder = [];
  state.wrong = new Set();
  state.revealed = false;
  state.picks = new Map();
  state.queue = [];
  state.reading = true;
  room.activeId = null;
  room.clockRunning = false;
  room.turnDeadline = Date.now() + AK_MEMORY_READ_MS;
}

function startMemoryAnswering(room: Room) {
  const state = room.memory!;
  state.reading = false;
  room.turnDeadline = null;
  const owner = state.owners[state.owners.length - 1];
  startGridItem(room, state, state.index, [owner, ...byFewestSeconds(room, contestantIds(room).filter((id) => id !== owner))]);
}

// --- Finale -------------------------------------------------------------------

function beginFinale(room: Room) {
  const state = room.finale!;
  const ranked = byMostSeconds(room, contestantIds(room));
  state.finalists = [ranked[0], ranked[1]];
  room.phase = "FINALE";
  room.activeId = null;
  room.clockRunning = false;
  room.intermission = {
    title: "Finale",
    subtitle: `${contestantName(room, ranked[0])} tegen ${contestantName(room, ranked[1])}. Elk goed antwoord kost je tegenstander ${AK_FINALE_PENALTY} seconden.`,
    standings: true,
  };
  schedule(room, INTERMISSION_MS + 1000, () => {
    room.intermission = null;
    nextTopic(room);
  });
}

function nextTopic(room: Room) {
  const state = room.finale!;
  const index = state.index + 1;
  if (index >= state.items.length) {
    const [a, b] = state.finalists;
    finish(room, secondsOf(room, a) >= secondsOf(room, b) ? a : b);
    return;
  }
  startGridItem(room, state, index, byFewestSeconds(room, state.finalists));
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
  for (const contestant of room.contestants) {
    for (const userId of contestant.members) {
      prisma.liveGamePlayer
        .updateMany({ where: { gameId: room.gameId, userId }, data: { score: Math.round(secondsOf(room, contestant.id)) } })
        .catch(() => {});
    }
  }
  setTimeout(() => {
    if (rooms.get(room.code) === room) rooms.delete(room.code);
  }, ROOM_TTL_AFTER_FINISH_MS);
}

// --- Lobby: teams -----------------------------------------------------------------

/** Elke speler in een team, elk team een leider die er ook echt in zit. */
function normalizeTeams(room: Room) {
  if (!room.teamMode) return;
  const players = lobbyPlayers(room);
  const count = room.lobbyTeams.length;
  const sizes = Array.from({ length: count }, (_, i) => players.filter((p) => p.team === i).length);
  for (const p of players) {
    if (p.team !== null && p.team < count) continue;
    const smallest = sizes.indexOf(Math.min(...sizes));
    p.team = smallest;
    sizes[smallest]++;
  }
  for (const p of room.participants.values()) if (p.role !== "player") p.team = null;
  room.lobbyTeams.forEach((team, index) => {
    const members = players.filter((p) => p.team === index);
    if (!members.some((m) => m.userId === team.leaderId)) team.leaderId = members[0]?.userId ?? null;
  });
}

function setTeamCount(room: Room, count: number) {
  if (count === 0) {
    room.teamMode = false;
    room.lobbyTeams = [];
    for (const p of room.participants.values()) p.team = null;
    return;
  }
  room.teamMode = true;
  room.lobbyTeams = Array.from({ length: count }, () => ({ leaderId: null }));
  // Opnieuw eerlijk verdelen, om en om.
  lobbyPlayers(room).forEach((p, i) => (p.team = i % count));
  normalizeTeams(room);
}

// --- Aanmelden ----------------------------------------------------------------

// Een kamer wordt maar één keer opgebouwd, ook als meerdere spelers
// tegelijk binnenkomen: anders maakt ieder zijn eigen kamer aan en
// overschrijft de laatste de rest.
const loadingRooms = new Map<string, Promise<Room | string>>();

async function loadRoom(code: string): Promise<Room | string> {
  const game = await prisma.liveGame.findUnique({ where: { code }, select: { id: true, hostId: true, mode: true, status: true } });
  if (!game || game.mode !== "ALLESKENNER") return "Dit spel bestaat niet (meer).";
  if (game.status !== "LOBBY") return "Dit spel is al afgelopen.";
  const host = await prisma.user.findUnique({ where: { id: game.hostId }, select: { handle: true } });
  const room: Room = {
    code,
    gameId: game.id,
    hostId: game.hostId,
    quizmasterId: game.hostId,
    participants: new Map([
      [game.hostId, { userId: game.hostId, name: host?.handle ?? "Host", role: "quizmaster" as AkRole, team: null }],
    ]),
    sockets: new Map(),
    length: "SHORT",
    teamMode: false,
    lobbyTeams: [],
    phase: "LOBBY",
    rounds: [],
    roundIndex: -1,
    contestants: [],
    seconds: new Map(),
    personal: new Map(),
    activeId: null,
    clockRunning: false,
    turnDeadline: null,
    intermission: null,
    pending: null,
    r369: null,
    openDeur: null,
    puzzle: null,
    gallery: null,
    memory: null,
    finale: null,
    winnerId: null,
    feedback: null,
    starting: false,
    lastTick: Date.now(),
    lastBroadcast: 0,
    timer: null,
  };
  rooms.set(code, room);
  return room;
}

async function joinRoom(socket: Socket, user: { id: string; handle: string }, code: string): Promise<Room | string> {
  const upper = code.toUpperCase();
  let room = rooms.get(upper);
  if (!room) {
    let loading = loadingRooms.get(upper);
    if (!loading) {
      loading = loadRoom(upper).finally(() => loadingRooms.delete(upper));
      loadingRooms.set(upper, loading);
    }
    const loaded = await loading;
    if (typeof loaded === "string") return loaded;
    room = loaded;
  }

  if (!room.participants.has(user.id)) {
    room.participants.set(user.id, {
      userId: user.id,
      name: user.handle,
      role: room.phase === "LOBBY" ? "player" : "spectator",
      team: null,
    });
    normalizeTeams(room);
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
    if (!room || room.hostId !== user.id || room.phase !== "LOBBY" || room.starting) return null;
    return room;
  };

  socket.on("ak:set_role", ({ userId, role }: { userId?: unknown; role?: unknown }) => {
    const room = hostInLobby();
    if (!room || typeof userId !== "string" || (role !== "player" && role !== "spectator")) return;
    const participant = room.participants.get(userId);
    if (!participant) return;
    if (room.quizmasterId === userId) room.quizmasterId = null;
    participant.role = role;
    participant.team = null;
    normalizeTeams(room);
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
    normalizeTeams(room);
    broadcast(room);
  });

  socket.on("ak:set_length", ({ length }: { length?: unknown }) => {
    const room = hostInLobby();
    if (!room || (length !== "SHORT" && length !== "FULL")) return;
    room.length = length;
    broadcast(room);
  });

  socket.on("ak:set_teams", ({ count }: { count?: unknown }) => {
    const room = hostInLobby();
    if (!room || typeof count !== "number" || !Number.isInteger(count)) return;
    if (count !== 0 && (count < 2 || count > AK_MAX_TEAMS)) return;
    if (count > 0 && lobbyPlayers(room).length < AK_MIN_TEAM_PLAYERS) {
      fail(`Teams kan vanaf ${AK_MIN_TEAM_PLAYERS} spelers.`);
      return;
    }
    setTeamCount(room, count);
    broadcast(room);
  });

  socket.on("ak:set_team", ({ userId, team }: { userId?: unknown; team?: unknown }) => {
    const room = hostInLobby();
    if (!room || !room.teamMode || typeof userId !== "string" || typeof team !== "number") return;
    const participant = room.participants.get(userId);
    if (!participant || participant.role !== "player" || team < 0 || team >= room.lobbyTeams.length) return;
    participant.team = team;
    normalizeTeams(room);
    broadcast(room);
  });

  socket.on("ak:set_leader", ({ userId }: { userId?: unknown }) => {
    const room = hostInLobby();
    if (!room || !room.teamMode || typeof userId !== "string") return;
    const participant = room.participants.get(userId);
    if (!participant || participant.team === null) return;
    room.lobbyTeams[participant.team].leaderId = userId;
    broadcast(room);
  });

  socket.on("ak:start", async () => {
    const room = hostInLobby();
    // Starten kiest en registreert inhoud (async): een tweede tik mag niet
    // intussen een tweede start beginnen.
    if (!room) return;
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

  // Tijdens het spel. Tikken en passen alleen door wie namens de deelnemer
  // aan de beurt handelt; beoordelen alleen door de quizmaster; stil
  // meekiezen door de andere teamspelers.
  const activeRoom = (): Room | null => {
    const room = current();
    if (!room || room.pending || room.intermission) return null;
    return room;
  };
  const isQuizmaster = (room: Room) => room.quizmasterId === user.id;

  socket.on("ak:pass", () => {
    const room = activeRoom();
    if (!room || !room.activeId) return;
    if (!(isQuizmaster(room) || leaderOfActive(room) === user.id)) return;
    if (room.phase === "GALLERY") galleryAnswer(room, false);
    else if (room.phase === "OPEN_DEUR" && room.openDeur?.choosing) return;
    else endTurn(room);
    broadcast(room);
  });

  socket.on("ak:tap_369", ({ option }: { option?: unknown }) => {
    const room = activeRoom();
    if (!room || room.phase !== "R369" || typeof option !== "string" || !room.r369 || room.r369.reveal) return;
    const current369 = room.r369.items[room.r369.index];
    if (!current369.data.options.includes(option)) return;
    const kind = actorKind(room, user.id);
    if (kind === "team") {
      room.r369.picks.set(user.id, option);
      answer369(room, option === current369.data.answer);
    } else if (kind === "silent") {
      room.r369.picks.set(user.id, option);
    }
    broadcast(room);
  });

  socket.on("ak:type_puzzle", ({ text }: { text?: unknown }) => {
    const room = activeRoom();
    if (!room || room.phase !== "PUZZLE" || typeof text !== "string" || !room.puzzle || room.puzzle.revealed) return;
    const state = room.puzzle;
    const guess = text.trim().slice(0, 40);
    if (!guess) return;
    const kind = actorKind(room, user.id);
    const group = state.items[state.index].data.groups.findIndex(
      (g, i) => !state.found[i] && answerMatches(guess, [g.answer, ...g.accept])
    );
    if (kind === "team") {
      if (group >= 0) puzzleFound(room, group);
      else feedback(room, room.activeId, `"${guess}" is niet goed`, "bad");
    } else if (kind === "silent") {
      const guesses = state.guesses.get(user.id) ?? [];
      if (guesses.length >= PUZZLE_SILENT_GUESSES) return;
      state.guesses.set(user.id, [...guesses, guess]);
      if (group >= 0) {
        const picks = state.picks.get(user.id) ?? new Set<number>();
        picks.add(group);
        state.picks.set(user.id, picks);
      }
    }
    broadcast(room);
  });

  const gridRoundFor = (room: Room): { round: GridRound; count: number } | null => {
    if (room.phase === "OPEN_DEUR" && room.openDeur && !room.openDeur.choosing && room.openDeur.index >= 0)
      return { round: room.openDeur, count: OPEN_DEUR_ANSWERS };
    if (room.phase === "MEMORY" && room.memory && !room.memory.reading) return { round: room.memory, count: MEMORY_ANSWERS };
    if (room.phase === "FINALE" && room.finale && room.finale.index >= 0) return { round: room.finale, count: FINALE_ANSWERS };
    return null;
  };

  socket.on("ak:tap_grid", ({ text }: { text?: unknown }) => {
    const room = activeRoom();
    if (!room || typeof text !== "string") return;
    const grid = gridRoundFor(room);
    if (!grid || grid.round.revealed) return;
    const { round, count } = grid;
    const item = round.items[round.index];
    if (!item.grid.includes(text)) return;
    const kind = actorKind(room, user.id);
    if (kind === "team") {
      const index = item.answers.slice(0, count).findIndex((a) => a.text === text);
      if (index >= 0) gridFound(room, round, index);
      else if (!round.wrong.has(text)) gridWrong(room, round, text);
    } else if (kind === "silent") {
      silentGridPick(room, round, user.id, text, count);
    }
    broadcast(room);
  });

  socket.on("ak:tap_gallery", ({ option }: { option?: unknown }) => {
    const room = activeRoom();
    if (!room || room.phase !== "GALLERY" || typeof option !== "string" || !room.gallery || room.gallery.revealed) return;
    const state = room.gallery;
    const entryIndex = state.turnEntries[state.turnPos];
    const entry = entryIndex === undefined ? null : state.items[state.index].entries[entryIndex];
    if (!entry || !entry.options.includes(option)) return;
    const kind = actorKind(room, user.id);
    if (kind === "team") {
      galleryAnswer(room, option === entry.answer);
    } else if (kind === "silent") {
      const picks = state.picks.get(user.id) ?? new Map<number, string>();
      picks.set(entryIndex, option);
      state.picks.set(user.id, picks);
    }
    broadcast(room);
  });

  socket.on("ak:choose_door", ({ index }: { index?: unknown }) => {
    const room = activeRoom();
    if (!room || room.phase !== "OPEN_DEUR" || typeof index !== "number") return;
    if (!(isQuizmaster(room) || leaderOfActive(room) === user.id)) return;
    chooseDoor(room, index);
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

  socket.on("ak:qm_answer", ({ index }: { index?: unknown }) => {
    const room = activeRoom();
    if (!room || !isQuizmaster(room) || typeof index !== "number") return;
    const grid = gridRoundFor(room);
    if (!grid || index < 0 || index >= grid.count) return;
    gridFound(room, grid.round, index);
    broadcast(room);
  });

  socket.on("ak:qm_gallery", ({ correct }: { correct?: unknown }) => {
    const room = activeRoom();
    if (!room || !isQuizmaster(room) || room.phase !== "GALLERY" || typeof correct !== "boolean") return;
    galleryAnswer(room, correct);
    broadcast(room);
  });
}
