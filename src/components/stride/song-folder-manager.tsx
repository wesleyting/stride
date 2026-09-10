"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import { createSongFolderAction, deleteSongFolderAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { songFieldClassName } from "@/components/stride/song-fields";
import { useToast } from "@/components/stride/toast-provider";
import type { SongFolderRecord } from "@/lib/stride";

const initialState: MutationState = { success: false, error: null };

export function SongFolderManager({ folders, ready }: { folders: SongFolderRecord[]; ready: boolean }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "outline" })}><FolderPlus data-icon="inline-start" aria-hidden="true" />Folders</button><DialogShell open={open} onOpenChange={setOpen} title="Folders" description="Create simple groups for your song library." size="md">{open ? <FolderManagerContent folders={folders} ready={ready} /> : null}</DialogShell></>;
}

function FolderManagerContent({ folders, ready }: { folders: SongFolderRecord[]; ready: boolean }) {
  const [state, action, pending] = useActionState(createSongFolderAction, initialState);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      showToast("Folder created.");
    }
  }, [showToast, state]);

  function removeFolder(folder: SongFolderRecord) {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteSongFolderAction(folder.id);
      if (!result.success) setDeleteError(result.error ?? "Could not remove the folder.");
      else showToast(`${folder.name} removed. Songs moved to Uncategorized.`);
    });
  }

  if (!ready) return <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Run migration <code>0022_song_folders_and_optional_difficulty.sql</code> to organize songs into folders.</p>;

  return <div className="grid gap-5">
    <form ref={formRef} action={action} className="flex items-end gap-2">
      <input type="hidden" name="activitySlug" value="guitar" />
      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold text-stone-900">New Folder<input name="name" required maxLength={40} placeholder="Fingerstyle" className={songFieldClassName} /></label>
      <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Adding…" : "Add"}</button>
    </form>
    {state.error || deleteError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error || deleteError}</p> : null}
    <div className="border-t border-stone-200 pt-4">
      {folders.length ? <div className="grid gap-1">{folders.map((folder) => <div key={folder.id} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-stone-50"><span className="truncate text-sm font-medium text-stone-900">{folder.name}</span><button type="button" disabled={deleting} onClick={() => removeFolder(folder)} title={`Remove ${folder.name}`} aria-label={`Remove ${folder.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><Trash2 aria-hidden="true" /></button></div>)}</div> : <p className="py-3 text-center text-sm text-stone-500">No folders yet.</p>}
      <p className="mt-3 text-xs leading-5 text-stone-500">Removing a folder keeps its songs and moves them to Uncategorized.</p>
    </div>
  </div>;
}
