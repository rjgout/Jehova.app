import { NextRequest, NextResponse } from "next/server";
import { getBranding, decodeBrandingDataUrl } from "@/lib/branding";

// Publieke route (geen auth) die het door de admin ingestelde favicon
// serveert als binair beeld met het juiste Content-Type — een <link
// rel="icon"> kan niet rechtstreeks naar een data-URL uit de database
// wijzen op een manier die browsers betrouwbaar verversen, dus dit is de
// tussenlaag (zie generateMetadata in layout.tsx). Zonder eigen favicon
// wordt gewoon doorverwezen naar het standaardbestand.
export async function GET(req: NextRequest) {
  const { faviconDataUrl } = await getBranding();
  const decoded = decodeBrandingDataUrl(faviconDataUrl);
  if (!decoded) {
    // Niet terugverwijzen naar /favicon.ico: de reverse proxy stuurt dat pad
    // juist naar deze route door, waardoor zonder branding een redirectlus
    // zou ontstaan.
    return NextResponse.redirect(new URL("/icons/icon-192.png", req.nextUrl.origin));
  }

  return new NextResponse(decoded.buffer, {
    headers: {
      "Content-Type": decoded.contentType,
      // Een beheerder moet een nieuw icoon meteen kunnen zien; browsers en de
      // reverse proxy mogen de oude branding daarom niet opnieuw gebruiken.
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
