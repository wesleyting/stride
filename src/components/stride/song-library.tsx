"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Folder, Minus, Plus, Search, X } from "lucide-react";
import { moveSongAction, setSongFolderOrderAction } from "@/app/actions";
import { CustomSelect } from "@/components/ui/custom-select";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { EditItemModal } from "@/components/stride/edit-item-modal";
import { FavoriteButton } from "@/components/stride/favorite-button";
import { SongFolderManager } from "@/components/stride/song-folder-manager";
import { SongVisibilityButton } from "@/components/stride/song-visibility-button";
import { useToast } from "@/components/stride/toast-provider";
import { titleCaseSongName, type ItemRecord, type SongFolderRecord } from "@/lib/stride";

const collapsedFoldersStorageKey = "stride:song-library-collapsed-folders";
const shownHiddenStorageKey = "stride:song-library-shown-hidden";
const songLibraryViewChangeEvent = "stride:song-library-view-change";
let inMemoryCollapsedFolders = "[]";
let inMemoryShownHidden = "[]";

type DraggedItem = { type: "song" | "folder"; id: string };

function readStoredIds(key: string, fallback: string) {
  try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function parseStoredIds(value: string) {
  try {
    const parsed = JSON.parse(value);
    return new Set<string>(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch { return new Set<string>(); }
}

function subscribeToLibraryView(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(songLibraryViewChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(songLibraryViewChangeEvent, onStoreChange);
  };
}

function saveStoredIds(key: string, ids: Set<string>) {
  const value = JSON.stringify([...ids]);
  if (key === collapsedFoldersStorageKey) inMemoryCollapsedFolders = value;
  else inMemoryShownHidden = value;
  try { window.localStorage.setItem(key, value); } catch { /* Keep the in-memory preference. */ }
  window.dispatchEvent(new Event(songLibraryViewChangeEvent));
}

export function SongLibrary({ songs, folders, foldersReady, referencesBySong = {}, addedSongSlug }: { songs: ItemRecord[]; folders: SongFolderRecord[]; foldersReady: boolean; referencesBySong?: Record<string, string[]>; addedSongSlug?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [layoutSongs, setLayoutSongs] = useState(() => songs);
  const [layoutFolders, setLayoutFolders] = useState(() => [...folders].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
  const [highlightedSong, setHighlightedSong] = useState(addedSongSlug ?? null);
  const [dragged, setDragged] = useState<DraggedItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [folderDropAfter, setFolderDropAfter] = useState(false);
  const draggedRef = useRef(false);
  const collapsedFoldersValue = useSyncExternalStore(subscribeToLibraryView, () => readStoredIds(collapsedFoldersStorageKey, inMemoryCollapsedFolders), () => "[]");
  const shownHiddenValue = useSyncExternalStore(subscribeToLibraryView, () => readStoredIds(shownHiddenStorageKey, inMemoryShownHidden), () => "[]");
  const collapsedFolders = useMemo(() => parseStoredIds(collapsedFoldersValue), [collapsedFoldersValue]);
  const shownHidden = useMemo(() => parseStoredIds(shownHiddenValue), [shownHiddenValue]);

  useEffect(() => {
    if (!addedSongSlug) return;
    const addedSong = songs.find((song) => song.slug === addedSongSlug);
    if (addedSong) {
      const next = parseStoredIds(readStoredIds(collapsedFoldersStorageKey, inMemoryCollapsedFolders));
      next.delete(addedSong.folder_id ?? "uncategorized");
      saveStoredIds(collapsedFoldersStorageKey, next);
    }
    const scrollTimer = window.setTimeout(() => document.querySelector<HTMLElement>(`[data-song-slug="${CSS.escape(addedSongSlug)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 140);
    const url = new URL(window.location.href);
    url.searchParams.delete("added");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    return () => window.clearTimeout(scrollTimer);
  }, [addedSongSlug, songs]);

  useEffect(() => {
    if (!addedSongSlug) return;
    const timer = window.setTimeout(() => setHighlightedSong(null), 3500);
    return () => window.clearTimeout(timer);
  }, [addedSongSlug]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return layoutSongs
      .filter((song) => song.name.toLowerCase().includes(normalizedQuery))
      .filter((song) => difficulty === "all" ? true : difficulty === "unset" ? song.difficulty === null : song.difficulty === Number(difficulty))
      .filter((song) => !pinnedOnly || song.is_favorite)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }, [difficulty, layoutSongs, pinnedOnly, query]);

  const hasFilters = Boolean(query.trim() || difficulty !== "all" || pinnedOnly);
  const knownFolderIds = new Set(layoutFolders.map((folder) => folder.id));
  const groups = [
    ...layoutFolders.map((folder) => ({ id: folder.id, folderId: folder.id as string | null, name: folder.name, songs: filtered.filter((song) => song.folder_id === folder.id) })),
    { id: "uncategorized", folderId: null, name: "Uncategorized", songs: filtered.filter((song) => !song.folder_id || !knownFolderIds.has(song.folder_id)) },
  ].filter((group) => group.songs.length > 0 || (!hasFilters && group.id !== "uncategorized") || (dragged?.type === "song" && group.id === "uncategorized"));

  function toggleStoredId(key: string, current: Set<string>, id: string) {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    saveStoredIds(key, next);
  }

  function finishDrag() {
    setDragged(null);
    setDropTarget(null);
    setFolderDropAfter(false);
    window.setTimeout(() => { draggedRef.current = false; }, 0);
  }

  function moveFolder(folderId: string, targetId: string, after: boolean) {
    if (folderId === targetId) return;
    const previous = layoutFolders;
    const next = [...layoutFolders];
    const sourceIndex = next.findIndex((folder) => folder.id === folderId);
    if (sourceIndex < 0 || !next.some((folder) => folder.id === targetId)) return;
    const [moved] = next.splice(sourceIndex, 1);
    const insertionIndex = next.findIndex((folder) => folder.id === targetId) + (after ? 1 : 0);
    next.splice(insertionIndex, 0, moved);
    setLayoutFolders(next.map((folder, index) => ({ ...folder, sort_order: index })));
    startTransition(async () => {
      const result = await setSongFolderOrderAction(next.map((folder) => folder.id));
      if (!result.success) { setLayoutFolders(previous); showToast(result.error ?? "Could not move the folder.", { tone: "error" }); }
      else router.refresh();
    });
  }

  function moveSong(songId: string, targetFolderId: string | null, beforeSongId?: string) {
    const movedSong = layoutSongs.find((song) => song.id === songId);
    if (!movedSong) return;
    const previous = layoutSongs;
    const remaining = layoutSongs.filter((song) => song.id !== songId);
    const inTarget = remaining.filter((song) => (song.folder_id ?? null) === targetFolderId);
    const active = inTarget.filter((song) => !song.is_hidden).sort((a, b) => a.sort_order - b.sort_order);
    const hidden = inTarget.filter((song) => song.is_hidden).sort((a, b) => a.sort_order - b.sort_order);
    const partition = movedSong.is_hidden ? hidden : active;
    const targetIndex = beforeSongId ? partition.findIndex((song) => song.id === beforeSongId) : -1;
    partition.splice(targetIndex >= 0 ? targetIndex : partition.length, 0, { ...movedSong, folder_id: targetFolderId });
    const ordered = [...active, ...hidden];
    const orderById = new Map(ordered.map((song, index) => [song.id, index]));
    const next = remaining.map((song) => orderById.has(song.id) ? { ...song, sort_order: orderById.get(song.id)! } : song);
    next.push({ ...movedSong, folder_id: targetFolderId, sort_order: orderById.get(songId) ?? ordered.length - 1 });
    setLayoutSongs(next);
    startTransition(async () => {
      const result = await moveSongAction(songId, targetFolderId, ordered.map((song) => song.id));
      if (!result.success) { setLayoutSongs(previous); showToast(result.error ?? "Could not move the song.", { tone: "error" }); }
      else router.refresh();
    });
  }

  function handleFolderDrop(folderId: string | null) {
    if (dragged?.type === "folder" && folderId) moveFolder(dragged.id, folderId, folderDropAfter);
    if (dragged?.type === "song") moveSong(dragged.id, folderId);
    finishDrag();
  }

  return <>
    <div className="mt-6 grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_10rem_auto]"><label className="relative block"><span className="sr-only">Search songs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input data-shortcut-search aria-keyshortcuts="/" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { if (query) setQuery(""); else event.currentTarget.blur(); } }} placeholder="Search songs…" className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-10 pl-9 text-sm shadow-sm transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" />{query ? <button type="button" onClick={() => setQuery("")} title="Clear search" aria-label="Clear song search" className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-800 focus-visible:ring-2 focus-visible:ring-stone-500"><X className="size-4" aria-hidden="true" /></button> : <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-sans text-[0.6875rem] text-stone-400 sm:block">/</kbd>}</label><CustomSelect value={difficulty} onValueChange={setDifficulty} ariaLabel="Filter by difficulty" options={[{ value: "all", label: "Any difficulty" }, { value: "unset", label: "Not set" }, ...Array.from({ length: 10 }, (_, index) => (index + 1) / 2).map((value) => ({ value: String(value), label: `${value} star${value === 1 ? "" : "s"}` }))]} /><button type="button" aria-pressed={pinnedOnly} onClick={() => setPinnedOnly((current) => !current)} className={`h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-stone-500 ${pinnedOnly ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}>Pinned only</button></div>
    {hasFilters ? <div className="mt-3 flex min-h-8 items-center justify-between gap-3 px-1"><p aria-live="polite" className="text-xs text-stone-500"><span className="font-semibold text-stone-700">{filtered.length}</span> of {layoutSongs.length} {layoutSongs.length === 1 ? "song" : "songs"}</p><button type="button" onClick={() => { setQuery(""); setDifficulty("all"); setPinnedOnly(false); }} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><X className="size-3.5" aria-hidden="true" />Clear Filters</button></div> : null}
    {!foldersReady ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Run migration <code>0022_song_folders_and_optional_difficulty.sql</code> to enable folders and optional difficulty.</p> : null}
    <div className={`mt-6 grid gap-4 ${pending ? "cursor-progress" : ""}`}>
      {groups.map((group) => {
        const expanded = hasFilters || !collapsedFolders.has(group.id);
        const hiddenShown = hasFilters || shownHidden.has(group.id);
        const activeSongs = group.songs.filter((song) => !song.is_hidden);
        const hiddenSongs = group.songs.filter((song) => song.is_hidden);
        const folderIsDragged = dragged?.type === "folder" && dragged.id === group.id;
        const folderIsTarget = dropTarget === `folder:${group.id}`;
        const rowProps = (song: ItemRecord) => ({ song, folders, referenceUrls: referencesBySong[song.id], dragged: dragged?.type === "song" && dragged.id === song.id, dropTarget: dropTarget === `song:${song.id}`, onDragStart: (event: React.DragEvent<HTMLElement>) => { draggedRef.current = true; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", song.id); setDragged({ type: "song" as const, id: song.id }); }, onDragEnd: finishDrag, onDragOver: (event: React.DragEvent<HTMLElement>) => { if (dragged?.type !== "song") return; event.preventDefault(); event.stopPropagation(); setDropTarget(`song:${song.id}`); }, onDrop: (event: React.DragEvent<HTMLElement>) => { event.preventDefault(); event.stopPropagation(); if (dragged?.type === "song") moveSong(dragged.id, group.folderId, song.id); finishDrag(); }, onOpen: () => { if (!draggedRef.current) router.push(`/songs/${song.slug}`); } });
        return <section key={group.id} aria-labelledby={`folder-${group.id}`} className={`rounded-xl transition ${folderIsDragged ? "bg-stone-100 opacity-45" : ""} ${folderIsTarget && dragged?.type === "song" ? "ring-2 ring-stone-400 ring-offset-2" : ""} ${folderIsTarget && dragged?.type === "folder" ? folderDropAfter ? "border-b-2 border-stone-500 pb-2" : "border-t-2 border-stone-500 pt-2" : ""}`} onDragOver={(event) => { if (!dragged) return; event.preventDefault(); setDropTarget(`folder:${group.id}`); if (dragged.type === "folder") { const header = event.currentTarget.querySelector("h2"); if (header) { const bounds = header.getBoundingClientRect(); setFolderDropAfter(event.clientY > bounds.top + bounds.height / 2); } } }} onDrop={(event) => { event.preventDefault(); handleFolderDrop(group.folderId); }}>
          <h2 id={`folder-${group.id}`} className="mb-2"><button type="button" draggable={Boolean(group.folderId)} onDragStart={(event) => { if (!group.folderId) return; draggedRef.current = true; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", group.folderId); setDragged({ type: "folder", id: group.folderId }); }} onDragEnd={finishDrag} onClick={() => { if (!draggedRef.current) toggleStoredId(collapsedFoldersStorageKey, collapsedFolders, group.id); }} aria-expanded={expanded} aria-controls={`folder-songs-${group.id}`} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-500 active:cursor-grabbing"><Folder className="size-4 text-stone-400" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">{group.name}</span><span className="text-xs tabular-nums text-stone-400">{activeSongs.length}</span><ChevronDown className={`size-4 text-stone-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button></h2>
          <div id={`folder-songs-${group.id}`} hidden={!expanded} className="grid gap-2">{activeSongs.length ? activeSongs.map((song) => <SongRow key={song.id} {...rowProps(song)} justAdded={addedSongSlug === song.slug} highlighted={highlightedSong === song.slug} />) : !hiddenSongs.length ? <p className="rounded-xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400">No songs in this folder.</p> : null}{hiddenSongs.length && !hiddenShown ? <HiddenSongsToggle count={hiddenSongs.length} shown={false} onClick={() => toggleStoredId(shownHiddenStorageKey, shownHidden, group.id)} /> : null}{hiddenSongs.length && hiddenShown ? <>{hiddenSongs.map((song) => <SongRow key={song.id} {...rowProps(song)} />)}{!hasFilters ? <HiddenSongsToggle count={hiddenSongs.length} shown onClick={() => toggleStoredId(shownHiddenStorageKey, shownHidden, group.id)} /> : null}</> : null}</div>
        </section>;
      })}
      {!groups.length ? <p className="px-5 py-8 text-center text-sm text-stone-500">{layoutSongs.length ? "No songs match those filters." : "No songs yet."}</p> : null}
    </div>
    <div className="mt-5 flex justify-center border-t border-stone-200 pt-4"><SongFolderManager folders={layoutFolders} ready={foldersReady} addOnly /></div>
  </>;
}

function HiddenSongsToggle({ count, shown, onClick }: { count: number; shown: boolean; onClick: () => void }) {
  return <div className="my-1 flex items-center gap-3 text-stone-300"><span className="h-px flex-1 bg-current" aria-hidden="true" /><button type="button" onClick={onClick} aria-expanded={shown} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:ring-2 focus-visible:ring-stone-500"><span>{shown ? `Hide Hidden Songs (${count})` : `Show Hidden Songs (${count})`}</span>{shown ? <Minus className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}</button><span className="h-px flex-1 bg-current" aria-hidden="true" /></div>;
}

type SongRowProps = { song: ItemRecord; folders: SongFolderRecord[]; referenceUrls?: string[]; justAdded?: boolean; highlighted?: boolean; dragged: boolean; dropTarget: boolean; onDragStart: (event: React.DragEvent<HTMLElement>) => void; onDragEnd: () => void; onDragOver: (event: React.DragEvent<HTMLElement>) => void; onDrop: (event: React.DragEvent<HTMLElement>) => void; onOpen: () => void };

function SongRow({ song, folders, referenceUrls, justAdded = false, highlighted = false, dragged, dropTarget, onDragStart, onDragEnd, onDragOver, onDrop, onOpen }: SongRowProps) {
  const name = titleCaseSongName(song.name);
  return <article data-song-slug={song.slug} draggable onDragStart={(event) => { if ((event.target as HTMLElement).closest("button, [data-song-controls]")) { event.preventDefault(); return; } onDragStart(event); }} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} role="link" tabIndex={0} aria-label={`Open ${name}`} className={`group grid min-h-18 cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-all duration-500 hover:border-stone-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-stone-500 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center ${song.is_hidden ? "border-stone-200 bg-stone-50/80 hover:bg-stone-100/80" : "border-stone-200 bg-white hover:bg-stone-50"} ${highlighted ? "border-stone-500 ring-2 ring-stone-300" : ""} ${dragged ? "border-stone-300 bg-stone-100 shadow-none [&>*]:invisible" : ""} ${dropTarget ? "border-stone-500 ring-2 ring-stone-300" : ""}`}>
    <h3 className={`flex min-w-0 items-center gap-2 truncate text-sm font-semibold ${song.is_hidden ? "text-stone-700" : "text-stone-950"}`}><span className="truncate">{name}</span>{justAdded ? <span className="shrink-0 rounded-full bg-stone-900 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-white">Just Added</span> : null}</h3>
    <div data-song-controls onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}><DifficultyControl itemId={song.id} itemSlug={song.slug} activitySlug="guitar" value={song.difficulty} /></div>
    <div data-song-controls onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} className="flex items-center justify-end gap-1"><SongVisibilityButton itemId={song.id} itemName={name} hidden={song.is_hidden} /><FavoriteButton itemId={song.id} initialFavorite={song.is_favorite} compact /><EditItemModal itemId={song.id} itemSlug={song.slug} activitySlug="guitar" itemName={name} difficulty={song.difficulty} youtubeUrl={song.youtube_url} referenceUrls={referenceUrls} tuning={song.tuning} capo={song.capo} folderId={song.folder_id} folders={folders} /><DeleteItemModal itemId={song.id} activitySlug="guitar" itemName={name} /></div>
  </article>;
}
