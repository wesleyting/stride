import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, FileImage, NotebookPen, Play } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { PublicHistoryPagination } from "@/components/stride/public-history-pagination";
import { PublicMediaGallery } from "@/components/stride/public-media-gallery";
import { SongSetup } from "@/components/stride/song-setup";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { StarRating } from "@/components/stride/star-rating";
import { normalizePracticeTags } from "@/lib/practice-tags";
import { createClient } from "@/lib/supabase/server";
import { formatCompactLogDate, formatTrackedTime, titleCaseSongName } from "@/lib/stride";

export const dynamic = "force-dynamic";

type PublicSong = { username: string; display_name: string; bio: string; share_practice_logs: boolean; share_song_resources: boolean; song_name: string; song_slug: string; difficulty: number; tracked_seconds: number; last_practiced: string | null; youtube_url: string; tuning?: string | null; capo?: number | null };
type PublicEntry = { content: string; rating: number | null; practice_part: string | null; duration_seconds: number | null; created_at: string };
type PublicMedia = { storage_path: string; file_name: string; mime_type: string; created_at: string; signed_url?: string };
const ENTRIES_PER_PAGE = 5;

export async function generateMetadata({ params }: PageProps<"/people/[username]/songs/[songSlug]">): Promise<Metadata> {
  const { username, songSlug } = await params;
  const supabase = await createClient();
  const result = await supabase.rpc("get_public_song", { profile_username: username.toLowerCase(), public_song_slug: songSlug });
  if (result.error || !result.data?.length) return { title: "Shared Song", robots: { index: false, follow: false } };
  const song = result.data[0] as PublicSong;
  const songName = titleCaseSongName(song.song_name);
  const title = `${songName} — ${song.display_name}`;
  const description = `See ${song.display_name}'s shared practice progress for ${songName} on Stride.`;
  const path = `/people/${song.username}/songs/${song.song_slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "article", url: path, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Stride guitar practice tracker" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function PublicSongPage({
  params,
  searchParams,
}: PageProps<"/people/[username]/songs/[songSlug]"> & {
  searchParams: Promise<{ historyPage?: string | string[] }>;
}) {
  const { username, songSlug } = await params;
  const query = await searchParams;
  const requestedPage = parsePage(query.historyPage);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const songResult = await supabase.rpc("get_public_song", { profile_username: username.toLowerCase(), public_song_slug: songSlug });
  if (songResult.error || !songResult.data?.length) notFound();
  const song = songResult.data[0] as PublicSong;
  let entries: PublicEntry[] = [];
  let entryCount = 0;
  let currentPage = requestedPage ?? 1;
  if (song.share_practice_logs) {
    const countResult = await supabase.rpc("count_public_song_entries", {
      profile_username: song.username,
      public_song_slug: song.song_slug,
    });
    if (!countResult.error) {
      entryCount = Number(countResult.data ?? 0);
      const totalPages = Math.max(1, Math.ceil(entryCount / ENTRIES_PER_PAGE));
      currentPage = Math.min(currentPage, totalPages);
      const entriesResult = await supabase.rpc("get_public_song_entries_page", {
        profile_username: song.username,
        public_song_slug: song.song_slug,
        page_limit: ENTRIES_PER_PAGE,
        page_offset: (currentPage - 1) * ENTRIES_PER_PAGE,
      });
      entries = (entriesResult.data ?? []) as PublicEntry[];
    } else {
      const fallback = await supabase.rpc("get_public_song_entries", {
        profile_username: song.username,
        public_song_slug: song.song_slug,
      });
      const allEntries = (fallback.data ?? []) as PublicEntry[];
      entryCount = allEntries.length;
      entries = allEntries.slice(0, ENTRIES_PER_PAGE);
      currentPage = 1;
    }
  }
  const mediaResult = song.share_song_resources
    ? await supabase.rpc("get_public_song_media", { profile_username: song.username, public_song_slug: song.song_slug })
    : { data: [], error: null };
  const mediaRows = (mediaResult.data ?? []) as PublicMedia[];
  const media = await Promise.all(mediaRows.map(async (resource) => {
    const signed = await supabase.storage.from("song-resources").createSignedUrl(resource.storage_path, 3600);
    return { ...resource, signed_url: signed.data?.signedUrl };
  }));
  const path = `/people/${song.username}/songs/${song.song_slug}`;

  const totalPages = Math.max(1, Math.ceil(entryCount / ENTRIES_PER_PAGE));

  return <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn={Boolean(authData.user)} isGuest={authData.user?.is_anonymous === true} next={path} />}><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
    <p className="mb-4 text-xs font-semibold tracking-wide text-stone-500 uppercase">Viewing @{song.username}&apos;s public song</p>
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-stone-500" aria-label="Breadcrumb"><Link href={`/people/${song.username}`} className="rounded-md hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500">{song.display_name}</Link><ChevronRight className="size-3.5" aria-hidden="true" /><span className="text-stone-700">{titleCaseSongName(song.song_name)}</span></nav>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6"><div><span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">Shared Song</span><h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{titleCaseSongName(song.song_name)}</h1><Link href={`/people/${song.username}`} className="mt-1 inline-flex text-sm text-stone-500 hover:text-stone-900">by {song.display_name} · @{song.username}</Link></div><CopyLinkButton path={path} label="Copy Song Link" /></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><StarRating value={song.difficulty} /><div className="mt-2"><SongSetup tuning={song.tuning} capo={song.capo} compact /></div></div><div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><p className="text-xl font-semibold text-stone-950">{formatTrackedTime(Number(song.tracked_seconds))}</p><p className="mt-1 text-xs text-stone-500">Tracked time</p></div><div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><p className="text-sm font-semibold text-stone-950">{song.last_practiced ? formatCompactLogDate(song.last_practiced) : "Not logged yet"}</p><p className="mt-1 text-xs text-stone-500">Last practiced</p></div></section>
    {song.share_song_resources && song.youtube_url ? <a href={song.youtube_url} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500"><Play className="size-5" aria-hidden="true" /><span className="flex-1 text-sm font-semibold text-stone-900">YouTube Reference</span><ExternalLink className="size-4 text-stone-400" aria-hidden="true" /></a> : null}
    {song.share_practice_logs ? <details id="practice-history" open={requestedPage !== null} className="group mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"><span className="flex items-center gap-2"><NotebookPen className="size-4 text-stone-500" aria-hidden="true" /><span className="font-semibold text-stone-950">Practice History</span><span className="text-sm text-stone-500">{entryCount}</span></span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="divide-y divide-stone-100 border-t border-stone-200">{entries.length ? entries.map((entry, index) => <article key={`${entry.created_at}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_7rem] sm:px-5"><div><p className="text-xs font-medium text-stone-500">{formatCompactLogDate(entry.created_at)}</p>{entry.duration_seconds ? <p className="mt-1 text-sm font-semibold text-stone-900">{formatTrackedTime(entry.duration_seconds)}</p> : null}</div><div>{entry.practice_part ? <div className="mb-2 flex flex-wrap gap-1">{normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{tag}</span>)}</div> : null}<p className="text-sm leading-6 text-stone-700">{entry.content}</p></div><p className="text-xs text-stone-500 sm:text-right">{entry.rating ? `Rating ${entry.rating}/10` : "Not rated"}</p></article>) : <p className="px-4 py-5 text-sm text-stone-500">No shared practice entries yet.</p>}</div><PublicHistoryPagination currentPage={currentPage} totalPages={totalPages} basePath={path} /></details> : <PrivateSection label="Practice history is not shared." />}
    {song.share_song_resources ? <details className="group mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"><span className="flex items-center gap-2"><FileImage className="size-4 text-stone-500" aria-hidden="true" /><span className="font-semibold text-stone-950">Shared Media</span><span className="text-sm font-normal text-stone-500">{media.length}</span></span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="border-t border-stone-200 p-4 sm:p-5">{media.length ? <PublicMediaGallery media={media} /> : <p className="text-sm text-stone-500">No media shared for this song.</p>}</div></details> : <PrivateSection label="Song resources are not shared." />}
  </main></AppFrame>;
}

function PrivateSection({ label }: { label: string }) { return <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">{label}</div>; }
function parsePage(value: string | string[] | undefined) { const parsed = Number(Array.isArray(value) ? value[0] : value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
