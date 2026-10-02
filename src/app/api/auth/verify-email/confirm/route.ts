import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeAuthToken } from "@/lib/authTokens";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getBaseUrl } from "@/lib/baseUrl";
import { confirmPendingRegistration } from "@/lib/registration";

// De link uit de bevestigingsmail komt via /verify-email hier terecht: een
// pagina kan geen cookie zetten, een route wel. Daarna terug naar
// /verify-email met alleen de uitkomst in de URL, niet meer het token.
function done(req: NextRequest, status: string, next?: string | null): NextResponse {
  const url = new URL("/verify-email", getBaseUrl(req));
  url.searchParams.set("status", status);
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return done(req, "invalid");

  const result = await confirmPendingRegistration(token);
  if (result.status === "confirmed") {
    // Pas nu bestaat het account; meteen ingelogd, zodat de klik in de mail
    // de laatste stap is.
    const res = done(req, "confirmed", result.returnTo);
    res.cookies.set(SESSION_COOKIE, await createSessionToken(result.user.id), sessionCookieOptions);
    return res;
  }
  if (result.status !== "notPending") return done(req, result.status);

  // Oude links van accounts die vóór de aanmeldingsstap zijn aangemaakt.
  const userId = await consumeAuthToken(token, "EMAIL_VERIFY");
  if (!userId) return done(req, "invalid");
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return done(req, "confirmed");
}
