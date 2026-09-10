"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createSongFolderAction } from "@/app/actions";
import { CustomSelect } from "@/components/ui/custom-select";
import { StarRating } from "@/components/stride/star-rating";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";
import { GUITAR_TUNINGS } from "@/lib/stride";
import type { SongFolderRecord } from "@/lib/stride";

export const songFieldClassName =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function DifficultyField({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-stone-900">Difficulty</legend>
      <input type="hidden" name="difficulty" value={value ?? ""} />
      <div className="mt-2 flex w-48 items-center">
        <StarRating value={value} onChange={onChange} size="lg" />
        <output className="ml-3 min-w-12 text-sm font-semibold tabular-nums text-stone-700">{value === null ? "Not set" : Number.isInteger(value) ? value : value.toFixed(1)}</output>
        {value !== null ? <button type="button" onClick={() => onChange(null)} title="Clear difficulty" aria-label="Clear difficulty" className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:ring-2 focus-visible:ring-stone-500"><X className="size-3.5" aria-hidden="true" /></button> : null}
      </div>
      <div className="mt-1 flex w-36 justify-between text-xs text-stone-500"><span>Easy</span><span>Hard</span></div>
    </fieldset>
  );
}

export function FolderField({ folders, value = null, activitySlug = "guitar" }: { folders: SongFolderRecord[]; value?: string | null; activitySlug?: string }) {
  const [addedFolders, setAddedFolders] = useState<SongFolderRecord[]>([]);
  const [selected, setSelected] = useState(value ?? "uncategorized");
  const [adding, setAdding] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  const localFolders = [...folders, ...addedFolders.filter((added) => !folders.some((folder) => folder.id === added.id))];

  function addFolder() {
    if (!folderName.trim()) {
      setError("Give the folder a name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("activitySlug", activitySlug);
      formData.set("name", folderName);
      const result = await createSongFolderAction({ success: false, error: null }, formData);
      if (!result.success || !result.folder) {
        setError(result.error ?? "Could not create the folder.");
        return;
      }
      setAddedFolders((current) => [...current.filter((folder) => folder.id !== result.folder!.id), { ...result.folder!, activity_id: "", sort_order: 999, created_at: new Date().toISOString() }]);
      setSelected(result.folder.id);
      setFolderName("");
      setAdding(false);
      showToast("Folder created.");
    });
  }

  return <div className="grid gap-2 text-sm font-semibold text-stone-900"><span>Folder</span><CustomSelect name="folderId" value={selected} onValueChange={(next) => { if (next === "add-folder") { setAdding(true); setError(null); } else { setSelected(next); setAdding(false); } }} ariaLabel="Song folder" placement="below" options={[{ value: "uncategorized", label: "Uncategorized" }, ...localFolders.map((folder) => ({ value: folder.id, label: folder.name })), { value: "add-folder", label: "+ Add Folder", tone: "action" }]} />{adding ? <div className="grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3"><input value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFolder(); } }} autoFocus maxLength={40} placeholder="Folder name" aria-label="New folder name" className={songFieldClassName} />{error ? <span role="alert" className="text-xs font-normal text-red-700">{error}</span> : null}<div className="flex justify-end gap-2"><button type="button" onClick={() => { setAdding(false); setError(null); }} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancel</button><button type="button" onClick={addFolder} disabled={pending} className={buttonVariants({ size: "sm" })}><Plus data-icon="inline-start" aria-hidden="true" />{pending ? "Adding…" : "Add Folder"}</button></div></div> : null}</div>;
}

export function OptionalSongFields({ youtubeUrl = "", tuning = "standard", capo = null }: { youtubeUrl?: string; tuning?: string; capo?: number | null }) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-stone-900">
        <span>Reference Link</span>
        <input name="youtubeUrl" type="url" maxLength={500} defaultValue={youtubeUrl} placeholder="YouTube, Ultimate Guitar, or another chord site" className={songFieldClassName} />
      </label>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <div className="grid gap-2 text-sm font-semibold text-stone-900">
          <span>Tuning</span>
          <CustomSelect name="tuning" defaultValue={tuning || "standard"} ariaLabel="Tuning" options={GUITAR_TUNINGS.map((option) => ({ value: option.value, label: `${option.label} · ${option.notes}` }))} />
        </div>
        <div className="grid gap-2 text-sm font-semibold text-stone-900">
          <span>Capo</span>
          <CustomSelect name="capo" defaultValue={capo ? String(capo) : "none"} ariaLabel="Capo" options={[{ value: "none", label: "No capo" }, ...Array.from({ length: 12 }, (_, index) => index + 1).map((fret) => ({ value: String(fret), label: `Fret ${fret}` }))]} />
        </div>
      </div>
    </div>
  );
}
