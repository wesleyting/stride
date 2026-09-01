"use client";

import { useActionState, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { updateSongWorkspaceAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";

const initialState: MutationState = { success: false, error: null };
const fieldClass = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function SongWorkspaceModal({
  itemId,
  itemSlug,
  youtubeUrl,
}: {
  itemId: string;
  itemSlug: string;
  youtubeUrl: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "outline" })}>
        <Link2 data-icon="inline-start" aria-hidden="true" />
        {youtubeUrl ? "Edit YouTube Link" : "Add YouTube Link"}
      </button>
      <DialogShell open={open} onOpenChange={setOpen} title="YouTube Link" size="md">
        {open ? <WorkspaceForm itemId={itemId} itemSlug={itemSlug} youtubeUrl={youtubeUrl} close={() => setOpen(false)} /> : null}
      </DialogShell>
    </>
  );
}

function WorkspaceForm(props: {
  itemId: string;
  itemSlug: string;
  youtubeUrl: string;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(updateSongWorkspaceAction, initialState);
  useEffect(() => { if (state.success) props.close(); }, [props, state.success]);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="itemId" value={props.itemId} />
      <input type="hidden" name="itemSlug" value={props.itemSlug} />
      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <label className="text-sm font-semibold text-stone-900">
        YouTube Link <span className="font-normal text-stone-500">Optional</span>
        <input name="youtubeUrl" type="url" maxLength={500} defaultValue={props.youtubeUrl} placeholder="https://www.youtube.com/watch?v=…" className={fieldClass} />
      </label>
      <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
        <button type="button" onClick={props.close} className={buttonVariants({ variant: "outline" })}>Cancel</button>
        <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
