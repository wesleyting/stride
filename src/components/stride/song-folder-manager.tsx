"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CornerDownRight, FolderPlus, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { createSongFolderAction, deleteSongFolderAction, renameSongFolderAction, setSongFolderTreeAction } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { songFieldClassName } from "@/components/stride/song-fields";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import type { SongFolderRecord } from "@/lib/stride";

type DropTarget = { id: string; mode: "before" | "after" | "inside" };

function normalizeTree(folders: SongFolderRecord[]) {
  const rootIds = new Set(folders.filter((folder) => !folder.parent_id).map((folder) => folder.id));
  const safe = folders.map((folder) => folder.parent_id && rootIds.has(folder.parent_id) ? folder : { ...folder, parent_id: null });
  const roots = safe.filter((folder) => !folder.parent_id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return roots.flatMap((root, rootIndex) => [
    { ...root, sort_order: rootIndex },
    ...safe.filter((folder) => folder.parent_id === root.id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).map((folder, index) => ({ ...folder, sort_order: index })),
  ]);
}

function treeSignature(folders: SongFolderRecord[]) {
  return normalizeTree(folders).map((folder) => `${folder.id}:${folder.parent_id ?? "root"}:${folder.sort_order}`).join("|");
}

export function SongFolderManager({ folders, ready, addOnly = false }: { folders: SongFolderRecord[]; ready: boolean; addOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} aria-label={addOnly ? "Add folder" : undefined} className={addOnly ? "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-500" : buttonVariants({ variant: "outline" })}>{addOnly ? <Plus className="size-4" aria-hidden="true" /> : <FolderPlus data-icon="inline-start" aria-hidden="true" />}{addOnly ? "Folder" : "Folders"}</button><DialogShell open={open} onOpenChange={setOpen} title="Organize Folders" description="Drag to reorder, or move a folder one level beneath another." size="md">{open ? <FolderManagerContent key={folders.map((folder) => `${folder.id}:${folder.parent_id ?? "root"}`).join(",")} folders={folders} ready={ready} /> : null}</DialogShell></>;
}

function FolderManagerContent({ folders, ready }: { folders: SongFolderRecord[]; ready: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startCreate] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [renaming, startRename] = useTransition();
  const [saving, startSaving] = useTransition();
  const [orderedFolders, setOrderedFolders] = useState(() => normalizeTree(folders));
  const [savedSignature, setSavedSignature] = useState(() => treeSignature(folders));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [createParentId, setCreateParentId] = useState("root");
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const roots = useMemo(() => orderedFolders.filter((folder) => !folder.parent_id).sort((a, b) => a.sort_order - b.sort_order), [orderedFolders]);
  const tree = useMemo(() => roots.flatMap((root) => [root, ...orderedFolders.filter((folder) => folder.parent_id === root.id).sort((a, b) => a.sort_order - b.sort_order)]), [orderedFolders, roots]);
  const currentSignature = treeSignature(orderedFolders);

  if (!ready) return <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Run migration <code>0026_song_subfolders.sql</code> to organize folders and subfolders.</p>;

  function createFolder(formData: FormData) {
    setError(null);
    formData.set("parentId", createParentId === "root" ? "" : createParentId);
    startCreate(async () => {
      const result = await createSongFolderAction({ success: false, error: null }, formData);
      if (!result.success || !result.folder) { setError(result.error ?? "Could not create the folder."); return; }
      const created: SongFolderRecord = { id: result.folder.id, name: result.folder.name, parent_id: result.folder.parent_id ?? null, sort_order: result.folder.sort_order ?? 999, activity_id: "", created_at: new Date().toISOString() };
      const next = normalizeTree([...orderedFolders, created]);
      setOrderedFolders(next);
      setSavedSignature(treeSignature(next));
      formRef.current?.reset();
      setCreateParentId("root");
      showToast(created.parent_id ? "Subfolder created." : "Folder created.");
    });
  }

  function removeFolder(folder: SongFolderRecord) {
    setError(null);
    startDelete(async () => {
      const result = await deleteSongFolderAction(folder.id);
      if (!result.success) { setError(result.error ?? "Could not remove the folder."); return; }
      const next = normalizeTree(orderedFolders.filter((item) => item.id !== folder.id).map((item) => item.parent_id === folder.id ? { ...item, parent_id: null } : item));
      setOrderedFolders(next);
      setSavedSignature(treeSignature(next));
      showToast(folder.parent_id ? `${folder.name} removed. Its songs moved to the parent folder.` : `${folder.name} removed.`);
    });
  }

  function renameFolder(folderId: string) {
    setError(null);
    startRename(async () => {
      const result = await renameSongFolderAction(folderId, editingName);
      if (!result.success || !result.folder) { setError(result.error ?? "Could not rename the folder."); return; }
      setOrderedFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, name: result.folder!.name } : folder));
      setEditingId(null);
      showToast("Folder renamed.");
    });
  }

  function moveFolder(folderId: string, target: DropTarget) {
    setOrderedFolders((current) => {
      const source = current.find((folder) => folder.id === folderId);
      const destination = current.find((folder) => folder.id === target.id);
      if (!source || !destination || source.id === destination.id) return current;
      const sourceHasChildren = current.some((folder) => folder.parent_id === source.id);
      if (target.mode === "inside") {
        if (destination.parent_id || sourceHasChildren) return current;
        const childCount = current.filter((folder) => folder.parent_id === destination.id && folder.id !== source.id).length;
        return normalizeTree(current.map((folder) => folder.id === source.id ? { ...folder, parent_id: destination.id, sort_order: childCount } : folder));
      }
      if (destination.parent_id && sourceHasChildren) return current;
      const parentId = destination.parent_id ?? null;
      const siblings = current.filter((folder) => folder.id !== source.id && (folder.parent_id ?? null) === parentId).sort((a, b) => a.sort_order - b.sort_order);
      const destinationIndex = siblings.findIndex((folder) => folder.id === destination.id);
      siblings.splice(destinationIndex + (target.mode === "after" ? 1 : 0), 0, { ...source, parent_id: parentId });
      const positions = new Map(siblings.map((folder, index) => [folder.id, index]));
      return normalizeTree(current.map((folder) => folder.id === source.id ? { ...folder, parent_id: parentId, sort_order: positions.get(folder.id) ?? 0 } : (folder.parent_id ?? null) === parentId && positions.has(folder.id) ? { ...folder, sort_order: positions.get(folder.id)! } : folder));
    });
  }

  function moveSibling(folder: SongFolderRecord, offset: number) {
    const siblings = orderedFolders.filter((item) => (item.parent_id ?? null) === (folder.parent_id ?? null)).sort((a, b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex((item) => item.id === folder.id);
    const target = siblings[index + offset];
    if (target) moveFolder(folder.id, { id: target.id, mode: offset < 0 ? "before" : "after" });
  }

  function indent(folder: SongFolderRecord) {
    if (folder.parent_id || orderedFolders.some((item) => item.parent_id === folder.id)) return;
    const priorRoot = roots[roots.findIndex((root) => root.id === folder.id) - 1];
    if (priorRoot) moveFolder(folder.id, { id: priorRoot.id, mode: "inside" });
  }

  function outdent(folder: SongFolderRecord) {
    if (!folder.parent_id) return;
    const parent = orderedFolders.find((item) => item.id === folder.parent_id);
    if (parent) moveFolder(folder.id, { id: parent.id, mode: "after" });
  }

  function saveTree() {
    const normalized = normalizeTree(orderedFolders);
    startSaving(async () => {
      const result = await setSongFolderTreeAction(normalized.map((folder) => ({ id: folder.id, parentId: folder.parent_id, sortOrder: folder.sort_order })));
      if (!result.success) setError(result.error ?? "Could not save the folder layout.");
      else { setOrderedFolders(normalized); setSavedSignature(treeSignature(normalized)); showToast("Folder layout saved."); }
    });
  }

  return <div className="grid gap-5">
    <form ref={formRef} action={createFolder} className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
      <input type="hidden" name="activitySlug" value="guitar" />
      <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-stone-900">Name<input ref={nameRef} name="name" required maxLength={40} placeholder="Folder name" className={songFieldClassName} /></label>
      <label className="grid gap-1.5 text-sm font-semibold text-stone-900">Inside<CustomSelect value={createParentId} onValueChange={setCreateParentId} ariaLabel="Parent folder" placement="below" options={[{ value: "root", label: "Top level" }, ...roots.map((folder) => ({ value: folder.id, label: folder.name }))]} /></label>
      <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Adding…" : "Add"}</button>
    </form>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
    <div className="border-t border-stone-200 pt-4">
      <p className="mb-3 text-xs leading-5 text-stone-500">Drag beneath a folder to nest it. Subfolders are limited to one level.</p>
      {tree.length ? <div className="grid gap-1">{tree.map((folder) => {
        const isChild = Boolean(folder.parent_id);
        const hasChildren = orderedFolders.some((item) => item.parent_id === folder.id);
        const target = dropTarget?.id === folder.id ? dropTarget : null;
        return <div key={folder.id} onDragOver={(event) => { if (!draggedId || draggedId === folder.id) return; event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); const dragged = orderedFolders.find((item) => item.id === draggedId); const canNest = !isChild && dragged && !orderedFolders.some((item) => item.parent_id === dragged.id); const inside = canNest && event.clientX > bounds.left + 84; setDropTarget({ id: folder.id, mode: inside ? "inside" : event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" }); }} onDrop={(event) => { event.preventDefault(); if (draggedId && dropTarget) moveFolder(draggedId, dropTarget); setDraggedId(null); setDropTarget(null); }} className={`${isChild ? "ml-7" : ""} ${target?.mode === "before" ? "mt-8" : target?.mode === "after" ? "mb-8" : ""} flex min-h-11 items-center gap-1 rounded-lg border px-1.5 py-1.5 transition ${target?.mode === "inside" ? "border-stone-400 bg-stone-100" : "border-transparent hover:border-stone-200 hover:bg-stone-50"}`}>
          <button type="button" draggable={editingId !== folder.id} onDragStart={(event) => { setDraggedId(folder.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDraggedId(null); setDropTarget(null); }} onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); moveSibling(folder, -1); } if (event.key === "ArrowDown") { event.preventDefault(); moveSibling(folder, 1); } }} title="Drag to organize. Use Up or Down arrow keys to reorder." aria-label={`Reorder ${folder.name}`} className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-stone-500 active:cursor-grabbing"><GripVertical className="size-4" aria-hidden="true" /></button>
          {isChild ? <CornerDownRight className="size-3.5 shrink-0 text-stone-300" aria-hidden="true" /> : null}
          {editingId === folder.id ? <form onSubmit={(event) => { event.preventDefault(); renameFolder(folder.id); }} className="flex min-w-0 flex-1 items-center gap-2"><label className="sr-only" htmlFor={`rename-folder-${folder.id}`}>Folder name</label><input id={`rename-folder-${folder.id}`} autoFocus required maxLength={40} value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setEditingId(null); } }} className={`${songFieldClassName} min-w-0 flex-1`} /><button type="submit" disabled={renaming} className={buttonVariants({ size: "sm" })}>{renaming ? "Saving…" : "Save"}</button><button type="button" onClick={() => setEditingId(null)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancel</button></form> : <><span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">{folder.name}</span>{!isChild ? <button type="button" onClick={() => { setCreateParentId(folder.id); nameRef.current?.focus(); }} title={`Add subfolder to ${folder.name}`} aria-label={`Add subfolder to ${folder.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><Plus aria-hidden="true" /></button> : null}<button type="button" onClick={() => isChild ? outdent(folder) : indent(folder)} disabled={!isChild && (hasChildren || roots[0]?.id === folder.id)} title={isChild ? "Move to top level" : "Move beneath previous folder"} aria-label={isChild ? `Move ${folder.name} to top level` : `Make ${folder.name} a subfolder`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>{isChild ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</button><button type="button" onClick={() => { setEditingId(folder.id); setEditingName(folder.name); setError(null); }} title={`Rename ${folder.name}`} aria-label={`Rename ${folder.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><Pencil aria-hidden="true" /></button><button type="button" disabled={deleting} onClick={() => removeFolder(folder)} title={`Remove ${folder.name}`} aria-label={`Remove ${folder.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}><Trash2 aria-hidden="true" /></button></>}
        </div>;
      })}</div> : <p className="py-3 text-center text-sm text-stone-500">No folders yet.</p>}
      {currentSignature !== savedSignature ? <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur"><p className="text-xs text-stone-600">Folder layout changed</p><button type="button" onClick={saveTree} disabled={saving} className={buttonVariants({ size: "sm" })}>{saving ? "Saving…" : "Save Layout"}</button></div> : null}
      <p className="mt-3 text-xs leading-5 text-stone-500">Removing a subfolder moves its songs to the parent. Removing a top-level folder keeps its subfolders.</p>
    </div>
  </div>;
}
