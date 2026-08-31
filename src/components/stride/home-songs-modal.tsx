"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pin, Search } from "lucide-react";
import { setHomeSongsAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { titleCaseSongName } from "@/lib/stride";

const initialState: MutationState = { success: false, error: null };

export function HomeSongsModal({ songs }: { songs: Array<{ id: string; name: string; is_favorite: boolean }> }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "outline" })}><Pin data-icon="inline-start" aria-hidden="true" />Customize pins</button><DialogShell open={open} onOpenChange={setOpen} title="Customize pins" size="md">{open ? <HomeSongsForm songs={songs} close={() => setOpen(false)} /> : null}</DialogShell></>;
}

function HomeSongsForm({ songs, close }: { songs: Array<{ id: string; name: string; is_favorite: boolean }>; close: () => void }) {
  const [state, action, pending] = useActionState(setHomeSongsAction, initialState);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(songs.filter((song) => song.is_favorite).map((song) => song.id)));
  const filtered = useMemo(() => songs.filter((song) => song.name.toLowerCase().includes(query.trim().toLowerCase())), [query, songs]);
  useEffect(() => { if (state.success) close(); }, [close, state.success]);

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  return <form action={action} className="grid gap-4"><input type="hidden" name="itemIds" value={Array.from(selected).join(",")} />{state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}<label className="relative block"><span className="sr-only">Filter songs</span><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter songs" className="h-10 w-full rounded-lg border border-stone-300 pr-3 pl-9 text-sm shadow-sm focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" /></label><div className="max-h-80 overflow-y-auto rounded-lg border border-stone-200">{filtered.map((song) => <label key={song.id} className="flex cursor-pointer items-center gap-3 border-b border-stone-200 px-3 py-2.5 text-sm last:border-b-0 hover:bg-stone-50 focus-within:bg-stone-50"><input type="checkbox" checked={selected.has(song.id)} onChange={() => toggle(song.id)} className="size-4 accent-stone-900" /><span className="min-w-0 flex-1 truncate font-medium text-stone-900">{titleCaseSongName(song.name)}</span><Pin className={`size-4 ${selected.has(song.id) ? "fill-stone-700 text-stone-700" : "text-stone-300"}`} aria-hidden="true" /></label>)}{!filtered.length ? <p className="px-4 py-6 text-center text-sm text-stone-500">No matching songs.</p> : null}</div><div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4"><span className="text-xs text-stone-500">{selected.size} selected</span><div className="flex gap-2"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save"}</button></div></div></form>;
}
