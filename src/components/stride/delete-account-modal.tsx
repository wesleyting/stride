"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccountAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";

const initialState: MutationState = { success: false, error: null };

export function DeleteAccountModal({ isGuest = false }: { isGuest?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "destructive" })}>
        <Trash2 data-icon="inline-start" aria-hidden="true" />
        {isGuest ? "Clear Guest Data" : "Delete Account"}
      </button>
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title={isGuest ? "Clear Guest Data?" : "Delete Your Account?"}
        description="This permanently removes your songs, practice history, profile, and uploaded media."
      >
        {open ? <DeleteAccountForm close={() => setOpen(false)} isGuest={isGuest} /> : null}
      </DialogShell>
    </>
  );
}

function DeleteAccountForm({ close, isGuest }: { close: () => void; isGuest: boolean }) {
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={action} className="grid gap-5">
      {state.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div> : null}
      <label className="grid gap-1.5 text-sm font-medium text-stone-700">
        Type <strong className="text-stone-950">DELETE</strong> to confirm
        <input
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button>
        <button type="submit" disabled={pending || confirmation !== "DELETE"} className={buttonVariants({ variant: "destructive" })}>
          {pending ? "Deleting…" : isGuest ? "Clear Data" : "Delete Account"}
        </button>
      </div>
    </form>
  );
}
