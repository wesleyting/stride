import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
type PublicProfileSitemapRow = { username: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const profiles = await supabase.rpc("list_public_profiles");
  if (profiles.error) return [];

  const siteUrl = getSiteUrl();
  return ((profiles.data ?? []) as PublicProfileSitemapRow[]).map((profile) => ({
    url: new URL(`/people/${profile.username}`, siteUrl).toString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}
