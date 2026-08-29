"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { updateItemAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: MutationState = { success: false, error: null };
const fieldClassName = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function EditItemModal({ itemId, itemSlug, activitySlug, itemName, description }: {
  itemId: string; itemSlug: string; activitySlug: string; itemName: string; description: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Edit ${itemName}`} title={`Edit ${itemName}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-stone-500 hover:text-stone-950")}><Pencil aria-hidden="true" /></button>
    <DialogShell open={open} onOpenChange={setOpen} title={`Edit ${itemName}`} description="Update the song name or the note that describes it." size="md">
      {open ? <EditItemForm itemId={itemId} itemSlug={itemSlug} activitySlug={activitySlug} itemName={itemName} description={description} close={() => setOpen(false)} /> : null}
    </DialogShell>
  </>;
}

function EditItemForm({ itemId, itemSlug, activitySlug, itemName, description, close }: { itemId: string; itemSlug: string; activitySlug: string; itemName: string; description: string; close: () => void }) {
  const [state, formAction, pending] = useActionState(updateItemAction, initialState);
  useEffect(() => { if (state.success) close(); }, [close, state.success]);
  return <form action={formAction} className="grid gap-4">
    <input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="itemSlug" value={itemSlug} /><input type="hidden" name="activitySlug" value={activitySlug} />
    {state.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div> : null}
    <label className="text-sm font-medium text-stone-700">Name<input name="name" required minLength={2} maxLength={60} defaultValue={itemName} className={fieldClassName} /></label>
    <label className="text-sm font-medium text-stone-700">Description<textarea name="description" rows={3} maxLength={120} defaultValue={description} className={cn(fieldClassName, "min-h-24 resize-y")} /></label>
    <div className="flex justify-end gap-2 border-t border-stone-200 pt-4"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save changes"}</button></div>
  </form>;
}
