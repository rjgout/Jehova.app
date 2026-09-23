import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { generateDiscriminator, formatTag, HANDLE_REGEX, HANDLE_MIN_LENGTH, HANDLE_MAX_LENGTH, containsForbiddenEmoji } from "@/lib/handle";
import { createAuthToken } from "@/lib/authTokens";
import { isEmailConfigured, sendMail } from "@/lib/email";
import { verifyEmailTemplate } from "@/lib/emailTemplates";
import { getBaseUrl } from "@/lib/baseUrl";
import { FRONT_TO_BACK_SLUG, subscribeUserToCourse } from "@/lib/courses";

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
});

const MAX_DISCRIMINATOR_ATTEMPTS = 25;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, handle, password } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Dit e-mailadres is al in gebruik." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  // De allereerste registratie op een verse installatie wordt automatisch
  // admin, zodat er zonder handmatige databasetoegang altijd een beheerder
  // is voor /adminbackend.
  const isFirstUser = (await prisma.user.count()) === 0;

  // Standaard-cursus voor nieuwe accounts: "van voor naar achter". Bestaat
  // die nog niet (content nog niet geïmporteerd), dan blijft dit gewoon leeg
  // — dashboard/page.tsx vangt dat later alsnog af.
  const defaultCourse = await prisma.course.findUnique({ where: { slug: FRONT_TO_BACK_SLUG } });

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
        },
      });

      // Meteen ook in de persoonlijke cursussenlijst ("Cursussen") zetten —
      // anders staat die leeg totdat de gebruiker toevallig een pagina
      // bezoekt die dit lazy aanmaakt (zie subscribeUserToCourse).
      if (defaultCourse) {
        await subscribeUserToCourse(prisma, user.id, defaultCourse.id);
      }

      // Best-effort: als er geen (werkende) e-mailconfiguratie is, blijft
      // emailVerifiedAt gewoon leeg en wordt bevestiging nergens afgedwongen
      // (zie dashboard/page.tsx) — dus geen registratie die vastloopt.
      if (await isEmailConfigured()) {
        const rawToken = await createAuthToken(user.id, "EMAIL_VERIFY");
        const link = `${getBaseUrl(req)}/verify-email?token=${rawToken}`;
        const { subject, html, text } = verifyEmailTemplate(link);
        await sendMail({ to: user.email, subject, html, text });
      }

      const token = await createSessionToken(user.id);
      const res = NextResponse.json({ id: user.id, tag: formatTag(user.handle, user.discriminator) });
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return res;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue; // discriminator-botsing voor deze handle, probeer opnieuw
      }
      throw e;
    }
  }

  return NextResponse.json(
    { error: "Kon geen unieke gebruikersnaam aanmaken, probeer een andere gebruikersnaam." },
    { status: 409 }
  );
}
