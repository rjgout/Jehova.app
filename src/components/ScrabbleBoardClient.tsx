"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const BOARD_SIZE = 15;
const CENTER = 7;
const BLANK = "?";

type SquareType = "NORMAL" | "DL" | "TL" | "DW" | "TW";

// Zelfde indeling als src/lib/scrabble/board.ts — hier los gehouden zodat
// deze client-component geen server-only module hoeft te importeren.
function buildLayout(): SquareType[][] {
  const grid: SquareType[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => "NORMAL" as SquareType)
  );
  const set = (cells: [number, number][], type: SquareType) => {
    for (const [r, c] of cells) grid[r][c] = type;
  };
  set(
    [
      [0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14],
    ],
    "TW"
  );
  set(
    [
      [1, 1], [2, 2], [3, 3], [4, 4], [1, 13], [2, 12], [3, 11], [4, 10],
      [13, 1], [12, 2], [11, 3], [10, 4], [13, 13], [12, 12], [11, 11], [10, 10], [7, 7],
    ],
    "DW"
  );
  set([[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]], "TL");
  set(
    [
      [0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12],
      [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11],
    ],
    "DL"
  );
  return grid;
}
const LAYOUT = buildLayout();

const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 5, D: 2, E: 1, F: 4, G: 3, H: 4, I: 1, J: 4, K: 3, L: 3, M: 3, N: 1, O: 1, P: 3,
  Q: 10, R: 2, S: 2, T: 2, U: 4, V: 4, W: 5, X: 8, Y: 8, Z: 4, [BLANK]: 0,
};

const SQUARE_LABEL: Record<SquareType, string> = { NORMAL: "", DL: "2L", TL: "3L", DW: "2W", TW: "3W" };
const SQUARE_CLASS: Record<SquareType, string> = {
  NORMAL: "bg-emerald-50 dark:bg-slate-800",
  DL: "bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200",
  TL: "bg-blue-400 dark:bg-blue-800 text-white",
  DW: "bg-pink-200 dark:bg-pink-900 text-pink-800 dark:text-pink-200",
  TW: "bg-red-400 dark:bg-red-800 text-white",
};

interface BoardCell {
  letter: string;
  isBlank: boolean;
}
type ServerBoard = (BoardCell | null)[][];

interface Pending {
  row: number;
  col: number;
  letter: string;
  isBlank: boolean;
  rackIndex: number;
}

interface MoveView {
  id: string;
  playerName: string;
  isMine: boolean;
  type: "PLACE" | "EXCHANGE" | "PASS" | "FORFEIT";
  wordsFormed: string[];
  score: number;
  createdAt: string;
}

interface GameState {
  id: string;
  status: "PENDING" | "DECLINED" | "ACTIVE" | "FINISHED";
  board: ServerBoard;
  myRack: string[];
  opponentRackCount: number;
  bagCount: number;
  myScore: number;
  opponentScore: number;
  myHintCredits: number;
  isMyTurn: boolean;
  opponent: { id: string; displayName: string };
  won: boolean | null;
  tied: boolean | null;
  moves: MoveView[];
  myTileKeys: string[];
  recentTileKeys: string[];
}

const FLASH_DURATION_MS = 2800;

