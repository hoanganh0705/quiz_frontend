import { PUBLIC_SITEMAP_ROUTES } from "@/shared/config/routes";
import { siteConfig } from "@/shared/lib/seo";

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_SITEMAP_ROUTES.map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
