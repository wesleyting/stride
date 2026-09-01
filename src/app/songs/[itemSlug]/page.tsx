import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { StartPracticeTimerButton } from "@/components/stride/practice-timer";
import { SongResources } from "@/components/stride/song-resources";
import { SongWorkspaceModal } from "@/components/stride/song-workspace-modal";
import { YoutubeReference } from "@/components/stride/youtube-reference";
import { requireUser } from "@/lib/auth";
import { normalizePracticeTags } from "@/lib/practice-tags";
import { entriesWithinDays, formatEntryDisplay, formatTrackedTime, titleCaseSongName, type EntryRecord, type ItemRecord, type SongResourceRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function SongPage({ params, searchParams }: PageProps<"/songs/[itemSlug]">) {
  const { itemSlug } = await params;
  const { from } = await searchParams;
  const openedFromHome = from === "home";
  const returnHref = openedFromHome ? "/" : "/songs";
  const returnLabel = openedFromHome ? "Home" : "All Songs";
  const { supabase, user } = await requireUser();
  const activity = await supabase.from("activities").select("id").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activity.error || !activity.data) redirect("/");

  const [base, extension] = await Promise.all([
    supabase.from("items").select("id, activity_id, name, slug, description, focus, going_well, still_working_on, confidence, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("slug", itemSlug).single(),
    supabase.from("items").select("id, is_favorite, next_action, youtube_url").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("slug", itemSlug).maybeSingle(),
  ]);
  if (base.error || !base.data) redirect("/songs");
  const item = { ...base.data, is_favorite: extension.data?.is_favorite ?? false, next_action: extension.data?.next_action ?? "", youtube_url: extension.data?.youtube_url ?? "" } as ItemRecord;

  const [entriesResult, resourcesResult, durationResult] = await Promise.all([
    supabase.from("entries").select("id, activity_id, item_id, content, rating, practice_part, created_at").eq("user_id", user.id).eq("item_id", item.id).order("created_at", { ascending: false }),
    supabase.from("song_resources").select("id, item_id, storage_path, file_name, mime_type, created_at").eq("user_id", user.id).eq("item_id", item.id).order("created_at", { ascending: false }),
    supabase.from("entries").select("id, duration_seconds").eq("user_id", user.id).eq("item_id", item.id),
  ]);
  if (entriesResult.error) throw entriesResult.error;
  const durationById = new Map((durationResult.data ?? []).map((entry) => [entry.id, entry.duration_seconds]));
  const entries = (entriesResult.data ?? []).map((entry) => ({ ...entry, duration_seconds: durationById.get(entry.id) ?? null })) as EntryRecord[];
  const resourceRows = (resourcesResult.data ?? []) as SongResourceRecord[];
  const resources = await Promise.all(resourceRows.map(async (resource) => {
    const signed = await supabase.storage.from("song-resources").createSignedUrl(resource.storage_path, 3600);
    return { ...resource, signed_url: signed.data?.signedUrl };
  }));
  const priorParts = entries.map((entry) => entry.practice_part).filter((value): value is string => Boolean(value));
  const totalTrackedSeconds = entries.reduce((total, entry) => total + (entry.duration_seconds ?? 0), 0);
  const weekTrackedSeconds = entriesWithinDays(entries, 7).reduce((total, entry) => total + (entry.duration_seconds ?? 0), 0);

  return <AppFrame><main className="px-4 py-6 sm:px-7 sm:py-8">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6">
      <div className="min-w-0"><Link href={returnHref} className="inline-flex items-center gap-1.5 rounded-md text-sm text-stone-500 transition hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><ArrowLeft className="size-4" aria-hidden="true" />{returnLabel}</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight text-stone-950">{titleCaseSongName(item.name)}</h1><FavoriteButton itemId={item.id} initialFavorite={item.is_favorite} /></div><div className="mt-3"><DifficultyControl itemId={item.id} itemSlug={item.slug} activitySlug="guitar" value={item.difficulty} /></div></div>
      <div className="flex flex-wrap items-center justify-end gap-2"><SongWorkspaceModal itemId={item.id} itemSlug={item.slug} nextAction={item.next_action} youtubeUrl={item.youtube_url} description={item.description} /><DeleteItemModal itemId={item.id} activitySlug="guitar" itemName={titleCaseSongName(item.name)} leavePageAfterDelete returnHref={returnHref} /><StartPracticeTimerButton itemId={item.id} itemSlug={item.slug} itemName={titleCaseSongName(item.name)} /><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={item.slug} itemName={titleCaseSongName(item.name)} hasHistory={entries.length > 0} previousParts={priorParts} currentYoutubeUrl={item.youtube_url} /></div>
    </header>

    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white" aria-labelledby="practice-log-heading"><div className="border-b border-stone-200 px-4 py-4 sm:px-5"><h2 id="practice-log-heading" className="text-sm font-semibold text-stone-950">Practice Log</h2></div>{entries.length ? entries.map((entry) => { const date = formatEntryDisplay(entry.created_at); return <article key={entry.id} className="grid gap-5 border-b border-stone-200 px-4 py-5 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)_7rem] sm:px-5"><div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">When</p><p className="mt-1.5 text-sm font-semibold text-stone-900">{date.label}</p><p className="mt-0.5 text-xs text-stone-500">{date.time}</p></div><div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Notes</p>{entry.practice_part ? <div className="mt-1.5 mb-2 flex flex-wrap gap-1">{normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{tag}</span>)}</div> : null}{entry.duration_seconds ? <p className="mt-1.5 inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{formatTrackedTime(entry.duration_seconds)} timed</p> : null}<p className="mt-1.5 text-sm leading-6 text-stone-700">{entry.content}</p></div><div className="sm:text-right"><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Session Rating</p><p className="mt-1.5 text-sm font-semibold tabular-nums text-stone-900">{entry.rating ? `${entry.rating} / 10` : "Not rated"}</p></div></article>; }) : <div className="px-5 py-8"><p className="text-sm font-semibold text-stone-900">No practice logs yet</p><p className="mt-1 text-sm leading-6 text-stone-500">Your first log creates a useful starting point for the next session.</p></div>}</section>
      <div className="grid gap-5"><PracticeTimeSummary totalSeconds={totalTrackedSeconds} weekSeconds={weekTrackedSeconds} ready={!durationResult.error} />{item.youtube_url ? <YoutubeReference url={item.youtube_url} /> : <section className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4"><SongWorkspaceModal itemId={item.id} itemSlug={item.slug} nextAction={item.next_action} youtubeUrl={item.youtube_url} description={item.description} mode="youtube" /></section>}<SongResources itemId={item.id} userId={user.id} initialResources={resources} />{item.description ? <section className="rounded-xl border border-stone-200 bg-white px-4 py-4"><h2 className="text-sm font-semibold text-stone-950">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">{item.description}</p></section> : null}</div>
    </div>
  </main></AppFrame>;
}

function PracticeTimeSummary({ totalSeconds, weekSeconds, ready }: { totalSeconds: number; weekSeconds: number; ready: boolean }) {
  return <section className="rounded-xl border border-stone-200 bg-white px-4 py-4" aria-labelledby="practice-time-heading"><div className="flex items-center gap-2"><Clock3 className="size-4 text-stone-500" aria-hidden="true" /><h2 id="practice-time-heading" className="text-sm font-semibold text-stone-950">Practice Time</h2></div>{ready ? <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xl font-semibold tabular-nums text-stone-950">{formatTrackedTime(weekSeconds)}</p><p className="mt-0.5 text-xs text-stone-500">Last 7 days</p></div><div><p className="text-xl font-semibold tabular-nums text-stone-950">{formatTrackedTime(totalSeconds)}</p><p className="mt-0.5 text-xs text-stone-500">All tracked</p></div></div> : <p className="mt-3 text-xs leading-5 text-amber-800">Run migration 0007 to enable tracked time.</p>}</section>;
}
