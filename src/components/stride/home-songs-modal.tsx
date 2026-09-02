"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Pin, Search } from "lucide-react";
import { setHomeSongsAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { titleCaseSongName } from "@/lib/stride";

const initialState: MutationState = { success: false, error: null };

export function HomeSongsModal({ songs }: { songs: Array<{ id: string; name: string; is_favorite: boolean; pin_position?: number | null }> }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "outline" })}><Pin data-icon="inline-start" aria-hidden="true" />Customize pins</button><DialogShell open={open} onOpenChange={setOpen} title="Customize pins" size="md">{open ? <HomeSongsForm songs={songs} close={() => setOpen(false)} /> : null}</DialogShell></>;
}

function HomeSongsForm({ songs, close }: { songs: Array<{ id: string; name: string; is_favorite: boolean; pin_position?: number | null }>; close: () => void }) {
  const [state, action, pending] = useActionState(setHomeSongsAction, initialState);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => songs
    .filter((song) => song.is_favorite)
    .sort((a, b) => (a.pin_position ?? Number.MAX_SAFE_INTEGER) - (b.pin_position ?? Number.MAX_SAFE_INTEGER))
    .map((song) => song.id));
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const position = new Map(selected.map((id, index) => [id, index]));
    return [...songs]
      .sort((a, b) => {
        const aPosition = position.get(a.id);
        const bPosition = position.get(b.id);
        if (aPosition !== undefined && bPosition !== undefined) return aPosition - bPosition;
        if (aPosition !== undefined) return -1;
        if (bPosition !== undefined) return 1;
        return a.name.localeCompare(b.name);
      })
      .filter((song) => song.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [query, selected, songs]);
  useEffect(() => { if (state.success) { router.refresh(); close(); } }, [close, router, state.success]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((songId) => songId !== id) : [...current, id]);
  }

  function move(id: string, targetId: string) {
    if (id === targetId) return;
    setSelected((current) => {
      const from = current.indexOf(id);
      const to = current.indexOf(targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, id);
      return next;
    });
  }

  function moveBy(id: string, direction: -1 | 1) {
    setSelected((current) => {
      const from = current.indexOf(id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  return <form action={action} className="grid gap-4"><input type="hidden" name="itemIds" value={selected.join(",")} />{state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}<label className="relative block"><span className="sr-only">Filter songs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter songs" className="h-10 w-full rounded-lg border border-stone-300 pr-3 pl-9 text-sm shadow-sm focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" /></label><p className="text-xs leading-5 text-stone-500">Pinned songs stay at the top in Home order. Drag a pinned song by its handle to move it.</p><div className="max-h-80 overflow-y-auto rounded-lg border border-stone-200">{filtered.map((song) => { const isSelected = selectedSet.has(song.id); const name = titleCaseSongName(song.name); return <div key={song.id} onDragOver={(event) => { if (isSelected) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); move(event.dataTransfer.getData("text/plain"), song.id); }} className={`grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-center gap-2 border-b border-stone-200 px-3 py-2.5 text-sm transition last:border-b-0 hover:bg-stone-50 focus-within:bg-stone-50 ${isSelected ? "bg-white" : "bg-stone-50/60"}`}><input type="checkbox" checked={isSelected} onChange={() => toggle(song.id)} aria-label={`${isSelected ? "Unpin" : "Pin"} ${name}`} className="size-4 cursor-pointer accent-stone-900" /><button type="button" onClick={() => toggle(song.id)} className={`min-w-0 cursor-pointer truncate rounded-sm text-left font-medium focus-visible:ring-2 focus-visible:ring-stone-500 ${isSelected ? "text-stone-900" : "text-stone-500"}`}>{name}</button><button type="button" draggable={isSelected} disabled={!isSelected} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", song.id); }} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveBy(song.id, -1); } if (event.key === "ArrowDown") { event.preventDefault(); moveBy(song.id, 1); } }} title={isSelected ? "Drag to reorder. Use Up or Down arrow keys for keyboard reordering." : "Pin this song before reordering it."} aria-label={isSelected ? `Reorder ${name}` : `${name} is not pinned`} className="cursor-grab rounded-md p-1 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800 focus-visible:ring-2 focus-visible:ring-stone-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:text-stone-300"><GripVertical className="size-4" aria-hidden="true" /></button></div>; })}{!filtered.length ? <p className="px-4 py-6 text-center text-sm text-stone-500">No matching songs.</p> : null}</div><div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4"><span className="text-xs text-stone-500">{selected.length} pinned</span><div className="flex gap-2"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save Order"}</button></div></div></form>;
}
