"use client";

import { useState } from "react";
import { ExternalLink, Link2, Play } from "lucide-react";
import { referenceSourceLabel } from "@/lib/stride";

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    if (!url.hostname.includes("youtube.com") && !url.hostname.includes("youtu.be")) return null;
    const id = url.hostname.includes("youtu.be") ? url.pathname.slice(1).split("/")[0] : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch { return null; }
}

export function SongReferences({ urls }: { urls: string[] }) {
  const links = Array.from(new Set(urls.filter(Boolean)));
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  if (!links.length) return null;
  const embedUrl = playingUrl ? youtubeEmbedUrl(playingUrl) : null;

  return <section className="overflow-hidden rounded-xl border border-stone-200 bg-white" aria-labelledby="references-heading">
    <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3"><Link2 className="size-4 text-stone-500" aria-hidden="true" /><h2 id="references-heading" className="text-sm font-semibold text-stone-950">Reference Links</h2><span className="text-xs tabular-nums text-stone-400">{links.length}</span></div>
    <div className="divide-y divide-stone-100">{links.map((url) => { const canPlay = Boolean(youtubeEmbedUrl(url)); return <div key={url} className="flex min-h-12 items-center gap-2 px-4 py-2.5"><span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{referenceSourceLabel(url)}</span>{canPlay ? <button type="button" onClick={() => setPlayingUrl(url)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-950"><Play className="size-3.5" aria-hidden="true" />Play</button> : null}<a href={url} target="_blank" rel="noreferrer" title={`Open ${referenceSourceLabel(url)}`} aria-label={`Open ${referenceSourceLabel(url)}`} className="flex size-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"><ExternalLink className="size-4" aria-hidden="true" /></a></div>; })}</div>
    {embedUrl ? <div className="aspect-video border-t border-stone-200 bg-black"><iframe className="h-full w-full" src={embedUrl} title="YouTube song reference" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : null}
  </section>;
}

export function YoutubeReference({ url }: { url: string }) { return <SongReferences urls={[url]} />; }
