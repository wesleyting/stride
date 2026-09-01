"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { updateItemAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { DifficultyField, OptionalSongFields, songFieldClassName } from "@/components/stride/song-fields";
import { cn } from "@/lib/utils";

const initialState: MutationState = { success: false, error: null };
type EditItemModalProps = { itemId: string; itemSlug: string; activitySlug: string; itemName: string; difficulty: number; youtubeUrl: string; tuning?: string | null; capo?: number | null; showLabel?: boolean };

export function EditItemModal(props: EditItemModalProps) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Edit ${props.itemName}`} title={`Edit ${props.itemName}`} className={cn(buttonVariants({ variant: props.showLabel ? "outline" : "ghost", size: props.showLabel ? "default" : "icon-sm" }), "text-stone-600 hover:text-stone-950")}><Pencil data-icon={props.showLabel ? "inline-start" : undefined} aria-hidden="true" />{props.showLabel ? "Edit Song" : null}</button>
    <DialogShell open={open} onOpenChange={setOpen} title="Edit Song" size="md">
      {open ? <EditItemForm {...props} close={() => setOpen(false)} /> : null}
    </DialogShell>
  </>;
}

function EditItemForm({ close, ...props }: EditItemModalProps & { close: () => void }) {
  const [state, formAction, pending] = useActionState(updateItemAction, initialState);
  const [difficulty, setDifficulty] = useState(props.difficulty);
  useEffect(() => { if (state.success) close(); }, [close, state.success]);
  return <form action={formAction} className="grid gap-5">
    <input type="hidden" name="itemId" value={props.itemId} /><input type="hidden" name="itemSlug" value={props.itemSlug} /><input type="hidden" name="activitySlug" value={props.activitySlug} />
    {state.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div> : null}
    <label className="grid gap-2 text-sm font-semibold text-stone-900">Song Name<input name="name" required minLength={2} maxLength={60} defaultValue={props.itemName} className={songFieldClassName} /></label>
    <DifficultyField value={difficulty} onChange={setDifficulty} />
    <OptionalSongFields youtubeUrl={props.youtubeUrl} tuning={props.tuning ?? "standard"} capo={props.capo} />
    <div className="flex justify-end gap-2 border-t border-stone-200 pt-4"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save Changes"}</button></div>
  </form>;
}
