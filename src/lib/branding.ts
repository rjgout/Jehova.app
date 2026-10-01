import { prisma } from "@/lib/db";

export interface BrandingView {
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
  appName: string | null;
}

const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/;
// Ruime maar niet oneindige bovengrens — dit is een klein huisstijl-plaatje,
// geen gebruikersbestand (zie Feedback.screenshot voor dezelfde aanpak).
const MAX_DATA_URL_LENGTH = 2 * 1024 * 1024;

export function isValidBrandingDataUrl(value: string): boolean {
  return DATA_URL_RE.test(value) && value.length <= MAX_DATA_URL_LENGTH;
}

export async function getBranding(): Promise<BrandingView> {
  const row = await prisma.brandingSettings.findUnique({ where: { id: "singleton" } });
  return {
    logoDataUrl: row?.logoDataUrl ?? null,
    faviconDataUrl: row?.faviconDataUrl ?? null,
    appName: row?.appName ?? null,
  };
}

export async function updateBranding(patch: Partial<BrandingView>): Promise<void> {
  await prisma.brandingSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...patch },
    update: patch,
  });
}

/** Haalt content-type + ruwe bytes uit een branding-data-URL (favicon/logo). Gedeeld door de serve-routes hieronder in /api/branding/*. */
export function decodeBrandingDataUrl(dataUrl: string | null): { contentType: string; buffer: Buffer } | null {
  const match = dataUrl ? /^data:([^;]+);base64,(.+)$/.exec(dataUrl) : null;
  if (!match) return null;
  const [, contentType, base64] = match;
  return { contentType, buffer: Buffer.from(base64, "base64") };
}
