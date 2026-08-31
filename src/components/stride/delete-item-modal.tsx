"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteItemAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: MutationState = { success: false, error: null };

export function DeleteItemModal({ itemId, activitySlug, itemName, leavePageAfterDelete = false, returnHref }: { itemId: string; activitySlug: string; itemName: string; leavePageAfterDelete?: boolean; returnHref?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Delete ${itemName}`} title={`Delete ${itemName}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-stone-400 hover:bg-red-50 hover:text-red-700")}><Trash2 aria-hidden="true" /></button>
    <DialogShell open={open} onOpenChange={setOpen} title={`Delete ${itemName}?`} description="This permanently removes the song and all of its practice history." size="md">
      {open ? <DeleteItemForm itemId={itemId} activitySlug={activitySlug} itemName={itemName} leavePageAfterDelete={leavePageAfterDelete} returnHref={returnHref} close={() => setOpen(false)} /> : null}
    </DialogShell>
  </>;
}

function DeleteItemForm({ itemId, activitySlug, itemName, leavePageAfterDelete, returnHref, close }: { itemId: string; activitySlug: string; itemName: string; leavePageAfterDelete: boolean; returnHref?: string; close: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteItemAction, initialState);
  useEffect(() => { if (state.success) { close(); if (leavePageAfterDelete) router.push(returnHref ?? `/${activitySlug}`); } }, [activitySlug, close, leavePageAfterDelete, returnHref, router, state.success]);
  return <form action={formAction} className="grid gap-5">
    <input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="activitySlug" value={activitySlug} />
    {state.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div> : null}
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"><strong>{itemName}</strong> and its saved entries cannot be recovered after deletion.</div>
    <div className="flex justify-end gap-2"><button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Keep song</button><button type="submit" disabled={pending} className={buttonVariants({ variant: "destructive" })}>{pending ? "Deleting…" : "Delete song"}</button></div>
  </form>;
}
