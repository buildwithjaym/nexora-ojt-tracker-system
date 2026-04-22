import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://nexora-ojt-tracker.online/sitemap.xml",
    host: "https://nexora-ojt-tracker.online",
  };
}