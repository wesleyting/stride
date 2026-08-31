"use client";

import { useActionState, useEffect, useState } from "react";
import { Link2, NotepadText, Pencil, Target } from "lucide-react";
import { updateSongWorkspaceAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";

const initialState: MutationState = { success: false, error: null };
const fieldClass = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function SongWorkspaceModal({
  itemId,
  itemSlug,
  nextAction,
  youtubeUrl,
  description,
  mode = "all",
}: {
  itemId: string;
  itemSlug: string;
  nextAction: string;
  youtubeUrl: string;
  description: string;
  mode?: "all" | "next" | "youtube" | "notes";
}) {
  const [open, setOpen] = useState(false);
  const config = {
    all: { label: "Edit song", title: "Edit song", icon: Pencil },
    next: { label: nextAction ? "Edit next step" : "Set next step", title: "Next step", icon: Target },
    youtube: { label: youtubeUrl ? "Edit YouTube link" : "Add YouTube link", title: "YouTube link", icon: Link2 },
    notes: { label: description ? "Edit notes" : "Add notes", title: "Song notes", icon: NotepadText },
  }[mode];
  const Icon = config.icon;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "outline" })}>
        <Icon data-icon="inline-start" aria-hidden="true" />
        {config.label}
      </button>
      <DialogShell open={open} onOpenChange={setOpen} title={config.title} size="md">
        {open ? <WorkspaceForm itemId={itemId} itemSlug={itemSlug} nextAction={nextAction} youtubeUrl={youtubeUrl} description={description} mode={mode} close={() => setOpen(false)} /> : null}
      </DialogShell>
    </>
  );
}

function WorkspaceForm(props: {
  itemId: string;
  itemSlug: string;
  nextAction: string;
  youtubeUrl: string;
  description: string;
  mode: "all" | "next" | "youtube" | "notes";
  close: () => void;
}) {
  const [state, action, pending] = useActionState(updateSongWorkspaceAction, initialState);
  useEffect(() => { if (state.success) props.close(); }, [props, state.success]);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="itemId" value={props.itemId} />
      <input type="hidden" name="itemSlug" value={props.itemSlug} />
      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      {props.mode === "all" || props.mode === "next" ? <label className="text-sm font-semibold text-stone-900">
        Next time
        <input name="nextAction" maxLength={180} defaultValue={props.nextAction} placeholder="Slow down the change into the chorus" className={fieldClass} />
      </label> : <input type="hidden" name="nextAction" value={props.nextAction} />}
      {props.mode === "all" || props.mode === "youtube" ? <label className="text-sm font-semibold text-stone-900">
        YouTube reference
        <input name="youtubeUrl" type="url" maxLength={500} defaultValue={props.youtubeUrl} placeholder="https://www.youtube.com/watch?v=…" className={fieldClass} />
      </label> : <input type="hidden" name="youtubeUrl" value={props.youtubeUrl} />}
      {props.mode === "all" || props.mode === "notes" ? <label className="text-sm font-semibold text-stone-900">
        Song notes
        <textarea name="description" rows={4} maxLength={500} defaultValue={props.description} placeholder="Tuning, capo, arrangement, or anything else worth keeping…" className={`${fieldClass} resize-y`} />
      </label> : <input type="hidden" name="description" value={props.description} />}
      <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
        <button type="button" onClick={props.close} className={buttonVariants({ variant: "outline" })}>Cancel</button>
        <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
