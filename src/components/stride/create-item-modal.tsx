"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createItemAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { DifficultyField, OptionalSongFields, songFieldClassName } from "@/components/stride/song-fields";
import { buttonVariants } from "@/components/ui/button";

const initialState: MutationState = {
  success: false,
  error: null,
};

export function CreateItemModal({
  activitySlug,
  activityKind,
  defaultOpen = false,
}: {
  activitySlug: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen && window.location.search.includes("action=add-song")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [defaultOpen]);

  const actionLabel =
    activityKind === "practice"
      ? "Add Song"
      : activityKind === "fitness"
        ? "Add Item"
        : "Add Item";

  const titleLabel = actionLabel;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonVariants({ size: "default" })}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        {actionLabel}
      </button>

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title={titleLabel}
        size="md"
      >
        {open ? (
          <ItemForm
            activitySlug={activitySlug}
            activityKind={activityKind}
            actionLabel={actionLabel}
            close={() => setOpen(false)}
          />
        ) : null}
      </DialogShell>
    </>
  );
}

function ItemForm({
  activitySlug,
  activityKind,
  actionLabel,
  close,
}: {
  activitySlug: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
  actionLabel: string;
  close: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createItemAction,
    initialState,
  );
  const [difficulty, setDifficulty] = useState(3);

  useEffect(() => {
    if (state.success) {
      close();
    }
  }, [close, state.success]);

  return (
    <form action={formAction} className="grid gap-5 text-left">
      <input type="hidden" name="activitySlug" value={activitySlug} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-semibold text-stone-900">
        Name
        <input
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder={activityKind === "practice" ? "Song name" : "Item name"}
          className={songFieldClassName}
        />
      </label>

      {activityKind === "practice" ? (
        <DifficultyField value={difficulty} onChange={setDifficulty} />
      ) : (
        <input type="hidden" name="difficulty" value="3" />
      )}

      {activityKind === "practice" ? <OptionalSongFields /> : null}

      <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
        <button
          type="button"
          onClick={close}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending ? "Saving..." : actionLabel}
        </button>
      </div>
    </form>
  );
}
