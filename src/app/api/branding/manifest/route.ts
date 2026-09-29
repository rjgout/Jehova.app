import { NextResponse } from "next/server";
import { getBranding, decodeBrandingDataUrl } from "@/lib/branding";

export async function GET() {
  const branding = await getBranding();
  const customIcon = decodeBrandingDataUrl(branding.faviconDataUrl);
  const icons = customIcon
    ? [{ src: "/api/branding/favicon", sizes: "any", type: customIcon.contentType, purpose: "any" }]
    : [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];
  return NextResponse.json(
    {
      name: branding.appName ?? "Versado",
      short_name: branding.appName ?? "Versado",
      description: "Schriftstudie op een speelse, motiverende manier.",
      start_url: "/",
      scope: "/",
      id: "/",
      display: "standalone",
      background_color: "#eef6ff",
      theme_color: "#1565c0",
      orientation: "portrait-primary",
      lang: "nl",
      icons,
    },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
  );
}
