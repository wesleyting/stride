"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const id = url.hostname.includes("youtu.be")
      ? url.pathname.slice(1).split("/")[0]
      : url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch {
    return null;
  }
}

export function YoutubeReference({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = youtubeEmbedUrl(url);
  if (!url) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white" aria-labelledby="reference-heading">
      <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-4 py-3">
        <div>
          <h2 id="reference-heading" className="text-sm font-semibold text-stone-950">Video reference</h2>
          <p className="mt-0.5 text-xs text-stone-500">Loads only when you choose to play it.</p>
        </div>
        <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Open YouTube <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </a>
      </div>
      {playing && embedUrl ? (
        <div className="aspect-video bg-black">
          <iframe className="h-full w-full" src={embedUrl} title="YouTube song reference" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <button type="button" onClick={() => setPlaying(true)} disabled={!embedUrl} className="flex aspect-[16/6] w-full items-center justify-center gap-2 bg-stone-50 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500 disabled:cursor-not-allowed">
          <span className="flex size-11 items-center justify-center rounded-full bg-stone-900 text-white"><Play className="size-5 fill-current" aria-hidden="true" /></span>
          Play reference
        </button>
      )}
    </section>
  );
}
