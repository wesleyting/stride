"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Star } from "lucide-react";
import { createItemAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: MutationState = {
  success: false,
  error: null,
};

const fieldClassName =
  "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export function CreateItemModal({
  activitySlug,
  activityKind,
}: {
  activitySlug: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
}) {
  const [open, setOpen] = useState(false);

  const actionLabel =
    activityKind === "practice"
      ? "Add song"
      : activityKind === "fitness"
        ? "Add item"
        : "Add item";

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
        description="Add a new item to the selected activity."
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
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="activitySlug" value={activitySlug} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-stone-700">
        Name
        <input
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder={activityKind === "practice" ? "Blackbird" : "Current focus"}
          className={fieldClassName}
        />
      </label>

      {activityKind === "practice" ? (
        <fieldset>
          <legend className="text-sm font-medium text-stone-700">
            Song difficulty
          </legend>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Your estimate of how challenging this song is overall.
          </p>
          <div className="mt-3 flex items-center gap-1" role="radiogroup">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className="cursor-pointer rounded-md p-1.5 transition-colors hover:bg-stone-100 focus-within:ring-2 focus-within:ring-stone-500 focus-within:ring-offset-2"
                title={`Difficulty ${value} out of 5`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={value}
                  checked={difficulty === value}
                  onChange={() => setDifficulty(value)}
                  className="sr-only"
                  aria-label={`Difficulty ${value} out of 5`}
                />
                <Star
                  className={cn(
                    "size-7 transition-colors",
                    value <= difficulty
                      ? "fill-amber-400 text-amber-500"
                      : "fill-transparent text-stone-300",
                  )}
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </label>
            ))}
          </div>
          <div className="mt-1 flex max-w-48 justify-between text-xs text-stone-500">
            <span>Easy</span>
            <span>Challenging</span>
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="difficulty" value="3" />
      )}

      <label className="grid gap-1.5 text-sm font-medium text-stone-700">
        Description
        <textarea
          name="description"
          rows={3}
          maxLength={120}
          placeholder="A short note about what this item is for"
          className={cn(fieldClassName, "min-h-24 resize-y")}
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
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
