import type { MetadataRoute } from "next";

const PUBLIC_PATHS = ["/", "/privacy", "/cookies"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL?.trim() || "https://jehova.app";

  return PUBLIC_PATHS.map((path) => ({
    url: new URL(path, `${baseUrl}/`).toString(),
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.3,
  }));
}
