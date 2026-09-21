"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, GripVertical, ListOrdered } from "lucide-react";
import { setSongArrangementAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";
import { titleCaseSongName, type ItemRecord } from "@/lib/stride";

export function ArrangeSongsModal({ folderId, folderName, songs, onSaved }: { folderId: string | null; folderName: string; songs: ItemRecord[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} title={`Arrange songs in ${folderName}`} aria-label={`Arrange songs in ${folderName}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><ListOrdered aria-hidden="true" /></button><DialogShell open={open} onOpenChange={setOpen} title={`Arrange ${folderName}`} description="Drag songs into order and choose which stay in your active repertoire." size="md">{open ? <ArrangeSongsContent folderId={folderId} songs={songs} close={() => setOpen(false)} onSaved={onSaved} /> : null}</DialogShell></>;
}

function ArrangeSongsContent({ folderId, songs, close, onSaved }: { folderId: string | null; songs: ItemRecord[]; close: () => void; onSaved: () => void }) {
  const [ordered, setOrdered] = useState(() => [...songs].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function move(songId: string, targetIndex: number) {
    setOrdered((current) => {
      const sourceIndex = current.findIndex((song) => song.id === songId);
      if (sourceIndex < 0) return current;
      const next = [...current];
      const [song] = next.splice(sourceIndex, 1);
      next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, song);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setSongArrangementAction(folderId, ordered.map((song) => ({ id: song.id, isHidden: song.is_hidden })));
      if (!result.success) { setError(result.error ?? "Could not save these songs."); return; }
      showToast("Song order saved.");
      onSaved();
      close();
    });
  }

  return <div className="grid gap-4">
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
    <div className="grid gap-1">{ordered.map((song, index) => <div key={song.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) move(draggedId, index); setDraggedId(null); }} className={`flex min-h-12 items-center gap-2 rounded-lg border px-2 py-1.5 transition ${song.is_hidden ? "border-stone-200 bg-stone-50 text-stone-500" : "border-stone-200 bg-white text-stone-900"}`}>
      <button type="button" draggable onDragStart={() => setDraggedId(song.id)} onDragEnd={() => setDraggedId(null)} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); move(song.id, index - 1); } if (event.key === "ArrowDown") { event.preventDefault(); move(song.id, index + 1); } }} title="Drag to reorder. Use arrow keys when focused." aria-label={`Reorder ${titleCaseSongName(song.name)}`} className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-stone-500 active:cursor-grabbing"><GripVertical className="size-4" aria-hidden="true" /></button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{titleCaseSongName(song.name)}</span>
      <button type="button" aria-pressed={song.is_hidden} onClick={() => setOrdered((current) => current.map((item) => item.id === song.id ? { ...item, is_hidden: !item.is_hidden } : item))} title={song.is_hidden ? "Return to active repertoire" : "Hide from active repertoire"} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-500">{song.is_hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}<span className="hidden sm:inline">{song.is_hidden ? "Show" : "Hide"}</span></button>
    </div>)}</div>
    <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4"><p className="text-xs leading-5 text-stone-500">Hidden songs remain in this folder and can be restored anytime.</p><div className="flex shrink-0 gap-2"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="button" onClick={save} disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save"}</button></div></div>
  </div>;
}
