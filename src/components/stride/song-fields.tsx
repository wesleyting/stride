"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { StarRating } from "@/components/stride/star-rating";
import { GUITAR_TUNINGS } from "@/lib/stride";
import type { SongFolderRecord } from "@/lib/stride";

export const songFieldClassName =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function DifficultyField({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-stone-900">Difficulty <span className="font-normal text-stone-500">Optional</span></legend>
      <input type="hidden" name="difficulty" value={value ?? ""} />
      <div className="mt-2 flex w-48 items-center">
        <StarRating value={value} onChange={onChange} size="lg" />
        <output className="ml-3 min-w-12 text-sm font-semibold tabular-nums text-stone-700">{value === null ? "Not set" : Number.isInteger(value) ? value : value.toFixed(1)}</output>
      </div>
      <div className="mt-1 flex w-48 items-center justify-between text-xs text-stone-500"><span>Easy</span>{value !== null ? <button type="button" onClick={() => onChange(null)} className="cursor-pointer rounded underline-offset-2 hover:text-stone-900 hover:underline focus-visible:ring-2 focus-visible:ring-stone-500">Clear</button> : null}<span>Hard</span></div>
    </fieldset>
  );
}

export function FolderField({ folders, value = null }: { folders: SongFolderRecord[]; value?: string | null }) {
  return <div className="grid gap-2 text-sm font-semibold text-stone-900"><span>Folder <span className="font-normal text-stone-500">Optional</span></span><CustomSelect name="folderId" defaultValue={value ?? "uncategorized"} ariaLabel="Song folder" options={[{ value: "uncategorized", label: "Uncategorized" }, ...folders.map((folder) => ({ value: folder.id, label: folder.name }))]} /></div>;
}

export function OptionalSongFields({ youtubeUrl = "", tuning = "standard", capo = null }: { youtubeUrl?: string; tuning?: string; capo?: number | null }) {
  return (
    <div className="grid gap-4 border-t border-stone-200 pt-4">
      <label className="grid gap-2 text-sm font-semibold text-stone-900">
        <span>Reference Link <span className="font-normal text-stone-500">Optional</span></span>
        <input name="youtubeUrl" type="url" maxLength={500} defaultValue={youtubeUrl} placeholder="YouTube, Ultimate Guitar, or another chord site" className={songFieldClassName} />
      </label>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <div className="grid gap-2 text-sm font-semibold text-stone-900">
          <span>Tuning <span className="font-normal text-stone-500">Optional</span></span>
          <CustomSelect name="tuning" defaultValue={tuning || "standard"} ariaLabel="Tuning" options={GUITAR_TUNINGS.map((option) => ({ value: option.value, label: `${option.label} · ${option.notes}` }))} />
        </div>
        <div className="grid gap-2 text-sm font-semibold text-stone-900">
          <span>Capo <span className="font-normal text-stone-500">Optional</span></span>
          <CustomSelect name="capo" defaultValue={capo ? String(capo) : "none"} ariaLabel="Capo" options={[{ value: "none", label: "No capo" }, ...Array.from({ length: 12 }, (_, index) => index + 1).map((fret) => ({ value: String(fret), label: `Fret ${fret}` }))]} />
        </div>
      </div>
    </div>
  );
}
