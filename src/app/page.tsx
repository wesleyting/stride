import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, ExternalLink, Flame, Music2 } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { HomeSongsModal } from "@/components/stride/home-songs-modal";
import { HomeSongPreviewModal } from "@/components/stride/home-song-preview-modal";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { StartPracticeTimerButton } from "@/components/stride/practice-timer";
import { SongWorkspaceModal } from "@/components/stride/song-workspace-modal";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { calculatePracticeStreak, entriesWithinDays, formatCompactLogDate, formatTrackedTime, titleCaseSongName, type EntryRecord, type ItemRecord } from "@/lib/stride";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";
type ItemExtension = Pick<ItemRecord, "id" | "is_favorite" | "next_action" | "youtube_url">;

export default async function GuitarDashboard() {
  const { supabase, user } = await requireUser();
  const activityResult = await supabase.from("activities").select("id, name, slug, kind").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activityResult.error) throw activityResult.error;
  const guitar = activityResult.data;
  let songs: ItemRecord[] = [];
  let entries: EntryRecord[] = [];
  let workspaceReady = true;
  let timeTrackingReady = true;

  if (guitar) {
    const [itemsResult, entriesResult, extensionResult, durationResult] = await Promise.all([
      supabase.from("items").select("id, activity_id, name, slug, description, focus, going_well, still_working_on, confidence, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", guitar.id).eq("is_archived", false).order("sort_order"),
      supabase.from("entries").select("id, activity_id, item_id, content, rating, practice_part, created_at").eq("user_id", user.id).eq("activity_id", guitar.id).order("created_at", { ascending: false }),
      supabase.from("items").select("id, is_favorite, next_action, youtube_url").eq("user_id", user.id).eq("activity_id", guitar.id),
      supabase.from("entries").select("id, duration_seconds").eq("user_id", user.id).eq("activity_id", guitar.id),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (entriesResult.error) throw entriesResult.error;
    workspaceReady = !extensionResult.error;
    timeTrackingReady = !durationResult.error;
    const extensionById = new Map((extensionResult.data ?? []).map((row) => [row.id, row as ItemExtension]));
    songs = (itemsResult.data ?? []).map((song) => ({ ...song, is_favorite: extensionById.get(song.id)?.is_favorite ?? false, next_action: extensionById.get(song.id)?.next_action ?? "", youtube_url: extensionById.get(song.id)?.youtube_url ?? "" })) as ItemRecord[];
    const durationById = new Map((durationResult.data ?? []).map((entry) => [entry.id, entry.duration_seconds]));
    entries = (entriesResult.data ?? []).map((entry) => ({ ...entry, duration_seconds: durationById.get(entry.id) ?? null })) as EntryRecord[];
  }

  const latestBySong = new Map<string, EntryRecord>();
  entries.forEach((entry) => { if (entry.item_id && !latestBySong.has(entry.item_id)) latestBySong.set(entry.item_id, entry); });
  const favoriteSongs = songs.filter((song) => song.is_favorite);
  const weekEntries = entriesWithinDays(entries, 7);
  const streak = calculatePracticeStreak(entries.map((entry) => entry.created_at));
  const trackedSecondsThisWeek = weekEntries.reduce((total, entry) => total + (entry.duration_seconds ?? 0), 0);

  return (
    <AppFrame showSidebar sidebarFooter={<form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign out</button></form>}>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Guitar</h1>
          <CreateItemModal activitySlug="guitar" activityKind="practice" />
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Practice overview"><Metric icon={Flame} value={streak ? `${streak} day${streak === 1 ? "" : "s"}` : "Start today"} label="Current practice streak" /><Metric icon={CalendarDays} value={`${weekEntries.length}`} label="Sessions in the last 7 days" /><Metric icon={Clock3} value={formatTrackedTime(trackedSecondsThisWeek)} label="Tracked practice this week" /></section>
        {!workspaceReady ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run Supabase migration <code>0006_guitar_workspace.sql</code> to enable favorites, next steps, and song images.</div> : null}
        {!timeTrackingReady ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run Supabase migration <code>0007_practice_time_and_public_profiles.sql</code> to save timer sessions and tracked practice time.</div> : null}

        <section className="mt-8" aria-labelledby="home-songs-heading">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="home-songs-heading" className="text-base font-semibold text-stone-950">Pinned</h2><div className="flex gap-2">{songs.length ? <HomeSongsModal songs={songs} /> : null}<Link href="/songs" className={buttonVariants({ variant: "ghost" })}>All songs <ChevronRight data-icon="inline-end" aria-hidden="true" /></Link></div></div>
          {songs.length === 0 ? <EmptyLibrary /> : favoriteSongs.length === 0 ? <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-5"><p className="text-sm font-medium text-stone-700">Pin songs for quick access.</p><HomeSongsModal songs={songs} /></div> : <div className="mt-4 grid gap-3 xl:grid-cols-2">{favoriteSongs.map((song) => <SongCard key={song.id} song={song} latest={latestBySong.get(song.id)} entries={entries} />)}</div>}
        </section>

      </main>
    </AppFrame>
  );
}

function SongCard({ song, latest, entries }: { song: ItemRecord; latest?: EntryRecord; entries: EntryRecord[] }) {
  const parts = entries.filter((entry) => entry.item_id === song.id && entry.practice_part).map((entry) => entry.practice_part!);
  return <article className="group grid min-h-36 grid-rows-[auto_1fr] rounded-xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm focus-within:border-stone-400"><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"><HomeSongPreviewModal song={song} entries={entries} /><DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} /><div className="justify-self-end">{song.youtube_url ? <a href={song.youtube_url} target="_blank" rel="noreferrer" title="Open YouTube" className={buttonVariants({ variant: "ghost", size: "sm" })}>YouTube<ExternalLink data-icon="inline-end" aria-hidden="true" /></a> : <SongWorkspaceModal itemId={song.id} itemSlug={song.slug} nextAction={song.next_action} youtubeUrl={song.youtube_url} description={song.description} mode="youtube" />}</div></div><div className="mt-4 grid content-end gap-2 border-t border-stone-100 pt-3"><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><StartPracticeTimerButton itemId={song.id} itemSlug={song.slug} itemName={titleCaseSongName(song.name)} compact /><span className="min-w-0 truncate text-center text-xs text-stone-500">{latest ? <><span className="font-medium text-stone-600">Last logged:</span> {formatCompactLogDate(latest.created_at)}</> : "Not logged yet"}</span><Link href={`/songs/${song.slug}?from=home`} className={buttonVariants({ variant: "ghost", size: "sm", className: "justify-self-end" })}>View Details<ChevronRight data-icon="inline-end" aria-hidden="true" /></Link></div><div className="[&>button]:w-full"><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={song.slug} itemName={titleCaseSongName(song.name)} hasHistory={Boolean(latest)} previousParts={parts} currentYoutubeUrl={song.youtube_url} /></div></div></article>;
}

function EmptyLibrary() {
  return <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-stone-200"><Music2 className="size-5 text-stone-600" aria-hidden="true" /></span><h3 className="mt-4 text-base font-semibold text-stone-950">Add Your First Song</h3><div className="mt-4 flex justify-center"><CreateItemModal activitySlug="guitar" activityKind="practice" /></div></div>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-stone-100"><Icon className="size-4 text-stone-600" aria-hidden="true" /></span><div><p className="text-base font-semibold text-stone-950">{value}</p><p className="text-xs text-stone-500">{label}</p></div></div></div>;
}
