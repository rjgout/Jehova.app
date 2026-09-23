import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import {
  XP_PER_CORRECT_STANDARD,
  XP_PERFECT_BONUS_STANDARD,
  XP_PER_CORRECT_LIGHT,
  CHALLENGE_WIN_XP,
  SCRABBLE_WIN_XP,
  SCRABBLE_PARTICIPATION_XP,
  REPEAT_DISCOUNT,
} from "@/lib/xpRules";
import { xpForWin, MAX_GUESSES } from "@/lib/wordGame";

// Leest rechtstreeks de waarden uit src/lib/xpRules.ts (en wordGame.ts voor
// het woordspel) — dus deze pagina kan nooit uit sync raken met wat er
// daadwerkelijk wordt uitgekeerd, zoals bij losstaand gekopieerde tekst wel
// had gekund.
const activities: { icon: string; title: string; description: string }[] = [
  {
    icon: "📖",
    title: "Een hoofdstuk lezen",
    description: `${XP_PER_CORRECT_STANDARD} XP per goed antwoord, plus ${XP_PERFECT_BONUS_STANDARD} XP bonus bij een perfecte score (100%).`,
  },
  {
    icon: "🧭",
    title: "Introductiecursus",
    description: `${XP_PER_CORRECT_STANDARD} XP per goed antwoord, plus ${XP_PERFECT_BONUS_STANDARD} XP bonus bij een perfecte score (100%).`,
  },
  {
    icon: "🧒",
    title: "Kinderverhaal",
    description: `${XP_PER_CORRECT_STANDARD} XP per goed antwoord, plus ${XP_PERFECT_BONUS_STANDARD} XP bonus bij een perfecte score (100%).`,
  },
  {
    icon: "🎙️",
    title: "Podcastles",
    description: `${XP_PER_CORRECT_STANDARD} XP per goed antwoord, plus ${XP_PERFECT_BONUS_STANDARD} XP bonus bij een perfecte score (100%).`,
  },
  {
    icon: "✍️",
    title: "Snelle ronde",
    description: `${XP_PER_CORRECT_LIGHT} XP per goed antwoord — geen vast hoofdstuk, dus geen perfecte-scorebonus.`,
  },
  {
    icon: "🔍",
    title: "Raad het hoofdstuk",
    description: `${XP_PER_CORRECT_LIGHT} XP per goed antwoord.`,
  },
  {
    icon: "🔤",
    title: "Woord van de dag",
    description: `${xpForWin(MAX_GUESSES)} XP als je 'm bij je laatste poging goed hebt, oplopend tot ${xpForWin(1)} XP bij de eerste poging.`,
  },
  {
    icon: "⚔️",
    title: "Uitdaging winnen",
    description: `${CHALLENGE_WIN_XP} XP voor de wekelijkse competitie (telt niet mee voor je algemene XP-totaal — dat komt al van het hoofdstuk zelf).`,
  },
  {
    icon: "🀄",
    title: "Scrabble",
    description: `${SCRABBLE_WIN_XP} XP voor de winnaar, ${SCRABBLE_PARTICIPATION_XP} XP voor de andere speler — voor de wekelijkse competitie, niet voor je algemene XP-totaal.`,
  },
];

export default async function XpGuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">⭐ Wat levert XP op?</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Een overzicht van elke activiteit in de app.</p>
      </div>

      <div className="flex flex-col gap-2">
        {activities.map((a) => (
          <div key={a.title} className="card flex items-center gap-4">
            <span className="text-2xl shrink-0" aria-hidden>
              {a.icon}
            </span>
            <div>
              <p className="font-extrabold dark:text-slate-100">{a.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{a.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-200 dark:!border-slate-700">
        <p className="font-extrabold dark:text-slate-100">🔁 Herhalen</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Had je een hoofdstuk, introles, kinderverhaal of podcastles al eerder met een perfecte score (100%)
          afgerond? Dan mag je 'm gerust nog een keer doen, maar levert dat nog maar {Math.round(REPEAT_DISCOUNT * 100)}%
          van de normale XP op — zo blijft herhalen zinvol als opfrisser, zonder dat het een oneindige XP-bron wordt.
        </p>
      </div>


    </div>
  );
}
