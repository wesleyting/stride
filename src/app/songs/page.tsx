import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { SongLibrary } from "@/components/stride/song-library";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { SongFolderManager } from "@/components/stride/song-folder-manager";
import { requireUser } from "@/lib/auth";
import type { ItemRecord, SongFolderRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function SongsPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const { supabase, user } = await requireUser("/songs");
  const preferencesResult = user.is_anonymous ? { data: null } : await supabase.from("profiles").select("default_song_public, default_tuning").eq("user_id", user.id).maybeSingle();
  const activity = await supabase.from("activities").select("id").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activity.error) throw activity.error;
  let songs: ItemRecord[] = [];
  let folders: SongFolderRecord[] = [];
  let referencesBySong: Record<string, string[]> = {};
  let foldersReady = true;
  if (activity.data) {
    const [base, extension, folderResult, referenceResult] = await Promise.all([
      supabase.from("items").select("id, activity_id, name, slug, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("is_archived", false).order("name"),
      supabase.from("items").select("id, is_favorite, pin_position, youtube_url, tuning, capo, folder_id, is_hidden").eq("user_id", user.id).eq("activity_id", activity.data.id),
      supabase.from("song_folders").select("id, activity_id, parent_id, name, sort_order, created_at").eq("user_id", user.id).eq("activity_id", activity.data.id).order("sort_order").order("name"),
      supabase.from("song_references").select("item_id, url, sort_order").eq("user_id", user.id).order("sort_order"),
    ]);
    if (base.error) throw base.error;
    let extensionRows = extension.data ?? [];
    if (extension.error?.code === "42703") {
      const fallback = await supabase.from("items").select("id, is_favorite, pin_position, youtube_url, tuning, capo, folder_id").eq("user_id", user.id).eq("activity_id", activity.data.id);
      if (fallback.error?.code === "42703") {
        const legacyFallback = await supabase.from("items").select("id, is_favorite, youtube_url").eq("user_id", user.id).eq("activity_id", activity.data.id);
        extensionRows = (legacyFallback.data ?? []).map((row) => ({ ...row, pin_position: null, tuning: "standard", capo: null, folder_id: null, is_hidden: false }));
      } else {
        extensionRows = (fallback.data ?? []).map((row) => ({ ...row, is_hidden: false }));
      }
    }
    foldersReady = !folderResult.error;
    folders = (folderResult.data ?? []) as SongFolderRecord[];
    const extended = new Map(extensionRows.map((row) => [row.id, row]));
    songs = (base.data ?? []).map((song) => ({ ...song, is_favorite: extended.get(song.id)?.is_favorite ?? false, pin_position: extended.get(song.id)?.pin_position ?? null, youtube_url: extended.get(song.id)?.youtube_url ?? "", tuning: extended.get(song.id)?.tuning ?? "standard", capo: extended.get(song.id)?.capo ?? null, folder_id: extended.get(song.id)?.folder_id ?? null, is_hidden: extended.get(song.id)?.is_hidden ?? false })) as ItemRecord[];
    if (!referenceResult.error) referencesBySong = (referenceResult.data ?? []).reduce<Record<string, string[]>>((groups, reference) => { (groups[reference.item_id] ??= []).push(reference.url); return groups; }, {});
    else referencesBySong = Object.fromEntries(songs.filter((song) => song.youtube_url).map((song) => [song.id, [song.youtube_url]]));
  }

  const isGuest = user.is_anonymous === true;
  const libraryKey = [...folders.map((folder) => `${folder.id}:${folder.parent_id ?? "root"}:${folder.sort_order}`), ...songs.map((song) => `${song.id}:${song.folder_id ?? "none"}:${song.sort_order}:${song.is_hidden}`)].join("|");
  return <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn isGuest={isGuest} next="/songs" />}><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8"><header className="flex items-start justify-between gap-4"><h1 className="text-2xl font-semibold tracking-tight text-stone-950">All songs</h1><div className="flex gap-2"><SongFolderManager folders={folders} ready={foldersReady} /><CreateItemModal activitySlug="guitar" activityKind="practice" isGuest={isGuest} folders={foldersReady ? folders : undefined} defaultSongPublic={preferencesResult.data?.default_song_public ?? false} defaultTuning={preferencesResult.data?.default_tuning ?? "standard"} /></div></header><SongLibrary key={libraryKey} songs={songs} folders={folders} foldersReady={foldersReady} referencesBySong={referencesBySong} addedSongSlug={added} isGuest={isGuest} defaultSongPublic={preferencesResult.data?.default_song_public ?? false} defaultTuning={preferencesResult.data?.default_tuning ?? "standard"} /></main></AppFrame>;
}
