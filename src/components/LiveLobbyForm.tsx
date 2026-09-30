"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ActiveGamesBanner from "@/components/ActiveGamesBanner";
import { SortableList, DragHandle, type DragHandleProps } from "@/components/SortableList";
import { applyPersonalOrder, fetchListOrder, saveListOrder } from "@/lib/listOrder";
import { useT } from "@/components/I18nProvider";
import AppSelect from "@/components/AppSelect";
import { GAME_CATALOG, type GameCatalogEntry } from "@/lib/gameCatalog";
import { gameArtworkKeys } from "@/lib/artwork";
import MediaArtwork from "@/components/versado/MediaArtwork";

interface ChapterOption {
  id: string;
  label: string;
  exerciseCount: number;
}

interface GameSettings {
  wordGameEnabled: boolean;
  scrabbleEnabled: boolean;
  gezinsavondEnabled: boolean;
  chapterGuessEnabled: boolean;
  challengesEnabled: boolean;
  liveExercisesEnabled: boolean;
  alleskennerEnabled: boolean;
  jigsawEnabled: boolean;
  wordSearchEnabled: boolean;
}

interface Props {
  settings: GameSettings;
  isAdmin: boolean;
  allowedGameKeys: string[];
  /** Naam van de actieve content, voor de melding als daar geen spellen bij horen. */
  contentName: string;
}

// De catalogus zelf staat in src/lib/gameCatalog.ts (gedeeld met Vandaag);
// het beeld per spel in src/lib/artwork.ts (GAME_COVERS), zodat een spel
// overal dezelfde cover heeft.
type GameEntry = GameCatalogEntry;
const GAMES: GameEntry[] = GAME_CATALOG;

export default function LiveLobbyForm({ settings, isAdmin, allowedGameKeys, contentName }: Props) {
  const t = useT();
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [games, setGames] = useState<GameEntry[]>(() => GAMES.filter((g) => allowedGameKeys.includes(g.id) && (settings[g.enabledKey] || isAdmin)));

  useEffect(() => {
    fetch("/api/chapters")
      .then((r) => r.json())
      .then((data: ChapterOption[]) => {
        setChapters(data);
        setChapterId(data[0]?.id ?? "");
      });
  }, []);

  useEffect(() => {
    const visible = GAMES.filter((g) => allowedGameKeys.includes(g.id) && (settings[g.enabledKey] || isAdmin));
    fetchListOrder("games").then((order) => setGames(applyPersonalOrder(visible, order)));
  }, [allowedGameKeys, isAdmin, settings]);

  function reorderGames(newGames: GameEntry[]) {
    setGames(newGames);
    saveListOrder(
      "games",
      newGames.map((g) => g.id)
    );
  }

  async function createGame(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const res = await fetch("/api/live/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    });
    setCreating(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("gamesHub.createFailed"));
      return;
    }
    router.push(`/live/${data.code}`);
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">
      <ActiveGamesBanner />

      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("gamesHub.title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("gamesHub.intro")}</p>
      </div>

      {settings.liveExercisesEnabled && allowedGameKeys.includes("live-exercises") && (
        <div className="card bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 text-white flex flex-col gap-4">
          <div>
            <h2 className="font-extrabold text-lg">{t("gamesHub.liveTitle")}</h2>
            <p className="text-brand-100 text-sm">{t("gamesHub.liveIntro")}</p>
          </div>
          <form onSubmit={createGame} className="flex flex-col gap-3">
            <AppSelect
              className="input !bg-white/90 dark:!bg-slate-900/60 !text-slate-800 dark:!text-slate-100 !border-0"
              value={chapterId}
              onChange={setChapterId}
              ariaLabel={t("gamesHub.liveTitle")}
              options={chapters.map((c) => ({ value: c.id, disabled: c.exerciseCount === 0, label: t("gamesHub.chapterOption", { label: c.label, count: c.exerciseCount }) }))}
            />
            <button
              className="rounded-2xl bg-gold-400 text-brand-900 font-extrabold uppercase tracking-wide text-sm py-3 shadow-[0_4px_0_0_theme(colors.gold.600)] active:shadow-none active:translate-y-1 transition disabled:opacity-50"
              disabled={creating || !chapterId}
              type="submit"
            >
              {creating ? t("courses.busy") : t("gamesHub.createGame")}
            </button>
            {error && <p className="text-red-100 text-sm font-semibold">{error}</p>}
          </form>
        </div>
      )}

      {/* Sommige content (zoals podcasts) heeft bewust geen spellen: die
          halen hun hoofdstukken uit een boek. Zonder deze melding bleef de
          pagina leeg zonder uitleg. */}
      {games.length === 0 && (
        <div className="card text-center flex flex-col gap-1">
          <p className="font-bold dark:text-slate-100">{t("gamesHub.noGames", { name: contentName })}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("gamesHub.switchContent")}
          </p>
        </div>
      )}

      <SortableList
        dndId="games-list"
        items={games}
        onReorder={reorderGames}
        className="grid gap-3 sm:grid-cols-2 sm:gap-4 items-stretch"
        getItemClassName={(game) => (game.id === "word-game" ? "sm:col-span-2" : undefined)}
        renderItem={(game, handle) => {
          const enabled = settings[game.enabledKey];
          if (!enabled && !isAdmin) return null;
          return <GameCardBody game={game} enabled={enabled} handle={handle} />;
        }}
      />
    </div>
  );
}

