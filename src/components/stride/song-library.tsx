"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { EditItemModal } from "@/components/stride/edit-item-modal";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { titleCaseSongName, type EntryRecord, type ItemRecord } from "@/lib/stride";

export function SongLibrary({ songs, entries }: { songs: ItemRecord[]; entries: EntryRecord[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [difficulty, setDifficulty] = useState("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const latestBySong = useMemo(() => {
    const latest = new Map<string, EntryRecord>();
    entries.forEach((entry) => { if (entry.item_id && !latest.has(entry.item_id)) latest.set(entry.item_id, entry); });
    return latest;
  }, [entries]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return songs
      .filter((song) => song.name.toLowerCase().includes(normalizedQuery))
      .filter((song) => difficulty === "all" || song.difficulty === Number(difficulty))
      .filter((song) => !pinnedOnly || song.is_favorite)
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "difficulty-high") return b.difficulty - a.difficulty || a.name.localeCompare(b.name);
        if (sort === "difficulty-low") return a.difficulty - b.difficulty || a.name.localeCompare(b.name);
        if (sort === "pinned") return Number(b.is_favorite) - Number(a.is_favorite) || (a.pin_position ?? Number.MAX_SAFE_INTEGER) - (b.pin_position ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
        const aDate = latestBySong.get(a.id)?.created_at ?? a.updated_at;
        const bDate = latestBySong.get(b.id)?.created_at ?? b.updated_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [difficulty, latestBySong, pinnedOnly, query, songs, sort]);

  return <>
    <div className="mt-6 grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_12rem_10rem_auto]"><label className="relative block"><span className="sr-only">Search songs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs…" className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-3 pl-9 text-sm shadow-sm transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" /></label><CustomSelect value={sort} onValueChange={setSort} ariaLabel="Sort songs" options={[{ value: "recent", label: "Recently practiced" }, { value: "name", label: "Name" }, { value: "pinned", label: "Pinned first" }, { value: "difficulty-high", label: "Hardest first" }, { value: "difficulty-low", label: "Easiest first" }]} /><CustomSelect value={difficulty} onValueChange={setDifficulty} ariaLabel="Filter by difficulty" options={[{ value: "all", label: "Any difficulty" }, ...Array.from({ length: 10 }, (_, index) => (index + 1) / 2).map((value) => ({ value: String(value), label: `${value} star${value === 1 ? "" : "s"}` }))]} /><button type="button" aria-pressed={pinnedOnly} onClick={() => setPinnedOnly((current) => !current)} className={`h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-stone-500 ${pinnedOnly ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}>Pinned only</button></div>
    <div className="mt-4 grid gap-3">
      {filtered.length ? filtered.map((song) => {
        const latest = latestBySong.get(song.id);
        const parts = entries.filter((entry) => entry.item_id === song.id && entry.practice_part).map((entry) => entry.practice_part!);
        return <article key={song.id} className="group grid min-h-18 gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-stone-300 hover:bg-stone-50 hover:shadow-sm focus-within:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_10rem] sm:items-center">
          <Link href={`/songs/${song.slug}`} className="min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-stone-500"><h2 className="truncate text-sm font-semibold text-stone-950 group-hover:underline">{titleCaseSongName(song.name)}</h2></Link>
          <DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} />
          <div className="flex items-center justify-end gap-1"><FavoriteButton itemId={song.id} initialFavorite={song.is_favorite} compact /><EditItemModal itemId={song.id} itemSlug={song.slug} activitySlug="guitar" itemName={titleCaseSongName(song.name)} difficulty={song.difficulty} youtubeUrl={song.youtube_url} tuning={song.tuning} capo={song.capo} /><DeleteItemModal itemId={song.id} activitySlug="guitar" itemName={titleCaseSongName(song.name)} /></div>
          <div className="[&>button]:w-full"><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={song.slug} itemName={titleCaseSongName(song.name)} hasHistory={Boolean(latest)} previousParts={parts} currentYoutubeUrl={song.youtube_url} /></div>
        </article>;
      }) : <p className="px-5 py-8 text-center text-sm text-stone-500">{songs.length ? "No songs match that search." : "No songs yet."}</p>}
    </div>
  </>;
}
