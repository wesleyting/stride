import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, Clock3, ExternalLink, FileImage, LockKeyhole, NotebookPen, Play, Settings, Star, TimerReset } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { PublicHistoryPagination } from "@/components/stride/public-history-pagination";
import { PublicMediaGallery } from "@/components/stride/public-media-gallery";
import { createClient } from "@/lib/supabase/server";
import { normalizePracticeTags } from "@/lib/practice-tags";
import { formatCompactLogDate, formatTrackedTime, titleCaseSongName, type PublicProfileRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";

type PublicSong = { song_name: string; song_slug: string; difficulty: number | null; tracked_seconds: number | null; last_practiced: string | null; youtube_url: string };
type PublicEntry = { song_name: string | null; content: string; rating: number | null; practice_part: string | null; duration_seconds: number | null; created_at: string };
type PublicResource = { song_name: string; storage_path: string; file_name: string; mime_type: string; created_at: string; is_public: boolean; signed_url?: string };
const ENTRIES_PER_PAGE = 10;

export default async function PublicProfilePage({
  params,
  searchParams,
}: PageProps<"/people/[username]"> & {
  searchParams: Promise<{ historyPage?: string | string[] }>;
}) {
  const { username } = await params;
  const query = await searchParams;
  const requestedPage = parsePage(query.historyPage);
  const normalizedUsername = username.toLowerCase();
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const [profileResult, ownProfileResult] = await Promise.all([
    supabase.rpc("get_public_profile", { profile_username: normalizedUsername }),
    authData.user ? supabase.from("profiles").select("username").eq("user_id", authData.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (profileResult.error || !profileResult.data?.length) notFound();
  const profile = profileResult.data[0] as PublicProfileRecord;
  const isOwner = ownProfileResult.data?.username === profile.username;

  const [songsResult, mediaResult] = await Promise.all([
    profile.share_song_library || profile.share_song_resources ? supabase.rpc("get_public_profile_songs", { profile_username: normalizedUsername }) : Promise.resolve({ data: [], error: null }),
    profile.share_song_resources ? supabase.rpc("get_public_profile_media", { profile_username: normalizedUsername }) : Promise.resolve({ data: [], error: null }),
  ]);
  const songs = (songsResult.data ?? []) as PublicSong[];
  let entries: PublicEntry[] = [];
  let entryCount = 0;
  let currentPage = requestedPage ?? 1;
  if (profile.share_practice_logs) {
    const countResult = await supabase.rpc("count_public_profile_entries", {
      profile_username: normalizedUsername,
    });
    if (!countResult.error) {
      entryCount = Number(countResult.data ?? 0);
      const totalPages = Math.max(1, Math.ceil(entryCount / ENTRIES_PER_PAGE));
      currentPage = Math.min(currentPage, totalPages);
      const entriesResult = await supabase.rpc("get_public_profile_entries_page", {
        profile_username: normalizedUsername,
        page_limit: ENTRIES_PER_PAGE,
        page_offset: (currentPage - 1) * ENTRIES_PER_PAGE,
      });
      entries = (entriesResult.data ?? []) as PublicEntry[];
    } else {
      const fallback = await supabase.rpc("get_public_profile_entries", {
        profile_username: normalizedUsername,
      });
      const allEntries = (fallback.data ?? []) as PublicEntry[];
      entryCount = allEntries.length;
      entries = allEntries.slice(0, ENTRIES_PER_PAGE);
      currentPage = 1;
    }
  }
  const rawMedia = (mediaResult.data ?? []) as PublicResource[];
  const media = await Promise.all(rawMedia.filter((resource) => resource.is_public).map(async (resource) => {
    const signed = await supabase.storage.from("song-resources").createSignedUrl(resource.storage_path, 3600);
    return { ...resource, signed_url: signed.data?.signedUrl };
  }));

  const totalPages = Math.max(1, Math.ceil(entryCount / ENTRIES_PER_PAGE));

  return <AppFrame showSidebar><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
    <p className="mb-4 text-xs font-semibold tracking-wide text-stone-500 uppercase">Viewing @{profile.username}&apos;s public profile</p>
    <Link href="/community" className="inline-flex items-center gap-1.5 rounded-md text-sm text-stone-500 transition hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><ArrowLeft className="size-4" aria-hidden="true" />Community</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6">
      <div><span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">Public Profile</span><h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{profile.display_name}</h1><p className="mt-1 text-sm text-stone-500">@{profile.username}</p>{profile.bio ? <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">{profile.bio}</p> : null}</div>
      <div className="flex flex-wrap gap-2"><CopyLinkButton path={`/people/${profile.username}`} label="Copy Profile Link" />{isOwner ? <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500"><Settings className="size-4" aria-hidden="true" />Sharing Settings</Link> : null}</div>
    </header>

    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Public practice totals"><ProfileMetric icon={Clock3} value={formatTrackedTime(Number(profile.tracked_seconds_7d))} label="Tracked this week" /><ProfileMetric icon={TimerReset} value={formatTrackedTime(Number(profile.tracked_seconds))} label="All tracked time" /><ProfileMetric icon={CalendarDays} value={`${profile.timed_sessions}`} label="Timed sessions" /><ProfileMetric icon={CalendarDays} value={`${profile.active_days_30 ?? 0}`} label="Active days in 30" /></section>

    {profile.share_song_library ? <SongLibrary username={profile.username} songs={songs} media={media} shareResources={Boolean(profile.share_song_resources)} /> : null}
    {profile.share_practice_logs ? <PracticeHistory entries={entries} entryCount={entryCount} currentPage={currentPage} totalPages={totalPages} basePath={`/people/${profile.username}`} open={requestedPage !== null} /> : null}
    {profile.share_song_resources && !profile.share_song_library ? <ResourcesOnly songs={songs} media={media} /> : null}
    <PrivacySummary profile={profile} isOwner={isOwner} />
  </main></AppFrame>;
}

function SongLibrary({ username, songs, media, shareResources }: { username: string; songs: PublicSong[]; media: PublicResource[]; shareResources: boolean }) {
  return <section className="mt-8" aria-labelledby="songs-heading"><div className="flex items-center gap-2"><BookOpen className="size-4 text-stone-500" aria-hidden="true" /><h2 id="songs-heading" className="text-base font-semibold text-stone-950">Songs</h2></div>{songs.length ? <div className="mt-3 grid gap-3">{songs.map((song) => {
    const songMedia = media.filter((resource) => resource.song_name === song.song_name);
    return <details key={song.song_name} className="group overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="grid cursor-pointer list-none items-center gap-3 px-4 py-4 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500 sm:grid-cols-[minmax(0,1fr)_8rem_12rem_auto]"><span className="font-semibold text-stone-950">{titleCaseSongName(song.song_name)}</span><Difficulty value={song.difficulty} /><span className="text-xs text-stone-500">{formatTrackedTime(Number(song.tracked_seconds))} practiced{song.last_practiced ? ` · ${formatCompactLogDate(song.last_practiced)}` : ""}</span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="grid gap-5 border-t border-stone-200 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-4">{song.song_slug ? <Link href={`/people/${username}/songs/${song.song_slug}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-stone-800 underline underline-offset-4 hover:text-stone-950">View Song</Link> : null}{shareResources && song.youtube_url ? <a href={song.youtube_url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-stone-700 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-stone-500"><Play className="size-4" aria-hidden="true" />YouTube Reference<ExternalLink className="size-3.5" aria-hidden="true" /></a> : null}</div>
      {shareResources ? <SongMedia media={songMedia} /> : null}
      {!shareResources ? <p className="text-sm text-stone-500">Open the shared song to see its details.</p> : null}
    </div></details>;
  })}</div> : <EmptyShared label="No songs shared yet." />}</section>;
}

function PracticeHistory({ entries, entryCount, currentPage, totalPages, basePath, open }: { entries: PublicEntry[]; entryCount: number; currentPage: number; totalPages: number; basePath: string; open: boolean }) {
  return <details id="practice-history" open={open} className="group mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500 sm:px-5"><span className="flex items-center gap-2"><NotebookPen className="size-4 text-stone-500" aria-hidden="true" /><span className="font-semibold text-stone-950">Practice History</span><span className="text-sm font-normal text-stone-500">{entryCount}</span></span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>{entries.length ? <div className="divide-y divide-stone-100 border-t border-stone-200">{entries.map((entry, index) => <EntryRow key={`${entry.created_at}-${index}`} entry={entry} />)}</div> : <div className="border-t border-stone-200 p-4"><p className="text-sm text-stone-500">No practice entries shared yet.</p></div>}<PublicHistoryPagination currentPage={currentPage} totalPages={totalPages} basePath={basePath} /></details>;
}

function EntryRow({ entry }: { entry: PublicEntry }) {
  return <article className="grid gap-3 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_8rem] sm:px-5"><div><p className="text-sm font-semibold text-stone-900">{entry.song_name ? titleCaseSongName(entry.song_name) : "Guitar Practice"}</p><p className="mt-0.5 text-xs text-stone-500">{formatCompactLogDate(entry.created_at)}</p></div><div>{entry.practice_part ? <div className="mb-1.5 flex flex-wrap gap-1">{normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="rounded-md bg-stone-200/70 px-2 py-0.5 text-xs font-medium text-stone-600">{tag}</span>)}</div> : null}<p className="text-sm leading-6 text-stone-700">{entry.content}</p></div><div className="sm:text-right">{entry.duration_seconds ? <p className="text-xs font-semibold text-stone-700">{formatTrackedTime(entry.duration_seconds)}</p> : null}<p className="text-xs text-stone-500">{entry.rating ? `Rating ${entry.rating}/10` : "Not rated"}</p></div></article>;
}

function SongMedia({ media }: { media: PublicResource[] }) {
  return <div><h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Shared Media</h3>{media.length ? <div className="mt-2"><PublicMediaGallery media={media} /></div> : <p className="mt-2 text-sm text-stone-500">No recordings shared for this song.</p>}</div>;
}

function ResourcesOnly({ songs, media }: { songs: PublicSong[]; media: PublicResource[] }) {
  const withYoutube = songs.filter((song) => song.youtube_url);
  return <details className="group mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500 sm:px-5"><span className="flex items-center gap-2"><FileImage className="size-4 text-stone-500" aria-hidden="true" /><span className="font-semibold text-stone-950">Shared Resources</span><span className="text-sm font-normal text-stone-500">{withYoutube.length + media.length}</span></span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="grid gap-4 border-t border-stone-200 p-4 sm:p-5">{withYoutube.length ? <div className="grid gap-3 sm:grid-cols-2">{withYoutube.map((song) => <a key={song.song_name} href={song.youtube_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-3 text-sm font-semibold hover:bg-stone-50"><Play className="size-4" aria-hidden="true" />{titleCaseSongName(song.song_name)}<ExternalLink className="ml-auto size-3.5 text-stone-400" aria-hidden="true" /></a>)}</div> : null}{media.length ? <PublicMediaGallery media={media} showSongName /> : null}{!withYoutube.length && !media.length ? <p className="text-sm text-stone-500">No resources shared yet.</p> : null}</div></details>;
}

function PrivacySummary({ profile, isOwner }: { profile: PublicProfileRecord; isOwner: boolean }) {
  const hidden = [{ label: "Song Library", shared: profile.share_song_library }, { label: "Practice History", shared: profile.share_practice_logs }, { label: "Song Resources", shared: profile.share_song_resources }].filter((item) => !item.shared);
  if (!hidden.length) return null;
  return <section className="mt-8 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" /><div className="min-w-0"><h2 className="text-sm font-semibold text-stone-900">Not Shared</h2><p className="mt-1 text-sm leading-6 text-stone-600">{hidden.map((item) => item.label).join(", ")} {hidden.length === 1 ? "is" : "are"} private on this profile.</p>{isOwner ? <Link href="/settings" className="mt-2 inline-flex text-sm font-semibold text-stone-800 underline underline-offset-4 hover:text-stone-950">Choose what to share</Link> : null}</div></div></section>;
}

function Difficulty({ value }: { value: number | null }) { return <span className="flex gap-0.5" aria-label={`Difficulty ${value} out of 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < Number(value) ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} aria-hidden="true" />)}</span>; }
function EmptyShared({ label }: { label: string }) { return <p className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">{label}</p>; }
function ProfileMetric({ icon: Icon, value, label }: { icon: typeof Clock3; value: string; label: string }) { return <div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><Icon className="size-4 text-stone-500" aria-hidden="true" /><p className="mt-3 text-xl font-semibold tabular-nums text-stone-950">{value}</p><p className="mt-0.5 text-xs text-stone-500">{label}</p></div>; }
function parsePage(value: string | string[] | undefined) { const parsed = Number(Array.isArray(value) ? value[0] : value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
