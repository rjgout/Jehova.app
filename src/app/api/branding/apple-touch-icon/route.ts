import { NextRequest, NextResponse } from "next/server";
import { getBranding, decodeBrandingDataUrl } from "@/lib/branding";

// Zelfde idee als /api/branding/favicon, maar dan voor het icoon dat iOS
// gebruikt bij "Voeg toe aan beginscherm": Safari negeert daarvoor de
// gewone favicon/manifest-icons en kijkt specifiek naar <link
// rel="apple-touch-icon"> (zie generateMetadata in layout.tsx) — zonder
// deze eigen route zou een via de adminbackend ingesteld favicon dus nooit
// op het beginscherm van een iPhone verschijnen. Zonder eigen favicon
// wordt gewoon doorverwezen naar het standaardbestand.
export async function GET(req: NextRequest) {
  const { faviconDataUrl } = await getBranding();
  const decoded = decodeBrandingDataUrl(faviconDataUrl);
  if (!decoded) {
    return NextResponse.redirect(new URL("/icons/icon-192.png", req.nextUrl.origin));
  }

  return new NextResponse(decoded.buffer, {
    headers: {
      "Content-Type": decoded.contentType,
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
