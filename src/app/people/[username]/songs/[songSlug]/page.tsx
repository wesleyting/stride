import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, FileAudio, FileImage, FileVideo, NotebookPen, Play, Star } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { normalizePracticeTags } from "@/lib/practice-tags";
import { createClient } from "@/lib/supabase/server";
import { formatCompactLogDate, formatTrackedTime, titleCaseSongName } from "@/lib/stride";

export const dynamic = "force-dynamic";

type PublicSong = { username: string; display_name: string; bio: string; share_practice_logs: boolean; share_song_resources: boolean; song_name: string; song_slug: string; difficulty: number; tracked_seconds: number; last_practiced: string | null; youtube_url: string };
type PublicEntry = { content: string; rating: number | null; practice_part: string | null; duration_seconds: number | null; created_at: string };
type PublicMedia = { storage_path: string; file_name: string; mime_type: string; created_at: string; signed_url?: string };

export default async function PublicSongPage({ params }: PageProps<"/people/[username]/songs/[songSlug]">) {
  const { username, songSlug } = await params;
  const supabase = await createClient();
  const songResult = await supabase.rpc("get_public_song", { profile_username: username.toLowerCase(), public_song_slug: songSlug });
  if (songResult.error || !songResult.data?.length) notFound();
  const song = songResult.data[0] as PublicSong;
  const [entriesResult, mediaResult] = await Promise.all([
    song.share_practice_logs ? supabase.rpc("get_public_song_entries", { profile_username: song.username, public_song_slug: song.song_slug }) : Promise.resolve({ data: [], error: null }),
    song.share_song_resources ? supabase.rpc("get_public_song_media", { profile_username: song.username, public_song_slug: song.song_slug }) : Promise.resolve({ data: [], error: null }),
  ]);
  const entries = (entriesResult.data ?? []) as PublicEntry[];
  const mediaRows = (mediaResult.data ?? []) as PublicMedia[];
  const media = await Promise.all(mediaRows.map(async (resource) => {
    const signed = await supabase.storage.from("song-resources").createSignedUrl(resource.storage_path, 3600);
    return { ...resource, signed_url: signed.data?.signedUrl };
  }));
  const path = `/people/${song.username}/songs/${song.song_slug}`;

  return <AppFrame><main className="px-4 py-6 sm:px-7 sm:py-8">
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-stone-500" aria-label="Breadcrumb"><Link href={`/people/${song.username}`} className="rounded-md hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500">{song.display_name}</Link><ChevronRight className="size-3.5" aria-hidden="true" /><span className="text-stone-700">{titleCaseSongName(song.song_name)}</span></nav>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6"><div><span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">Shared Song</span><h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{titleCaseSongName(song.song_name)}</h1><Link href={`/people/${song.username}`} className="mt-1 inline-flex text-sm text-stone-500 hover:text-stone-900">by {song.display_name} · @{song.username}</Link></div><CopyLinkButton path={path} label="Copy Song Link" /></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><div className="flex gap-0.5" aria-label={`Difficulty ${song.difficulty} out of 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${index < song.difficulty ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} aria-hidden="true" />)}</div><p className="mt-2 text-xs text-stone-500">Difficulty</p></div><div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><p className="text-xl font-semibold text-stone-950">{formatTrackedTime(Number(song.tracked_seconds))}</p><p className="mt-1 text-xs text-stone-500">Practice time</p></div><div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><p className="text-sm font-semibold text-stone-950">{song.last_practiced ? formatCompactLogDate(song.last_practiced) : "Not logged yet"}</p><p className="mt-1 text-xs text-stone-500">Last practiced</p></div></section>
    {song.share_song_resources && song.youtube_url ? <a href={song.youtube_url} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500"><Play className="size-5" aria-hidden="true" /><span className="flex-1 text-sm font-semibold text-stone-900">YouTube Reference</span><ExternalLink className="size-4 text-stone-400" aria-hidden="true" /></a> : null}
    {song.share_practice_logs ? <details className="group mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"><span className="flex items-center gap-2"><NotebookPen className="size-4 text-stone-500" aria-hidden="true" /><span className="font-semibold text-stone-950">Practice History</span><span className="text-sm text-stone-500">{entries.length}</span></span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><div className="divide-y divide-stone-100 border-t border-stone-200">{entries.length ? entries.map((entry, index) => <article key={`${entry.created_at}-${index}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_7rem] sm:px-5"><div><p className="text-xs font-medium text-stone-500">{formatCompactLogDate(entry.created_at)}</p>{entry.duration_seconds ? <p className="mt-1 text-sm font-semibold text-stone-900">{formatTrackedTime(entry.duration_seconds)}</p> : null}</div><div>{entry.practice_part ? <div className="mb-2 flex flex-wrap gap-1">{normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{tag}</span>)}</div> : null}<p className="text-sm leading-6 text-stone-700">{entry.content}</p></div><p className="text-xs text-stone-500 sm:text-right">{entry.rating ? `Rating ${entry.rating}/10` : "Not rated"}</p></article>) : <p className="px-4 py-5 text-sm text-stone-500">No shared practice entries yet.</p>}</div></details> : <PrivateSection label="Practice history is not shared." />}
    {song.share_song_resources ? <section className="mt-5"><div className="flex items-center gap-2"><FileImage className="size-4 text-stone-500" aria-hidden="true" /><h2 className="text-base font-semibold text-stone-950">Shared Media</h2></div>{media.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{media.map((resource) => <MediaItem key={resource.storage_path} resource={resource} />)}</div> : <p className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">No media shared for this song.</p>}</section> : <PrivateSection label="Song resources are not shared." />}
  </main></AppFrame>;
}

function MediaItem({ resource }: { resource: PublicMedia }) {
  const Icon = resource.mime_type.startsWith("video/") ? FileVideo : resource.mime_type.startsWith("audio/") ? FileAudio : FileImage;
  return <details className="group overflow-hidden rounded-xl border border-stone-200 bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"><Icon className="size-4 shrink-0 text-stone-500" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">{resource.file_name}</span><ChevronDown className="size-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>{resource.signed_url ? <div className="border-t border-stone-200 bg-stone-100 p-2">{resource.mime_type.startsWith("video/") ? <video src={resource.signed_url} controls preload="metadata" className="max-h-96 w-full rounded-lg bg-black" /> : resource.mime_type.startsWith("audio/") ? <audio src={resource.signed_url} controls preload="metadata" className="my-4 w-full" /> : <a href={resource.signed_url} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden rounded-lg"><Image src={resource.signed_url} alt={resource.file_name} fill unoptimized className="object-contain" /></a>}</div> : null}</details>;
}

function PrivateSection({ label }: { label: string }) { return <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">{label}</div>; }
