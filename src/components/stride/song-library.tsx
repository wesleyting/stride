"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Folder, Search, X } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { EditItemModal } from "@/components/stride/edit-item-modal";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { StartPracticeTimerButton } from "@/components/stride/practice-timer";
import { titleCaseSongName, type EntryRecord, type ItemRecord, type SongFolderRecord } from "@/lib/stride";

export function SongLibrary({ songs, entries, folders, foldersReady, referencesBySong = {} }: { songs: ItemRecord[]; entries: EntryRecord[]; folders: SongFolderRecord[]; foldersReady: boolean; referencesBySong?: Record<string, string[]> }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [difficulty, setDifficulty] = useState("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const latestBySong = useMemo(() => {
    const latest = new Map<string, EntryRecord>();
    entries.forEach((entry) => { if (entry.item_id && !latest.has(entry.item_id)) latest.set(entry.item_id, entry); });
    return latest;
  }, [entries]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return songs
      .filter((song) => song.name.toLowerCase().includes(normalizedQuery))
      .filter((song) => {
        if (difficulty === "all") return true;
        if (difficulty === "unset") return song.difficulty === null;
        return song.difficulty === Number(difficulty);
      })
      .filter((song) => !pinnedOnly || song.is_favorite)
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "difficulty-high") return (b.difficulty ?? -1) - (a.difficulty ?? -1) || a.name.localeCompare(b.name);
        if (sort === "difficulty-low") return (a.difficulty ?? 6) - (b.difficulty ?? 6) || a.name.localeCompare(b.name);
        if (sort === "pinned") return Number(b.is_favorite) - Number(a.is_favorite) || (a.pin_position ?? Number.MAX_SAFE_INTEGER) - (b.pin_position ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
        if (sort === "needs-practice") {
          const aLastPractice = latestBySong.get(a.id)?.created_at;
          const bLastPractice = latestBySong.get(b.id)?.created_at;
          if (!aLastPractice || !bLastPractice) return Number(Boolean(aLastPractice)) - Number(Boolean(bLastPractice)) || a.name.localeCompare(b.name);
          return new Date(aLastPractice).getTime() - new Date(bLastPractice).getTime() || a.name.localeCompare(b.name);
        }
        const aDate = latestBySong.get(a.id)?.created_at ?? a.updated_at;
        const bDate = latestBySong.get(b.id)?.created_at ?? b.updated_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [difficulty, latestBySong, pinnedOnly, query, songs, sort]);

  const hasFilters = Boolean(query.trim() || difficulty !== "all" || pinnedOnly);
  function clearFilters() {
    setQuery("");
    setDifficulty("all");
    setPinnedOnly(false);
  }
  function toggleFolder(folderId: string) {
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }
  const groups = [
    ...folders.map((folder) => ({ id: folder.id, name: folder.name, songs: filtered.filter((song) => song.folder_id === folder.id) })),
    { id: "uncategorized", name: "Uncategorized", songs: filtered.filter((song) => !song.folder_id || !folders.some((folder) => folder.id === song.folder_id)) },
  ].filter((group) => group.songs.length > 0 || !hasFilters && group.id !== "uncategorized");

  return <>
    <div className="mt-6 grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_12rem_10rem_auto]"><label className="relative block"><span className="sr-only">Search songs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input data-shortcut-search aria-keyshortcuts="/" value={query} onChange={(event) => { setQuery(event.target.value); setCollapsedFolders(new Set()); }} onKeyDown={(event) => { if (event.key === "Escape") { if (query) setQuery(""); else event.currentTarget.blur(); } }} placeholder="Search songs…" className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-10 pl-9 text-sm shadow-sm transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" />{query ? <button type="button" onClick={() => setQuery("")} title="Clear search" aria-label="Clear song search" className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-800 focus-visible:ring-2 focus-visible:ring-stone-500"><X className="size-4" aria-hidden="true" /></button> : <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-sans text-[0.6875rem] text-stone-400 sm:block">/</kbd>}</label><CustomSelect value={sort} onValueChange={setSort} ariaLabel="Sort songs" options={[{ value: "recent", label: "Recently practiced" }, { value: "needs-practice", label: "Needs practice" }, { value: "name", label: "Name" }, { value: "pinned", label: "Pinned first" }, { value: "difficulty-high", label: "Hardest first" }, { value: "difficulty-low", label: "Easiest first" }]} /><CustomSelect value={difficulty} onValueChange={(value) => { setDifficulty(value); setCollapsedFolders(new Set()); }} ariaLabel="Filter by difficulty" options={[{ value: "all", label: "Any difficulty" }, { value: "unset", label: "Not set" }, ...Array.from({ length: 10 }, (_, index) => (index + 1) / 2).map((value) => ({ value: String(value), label: `${value} star${value === 1 ? "" : "s"}` }))]} /><button type="button" aria-pressed={pinnedOnly} onClick={() => { setPinnedOnly((current) => !current); setCollapsedFolders(new Set()); }} className={`h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-stone-500 ${pinnedOnly ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}>Pinned only</button></div>
    {hasFilters ? <div className="mt-3 flex min-h-8 items-center justify-between gap-3 px-1"><p aria-live="polite" className="text-xs text-stone-500"><span className="font-semibold text-stone-700">{filtered.length}</span> of {songs.length} {songs.length === 1 ? "song" : "songs"}</p><button type="button" onClick={clearFilters} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><X className="size-3.5" aria-hidden="true" />Clear Filters</button></div> : null}
    {!foldersReady ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run migration <code>0022_song_folders_and_optional_difficulty.sql</code> to enable folders and optional difficulty.</p> : null}
    <div className="mt-6 grid gap-4">
      {groups.map((group) => { const expanded = !collapsedFolders.has(group.id); return <section key={group.id} aria-labelledby={`folder-${group.id}`}><h2 id={`folder-${group.id}`} className="mb-2"><button type="button" onClick={() => toggleFolder(group.id)} aria-expanded={expanded} aria-controls={`folder-songs-${group.id}`} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-500"><Folder className="size-4 text-stone-400" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">{group.name}</span><span className="text-xs tabular-nums text-stone-400">{group.songs.length}</span><ChevronDown className={`size-4 text-stone-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button></h2><div id={`folder-songs-${group.id}`} hidden={!expanded} className="grid gap-2">{group.songs.length ? group.songs.map((song) => <SongRow key={song.id} song={song} latest={latestBySong.get(song.id)} entries={entries} folders={folders} referenceUrls={referencesBySong[song.id]} />) : <p className="rounded-xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400">No songs in this folder.</p>}</div></section>; })}
      {!groups.length ? <p className="px-5 py-8 text-center text-sm text-stone-500">{songs.length ? "No songs match those filters." : "No songs yet."}</p> : null}
    </div>
  </>;
}

function SongRow({ song, latest, entries, folders, referenceUrls }: { song: ItemRecord; latest?: EntryRecord; entries: EntryRecord[]; folders: SongFolderRecord[]; referenceUrls?: string[] }) {
  const parts = entries.filter((entry) => entry.item_id === song.id && entry.practice_part).map((entry) => entry.practice_part!);
  return <article className="group grid min-h-18 gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-stone-300 hover:bg-stone-50 hover:shadow-sm focus-within:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_10rem] sm:items-center">
    <Link href={`/songs/${song.slug}`} className="min-w-0 rounded-md focus-visible:ring-2 focus-visible:ring-stone-500"><h3 className="truncate text-sm font-semibold text-stone-950 group-hover:underline">{titleCaseSongName(song.name)}</h3></Link>
    <DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} />
    <div className="flex items-center justify-end gap-1"><StartPracticeTimerButton itemId={song.id} itemSlug={song.slug} itemName={titleCaseSongName(song.name)} iconOnly /><FavoriteButton itemId={song.id} initialFavorite={song.is_favorite} compact /><EditItemModal itemId={song.id} itemSlug={song.slug} activitySlug="guitar" itemName={titleCaseSongName(song.name)} difficulty={song.difficulty} youtubeUrl={song.youtube_url} referenceUrls={referenceUrls} tuning={song.tuning} capo={song.capo} folderId={song.folder_id} folders={folders} /><DeleteItemModal itemId={song.id} activitySlug="guitar" itemName={titleCaseSongName(song.name)} /></div>
    <div className="[&>button]:w-full"><LogPracticeModal activitySlug="guitar" activityName="Guitar" activityKind="practice" itemSlug={song.slug} itemName={titleCaseSongName(song.name)} hasHistory={Boolean(latest)} previousParts={parts} currentYoutubeUrl={song.youtube_url} /></div>
  </article>;
}
