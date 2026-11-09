"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { renameSongFolderAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { songFieldClassName } from "@/components/stride/song-fields";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";

export function RenameFolderButton({ folderId, folderName, onRenamed }: {
  folderId: string; folderName: string; onRenamed: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(folderName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const { showToast } = useToast();

  function save() {
    if (saving.current || !name.trim() || name.trim() === folderName) return;
    saving.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await renameSongFolderAction(folderId, name.trim());
        if (!result.success || !result.folder) {
          setError(result.error ?? "Could not rename the folder.");
          return;
        }
        onRenamed(result.folder.name);
        setOpen(false);
        showToast("Folder renamed.");
      } catch {
        setError("Could not rename the folder. Try again.");
      } finally {
        saving.current = false;
      }
    });
  }

  return <div data-song-controls onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <button type="button" title={`Rename ${folderName}`} aria-label={`Rename ${folderName}`} onClick={() => { setName(folderName); setError(null); setOpen(true); }} className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} text-stone-400 hover:text-stone-900`}><Pencil aria-hidden="true" /></button>
    <DialogShell open={open} onOpenChange={(value) => { if (!saving.current) setOpen(value); }} title="Rename Folder">
      <form onSubmit={(event) => { event.preventDefault(); save(); }} className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium">Folder Name<input autoFocus required maxLength={40} value={name} disabled={pending} onChange={(event) => setName(event.target.value)} className={songFieldClassName} /></label>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" disabled={pending} onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="submit" disabled={pending || !name.trim() || name.trim() === folderName} className={buttonVariants()}>{pending ? "Saving…" : "Save Name"}</button></div>
      </form>
    </DialogShell>
  </div>;
}
