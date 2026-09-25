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
import { getT } from "@/lib/i18n";
import type { TFunction } from "@/lib/i18n/core";

// Leest rechtstreeks de waarden uit src/lib/xpRules.ts (en wordGame.ts voor
// het woordspel) — dus deze pagina kan nooit uit sync raken met wat er
// daadwerkelijk wordt uitgekeerd, zoals bij losstaand gekopieerde tekst wel
// had gekund.
function activities(t: TFunction): { icon: string; title: string; description: string }[] {
  const standard = t("xpGuide.standardText", { n: XP_PER_CORRECT_STANDARD, bonus: XP_PERFECT_BONUS_STANDARD });
  return [
    { icon: "📖", title: t("xpGuide.chapter"), description: standard },
    { icon: "🧭", title: t("xpGuide.intro"), description: standard },
    { icon: "🧒", title: t("xpGuide.kids"), description: standard },
    { icon: "🎙️", title: t("xpGuide.podcast"), description: standard },
    { icon: "✍️", title: t("xpGuide.quick"), description: t("xpGuide.quickText", { n: XP_PER_CORRECT_LIGHT }) },
    { icon: "🔍", title: t("pages.chapterGuess"), description: t("xpGuide.chapterGuessText", { n: XP_PER_CORRECT_LIGHT }) },
    {
      icon: "🔤",
      title: t("pages.wordOfTheDay"),
      description: t("xpGuide.wordOfDayText", { min: xpForWin(MAX_GUESSES), max: xpForWin(1) }),
    },
    { icon: "⚔️", title: t("xpGuide.challenge"), description: t("xpGuide.challengeText", { n: CHALLENGE_WIN_XP }) },
    {
      icon: "🀄",
      title: t("pages.wordGame"),
      description: t("xpGuide.wordGameText", { win: SCRABBLE_WIN_XP, rest: SCRABBLE_PARTICIPATION_XP }),
    },
  ];
}

export default async function XpGuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = getT(user.uiLanguage);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("xpGuide.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{t("xpGuide.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-2">
        {activities(t).map((a) => (
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
        <p className="font-extrabold dark:text-slate-100">{t("xpGuide.repeatTitle")}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {t("xpGuide.repeatText", { pct: Math.round(REPEAT_DISCOUNT * 100) })}
        </p>
      </div>


    </div>
  );
}
