"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { moveSongAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { songPositions, type SongPosition } from "@/lib/song-arrangement";
import { titleCaseSongName, type ItemRecord, type SongFolderRecord } from "@/lib/stride";

export function ArrangeSong({ song, songs, folders }: { song: ItemRecord; songs: ItemRecord[]; folders: SongFolderRecord[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Arrange ${titleCaseSongName(song.name)}`} className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} touch-order-controls sm:hidden`}><ArrowUpDown aria-hidden="true" /></button>
    <DialogShell open={open} onOpenChange={(value) => { if (!saving) setOpen(value); }} title="Arrange Song">
      {open ? <ArrangementDraft song={song} songs={songs} folders={folders} saving={saving} setSaving={setSaving} close={() => setOpen(false)} /> : null}
    </DialogShell>
  </>;
}

function ArrangementDraft({ song, songs, folders, saving, setSaving, close }: {
  song: ItemRecord; songs: ItemRecord[]; folders: SongFolderRecord[];
  saving: boolean; setSaving: (value: boolean) => void; close: () => void;
}) {
  // Freeze the draft's source while open, including during background refreshes.
  const [positions] = useState(() => songPositions(song, songs, folders));
  const [position, setPosition] = useState(() => Math.max(0, positions.findIndex((slot) => slot.original)));
  const [error, setError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const router = useRouter();
  const { showToast } = useToast();
  const slot = positions[position];
  const folderOptions = positions.filter((item) => item.index === 0).map((item) => ({ value: item.folderId ?? "uncategorized", label: item.folderName }));

  function step(direction: number) {
    setPosition((current) => Math.max(0, Math.min(positions.length - 1, current + direction)));
    setError(null);
  }

  async function save(target: SongPosition) {
    if (saveLock.current || target.original) return;
    saveLock.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await moveSongAction(song.id, target.folderId, target.orderedIds);
      if (!result.success) { setError(result.error ?? "Could not save the position. Try again."); return; }
      showToast("Song position saved.");
      close();
      router.refresh();
    } catch {
      setError("Could not save the position. Try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return <div className="grid gap-4">
    <p className="text-sm text-stone-500">Move freely. Nothing changes until you save.</p>
    <CustomSelect value={slot.folderId ?? "uncategorized"} onValueChange={(value) => {
      if (!saving) { setPosition(positions.findIndex((item) => (item.folderId ?? "uncategorized") === value)); setError(null); }
    }} ariaLabel="Destination folder" options={folderOptions} />
    <div className="grid gap-2" aria-label="Position preview">
      <div className="flex h-11 min-w-0 items-center rounded-lg bg-stone-50 px-3 text-sm text-stone-500"><span className="truncate">{slot.above ? titleCaseSongName(slot.above) : song.is_hidden ? "Start of hidden songs" : "Start of folder"}</span></div>
      <div className="flex h-16 min-w-0 items-center rounded-xl border border-stone-400 bg-white px-3 shadow-sm"><span className="truncate text-sm font-semibold text-stone-950">{titleCaseSongName(song.name)}</span></div>
      <div className="flex h-11 min-w-0 items-center rounded-lg bg-stone-50 px-3 text-sm text-stone-500"><span className="truncate">{slot.below ? titleCaseSongName(slot.below) : song.is_hidden ? "End of hidden songs" : "End of active songs"}</span></div>
    </div>
    <p role="status" className="truncate text-center text-xs text-stone-500">{slot.folderName} · {song.is_hidden ? "Hidden · " : ""}Position {slot.index + 1} of {slot.total}</p>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={saving || position === 0} onClick={() => step(-1)} className={buttonVariants({ variant: "outline" })}><ArrowUp aria-hidden="true" />Move Up</button>
      <button type="button" disabled={saving || position === positions.length - 1} onClick={() => step(1)} className={buttonVariants({ variant: "outline" })}><ArrowDown aria-hidden="true" />Move Down</button>
    </div>
    <p className="text-center text-xs text-stone-500">Keep moving to reach the next folder.</p>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
      <button type="button" disabled={saving} onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button>
      <button type="button" disabled={saving || slot.original} onClick={() => void save(slot)} className={buttonVariants()}>{saving ? "Saving…" : "Save Position"}</button>
    </div>
  </div>;
}
