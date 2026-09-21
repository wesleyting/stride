"use client";

import { useRef, useState, useTransition } from "react";
import { FolderPlus, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { createSongFolderAction, deleteSongFolderAction, renameSongFolderAction, setSongFolderOrderAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { songFieldClassName } from "@/components/stride/song-fields";
import { useToast } from "@/components/stride/toast-provider";
import type { SongFolderRecord } from "@/lib/stride";

export function SongFolderManager({ folders, ready, addOnly = false }: { folders: SongFolderRecord[]; ready: boolean; addOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={addOnly ? "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-500" : buttonVariants({ variant: "outline" })}>{addOnly ? <Plus className="size-4" aria-hidden="true" /> : <FolderPlus data-icon="inline-start" aria-hidden="true" />}{addOnly ? "Add Folder" : "Folders"}</button><DialogShell open={open} onOpenChange={setOpen} title={addOnly ? "Add Folder" : "Folders"} description="Create, rename, or remove folders." size="md">{open ? <FolderManagerContent key={folders.map((folder) => folder.id).join(",")} folders={folders} ready={ready} /> : null}</DialogShell></>;
}

function FolderManagerContent({ folders, ready }: { folders: SongFolderRecord[]; ready: boolean }) {
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, startCreate] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [orderedFolders, setOrderedFolders] = useState(folders);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, startRename] = useTransition();
  const [savingOrder, startSavingOrder] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  function createFolder(formData: FormData) {
    setCreateError(null);
    startCreate(async () => {
      const result = await createSongFolderAction({ success: false, error: null }, formData);
      if (!result.success) { setCreateError(result.error ?? "Could not create the folder."); return; }
      formRef.current?.reset();
      if (result.folder) setOrderedFolders((current) => [...current, { ...result.folder!, activity_id: "", sort_order: current.length, created_at: new Date().toISOString() }]);
      showToast("Folder created.");
    });
  }

  function removeFolder(folder: SongFolderRecord) {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteSongFolderAction(folder.id);
      if (!result.success) setDeleteError(result.error ?? "Could not remove the folder.");
      else { setOrderedFolders((current) => current.filter((item) => item.id !== folder.id)); showToast(`${folder.name} removed. Songs moved to Uncategorized.`); }
    });
  }

  function renameFolder(folderId: string) {
    setDeleteError(null);
    startRename(async () => {
      const result = await renameSongFolderAction(folderId, editingName);
      if (!result.success || !result.folder) {
        setDeleteError(result.error ?? "Could not rename the folder.");
        return;
      }
      setOrderedFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, name: result.folder!.name } : folder));
      setEditingId(null);
      showToast("Folder renamed.");
    });
  }

  function moveFolder(folderId: string, targetIndex: number) {
    setOrderedFolders((current) => {
      const fromIndex = current.findIndex((folder) => folder.id === folderId);
      if (fromIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, moved);
      return next;
    });
  }

  const orderChanged = orderedFolders.map((folder) => folder.id).join(",") !== folders.map((folder) => folder.id).join(",");

  function saveOrder() {
    startSavingOrder(async () => {
      const result = await setSongFolderOrderAction(orderedFolders.map((folder) => folder.id));
      if (!result.success) setDeleteError(result.error ?? "Could not save the folder order.");
      else showToast("Folder order saved.");
    });
  }

  if (!ready) return <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Run migration <code>0022_song_folders_and_optional_difficulty.sql</code> to organize songs into folders.</p>;

  return <div className="grid gap-5">
    <form ref={formRef} action={createFolder} className="flex items-end gap-2">
      <input type="hidden" name="activitySlug" value="guitar" />
      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold text-stone-900">New Folder<input name="name" required maxLength={40} placeholder="Fingerstyle" className={songFieldClassName} /></label>
      <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Adding…" : "Add"}</button>
    </form>
    {createError || deleteError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{createError || deleteError}</p> : null}
    <div className="border-t border-stone-200 pt-4">
      {orderedFolders.length ? <div className="grid gap-1">{orderedFolders.map((folder, index) => <div key={folder.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) moveFolder(draggedId, index); setDraggedId(null); }} className="flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-stone-200 hover:bg-stone-50">
        <button type="button" draggable={editingId !== folder.id} onDragStart={() => setDraggedId(folder.id)} onDragEnd={() => setDraggedId(null)} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveFolder(folder.id, index - 1); } if (event.key === "ArrowDown") { event.preventDefault(); moveFolder(folder.id, index + 1); } }} title="Drag to reorder. Use arrow keys when focused." aria-label={`Reorder ${folder.name}`} className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-stone-500 active:cursor-grabbing"><GripVertical className="size-4" aria-hidden="true" /></button>
        {editingId === folder.id ? <form onSubmit={(event) => { event.preventDefault(); renameFolder(folder.id); }} className="flex min-w-0 flex-1 items-center gap-2"><label className="sr-only" htmlFor={`rename-folder-${folder.id}`}>Folder name</label><input id={`rename-folder-${folder.id}`} autoFocus required maxLength={40} value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setEditingId(null); } }} className={`${songFieldClassName} min-w-0 flex-1`} /><button type="submit" disabled={renaming} className={buttonVariants({ size: "sm" })}>{renaming ? "Saving…" : "Save"}</button><button type="button" disabled={renaming} onClick={() => setEditingId(null)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancel</button></form> : <><span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">{folder.name}</span><button type="button" onClick={() => { setEditingId(folder.id); setEditingName(folder.name); setDeleteError(null); }} title={`Rename ${folder.name}`} aria-label={`Rename ${folder.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><Pencil aria-hidden="true" /></button><button type="button" disabled={deleting} onClick={() => removeFolder(folder)} title={`Remove ${folder.name}`} aria-label={`Remove ${folder.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><Trash2 aria-hidden="true" /></button></>}
      </div>)}</div> : <p className="py-3 text-center text-sm text-stone-500">No folders yet.</p>}
      {orderChanged ? <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"><p className="text-xs text-stone-600">Folder order changed</p><button type="button" onClick={saveOrder} disabled={savingOrder} className={buttonVariants({ size: "sm" })}>{savingOrder ? "Saving…" : "Save Order"}</button></div> : null}
      <p className="mt-3 text-xs leading-5 text-stone-500">Removing a folder keeps its songs and moves them to Uncategorized.</p>
    </div>
  </div>;
}