export default function ScrabbleBoardClient({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeIndices, setExchangeIndices] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hintIndices, setHintIndices] = useState<number[]>([]);
  const [hintSecondsLeft, setHintSecondsLeft] = useState(0);
  // Laatst gelegde tegels lichten op bij binnenkomst, en opnieuw zodra er
  // (via de polling hieronder) een nieuwe zet binnenkomt.
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const lastRecentSignature = useRef<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `resetLocalState` staat standaard aan (initieel laden, en na je eigen
  // zet/wissel/pas — dan IS de lokale selectie/plaatsing achterhaald). De
  // achtergrond-polling hieronder geeft bewust `false` mee: anders werd een
  // net neergelegd (nog niet verzonden) woord om de 8 seconden weer van het
  // bord geveegd, ruim voordat je 'm kon afronden of indienen.
  const load = useCallback(async (resetLocalState = true) => {
    const res = await fetch(`/api/scrabble/${gameId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setLoadError(body.error ?? "Kon het spel niet laden.");
      return;
    }
    const data: GameState = await res.json();
    setGame(data);
    const signature = (data.recentTileKeys ?? []).join("|");
    if (signature && signature !== lastRecentSignature.current) {
      lastRecentSignature.current = signature;
      setFlashKeys(new Set(data.recentTileKeys));
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashKeys(new Set()), FLASH_DURATION_MS);
    }
    if (resetLocalState) {
      setPending([]);
      setSelectedRackIndex(null);
      setExchangeMode(false);
      setExchangeIndices([]);
      setHintIndices([]);
      setHintSecondsLeft(0);
    }
  }, [gameId]);

  // Telt de 10 seconden af waarin de hint zichtbaar blijft; daarna
  // verdwijnt de highlight vanzelf weer (de knop blijft verder gewoon
  // bruikbaar zodra er weer tegoed is).
  useEffect(() => {
    if (hintSecondsLeft <= 0) {
      if (hintIndices.length > 0) setHintIndices([]);
      return;
    }
    const t = setTimeout(() => setHintSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [hintSecondsLeft, hintIndices.length]);

  useEffect(() => {
    load();
    // Lichte polling: dit is een asynchroon (niet realtime) spel, maar als
    // beide spelers toevallig tegelijk kijken, wil je elkaars zet wel zonder
    // handmatig verversen zien verschijnen. Laat je eigen, nog niet
    // ingediende plaatsing/selectie met rust (zie hierboven).
    const interval = setInterval(() => load(false), 8000);
    return () => {
      clearInterval(interval);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [load]);

  if (loadError) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{loadError}</p>
        <Link href="/scrabble" className="btn-secondary self-center">
          Terug naar woordspellen
        </Link>
      </div>
    );
  }
  if (!game) return <p className="text-slate-400 dark:text-slate-500 text-center">Laden...</p>;

  const usedRackIndices = new Set(pending.map((p) => p.rackIndex));
  const pendingByCell = new Map(pending.map((p) => [`${p.row},${p.col}`, p]));
  const myTiles = new Set(game.myTileKeys ?? []);

  function pickRackTile(index: number) {
    if (usedRackIndices.has(index) || exchangeMode) return;
    setSelectedRackIndex((cur) => (cur === index ? null : index));
  }

  function toggleExchangeTile(index: number) {
    if (usedRackIndices.has(index)) return;
    setExchangeIndices((cur) => (cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index]));
  }

  function placeSelectedAt(row: number, col: number) {
    if (!game || selectedRackIndex === null) return;
    if (game.board[row][col] !== null) return;
    if (pendingByCell.has(`${row},${col}`)) return;

    let letter = game.myRack[selectedRackIndex];
    const isBlank = letter === BLANK;
    if (isBlank) {
      const chosen = window.prompt("Welke letter moet de blanco steen voorstellen?", "")?.trim().toUpperCase();
      if (!chosen || chosen.length !== 1 || !/^[A-Z]$/.test(chosen)) return;
      letter = chosen;
    }
    setPending((cur) => [...cur, { row, col, letter, isBlank, rackIndex: selectedRackIndex }]);
    setSelectedRackIndex(null);
  }

  function removePendingAt(row: number, col: number) {
    setPending((cur) => cur.filter((p) => !(p.row === row && p.col === col)));
  }

  async function submitMove() {
    if (pending.length === 0) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/scrabble/${gameId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placements: pending.map(({ row, col, letter, isBlank }) => ({ row, col, letter, isBlank })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error ?? "Deze zet kan niet.");
      return;
    }
    setMessage(`+${body.score} punten: ${body.wordsFormed.join(", ")}`);
    load();
  }

  async function submitExchange() {
    if (exchangeIndices.length === 0 || !game) return;
    setBusy(true);
    setMessage(null);
    const letters = exchangeIndices.map((i) => game.myRack[i]);
    const res = await fetch(`/api/scrabble/${gameId}/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letters }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error ?? "Kon niet wisselen.");
      return;
    }
    setMessage("Letters gewisseld.");
    load();
  }

  async function submitPass() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/scrabble/${gameId}/pass`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Kon niet passen.");
      return;
    }
    load();
  }

  async function requestHint() {
    if (busy || hintSecondsLeft > 0) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/scrabble/${gameId}/hint`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error ?? "Kon geen hint geven.");
      return;
    }
    setHintIndices(body.usedIndices ?? []);
    setHintSecondsLeft(10);
    // Eén gedeeld tegoed (zie useHint in scrabbleGame.ts) dat overal
    // hetzelfde moet tonen — de server-waarde overnemen i.p.v. lokaal
    // aftrekken voorkomt dat dit scherm uit de pas gaat lopen met andere
    // schermen (winkel, Raad het hoofdstuk) die hetzelfde tegoed tonen.
    setGame((g) => (g && typeof body.hintBalance === "number" ? { ...g, myHintCredits: body.hintBalance } : g));
  }

  async function submitForfeit() {
    if (!window.confirm("Weet je zeker dat je wil opgeven? Je tegenstander wordt dan automatisch winnaar.")) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/scrabble/${gameId}/forfeit`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Kon niet opgeven.");
      return;
    }
    load();
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/scrabble" className="text-sm text-brand-600 dark:text-brand-300 font-bold underline underline-offset-2">
            ← Terug naar woordspellen
          </Link>
          <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 mt-1">
            Tegen {game.opponent.displayName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-extrabold text-lg dark:text-slate-100">
              {game.myScore} - {game.opponentScore}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Zak: {game.bagCount} · Tegenstander: {game.opponentRackCount} letters
            </div>
          </div>
        </div>
      </div>

      {game.status === "FINISHED" && (
        <div className="card text-center font-bold dark:text-slate-100">
          {game.tied ? "Gelijkspel!" : game.won ? "🎉 Je hebt gewonnen!" : "Je hebt verloren."}
        </div>
      )}

      {game.status === "ACTIVE" && (
        <p className={`text-center font-bold ${game.isMyTurn ? "text-brand-600 dark:text-brand-300" : "text-slate-400 dark:text-slate-500"}`}>
          {game.isMyTurn ? "Jij bent aan de beurt" : `Wachten op ${game.opponent.displayName}...`}
        </p>
      )}

      <div className="overflow-x-auto">
        <div
          className="grid gap-[1px] bg-slate-300 dark:bg-slate-700 border border-slate-300 dark:border-slate-700 mx-auto"
          style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(1.6rem, 2.4rem))`, width: "fit-content" }}
        >
          {game.board.map((rowCells, row) =>
            rowCells.map((cell, col) => {
              const key = `${row},${col}`;
              const pend = pendingByCell.get(key);
              const squareType = LAYOUT[row][col];
              const isCenter = row === CENTER && col === CENTER;
              const tile = cell ?? (pend ? { letter: pend.letter, isBlank: pend.isBlank } : null);
              const isMine = myTiles.has(key);
              const flashing = !pend && flashKeys.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`cell-${row}-${col}`}
                  disabled={!game.isMyTurn || exchangeMode || game.status !== "ACTIVE"}
                  onClick={() => (pend ? removePendingAt(row, col) : placeSelectedAt(row, col))}
                  className={`aspect-square flex items-center justify-center relative text-[0.65rem] font-bold ${
                    tile
                      ? pend
                        ? "bg-violet-500 dark:bg-violet-400 text-white ring-2 ring-inset ring-gold-400"
                        : isMine
                          ? "bg-violet-600 dark:bg-violet-500 text-white"
                          : "bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-50"
                      : SQUARE_CLASS[squareType]
                  } ${flashing ? "animate-tile-flash z-10 rounded-sm" : ""}`}
                >
                  {tile ? (
                    <>
                      <span className="text-sm sm:text-base">{tile.letter}</span>
                      {!tile.isBlank && (
                        <span className="absolute bottom-0 right-0.5 text-[0.5rem] leading-none">
                          {LETTER_VALUES[tile.letter] ?? ""}
                        </span>
                      )}
                    </>
                  ) : isCenter ? (
                    "★"
                  ) : (
                    SQUARE_LABEL[squareType]
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-violet-600 dark:bg-violet-500 ring-1 ring-violet-800 dark:ring-violet-300" aria-hidden />
          Jouw letters
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm bg-amber-100 dark:bg-amber-800 ring-1 ring-amber-300 dark:ring-amber-600" aria-hidden />
          {game.opponent.displayName}
        </span>
      </div>

      {message && <p className="text-center text-sm font-semibold text-brand-600 dark:text-brand-300">{message}</p>}

      {game.status === "ACTIVE" && (
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {game.myRack.map((letter, i) => {
              const used = usedRackIndices.has(i);
              const selectedForPlace = selectedRackIndex === i;
              const selectedForExchange = exchangeIndices.includes(i);
              const hinted = hintIndices.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  data-testid={`rack-${i}`}
                  disabled={used || !game.isMyTurn}
                  onClick={() => (exchangeMode ? toggleExchangeTile(i) : pickRackTile(i))}
                  className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-md font-extrabold text-lg flex items-center justify-center border-2 ${
                    used
                      ? "opacity-30 bg-violet-600 dark:bg-violet-500 text-white border-transparent"
                      : selectedForPlace || selectedForExchange
                        ? "bg-violet-600 dark:bg-violet-500 text-white border-gold-400 ring-2 ring-gold-400 -translate-y-1"
                        : hinted
                          ? "bg-yellow-200 dark:bg-yellow-600 border-yellow-500 ring-4 ring-yellow-400 dark:ring-yellow-300"
                          : "bg-violet-600 dark:bg-violet-500 text-white border-violet-800 dark:border-violet-300"
                  }`}
                >
                  {letter === BLANK ? "★" : letter}
                  <span className="absolute bottom-0 right-1 text-[0.55rem] font-normal">{LETTER_VALUES[letter] ?? ""}</span>
                </button>
              );
            })}
          </div>

          {game.isMyTurn ? (
            <div className="flex flex-wrap justify-center gap-2">
              {exchangeMode ? (
                <>
                  <button className="btn-primary !px-4 !py-2" disabled={busy || exchangeIndices.length === 0} onClick={submitExchange}>
                    Wissel {exchangeIndices.length || ""} letter(s)
                  </button>
                  <button
                    className="btn-secondary !px-4 !py-2"
                    onClick={() => {
                      setExchangeMode(false);
                      setExchangeIndices([]);
                    }}
                  >
                    Annuleren
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-primary !px-4 !py-2" disabled={busy || pending.length === 0} onClick={submitMove}>
                    Speel woord
                  </button>
                  <button className="btn-secondary !px-4 !py-2" disabled={busy || pending.length === 0} onClick={() => setPending([])}>
                    Reset
                  </button>
                  <button className="btn-secondary !px-4 !py-2" disabled={busy || pending.length > 0} onClick={() => setExchangeMode(true)}>
                    Wissel letters
                  </button>
                  <button className="btn-secondary !px-4 !py-2" disabled={busy || pending.length > 0} onClick={submitPass}>
                    Pas
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">
              Wacht tot {game.opponent.displayName} heeft gespeeld.
            </p>
          )}

          {/* Hint en Opgeven mogen altijd, ook als je niet aan de beurt bent. */}
          <div className="flex justify-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700 mt-2">
            <button
              className="btn-secondary !px-3 !py-1.5"
              disabled={busy || hintSecondsLeft > 0 || game.myHintCredits <= 0}
              onClick={requestHint}
              title="Highlight letters op je rek waarmee je een woord kan maken"
            >
              💡 {hintSecondsLeft > 0 ? `Hint actief... ${hintSecondsLeft}s` : `Hint (${game.myHintCredits})`}
            </button>
            <button className="btn-secondary !px-3 !py-1.5 !text-red-500 !border-red-200" disabled={busy} onClick={submitForfeit}>
              Opgeven
            </button>
          </div>
        </div>
      )}

      

      {game.moves.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Zetten</h2>
          <div className="flex flex-col gap-1 text-sm">
            {[...game.moves].reverse().map((m) => (
              <div key={m.id} className="card !py-2 flex justify-between dark:text-slate-200">
                <span>
                  <strong>{m.playerName}</strong>{" "}
                  {m.type === "PLACE"
                    ? m.wordsFormed.join(", ")
                    : m.type === "EXCHANGE"
                      ? "wisselde letters"
                      : m.type === "FORFEIT"
                        ? "gaf op"
                        : "paste"}
                </span>
                {m.type === "PLACE" && <span className="font-bold">+{m.score}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
