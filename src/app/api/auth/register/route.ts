import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { anonymousLanguage } from "@/lib/requestLanguage";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateDiscriminator, HANDLE_REGEX, HANDLE_MIN_LENGTH, HANDLE_MAX_LENGTH, containsForbiddenEmoji } from "@/lib/handle";
import { createAuthToken } from "@/lib/authTokens";
import { isEmailConfigured, sendMail } from "@/lib/email";
import { registrationAttemptTemplate, verifyEmailTemplate } from "@/lib/emailTemplates";
import { getT } from "@/lib/i18n";
import { getBaseUrl } from "@/lib/baseUrl";
import { FRONT_TO_BACK_SLUG, subscribeUserToCourse } from "@/lib/courses";
import { BOFM_WORK, resolveEditionId } from "@/lib/contentCollections";
import { becomeFriendsViaInvite } from "@/lib/friendInvite";
import { apiError, apiErrorText } from "@/lib/apiError";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in."),
  handle: z
    .string()
    .trim()
    .min(HANDLE_MIN_LENGTH, `Gebruikersnaam moet minstens ${HANDLE_MIN_LENGTH} tekens zijn.`)
    .max(HANDLE_MAX_LENGTH, `Gebruikersnaam mag maximaal ${HANDLE_MAX_LENGTH} tekens zijn.`)
    .regex(HANDLE_REGEX, "Alleen letters, cijfers, spaties, -, _ en emoji toegestaan.")
    .refine((v) => !containsForbiddenEmoji(v), "Deze emoji is niet toegestaan in een gebruikersnaam."),
  password: z.string().min(8, "Wachtwoord moet minstens 8 tekens zijn."),
  // Code uit een uitnodigingslink (zie src/lib/friendInvite.ts), optioneel.
  inviteCode: z.string().trim().max(32).optional(),
});

const MAX_DISCRIMINATOR_ATTEMPTS = 25;
const REGISTRATION_NOTICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const noticeSentAt = new Map<string, number>();

// Bewust zonder tekst: het registratiescherm toont zelf de (vertaalde)
// melding, en een vaste Nederlandse zin hier liep buiten de vertalingen om.
const GENERIC_RESPONSE = { ok: true };

function noticeKey(email: string): string {
  // Het e-mailadres mag niet in de rate-limit-sleutel blijven staan als deze
  // map tijdens de levensduur van het proces wordt geïnspecteerd.
  return createHash("sha256").update(email).digest("hex");
}

function maySendRegistrationNotice(email: string): boolean {
  const key = noticeKey(email);
  const now = Date.now();
  const lastSent = noticeSentAt.get(key);
  if (lastSent && now - lastSent < REGISTRATION_NOTICE_WINDOW_MS) return false;
  noticeSentAt.set(key, now);
  if (noticeSentAt.size > 5000) {
    for (const [storedKey, sentAt] of noticeSentAt) {
      if (now - sentAt >= REGISTRATION_NOTICE_WINDOW_MS) noticeSentAt.delete(storedKey);
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return await apiErrorText(parsed.error.issues[0].message, 400);
  }
  const { email, handle, password, inviteCode } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    // Geef geen account-specifieke respons en maak geen tweede account aan.
    // De melding is bewust beperkt tot maximaal één keer per dag: anders kan
    // dit eindpunt worden misbruikt om iemand met e-mails lastig te vallen.
    if (await isEmailConfigured() && maySendRegistrationNotice(email)) {
      const { subject, html, text } = registrationAttemptTemplate(getT(existingEmail.uiLanguage));
      await sendMail({ to: existingEmail.email, subject, html, text });
    }
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const passwordHash = await hashPassword(password);

  // De allereerste registratie op een verse installatie wordt automatisch
  // admin, zodat er zonder handmatige databasetoegang altijd een beheerder
  // is voor /adminbackend.
  const isFirstUser = (await prisma.user.count()) === 0;

  // Standaard-cursus voor nieuwe accounts: "van voor naar achter". Bestaat
  // die nog niet (content nog niet geïmporteerd), dan blijft dit gewoon leeg
  // — dashboard/page.tsx vangt dat later alsnog af.
  // Taal van het apparaat (zie requestLanguage): bepaalt de taal van de app
  // en welke uitgave iemand leest. De startcursus is die van die uitgave.
  const language = await anonymousLanguage();
  const editionId = await resolveEditionId(BOFM_WORK, language);
  const edition = editionId
    ? await prisma.contentCollection.findUnique({ where: { id: editionId }, select: { language: true } })
    : null;
  const defaultCourse =
    (editionId && (await prisma.course.findFirst({ where: { type: "FRONT_TO_BACK", contentCollectionId: editionId } }))) ||
    (await prisma.course.findUnique({ where: { slug: FRONT_TO_BACK_SLUG } }));

  // handle+discriminator is uniek, handle alleen niet — bij een botsing
  // (1 op 100 voor exact dezelfde combinatie) proberen we gewoon een
  // nieuw willekeurig nummer.
  for (let attempt = 0; attempt < MAX_DISCRIMINATOR_ATTEMPTS; attempt++) {
    const discriminator = generateDiscriminator();
    try {
      const user = await prisma.user.create({
        data: {
          email,
          handle,
          discriminator,
          passwordHash,
          isAdmin: isFirstUser,
          activeCourseId: defaultCourse?.id,
          // De taal waarin de bezoeker de app tot nu toe zag (zie requestLanguage).
          uiLanguage: language,
          contentLanguage: edition?.language ?? "nl",
        },
      });

      // Meteen ook in de persoonlijke cursussenlijst ("Cursussen") zetten —
      // anders staat die leeg totdat de gebruiker toevallig een pagina
      // bezoekt die dit lazy aanmaakt (zie subscribeUserToCourse).
      if (defaultCourse) {
        await subscribeUserToCourse(prisma, user.id, defaultCourse.id);
      }

      // Als e-mail is geconfigureerd, moet de gebruiker eerst bevestigen. De
      // registratie krijgt daarom nog geen sessie: zo is het antwoord voor een
      // bestaand en een nieuw e-mailadres niet uit elkaar te houden.
      if (await isEmailConfigured()) {
        const rawToken = await createAuthToken(user.id, "EMAIL_VERIFY");
        const link = `${getBaseUrl(req)}/verify-email?token=${rawToken}`;
        const { subject, html, text } = verifyEmailTemplate(getT(user.uiLanguage), link);
        await sendMail({ to: user.email, subject, html, text });
      }

      // Een ongeldige of vervangen link mag de registratie nooit laten mislukken:
      // dan wordt het gewoon een account zonder vriend.
      if (inviteCode) {
        const invite = await becomeFriendsViaInvite(inviteCode, user.id, { isNewAccount: true }).catch(() => null);
        if (invite?.ok) {
          await prisma.user.update({ where: { id: user.id }, data: { registeredViaInvite: true } });
        }
      }

      // Geen id, tag, uitnodiger of sessie teruggeven: ook de normale
      // registratie mag vóór e-mailbevestiging geen accountinformatie lekken.
      return NextResponse.json(GENERIC_RESPONSE);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue; // discriminator-botsing voor deze handle, probeer opnieuw
      }
      throw e;
    }
  }

  return await apiError("apiErrors.uniqueHandleFailed", 409);
}
