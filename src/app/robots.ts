import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/people/"],
      disallow: ["/settings", "/songs", "/sign-in", "/sign-up", "/guitar"],
    }],
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  };
}
