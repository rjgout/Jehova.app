import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { getAppUrl } from "@/lib/baseUrl";
import { APP_NAME } from "@/lib/brand";

// Elke gebeurtenis valt in één categorie, die de gebruiker in zijn profiel
// apart aan/uit kan zetten (zie User.notify* in schema.prisma) — bovenop,
// niet in plaats van, de kanaalschakelaars (email/pushNotificationsEnabled).
type NotifyCategory = "dailyReminder" | "dailyText" | "social" | "achievements" | "wordGame";

const CATEGORY_FIELD: Record<NotifyCategory, "notifyDailyReminder" | "notifyDailyText" | "notifySocial" | "notifyAchievements" | "notifyWordGame"> = {
  dailyReminder: "notifyDailyReminder",
  dailyText: "notifyDailyText",
  social: "notifySocial",
  achievements: "notifyAchievements",
  wordGame: "notifyWordGame",
};

interface NotifyInput {
  userId: string;
  category: NotifyCategory;
  subject: string;
  emailHtml: string;
  emailText: string;
  pushTitle: string;
  pushBody: string;
  url: string;
}

/**
 * Centrale dispatcher: stuurt alleen via de kanalen die deze gebruiker zelf
 * heeft aangezet (zie User.emailNotificationsEnabled/pushNotificationsEnabled
 * in schema.prisma — beide standaard uit) én voor categorieën die niet
 * expliciet zijn uitgezet (User.notify*, standaard allemaal aan). Faalt
 * bewust stil per kanaal (bv. e-mail niet geconfigureerd, of geen
 * pushsubscripties) — een notificatie is nooit kritiek voor de aanroepende
 * flow (les afronden, vriendschapsverzoek versturen, ...).
 */
async function notifyUser(input: NotifyInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      email: true,
      emailNotificationsEnabled: true,
      pushNotificationsEnabled: true,
      notifyDailyReminder: true,
      notifyDailyText: true,
      notifySocial: true,
      notifyAchievements: true,
      notifyWordGame: true,
    },
  });
  if (!user) return;
  if (!user[CATEGORY_FIELD[input.category]]) return;

  const jobs: Promise<unknown>[] = [];
  if (user.emailNotificationsEnabled) {
    jobs.push(sendMail({ to: user.email, subject: input.subject, html: input.emailHtml, text: input.emailText }));
  }
  if (user.pushNotificationsEnabled) {
    jobs.push(sendPushToUser(input.userId, { title: input.pushTitle, body: input.pushBody, url: input.url }));
  }
  await Promise.allSettled(jobs);
}

function emailWrap(bodyHtml: string, ctaUrl: string, ctaLabel: string): string {
  return `<p>${bodyHtml}</p><p><a href="${ctaUrl}">${ctaLabel} →</a></p><p style="color:#94a3b8;font-size:12px">${APP_NAME} — je kan e-mailnotificaties uitzetten in je profiel.</p>`;
}

export async function notifyFreezeReceived(userId: string, senderDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/friends`;
  const text = `${senderDisplayName} heeft je een streak freeze gegeven! 🧊`;
  await notifyUser({
    userId,
    category: "social",
    subject: "Je hebt een streak freeze gekregen! 🧊",
    emailHtml: emailWrap(text, url, "Bekijk je vrienden"),
    emailText: `${text} Bekijk je vrienden: ${url}`,
    pushTitle: "Je hebt een streak freeze gekregen! 🧊",
    pushBody: `${senderDisplayName} heeft je een streak freeze gegeven.`,
    url: "/friends",
  });
}

export async function notifyFriendRequest(receiverUserId: string, senderDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/friends`;
  await notifyUser({
    userId: receiverUserId,
    category: "social",
    subject: `${senderDisplayName} stuurde je een vriendschapsverzoek`,
    emailHtml: emailWrap(`<strong>${senderDisplayName}</strong> wil vrienden met je worden op ${APP_NAME}.`, url, "Bekijk verzoek"),
    emailText: `${senderDisplayName} wil vrienden met je worden op ${APP_NAME}. Bekijk het verzoek: ${url}`,
    pushTitle: "Nieuw vriendschapsverzoek",
    pushBody: `${senderDisplayName} wil vrienden met je worden.`,
    url: "/friends",
  });
}

export async function notifyAchievement(userId: string, achievementName: string, achievementIcon: string): Promise<void> {
  const url = `${await getAppUrl()}/profile`;
  await notifyUser({
    userId,
    category: "achievements",
    subject: `Nieuwe prestatie behaald: ${achievementName}`,
    emailHtml: emailWrap(`${achievementIcon} Je hebt de prestatie <strong>${achievementName}</strong> behaald!`, url, "Bekijk je profiel"),
    emailText: `${achievementIcon} Je hebt de prestatie "${achievementName}" behaald! Bekijk je profiel: ${url}`,
    pushTitle: "Nieuwe prestatie! " + achievementIcon,
    pushBody: `Je hebt "${achievementName}" behaald.`,
    url: "/profile",
  });
}

