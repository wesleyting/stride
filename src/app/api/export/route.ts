import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return Response.json({ error: "Sign in to export your data." }, { status: 401 });

  const userId = auth.user.id;
  const [profile, activities, items, entries, folders, references, resources] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("activities").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("items").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("entries").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("song_folders").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("song_references").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("song_resources").select("id, item_id, file_name, mime_type, is_public, created_at").eq("user_id", userId).order("created_at"),
  ]);

  const failed = [profile, activities, items, entries, folders, references, resources].find((result) => result.error);
  if (failed?.error) return Response.json({ error: "Your export could not be prepared. Confirm all database migrations are installed." }, { status: 500 });

  const body = JSON.stringify({
    exported_at: new Date().toISOString(),
    account: { id: userId, email: auth.user.email ?? null, anonymous: auth.user.is_anonymous === true },
    profile: profile.data,
    activities: activities.data ?? [],
    songs: items.data ?? [],
    practice_logs: entries.data ?? [],
    folders: folders.data ?? [],
    reference_links: references.data ?? [],
    media: resources.data ?? [],
    note: "Uploaded image, audio, and video files are not embedded in this JSON export.",
  }, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="stride-export-${date}.json"`, "Cache-Control": "private, no-store" } });
}
