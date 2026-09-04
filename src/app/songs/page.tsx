import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { SongLibrary } from "@/components/stride/song-library";
import { requireUser } from "@/lib/auth";
import type { EntryRecord, ItemRecord } from "@/lib/stride";
import { signOutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SongsPage() {
  const { supabase, user } = await requireUser("/songs");
  const activity = await supabase.from("activities").select("id").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activity.error) throw activity.error;
  let songs: ItemRecord[] = [];
  let entries: EntryRecord[] = [];
  if (activity.data) {
    const [base, extension, entryResult] = await Promise.all([
      supabase.from("items").select("id, activity_id, name, slug, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("is_archived", false).order("name"),
      supabase.from("items").select("id, is_favorite, pin_position, youtube_url, tuning, capo").eq("user_id", user.id).eq("activity_id", activity.data.id),
      supabase.from("entries").select("id, activity_id, item_id, content, rating, practice_part, created_at").eq("user_id", user.id).eq("activity_id", activity.data.id).order("created_at", { ascending: false }),
    ]);
    if (base.error) throw base.error;
    if (entryResult.error) throw entryResult.error;
    let extensionRows = extension.data ?? [];
    if (extension.error?.code === "42703") {
      const fallback = await supabase.from("items").select("id, is_favorite, youtube_url").eq("user_id", user.id).eq("activity_id", activity.data.id);
      extensionRows = (fallback.data ?? []).map((row) => ({ ...row, pin_position: null, tuning: "standard", capo: null }));
    }
    const extended = new Map(extensionRows.map((row) => [row.id, row]));
    songs = (base.data ?? []).map((song) => ({ ...song, is_favorite: extended.get(song.id)?.is_favorite ?? false, pin_position: extended.get(song.id)?.pin_position ?? null, youtube_url: extended.get(song.id)?.youtube_url ?? "", tuning: extended.get(song.id)?.tuning ?? "standard", capo: extended.get(song.id)?.capo ?? null })) as ItemRecord[];
    entries = (entryResult.data ?? []) as EntryRecord[];
  }

  return <AppFrame showSidebar sidebarFooter={<form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100">Sign out</button></form>}><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8"><header className="flex items-start justify-between gap-4"><h1 className="text-2xl font-semibold tracking-tight text-stone-950">All songs</h1><CreateItemModal activitySlug="guitar" activityKind="practice" /></header><SongLibrary songs={songs} entries={entries} /></main></AppFrame>;
}
