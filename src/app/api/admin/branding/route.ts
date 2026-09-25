import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getBranding, updateBranding, isValidBrandingDataUrl } from "@/lib/branding";
import { apiError } from "@/lib/apiError";

const dataUrlField = z
  .string()
  .refine(isValidBrandingDataUrl, "Ongeldig of te groot afbeeldingsbestand.")
  .nullable()
  .optional();

const schema = z.object({
  logoDataUrl: dataUrlField,
  heroLogoDataUrl: dataUrlField,
  faviconDataUrl: dataUrlField,
  appName: z
    .string()
    .max(40, "Maximaal 40 tekens.")
    .transform((v) => v.trim() || null)
    .nullable()
    .optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  return NextResponse.json(await getBranding());
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return await apiError("apiErrors.nothingToSave", 400);
  }

  await updateBranding(parsed.data);
  return NextResponse.json(await getBranding());
}
