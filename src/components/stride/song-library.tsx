"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { EditItemModal } from "@/components/stride/edit-item-modal";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import type { EntryRecord, ItemRecord } from "@/lib/stride";

export function SongLibrary({ songs, entries }: { songs: ItemRecord[]; entries: EntryRecord[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => songs.filter((song) => `${song.name} ${song.description}`.toLowerCase().includes(query.trim().toLowerCase())), [query, songs]);
  const latestBySong = new Map<string, EntryRecord>();
  entries.forEach((entry) => { if (entry.item_id && !latestBySong.has(entry.item_id)) latestBySong.set(entry.item_id, entry); });

  return <>
    <label className="relative mt-6 block max-w-md"><span className="sr-only">Search songs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs…" className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-3 pl-9 text-sm shadow-sm transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" /></label>
    <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
      {filtered.length ? filtered.map((song) => {
        const latest = latestBySong.get(song.id);
        const parts = entries.filter((entry) => entry.item_id === song.id && entry.practice_part).map((entry) => entry.practice_part!);
        return <article key={song.id} className="group grid gap-3 border-b border-stone-200 px-4 py-4 last:border-b-0 hover:bg-stone-50 focus-within:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto] sm:items-center">
          <Link href={`/songs/${song.slug}`} className="min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-stone-500"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold text-stone-950 group-hover:underline">{song.name}</h2>{song.is_favorite ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-medium text-amber-800">On home</span> : null}</div><p className="mt-1 truncate text-xs text-stone-500">{song.next_action ? `Next: ${song.next_action}` : latest ? "No next step set" : "No practice logged yet"}</p></Link>
          <DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} />
          <div className="flex items-center justify-end gap-1"><FavoriteButton itemId={song.id} initialFavorite={song.is_favorite} compact /><span className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><EditItemModal itemId={song.id} itemSlug={song.slug} activitySlug="guitar" itemName={song.name} description={song.description} /><DeleteItemModal itemId={song.id} activitySlug="guitar" itemName={song.name} /></span></div>
          <LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={song.slug} itemName={song.name} hasHistory={Boolean(latest)} previousParts={parts} />
        </article>;
      }) : <p className="px-5 py-8 text-center text-sm text-stone-500">{songs.length ? "No songs match that search." : "No songs yet."}</p>}
    </div>
  </>;
}
