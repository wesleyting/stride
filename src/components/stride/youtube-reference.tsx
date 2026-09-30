"use client";

import { useState } from "react";
import { ExternalLink, Link2, Play, X } from "lucide-react";
import { referenceSourceLabel } from "@/lib/stride";

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const shortLink = host === "youtu.be";
    if (!shortLink && host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const path = url.pathname.split("/").filter(Boolean);
    const id = shortLink ? path[0] : path[0] === "watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(path[0]) ? path[1] : null;
    if (!id || !/^[\w-]{11}$/.test(id)) return null;

    const timestamp = url.searchParams.get("t") ?? url.searchParams.get("start") ?? new URLSearchParams(url.hash.slice(1)).get("t") ?? "";
    const parts = timestamp.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
    const seconds = /^\d+$/.test(timestamp) ? Number(timestamp) : parts ? Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0) : 0;
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    if (Number.isSafeInteger(seconds) && seconds > 0) embed.searchParams.set("start", String(seconds));
    return embed.toString();
  } catch { return null; }
}

export function SongReferences({ urls, editControl }: { urls: string[]; editControl?: React.ReactNode }) {
  const links = Array.from(new Set(urls.filter(Boolean)));
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  if (!links.length) return null;
  const embedUrl = playingUrl && links.includes(playingUrl) ? youtubeEmbedUrl(playingUrl) : null;

  return <section className="overflow-hidden rounded-xl border border-stone-200 bg-white" aria-labelledby="references-heading">
    <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3"><Link2 className="size-4 text-stone-500" aria-hidden="true" /><h2 id="references-heading" className="text-sm font-semibold text-stone-950">Reference Links</h2><span className="text-xs tabular-nums text-stone-400">{links.length}</span>{editControl ? <div className="ml-auto">{editControl}</div> : null}</div>
    <div className="divide-y divide-stone-100">{links.map((url) => {
      const canPlay = Boolean(youtubeEmbedUrl(url));
      const isOpen = playingUrl === url;
      return <div key={url} className="flex min-h-12 items-center gap-2 px-4 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{referenceSourceLabel(url)}</span>
        {canPlay ? <button type="button" aria-expanded={isOpen} onClick={() => setPlayingUrl((current) => current === url ? null : url)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500">
          {isOpen ? <X className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {isOpen ? "Close video" : "Play"}
        </button> : null}
        <a href={url} target="_blank" rel="noreferrer" title={`Open ${referenceSourceLabel(url)}`} aria-label={`Open ${referenceSourceLabel(url)}`} className="flex size-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"><ExternalLink className="size-4" aria-hidden="true" /></a>
      </div>;
    })}</div>
    {embedUrl ? <div className="aspect-video border-t border-stone-200 bg-black"><iframe className="h-full w-full" src={embedUrl} title="YouTube song reference" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : null}
  </section>;
}

export function YoutubeReference({ url }: { url: string }) { return <SongReferences urls={[url]} />; }
