"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Expand, FileAudio, Minimize, Play } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { titleCaseSongName } from "@/lib/stride";

export type PublicMediaItem = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  signed_url?: string;
  song_name?: string;
};

export function PublicMediaGallery({ media, showSongName = false }: { media: PublicMediaItem[]; showSongName?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : media[selectedIndex];

  useEffect(() => {
    if (selectedIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setSelectedIndex((current) => current === null ? null : (current - 1 + media.length) % media.length);
      if (event.key === "ArrowRight") setSelectedIndex((current) => current === null ? null : (current + 1) % media.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media.length, selectedIndex]);

  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      {media.map((resource, index) => <MediaCard key={resource.storage_path} resource={resource} showSongName={showSongName} open={() => setSelectedIndex(index)} />)}
    </div>
    <DialogShell open={selected !== null} onOpenChange={(open) => { if (!open) setSelectedIndex(null); }} title={selected ? mediaLabel(selected, showSongName) : "Shared Media"} size="xl">
      {selected && selectedIndex !== null ? <Lightbox resource={selected} index={selectedIndex} count={media.length} previous={() => setSelectedIndex((selectedIndex - 1 + media.length) % media.length)} next={() => setSelectedIndex((selectedIndex + 1) % media.length)} /> : null}
    </DialogShell>
  </>;
}

function MediaCard({ resource, showSongName, open }: { resource: PublicMediaItem; showSongName: boolean; open: () => void }) {
  const label = mediaLabel(resource, showSongName);
  return <button type="button" onClick={open} disabled={!resource.signed_url} className="group overflow-hidden rounded-xl border border-stone-200 bg-white text-left transition hover:border-stone-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-stone-500 disabled:cursor-not-allowed disabled:bg-stone-50">
    <span className="relative flex aspect-video items-center justify-center overflow-hidden bg-stone-100">
      {resource.signed_url && resource.mime_type.startsWith("image/") ? <Image src={resource.signed_url} alt={label} fill unoptimized className="object-cover transition group-hover:scale-[1.02]" /> : resource.signed_url && resource.mime_type.startsWith("video/") ? <><video src={resource.signed_url} muted preload="metadata" className="h-full w-full bg-black object-contain" /><span className="absolute flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow"><Play className="ml-0.5 size-4 fill-current" aria-hidden="true" /></span></> : <FileAudio className="size-9 text-stone-400" aria-hidden="true" />}
    </span>
    <span className="flex items-center gap-2 px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{label}</span>{resource.signed_url ? <span className="text-xs text-stone-400">View</span> : <span className="text-xs text-stone-500">Unavailable</span>}</span>
  </button>;
}

function Lightbox({ resource, index, count, previous, next }: { resource: PublicMediaItem; index: number; count: number; previous: () => void; next: () => void }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    function onFullscreenChange() { setIsFullscreen(document.fullscreenElement === previewRef.current); }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (isFullscreen) {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } finally {
        setIsFullscreen(false);
      }
      return;
    }
    await previewRef.current?.requestFullscreen();
  }

  return <div className="grid gap-4">
    <div ref={previewRef} className={`relative flex items-center justify-center overflow-hidden bg-stone-950 ${isFullscreen ? "h-screen w-screen rounded-none p-0" : "min-h-64 rounded-xl p-2 sm:min-h-[55vh]"}`}>
      <MediaPreview resource={resource} fullscreen={isFullscreen} />
      {isFullscreen ? <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-80 transition hover:opacity-100 focus-within:opacity-100"><a href={resource.signed_url} download={resource.file_name} aria-label="Download media" title="Download" className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-white"><Download className="size-4" aria-hidden="true" /></a><button type="button" onClick={() => void toggleFullscreen()} aria-label="Exit full screen" title="Exit Full Screen" className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-white"><Minimize className="size-5" aria-hidden="true" /></button></div> : null}
      {count > 1 ? <><button type="button" onClick={previous} aria-label="Previous media" className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"><ChevronLeft className="size-5" aria-hidden="true" /></button><button type="button" onClick={next} aria-label="Next media" className="absolute right-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"><ChevronRight className="size-5" aria-hidden="true" /></button></> : null}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs tabular-nums text-stone-500">{index + 1} of {count}{count > 1 ? " · Use Left and Right arrow keys to browse" : ""}</p><div className="flex gap-2">{resource.signed_url ? <a href={resource.signed_url} download={resource.file_name} className={buttonVariants({ variant: "outline", size: "sm" })}><Download data-icon="inline-start" aria-hidden="true" />Download</a> : null}<button type="button" onClick={() => void toggleFullscreen()} className={buttonVariants({ variant: "outline", size: "sm" })}>{isFullscreen ? <Minimize data-icon="inline-start" aria-hidden="true" /> : <Expand data-icon="inline-start" aria-hidden="true" />}{isFullscreen ? "Exit Full Screen" : "Full Screen"}</button></div></div>
  </div>;
}

function MediaPreview({ resource, fullscreen }: { resource: PublicMediaItem; fullscreen: boolean }) {
  if (!resource.signed_url) return <p className="text-sm text-stone-300">Preview unavailable</p>;
  if (resource.mime_type.startsWith("video/")) return <video key={resource.storage_path} src={resource.signed_url} controls autoPlay preload="metadata" className={`fullscreen-media object-contain ${fullscreen ? "h-screen w-screen" : "max-h-[70vh] w-full"}`} />;
  if (resource.mime_type.startsWith("audio/")) return <div className="fullscreen-media w-full max-w-xl rounded-xl bg-white p-6"><div className="mb-5 flex items-center gap-3"><FileAudio className="size-6 text-stone-500" aria-hidden="true" /><p className="truncate text-sm font-semibold text-stone-900">{resource.file_name}</p></div><audio key={resource.storage_path} src={resource.signed_url} controls autoPlay preload="metadata" className="w-full" /></div>;
  return <div className={`fullscreen-media relative w-full ${fullscreen ? "h-screen" : "h-[55vh]"}`}><Image key={resource.storage_path} src={resource.signed_url} alt={resource.file_name} fill unoptimized className="object-contain" /></div>;
}

function mediaLabel(resource: PublicMediaItem, showSongName: boolean) {
  return showSongName && resource.song_name ? `${titleCaseSongName(resource.song_name)} · ${resource.file_name}` : resource.file_name;
}