export async function notifyWeeklyResult(userId: string, outcome: "promoted" | "demoted" | "stayed", tierLabel: string): Promise<void> {
  const url = `${await getAppUrl()}/competition`;
  const text =
    outcome === "promoted"
      ? `Gefeliciteerd! Je bent gepromoveerd naar de ${tierLabel}.`
      : outcome === "demoted"
        ? `Je bent deze week gedegradeerd naar de ${tierLabel}. Volgende week weer omhoog!`
        : `Je blijft deze week in de ${tierLabel}.`;
  await notifyUser({
    userId,
    category: "achievements",
    subject: "Je wekelijkse competitie-uitslag",
    emailHtml: emailWrap(text, url, "Bekijk de competitie"),
    emailText: `${text} Bekijk de competitie: ${url}`,
    pushTitle: outcome === "promoted" ? "Gepromoveerd! 🎉" : outcome === "demoted" ? "Gedegradeerd" : "Competitie-uitslag",
    pushBody: text,
    url: "/competition",
  });
}

/** Melding bij het afsluiten van een seizoen (zie runSeasonRolloverTick in src/lib/scheduler.ts). */
export async function notifySeasonResult(
  userId: string,
  seasonIndex: number,
  tierLabel: string,
  finalPosition: number | null
): Promise<void> {
  const url = `${await getAppUrl()}/profile`;
  const positionText = finalPosition ? ` (#${finalPosition})` : "";
  const text = `Seizoen ${seasonIndex} is afgelopen! Je eindigde in de ${tierLabel}${positionText}.`;
  await notifyUser({
    userId,
    category: "achievements",
    subject: `Seizoen ${seasonIndex} is afgelopen`,
    emailHtml: emailWrap(text, url, "Bekijk je profiel"),
    emailText: `${text} Bekijk je profiel: ${url}`,
    pushTitle: `Seizoen ${seasonIndex} afgesloten`,
    pushBody: text,
    url: "/profile",
  });
}

export async function notifyDailyText(userId: string, text: { bookName: string; chapterNumber: number; verseNumber: number; content: string }): Promise<void> {
  const url = `${await getAppUrl()}/dashboard`;
  const reference = `${text.bookName} ${text.chapterNumber}:undefined`;
  await notifyUser({
    userId,
    category: "dailyText",
    subject: "Tekst van de dag",
    emailHtml: emailWrap(`📖 <strong>${reference}</strong><br />${text.content}`, url, "Bekijk je dashboard"),
    emailText: `📖 ${reference} — ${text.content} — ${url}`,
    pushTitle: "Tekst van de dag 📖",
    pushBody: `${reference} — ${text.content}`,
    url: "/dashboard",
  });
}

export async function notifyDailyReminder(userId: string): Promise<void> {
  const url = `${await getAppUrl()}/dashboard`;
  await notifyUser({
    userId,
    category: "dailyReminder",
    subject: "Je hebt vandaag nog niet geoefend",
    emailHtml: emailWrap(`Je bent vandaag nog niet langs geweest bij ${APP_NAME} — hou je streak in leven!`, url, "Nu oefenen"),
    emailText: `Je bent vandaag nog niet langs geweest bij ${APP_NAME} — hou je streak in leven! Nu oefenen: ${url}`,
    pushTitle: "Vergeet je streak niet! 🔥",
    pushBody: "Je hebt vandaag nog niet geoefend.",
    url: "/dashboard",
  });
}

export async function notifyChallengeReceived(receiverUserId: string, senderDisplayName: string, bookName: string, chapterNumber: number): Promise<void> {
  const url = `${await getAppUrl()}/challenges`;
  const text = `${senderDisplayName} daagt je uit op ${bookName} ${chapterNumber}!`;
  await notifyUser({
    userId: receiverUserId,
    category: "social",
    subject: text,
    emailHtml: emailWrap(text, url, "Bekijk de uitdaging"),
    emailText: `${text} Bekijk de uitdaging: ${url}`,
    pushTitle: "Nieuwe uitdaging! ⚔️",
    pushBody: text,
    url: "/challenges",
  });
}

