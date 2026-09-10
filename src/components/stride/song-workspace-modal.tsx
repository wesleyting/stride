"use client";

import { useActionState, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { updateSongWorkspaceAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/stride/toast-provider";
import { ReferenceLinksField } from "@/components/stride/song-fields";

const initialState: MutationState = { success: false, error: null };

export function SongWorkspaceModal({
  itemId,
  itemSlug,
  youtubeUrl,
  referenceUrls,
}: {
  itemId: string;
  itemSlug: string;
  youtubeUrl: string;
  referenceUrls?: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "outline" })}>
        <Link2 data-icon="inline-start" aria-hidden="true" />
        {referenceUrls?.length || youtubeUrl ? "Edit Reference Links" : "Add Reference Link"}
      </button>
      <DialogShell open={open} onOpenChange={setOpen} title="Reference Links" size="md">
        {open ? <WorkspaceForm itemId={itemId} itemSlug={itemSlug} referenceUrls={referenceUrls ?? (youtubeUrl ? [youtubeUrl] : [])} close={() => setOpen(false)} /> : null}
      </DialogShell>
    </>
  );
}

function WorkspaceForm(props: {
  itemId: string;
  itemSlug: string;
  referenceUrls: string[];
  close: () => void;
}) {
  const [state, action, pending] = useActionState(updateSongWorkspaceAction, initialState);
  const { showToast } = useToast();
  useEffect(() => { if (state.success) { props.close(); showToast("Reference links updated."); } }, [props, showToast, state.success]);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="itemId" value={props.itemId} />
      <input type="hidden" name="itemSlug" value={props.itemSlug} />
      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <ReferenceLinksField urls={props.referenceUrls} />
      <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
        <button type="button" onClick={props.close} className={buttonVariants({ variant: "outline" })}>Cancel</button>
        <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
