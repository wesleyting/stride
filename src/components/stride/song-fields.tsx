"use client";

import { Star } from "lucide-react";
import { GUITAR_TUNINGS } from "@/lib/stride";
import { cn } from "@/lib/utils";

export const songFieldClassName =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function DifficultyField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-stone-900">Difficulty</legend>
      <div className="mt-2 flex w-48 items-center justify-between" role="radiogroup">
        {[1, 2, 3, 4, 5].map((difficulty) => (
          <label key={difficulty} className="cursor-pointer rounded-md p-1 transition-colors hover:bg-stone-100 focus-within:ring-2 focus-within:ring-stone-500 focus-within:ring-offset-2" title={`Difficulty ${difficulty} out of 5`}>
            <input type="radio" name="difficulty" value={difficulty} checked={value === difficulty} onChange={() => onChange(difficulty)} className="sr-only" aria-label={`Difficulty ${difficulty} out of 5`} />
            <Star className={cn("size-6 transition-colors", difficulty <= value ? "fill-amber-400 text-amber-500" : "fill-transparent text-stone-300")} strokeWidth={1.7} aria-hidden="true" />
          </label>
        ))}
      </div>
      <div className="mt-1 flex w-48 justify-between text-xs text-stone-500"><span>Easy</span><span>Hard</span></div>
    </fieldset>
  );
}

export function OptionalSongFields({ youtubeUrl = "", tuning = "standard", capo = null }: { youtubeUrl?: string; tuning?: string; capo?: number | null }) {
  return (
    <div className="grid gap-4 border-t border-stone-200 pt-4">
      <label className="grid gap-2 text-sm font-semibold text-stone-900">
        <span>YouTube Link <span className="font-normal text-stone-500">Optional</span></span>
        <input name="youtubeUrl" type="url" maxLength={500} defaultValue={youtubeUrl} placeholder="https://www.youtube.com/watch?v=…" className={songFieldClassName} />
      </label>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <label className="grid gap-2 text-sm font-semibold text-stone-900">
          <span>Tuning <span className="font-normal text-stone-500">Optional</span></span>
          <select name="tuning" defaultValue={tuning || "standard"} className={cn(songFieldClassName, "cursor-pointer")}>
            {GUITAR_TUNINGS.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.notes}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-900">
          <span>Capo <span className="font-normal text-stone-500">Optional</span></span>
          <select name="capo" defaultValue={capo ?? ""} className={cn(songFieldClassName, "cursor-pointer")}>
            <option value="">No capo</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((fret) => <option key={fret} value={fret}>Fret {fret}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