export async function notifyChallengeDeclined(senderUserId: string, receiverDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/challenges`;
  const text = `${receiverDisplayName} heeft je uitdaging geweigerd.`;
  await notifyUser({
    userId: senderUserId,
    category: "social",
    subject: "Je uitdaging is geweigerd",
    emailHtml: emailWrap(text, url, "Bekijk uitdagingen"),
    emailText: `${text} ${url}`,
    pushTitle: "Uitdaging geweigerd",
    pushBody: text,
    url: "/challenges",
  });
}

export async function notifyChallengeYourTurn(userId: string, opponentDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/challenges`;
  const text = `${opponentDisplayName} heeft gespeeld — jij bent aan de beurt!`;
  await notifyUser({
    userId,
    category: "social",
    subject: text,
    emailHtml: emailWrap(text, url, "Speel je beurt"),
    emailText: `${text} ${url}`,
    pushTitle: "Jij bent aan de beurt! ⚔️",
    pushBody: text,
    url: "/challenges",
  });
}

export async function notifyScrabbleInvite(receiverUserId: string, senderDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/scrabble`;
  const text = `${senderDisplayName} daagt je uit voor een woordspel!`;
  await notifyUser({
    userId: receiverUserId,
    category: "social",
    subject: text,
    emailHtml: emailWrap(text, url, "Bekijk het woordspel"),
    emailText: `${text} ${url}`,
    pushTitle: "Nieuw woordspel! 🔤",
    pushBody: text,
    url: "/scrabble",
  });
}

export async function notifyScrabbleDeclined(senderUserId: string, receiverDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/scrabble`;
  const text = `${receiverDisplayName} heeft je woordspel-uitdaging geweigerd.`;
  await notifyUser({
    userId: senderUserId,
    category: "social",
    subject: "Je woordspel-uitdaging is geweigerd",
    emailHtml: emailWrap(text, url, "Bekijk woordspellen"),
    emailText: `${text} ${url}`,
    pushTitle: "Uitdaging geweigerd",
    pushBody: text,
    url: "/scrabble",
  });
}

export async function notifyScrabbleYourTurn(userId: string, opponentDisplayName: string): Promise<void> {
  const url = `${await getAppUrl()}/scrabble`;
  const text = `${opponentDisplayName} heeft gespeeld — jij bent aan de beurt!`;
  await notifyUser({
    userId,
    category: "social",
    subject: text,
    emailHtml: emailWrap(text, url, "Speel je beurt"),
    emailText: `${text} ${url}`,
    pushTitle: "Jij bent aan de beurt! 🔤",
    pushBody: text,
    url: "/scrabble",
  });
}

export async function notifyScrabbleFinished(userId: string, opponentDisplayName: string, won: boolean, tied: boolean): Promise<void> {
  const url = `${await getAppUrl()}/scrabble`;
  const text = tied
    ? `Gelijkspel tegen ${opponentDisplayName}!`
    : won
      ? `Je hebt het woordspel gewonnen van ${opponentDisplayName}! 🎉`
      : `Je hebt het woordspel verloren van ${opponentDisplayName}.`;
  await notifyUser({
    userId,
    category: "social",
    subject: `Woordspel afgerond: ${text}`,
    emailHtml: emailWrap(text, url, "Bekijk het resultaat"),
    emailText: `${text} ${url}`,
    pushTitle: "Woordspel afgerond",
    pushBody: text,
    url: "/scrabble",
  });
}

/** Zoekt de zojuist behaalde achievement-slugs (zie StudyResult.newAchievements) op en notificeert er per stuk over. */
export async function notifyNewAchievements(userId: string, slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const achievements = await prisma.achievement.findMany({ where: { slug: { in: slugs } } });
  await Promise.allSettled(achievements.map((a) => notifyAchievement(userId, a.name, a.icon)));
}

export async function notifyChallengeFinished(userId: string, opponentDisplayName: string, won: boolean, tied: boolean): Promise<void> {
  const url = `${await getAppUrl()}/challenges`;
  const text = tied
    ? `Gelijkspel tegen ${opponentDisplayName}!`
    : won
      ? `Je hebt gewonnen van ${opponentDisplayName}! 🎉`
      : `Je hebt verloren van ${opponentDisplayName}.`;
  await notifyUser({
    userId,
    category: "social",
    subject: `Uitdaging afgerond: ${text}`,
    emailHtml: emailWrap(text, url, "Bekijk het resultaat"),
    emailText: `${text} ${url}`,
    pushTitle: "Uitdaging afgerond",
    pushBody: text,
    url: "/challenges",
  });
}

export async function notifyWordGame(userId: string): Promise<void> {
  const url = `${await getAppUrl()}/word-game`;
  await notifyUser({
    userId,
    category: "wordGame",
    subject: "Het woord van vandaag staat klaar",
    emailHtml: emailWrap(`Er staat een nieuw woord van de dag voor je klaar bij ${APP_NAME}.`, url, "Raad het woord"),
    emailText: `Er staat een nieuw woord van de dag voor je klaar bij ${APP_NAME}. Raad het woord: ${url}`,
    pushTitle: "Nieuw woord van de dag! 🔤",
    pushBody: "Raad het woord van vandaag in 6 pogingen.",
    url: "/word-game",
  });
}
