import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, ExternalLink, Flame, Music2 } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { HomeSongsModal } from "@/components/stride/home-songs-modal";
import { HomeSongPreviewModal } from "@/components/stride/home-song-preview-modal";
import { GuestSavePrompt } from "@/components/stride/guest-save-prompt";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { StartPracticeTimerButton } from "@/components/stride/practice-timer";
import { SongWorkspaceModal } from "@/components/stride/song-workspace-modal";
import { SignedOutDashboard } from "@/components/stride/signed-out-dashboard";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { buttonVariants } from "@/components/ui/button";
import { getUser, isAccountSetupPending } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculatePracticeStreak, entriesWithinDays, formatCompactLogDate, formatTrackedTime, titleCaseSongName, type EntryRecord, type ItemRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";
type ItemExtension = Pick<ItemRecord, "id" | "is_favorite" | "pin_position" | "youtube_url" | "tuning" | "capo">;

export default async function GuitarDashboard({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const auth = await getUser();
  if (!auth.user) return <SignedOutDashboard guestUnavailable={query.guest === "unavailable"} />;
  if (isAccountSetupPending(auth.user)) redirect("/finish-sign-up?next=%2F");
  const { supabase, user } = auth;
  const isGuest = user.is_anonymous === true;
  const openAddSong = query.action === "add-song";
  const activityResult = await supabase.from("activities").select("id, name, slug, kind").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activityResult.error) throw activityResult.error;
  const guitar = activityResult.data;
  let songs: ItemRecord[] = [];
  let entries: EntryRecord[] = [];
  let workspaceReady = true;
  let pinOrderingReady = true;
  let timeTrackingReady = true;

  if (guitar) {
    const [itemsResult, entriesResult, extensionResult, durationResult] = await Promise.all([
      supabase.from("items").select("id, activity_id, name, slug, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", guitar.id).eq("is_archived", false).order("sort_order"),
      supabase.from("entries").select("id, activity_id, item_id, content, rating, practice_part, created_at").eq("user_id", user.id).eq("activity_id", guitar.id).order("created_at", { ascending: false }),
      supabase.from("items").select("id, is_favorite, pin_position, youtube_url, tuning, capo").eq("user_id", user.id).eq("activity_id", guitar.id),
      supabase.from("entries").select("id, duration_seconds").eq("user_id", user.id).eq("activity_id", guitar.id),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (entriesResult.error) throw entriesResult.error;
    let extensionRows = extensionResult.data ?? [];
    if (extensionResult.error?.code === "42703") {
      const fallback = await supabase.from("items").select("id, is_favorite, youtube_url").eq("user_id", user.id).eq("activity_id", guitar.id);
      extensionRows = (fallback.data ?? []).map((row) => ({ ...row, pin_position: null, tuning: "standard", capo: null }));
      workspaceReady = !fallback.error;
      pinOrderingReady = false;
    } else workspaceReady = !extensionResult.error;
    timeTrackingReady = !durationResult.error;
    const extensionById = new Map(extensionRows.map((row) => [row.id, row as ItemExtension]));
    songs = (itemsResult.data ?? []).map((song) => ({ ...song, is_favorite: extensionById.get(song.id)?.is_favorite ?? false, pin_position: extensionById.get(song.id)?.pin_position ?? null, youtube_url: extensionById.get(song.id)?.youtube_url ?? "", tuning: extensionById.get(song.id)?.tuning ?? "standard", capo: extensionById.get(song.id)?.capo ?? null })) as ItemRecord[];
    const durationById = new Map((durationResult.data ?? []).map((entry) => [entry.id, entry.duration_seconds]));
    entries = (entriesResult.data ?? []).map((entry) => ({ ...entry, duration_seconds: durationById.get(entry.id) ?? null })) as EntryRecord[];
  }

  const latestBySong = new Map<string, EntryRecord>();
  entries.forEach((entry) => { if (entry.item_id && !latestBySong.has(entry.item_id)) latestBySong.set(entry.item_id, entry); });
  const favoriteSongs = songs.filter((song) => song.is_favorite).sort((a, b) => (a.pin_position ?? Number.MAX_SAFE_INTEGER) - (b.pin_position ?? Number.MAX_SAFE_INTEGER));
  const weekEntries = entriesWithinDays(entries, 7);
  const streak = calculatePracticeStreak(entries.map((entry) => entry.created_at));
  const trackedSecondsThisWeek = weekEntries.reduce((total, entry) => total + (entry.duration_seconds ?? 0), 0);

  return (
    <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn isGuest={isGuest} next="/" />}>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Guitar</h1>
          <CreateItemModal activitySlug="guitar" activityKind="practice" defaultOpen={openAddSong} createdFrom="home" isGuest={isGuest} />
        </header>

        {isGuest && songs.length ? <div className="mt-5"><GuestSavePrompt /></div> : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Practice overview"><Metric icon={Flame} value={streak ? `${streak} day${streak === 1 ? "" : "s"}` : "Start today"} label="Current practice streak" /><Metric icon={CalendarDays} value={`${weekEntries.length}`} label="Sessions in the last 7 days" /><Metric icon={Clock3} value={formatTrackedTime(trackedSecondsThisWeek)} label="Tracked practice this week" /></section>
        {!workspaceReady ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run Supabase migration <code>0006_guitar_workspace.sql</code> to enable favorites, next steps, and song images.</div> : null}
        {workspaceReady && !pinOrderingReady ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run Supabase migration <code>0013_pinned_song_order.sql</code> to save your custom pin order.</div> : null}
        {!timeTrackingReady ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run Supabase migration <code>0007_practice_time_and_public_profiles.sql</code> to save timer sessions and tracked practice time.</div> : null}

        <section className="mt-8" aria-labelledby="home-songs-heading">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="home-songs-heading" className="text-base font-semibold text-stone-950">Pinned</h2><div className="flex gap-2">{songs.length ? <HomeSongsModal songs={songs} /> : null}<Link href="/songs" className={buttonVariants({ variant: "ghost" })}>All songs <ChevronRight data-icon="inline-end" aria-hidden="true" /></Link></div></div>
          {songs.length === 0 ? <EmptyLibrary isGuest={isGuest} /> : favoriteSongs.length === 0 ? <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-5"><p className="text-sm font-medium text-stone-700">Pin songs for quick access.</p><HomeSongsModal songs={songs} /></div> : <div className="mt-4 grid gap-3 xl:grid-cols-2">{favoriteSongs.map((song) => <SongCard key={song.id} song={song} latest={latestBySong.get(song.id)} entries={entries} />)}</div>}
        </section>

      </main>
    </AppFrame>
  );
}

function SongCard({ song, latest, entries }: { song: ItemRecord; latest?: EntryRecord; entries: EntryRecord[] }) {
  const parts = entries.filter((entry) => entry.item_id === song.id && entry.practice_part).map((entry) => entry.practice_part!);
  return <article className="grid min-h-40 grid-rows-[auto_1fr] rounded-xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm focus-within:border-stone-400"><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3 border-b border-stone-100 pb-3"><Link href={`/songs/${song.slug}?from=home`} className="group/title -m-2 flex min-h-14 min-w-0 flex-col justify-center rounded-lg p-2 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500"><h3 className="truncate text-base font-semibold text-stone-950 group-hover/title:underline">{titleCaseSongName(song.name)}</h3><p className="mt-1 truncate text-xs text-stone-500">{latest ? <><span className="font-medium text-stone-600">Last logged:</span> {formatCompactLogDate(latest.created_at)}</> : "Not logged yet"}</p></Link><div className="self-center justify-self-end">{song.youtube_url ? <a href={song.youtube_url} target="_blank" rel="noreferrer" title="Open YouTube" className={buttonVariants({ variant: "ghost", size: "sm" })}>YouTube<ExternalLink data-icon="inline-end" aria-hidden="true" /></a> : <SongWorkspaceModal itemId={song.id} itemSlug={song.slug} youtubeUrl={song.youtube_url} />}</div></div><div className="mt-3 grid content-end gap-3"><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><StartPracticeTimerButton itemId={song.id} itemSlug={song.slug} itemName={titleCaseSongName(song.name)} compact /><DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} /><div className="justify-self-end"><HomeSongPreviewModal song={song} entries={entries} /></div></div><div className="[&>button]:w-full"><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={song.slug} itemName={titleCaseSongName(song.name)} hasHistory={Boolean(latest)} previousParts={parts} currentYoutubeUrl={song.youtube_url} /></div></div></article>;
}

function EmptyLibrary({ isGuest }: { isGuest: boolean }) {
  return <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-stone-200"><Music2 className="size-5 text-stone-600" aria-hidden="true" /></span><h3 className="mt-4 text-base font-semibold text-stone-950">Add Your First Song</h3><div className="mt-4 flex justify-center"><CreateItemModal activitySlug="guitar" activityKind="practice" createdFrom="home" isGuest={isGuest} /></div></div>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-stone-100"><Icon className="size-4 text-stone-600" aria-hidden="true" /></span><div><p className="text-base font-semibold text-stone-950">{value}</p><p className="text-xs text-stone-500">{label}</p></div></div></div>;
}
