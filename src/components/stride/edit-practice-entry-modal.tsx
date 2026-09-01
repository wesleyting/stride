"use client";

import { useActionState, useEffect, useState } from "react";
import { Gauge, Pencil } from "lucide-react";
import { editPracticeEntryAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { PracticeTagInput } from "@/components/stride/practice-tag-input";
import { buttonVariants } from "@/components/ui/button";

const initialState: MutationState = { success: false, error: null };

export function EditPracticeEntryModal({ entryId, itemSlug, note, rating: initialRating, practicePart, suggestions }: { entryId: string; itemSlug: string; note: string; rating: number | null; practicePart: string; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} title="Edit practice log" aria-label="Edit practice log" className={buttonVariants({ variant: "ghost", size: "icon-xs" })}><Pencil className="size-3" aria-hidden="true" /></button><DialogShell open={open} onOpenChange={setOpen} title="Edit Practice Log" description="Add anything you missed or correct the session details." size="md">{open ? <EditPracticeForm entryId={entryId} itemSlug={itemSlug} note={note} initialRating={initialRating} practicePart={practicePart} suggestions={suggestions} close={() => setOpen(false)} /> : null}</DialogShell></>;
}

function EditPracticeForm({ entryId, itemSlug, note, initialRating, practicePart, suggestions, close }: { entryId: string; itemSlug: string; note: string; initialRating: number | null; practicePart: string; suggestions: string[]; close: () => void }) {
  const [state, action, pending] = useActionState(editPracticeEntryAction, initialState);
  const [rating, setRating] = useState<number | null>(initialRating);
  useEffect(() => { if (state.success) close(); }, [close, state.success]);

  return <form action={action} className="grid gap-5"><input type="hidden" name="entryId" value={entryId} /><input type="hidden" name="itemSlug" value={itemSlug} /><input type="hidden" name="rating" value={rating ?? ""} />{state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}<label className="text-sm font-semibold text-stone-900">Practice Note <span className="font-normal text-stone-500">Optional</span><textarea name="note" rows={4} maxLength={500} defaultValue={note === "Timed practice session" || note === "Practice session" ? "" : note} placeholder="What improved, what was difficult, or anything worth remembering…" className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6 text-stone-950 shadow-sm outline-none transition hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20" /></label><fieldset className="rounded-xl border border-stone-200 px-4 py-3"><label className="flex cursor-pointer items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold text-stone-900"><Gauge className="size-4 text-stone-500" aria-hidden="true" />Session Rating <span className="font-normal text-stone-500">Optional</span></span><input type="checkbox" checked={rating !== null} onChange={(event) => setRating(event.target.checked ? 6 : null)} className="size-4 accent-stone-900" /></label>{rating !== null ? <div className="mt-3 border-t border-stone-100 pt-3"><div className="flex items-baseline justify-end"><output className="text-xl font-semibold tabular-nums text-stone-950">{rating}<span className="text-xs font-normal text-stone-400">/10</span></output></div><input type="range" min="1" max="10" value={rating} onChange={(event) => setRating(Number(event.target.value))} aria-label="Session rating out of 10" className="mt-2 h-2 w-full cursor-pointer accent-stone-900" /></div> : null}</fieldset><PracticeTagInput name="practicePart" suggestions={suggestions} initialValue={practicePart} optional /><div className="flex justify-end gap-2 border-t border-stone-200 pt-4"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save Changes"}</button></div></form>;
}