// Uitgezet (zie /adminbackend) betekent: verborgen voor gewone gebruikers,
// maar een admin blijft alles zien — dan met deze roodgerande "uitgeschakeld
// voor gebruikers"-badge in plaats van dat de kaart gewoon verdwijnt. Deze
// render-functie krijgt de sleepgreep via het "handle"-argument van
// SortableList (zie renderItem hierboven) doorgegeven.
function GameCardBody({ game, enabled, handle }: { game: GameEntry; enabled: boolean; handle: DragHandleProps }) {
  const [showRules, setShowRules] = useState(false);
  const t = useT();
  const title = t(game.titleKey);
  const text = (part: "description" | "linkLabel" | "rule1" | "rule2" | "rule3") => t(`gamesHub.${game.textKey}.${part}`);

  return (
    <div className={`card flex flex-col gap-2 !p-3 sm:gap-3 sm:!p-5 ${enabled ? "dark:!border-slate-800" : "!border-2 !border-red-300 dark:!border-red-800"}`}>
      {/* Cover over de volle breedte van de kaart (tegen de padding van .card
          in). Op een telefoon lager (21:9), vanaf twee kolommen 2:1. */}
      <MediaArtwork
        kind="game"
        artworkKey={gameArtworkKeys(game.id)}
        ratio="21/9"
        sizes="(min-width: 1024px) 500px, (min-width: 640px) 50vw, 100vw"
        className="-mx-3 -mt-3 rounded-t-[calc(1.5rem-1px)] sm:-mx-5 sm:-mt-5 sm:aspect-[2/1]"
      />
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5 shrink-0">
          <DragHandle {...handle} className="!ml-[-0.5rem] !rounded-lg !px-2 !py-1 !text-slate-400 hover:!bg-slate-100 dark:!text-slate-500 dark:hover:!bg-slate-700" />
        </div>
        <div className="min-w-0 flex-1">
          {!enabled && (
            <span className="mb-1.5 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold uppercase text-red-500 dark:bg-red-950 dark:text-red-400">
              {t("gamesHub.disabledForUsers")}
            </span>
          )}
          {game.id === "word-game" && <span className="mb-0.5 inline-flex text-xs font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-300">{t("gamesHub.featured")}</span>}
          <div className="flex min-w-0 items-start gap-2">
            <Link href={game.href} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <h2 className="truncate font-extrabold leading-tight dark:text-slate-100">{title}</h2>
            </Link>
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-sm font-extrabold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={t("gamesHub.rulesFor", { title })}
              title={t("gamesHub.rules")}
            >
              i
            </button>
          </div>
          <Link href={game.href} className="mt-0.5 block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{text("description")}</p>
          </Link>
        </div>
        <Link href={game.href} className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100/70 text-slate-500 transition hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-brand-200" aria-label={text("linkLabel")}>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {showRules && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="presentation" onClick={() => setShowRules(false)}>
            <div className="card max-w-lg w-full max-h-[85vh] overflow-y-auto relative" role="dialog" aria-modal="true" aria-labelledby={`game-rules-${game.id}`} onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setShowRules(false)} className="absolute top-3 right-3 w-9 h-9 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xl" aria-label={t("gamesHub.rulesClose")}>×</button>
              <h3 id={`game-rules-${game.id}`} className="text-xl font-extrabold text-brand-800 dark:text-brand-300 pr-10">{t("gamesHub.rules")}</h3>
              <h4 className="mt-4 font-extrabold dark:text-slate-100">{t("gamesHub.howToPlay")}</h4>
              <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {(["rule1", "rule2", "rule3"] as const).map((rule) => <li key={rule}>{text(rule)}</li>)}
              </ul>
            </div>
          </div>
        )}
    </div>
  );
}
