import Image from "next/image";
import { ExternalLink, FileAudio, FileVideo } from "lucide-react";
import { titleCaseSongName } from "@/lib/stride";

export type PublicMediaItem = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  signed_url?: string;
  song_name?: string;
};

export function PublicMediaGallery({
  media,
  showSongName = false,
}: {
  media: PublicMediaItem[];
  showSongName?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {media.map((resource) => (
        <MediaCard
          key={resource.storage_path}
          resource={resource}
          showSongName={showSongName}
        />
      ))}
    </div>
  );
}

function MediaCard({
  resource,
  showSongName,
}: {
  resource: PublicMediaItem;
  showSongName: boolean;
}) {
  const label = showSongName && resource.song_name
    ? `${titleCaseSongName(resource.song_name)} · ${resource.file_name}`
    : resource.file_name;

  if (!resource.signed_url) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
        <p className="truncate text-sm font-medium text-stone-700">{label}</p>
        <p className="mt-1 text-xs text-stone-500">Preview unavailable</p>
      </div>
    );
  }

  if (resource.mime_type.startsWith("video/")) {
    return (
      <figure className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <video
          src={resource.signed_url}
          controls
          preload="metadata"
          className="aspect-video w-full bg-black object-contain"
        />
        <figcaption className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-stone-700">
          <FileVideo className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </figcaption>
      </figure>
    );
  }

  if (resource.mime_type.startsWith("audio/")) {
    return (
      <figure className="rounded-xl border border-stone-200 bg-white p-4">
        <figcaption className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-700">
          <FileAudio className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </figcaption>
        <audio src={resource.signed_url} controls preload="metadata" className="w-full" />
      </figure>
    );
  }

  return (
    <figure className="group overflow-hidden rounded-xl border border-stone-200 bg-white">
      <a
        href={resource.signed_url}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-video overflow-hidden bg-stone-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"
        aria-label={`Open ${label}`}
      >
        <Image
          src={resource.signed_url}
          alt={label}
          fill
          unoptimized
          className="object-contain transition group-hover:scale-[1.01]"
        />
        <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-white/90 text-stone-600 shadow-sm">
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </span>
      </a>
      <figcaption className="truncate px-3 py-2.5 text-sm font-medium text-stone-700">
        {label}
      </figcaption>
    </figure>
  );
}
