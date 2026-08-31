import Link from "next/link";
import { CalendarDays, ChevronRight, Flame, Guitar, Library, Music2 } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { calculatePracticeStreak, entriesWithinDays, formatEntryMoment, type EntryRecord, type ItemRecord } from "@/lib/stride";
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

  if (guitar) {
    const [itemsResult, entriesResult, extensionResult] = await Promise.all([
      supabase.from("items").select("id, activity_id, name, slug, description, focus, going_well, still_working_on, confidence, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", guitar.id).eq("is_archived", false).order("sort_order"),
      supabase.from("entries").select("id, activity_id, item_id, content, rating, practice_part, created_at").eq("user_id", user.id).eq("activity_id", guitar.id).order("created_at", { ascending: false }),
      supabase.from("items").select("id, is_favorite, next_action, youtube_url").eq("user_id", user.id).eq("activity_id", guitar.id),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (entriesResult.error) throw entriesResult.error;
    workspaceReady = !extensionResult.error;
    const extensionById = new Map((extensionResult.data ?? []).map((row) => [row.id, row as ItemExtension]));
    songs = (itemsResult.data ?? []).map((song) => ({ ...song, is_favorite: extensionById.get(song.id)?.is_favorite ?? false, next_action: extensionById.get(song.id)?.next_action ?? "", youtube_url: extensionById.get(song.id)?.youtube_url ?? "" })) as ItemRecord[];
    entries = (entriesResult.data ?? []) as EntryRecord[];
  }

  const latestBySong = new Map<string, EntryRecord>();
  entries.forEach((entry) => { if (entry.item_id && !latestBySong.has(entry.item_id)) latestBySong.set(entry.item_id, entry); });
  const favoriteSongs = songs.filter((song) => song.is_favorite);
  const weekEntries = entriesWithinDays(entries, 7);
  const streak = calculatePracticeStreak(entries.map((entry) => entry.created_at));
  const songsThisWeek = new Set(weekEntries.map((entry) => entry.item_id).filter(Boolean)).size;

  return (
    <AppFrame showSidebar sidebarFooter={<form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign out</button></form>}>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="flex items-center gap-2 text-sm font-medium text-stone-500"><Guitar className="size-4" aria-hidden="true" />Your guitar practice</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Ready when you are</h1><p className="mt-1 text-sm text-stone-600">Pick a song and continue from a clear starting point.</p></div>
          <CreateItemModal activitySlug="guitar" activityKind="practice" />
        </header>

        {entries.length > 0 ? <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Practice overview"><Metric icon={Flame} value={streak ? `${streak} day${streak === 1 ? "" : "s"}` : "Start today"} label="Current practice streak" /><Metric icon={CalendarDays} value={`${weekEntries.length}`} label="Sessions in the last 7 days" /><Metric icon={Music2} value={`${songsThisWeek}`} label="Songs practiced this week" /></section> : null}
        {!workspaceReady ? <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run Supabase migration <code>0006_guitar_workspace.sql</code> to enable favorites, next steps, and song images.</div> : null}

        <section className="mt-8" aria-labelledby="home-songs-heading">
          <div className="flex items-end justify-between gap-4"><div><h2 id="home-songs-heading" className="text-base font-semibold text-stone-950">Your songs</h2><p className="mt-1 text-sm text-stone-500">Favorites stay here for the quickest route into practice.</p></div><Link href="/songs" className={buttonVariants({ variant: "ghost", size: "sm" })}>All songs <ChevronRight data-icon="inline-end" aria-hidden="true" /></Link></div>
          {songs.length === 0 ? <EmptyLibrary /> : favoriteSongs.length === 0 ? <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-5"><div><p className="text-sm font-semibold text-stone-900">Choose what belongs on your home</p><p className="mt-1 text-sm text-stone-600">Favorite the songs you want within immediate reach. Your full library stays uncluttered.</p></div><Link href="/songs" className={buttonVariants({ variant: "outline" })}><Library data-icon="inline-start" aria-hidden="true" />Choose songs</Link></div> : <div className="mt-4 grid gap-3 xl:grid-cols-2">{favoriteSongs.map((song) => <SongCard key={song.id} song={song} latest={latestBySong.get(song.id)} entries={entries} />)}</div>}
        </section>

        {songs.length > 0 && favoriteSongs.some((song) => !song.next_action) ? <aside className="mt-6 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600"><span className="font-semibold text-stone-900">A useful habit:</span> add one “Next time” note on a song page. It gives tomorrow’s practice an obvious starting point without asking you to reread the log.</aside> : null}
      </main>
    </AppFrame>
  );
}

function SongCard({ song, latest, entries }: { song: ItemRecord; latest?: EntryRecord; entries: EntryRecord[] }) {
  const parts = entries.filter((entry) => entry.item_id === song.id && entry.practice_part).map((entry) => entry.practice_part!);
  return <article className="group rounded-xl border border-stone-200 bg-white p-4 transition hover:border-stone-300 hover:shadow-sm focus-within:border-stone-400"><div className="flex items-start justify-between gap-3"><Link href={`/songs/${song.slug}`} className="min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-stone-500"><h3 className="truncate text-base font-semibold text-stone-950 group-hover:underline">{song.name}</h3>{song.next_action ? <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-stone-700"><span className="font-semibold">Next:</span> {song.next_action}</p> : <p className="mt-1.5 text-sm text-stone-500">Open the song to set a clear next step.</p>}</Link><FavoriteButton itemId={song.id} initialFavorite compact /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3"><div className="flex items-center gap-3"><DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} />{latest ? <span className="text-xs text-stone-500">Last log {formatEntryMoment(latest.created_at)}</span> : <span className="text-xs text-amber-700">No practice logged yet</span>}</div><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={song.slug} itemName={song.name} hasHistory={Boolean(latest)} previousParts={parts} /></div></article>;
}

function EmptyLibrary() {
  return <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-stone-200"><Music2 className="size-5 text-stone-600" aria-hidden="true" /></span><h3 className="mt-4 text-base font-semibold text-stone-950">Add the first song you want to play</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-stone-600">Just give it a name and rough difficulty. Everything else can wait until it becomes useful.</p><div className="mt-4 flex justify-center"><CreateItemModal activitySlug="guitar" activityKind="practice" /></div></div>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-stone-100"><Icon className="size-4 text-stone-600" aria-hidden="true" /></span><div><p className="text-base font-semibold text-stone-950">{value}</p><p className="text-xs text-stone-500">{label}</p></div></div></div>;
}
