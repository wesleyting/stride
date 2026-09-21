import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronDown, Clock3 } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { EditItemModal } from "@/components/stride/edit-item-modal";
import { EditPracticeEntryModal } from "@/components/stride/edit-practice-entry-modal";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { LocalDateTime } from "@/components/stride/local-date-time";
import { StartPracticeTimerButton } from "@/components/stride/practice-timer";
import { SongResources } from "@/components/stride/song-resources";
import { SongShareControl } from "@/components/stride/song-share-control";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { SongWorkspaceModal } from "@/components/stride/song-workspace-modal";
import { SongSetup } from "@/components/stride/song-setup";
import { SongReferences } from "@/components/stride/youtube-reference";
import { requireUser } from "@/lib/auth";
import { normalizePracticeTags } from "@/lib/practice-tags";
import { entriesWithinDays, formatPracticeDuration, formatTrackedTime, titleCaseSongName, type EntryRecord, type ItemRecord, type SongFolderRecord, type SongResourceRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function SongPage({ params, searchParams }: PageProps<"/songs/[itemSlug]">) {
  const { itemSlug } = await params;
  const { from } = await searchParams;
  const openedFromHome = from === "home";
  const returnHref = openedFromHome ? "/" : "/songs";
  const returnLabel = openedFromHome ? "Home" : "All Songs";
  const { supabase, user } = await requireUser(`/songs/${itemSlug}${openedFromHome ? "?from=home" : ""}`);
  const isGuest = user.is_anonymous === true;
  const activity = await supabase.from("activities").select("id").eq("user_id", user.id).eq("slug", "guitar").maybeSingle();
  if (activity.error || !activity.data) redirect("/");

  const [base, extension] = await Promise.all([
    supabase.from("items").select("id, activity_id, name, slug, difficulty, sort_order, is_archived, created_at, updated_at").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("slug", itemSlug).single(),
    supabase.from("items").select("id, is_favorite, youtube_url, tuning, capo, folder_id").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("slug", itemSlug).maybeSingle(),
  ]);
  if (base.error || !base.data) notFound();
  let extensionData = extension.data;
  if (extension.error?.code === "42703") {
    const fallback = await supabase.from("items").select("id, is_favorite, youtube_url").eq("user_id", user.id).eq("activity_id", activity.data.id).eq("slug", itemSlug).maybeSingle();
    extensionData = fallback.data ? { ...fallback.data, tuning: "standard", capo: null, folder_id: null } : null;
  }
  const item = { ...base.data, is_favorite: extensionData?.is_favorite ?? false, pin_position: null, youtube_url: extensionData?.youtube_url ?? "", tuning: extensionData?.tuning ?? "standard", capo: extensionData?.capo ?? null, folder_id: extensionData?.folder_id ?? null, is_hidden: false } as ItemRecord;

  const [entriesResult, resourcesResult, durationResult, visibilityResult, profileResult, foldersResult, referencesResult] = await Promise.all([
    supabase.from("entries").select("id, activity_id, item_id, content, rating, practice_part, created_at").eq("user_id", user.id).eq("item_id", item.id).order("created_at", { ascending: false }),
    supabase.from("song_resources").select("id, item_id, storage_path, file_name, mime_type, is_public, created_at").eq("user_id", user.id).eq("item_id", item.id).order("created_at", { ascending: false }),
    supabase.from("entries").select("id, duration_seconds").eq("user_id", user.id).eq("item_id", item.id),
    supabase.from("items").select("is_public").eq("user_id", user.id).eq("id", item.id).maybeSingle(),
    supabase.from("profiles").select("username, is_public, default_resource_public").eq("user_id", user.id).maybeSingle(),
    supabase.from("song_folders").select("id, activity_id, name, sort_order, created_at").eq("user_id", user.id).eq("activity_id", activity.data.id).order("sort_order").order("name"),
    supabase.from("song_references").select("url, sort_order").eq("user_id", user.id).eq("item_id", item.id).order("sort_order"),
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
  const folders = (foldersResult.data ?? []) as SongFolderRecord[];
  const referenceUrls = referencesResult.error ? (item.youtube_url ? [item.youtube_url] : []) : (referencesResult.data ?? []).map((reference) => reference.url);

  return <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn isGuest={isGuest} next={`/songs/${itemSlug}`} />}><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
    <header className="border-b border-stone-200 pb-6">
      <Link href={returnHref} className="inline-flex items-center gap-1.5 rounded-md text-sm text-stone-500 transition hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><ArrowLeft className="size-4" aria-hidden="true" />{returnLabel}</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight text-stone-950">{titleCaseSongName(item.name)}</h1><FavoriteButton itemId={item.id} initialFavorite={item.is_favorite} /></div><div className="mt-3 flex flex-wrap items-center gap-3"><DifficultyControl itemId={item.id} itemSlug={item.slug} activitySlug="guitar" value={item.difficulty} /><SongSetup tuning={item.tuning} capo={item.capo} /></div></div>
        <div className="flex flex-wrap items-center justify-end gap-2"><SongShareControl itemId={item.id} itemSlug={item.slug} itemName={titleCaseSongName(item.name)} username={profileResult.data?.username ?? null} profilePublic={profileResult.data?.is_public ?? false} initialPublic={visibilityResult.data?.is_public ?? false} isGuest={isGuest} /><EditItemModal itemId={item.id} itemSlug={item.slug} activitySlug="guitar" itemName={titleCaseSongName(item.name)} difficulty={item.difficulty} youtubeUrl={item.youtube_url} referenceUrls={referenceUrls} tuning={item.tuning} capo={item.capo} folderId={item.folder_id} folders={folders} showLabel /><DeleteItemModal itemId={item.id} activitySlug="guitar" itemName={titleCaseSongName(item.name)} leavePageAfterDelete returnHref={returnHref} /><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={item.slug} itemName={titleCaseSongName(item.name)} hasHistory={entries.length > 0} previousParts={priorParts} currentYoutubeUrl={item.youtube_url} secondary /><StartPracticeTimerButton itemId={item.id} itemSlug={item.slug} itemName={titleCaseSongName(item.name)} primary /></div>
      </div>
    </header>

    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <PracticeLog entries={entries} itemSlug={item.slug} suggestions={priorParts} />
      <div className="grid gap-5"><PracticeTimeSummary totalSeconds={totalTrackedSeconds} weekSeconds={weekTrackedSeconds} ready={!durationResult.error} />{referenceUrls.length ? <SongReferences urls={referenceUrls} editControl={<SongWorkspaceModal itemId={item.id} itemSlug={item.slug} youtubeUrl={item.youtube_url} referenceUrls={referenceUrls} iconOnly />} /> : <section className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4"><SongWorkspaceModal itemId={item.id} itemSlug={item.slug} youtubeUrl={item.youtube_url} referenceUrls={referenceUrls} /></section>}<SongResources itemId={item.id} itemSlug={item.slug} userId={user.id} initialResources={resources} isGuest={isGuest} defaultPublic={profileResult.data?.default_resource_public ?? false} /></div>
    </div>
  </main></AppFrame>;
}

function PracticeLog({ entries, itemSlug, suggestions }: { entries: EntryRecord[]; itemSlug: string; suggestions: string[] }) {
  const groups = groupEntriesByDay(entries);

  return <section className="overflow-hidden rounded-xl border border-stone-200 bg-white" aria-labelledby="practice-log-heading"><div className="border-b border-stone-200 px-4 py-4 sm:px-5"><h2 id="practice-log-heading" className="text-sm font-semibold text-stone-950">Practice Log</h2></div>{groups.length ? groups.map((group, index) => { const trackedSeconds = group.entries.reduce((total, entry) => total + (entry.duration_seconds ?? 0), 0); return <details key={group.key} open={index === 0} className="group/day border-b border-stone-200 last:border-b-0"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-stone-50 px-4 py-3 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500 sm:px-5"><div><p className="text-sm font-semibold text-stone-900"><LocalDateTime value={group.date} display="relative" /></p><p className="mt-0.5 text-xs text-stone-500">{group.entries.length} {group.entries.length === 1 ? "session" : "sessions"}</p></div><div className="flex items-center gap-3">{trackedSeconds ? <span className="text-sm font-semibold tabular-nums text-stone-700">{formatPracticeDuration(trackedSeconds)} total</span> : null}<ChevronDown className="size-4 text-stone-400 transition-transform group-open/day:rotate-180" aria-hidden="true" /></div></summary><div className="divide-y divide-stone-100 border-t border-stone-200">{group.entries.map((entry) => <PracticeLogEntry key={entry.id} entry={entry} itemSlug={itemSlug} suggestions={suggestions} />)}</div></details>; }) : <div className="px-5 py-8"><p className="text-sm font-semibold text-stone-900">No practice logs yet</p><p className="mt-1 text-sm leading-6 text-stone-500">Your first log creates a useful starting point for the next session.</p></div>}</section>;
}

function PracticeLogEntry({ entry, itemSlug, suggestions }: { entry: EntryRecord; itemSlug: string; suggestions: string[] }) {
  const tags = entry.practice_part ? normalizePracticeTags(entry.practice_part) : [];
  const note = entry.content === "Timed practice session" || entry.content === "Practice session" ? "" : entry.content.trim();
  const hasDetails = Boolean(note || entry.rating || tags.length);

  return <article className="group/log grid gap-4 px-4 py-4 sm:grid-cols-[8rem_11rem_minmax(0,1fr)_1.25rem] sm:px-5"><div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Started</p><p className="mt-1 text-sm font-semibold text-stone-900"><LocalDateTime value={entry.created_at} display="time" /></p></div><div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Duration</p><p className="mt-1 text-sm font-semibold tabular-nums text-stone-900">{entry.duration_seconds ? formatPracticeDuration(entry.duration_seconds) : "Not tracked"}</p></div><div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Details</p>{hasDetails ? <details className="group/details mt-1"><summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-stone-600 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><span>View details</span><ChevronDown className="size-3.5 text-stone-400 transition-transform group-open/details:rotate-180" aria-hidden="true" /></summary><div className="mt-3 grid gap-3 rounded-lg bg-stone-50 px-3 py-3">{tags.length ? <div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Worked on</p><div className="mt-1.5 flex flex-wrap gap-1">{tags.map((tag) => <span key={tag} className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200">{tag}</span>)}</div></div> : null}{note ? <div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Note</p><p className="mt-1 text-sm leading-6 text-stone-700">{note}</p></div> : null}{entry.rating ? <div><p className="text-[0.6875rem] font-semibold tracking-wide text-stone-400 uppercase">Session rating</p><p className="mt-1 text-sm font-semibold tabular-nums text-stone-900">{entry.rating} / 10</p></div> : null}</div></details> : <p className="mt-1 text-sm text-stone-400">None added</p>}</div><div className="pt-4"><EditPracticeEntryModal entryId={entry.id} itemSlug={itemSlug} note={entry.content} rating={entry.rating} practicePart={entry.practice_part ?? ""} suggestions={suggestions} /></div></article>;
}

function groupEntriesByDay(entries: EntryRecord[]) {
  const groups = new Map<string, { key: string; date: string; entries: EntryRecord[] }>();
  entries.forEach((entry) => {
    const date = new Date(entry.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const existing = groups.get(key);
    if (existing) existing.entries.push(entry);
    else groups.set(key, { key, date: entry.created_at, entries: [entry] });
  });
  return Array.from(groups.values());
}

function PracticeTimeSummary({ totalSeconds, weekSeconds, ready }: { totalSeconds: number; weekSeconds: number; ready: boolean }) {
  return <section className="rounded-xl border border-stone-200 bg-white px-4 py-4" aria-labelledby="practice-time-heading"><div className="flex items-center gap-2"><Clock3 className="size-4 text-stone-500" aria-hidden="true" /><h2 id="practice-time-heading" className="text-sm font-semibold text-stone-950">Tracked Time</h2></div>{ready ? <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xl font-semibold tabular-nums text-stone-950">{formatTrackedTime(weekSeconds)}</p><p className="mt-0.5 text-xs text-stone-500">Last 7 days</p></div><div><p className="text-xl font-semibold tabular-nums text-stone-950">{formatTrackedTime(totalSeconds)}</p><p className="mt-0.5 text-xs text-stone-500">All tracked</p></div></div> : <p className="mt-3 text-xs leading-5 text-amber-800">Run migration 0007 to enable tracked time.</p>}</section>;
}
