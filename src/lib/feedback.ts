import { randomBytes } from "crypto";
import type { FeedbackStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { APP_NAME } from "@/lib/brand";

// Bewust hardcoded (geen admin-instelling): dit is de vaste ontvanger van
// alle feedback, niet iets dat per installatie hoeft te wisselen.
const FEEDBACK_ADMIN_EMAIL = "raphael@gout.nl";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseDataUrl(dataUrl: string): { contentType: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/**
 * Maakt een feedbackmelding aan en mailt 'm naar de beheerder, met een
 * tokenlink (geen login nodig) waarmee die de status kan bijwerken vanuit
 * de mail zelf — zie /feedback/respond/[token] en respondToFeedback
 * hieronder. De screenshot (als data-URL, al verkleind door de client) gaat
 * als bijlage mee.
 */
export async function createFeedback(userId: string, message: string, screenshot: string | undefined, baseUrl: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const respondToken = randomBytes(24).toString("hex");

  const feedback = await prisma.feedback.create({
    data: { userId, message, screenshot, respondToken },
  });

  const url = `${baseUrl}/feedback/respond/${respondToken}`;
  const parsed = screenshot ? parseDataUrl(screenshot) : null;

  sendMail({
    to: FEEDBACK_ADMIN_EMAIL,
    subject: `Nieuwe feedback van ${user.handle} — ${APP_NAME}`,
    html: `
      <p><strong>${escapeHtml(user.handle)}</strong> (${escapeHtml(user.email)}) stuurde feedback:</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      ${parsed ? "<p>(screenshot als bijlage toegevoegd)</p>" : ""}
      <p><a href="${url}">Bekijk de melding en update de status →</a></p>
    `,
    text: `${user.handle} (${user.email}) stuurde feedback:\n\n${message}\n\nBekijk de melding en update de status: ${url}`,
    attachments: parsed ? [{ filename: "screenshot.jpg", content: parsed.buffer, contentType: parsed.contentType }] : undefined,
  }).catch(() => {});

  return feedback;
}

const RESPOND_STATUSES: FeedbackStatus[] = ["IN_PROGRESS", "DONE", "WONT_DO"];

export async function respondToFeedback(token: string, status: FeedbackStatus) {
  if (!RESPOND_STATUSES.includes(status)) {
    return { ok: false as const, error: "Ongeldige status." };
  }
  const feedback = await prisma.feedback.findUnique({ where: { respondToken: token } });
  if (!feedback) return { ok: false as const, error: "Melding niet gevonden." };

  const updated = await prisma.feedback.update({ where: { id: feedback.id }, data: { status } });
  return { ok: true as const, feedback: updated };
}
