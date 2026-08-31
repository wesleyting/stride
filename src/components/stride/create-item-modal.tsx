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
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

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
  const [showDetails, setShowDetails] = useState(false);

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
          className={fieldClassName}
        />
      </label>

      {activityKind === "practice" ? (
        <fieldset>
          <legend className="text-sm font-semibold text-stone-900">Difficulty</legend>
          <div className="mt-2 flex w-48 items-center justify-between" role="radiogroup">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className="cursor-pointer rounded-md p-1 transition-colors hover:bg-stone-100 focus-within:ring-2 focus-within:ring-stone-500 focus-within:ring-offset-2"
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
                    "size-6 transition-colors",
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
          <div className="mt-1 flex w-48 justify-between text-xs text-stone-500">
            <span>Easy</span>
            <span>Hard</span>
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="difficulty" value="3" />
      )}

      <div className="border-t border-stone-200 pt-4">
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          aria-expanded={showDetails}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          {showDetails ? "Hide details" : "Add details"}
        </button>
      </div>

      {showDetails ? (
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-stone-900">
            <span>
              YouTube link{" "}
              <span className="font-normal text-stone-500">Optional</span>
            </span>
            <input
              name="youtubeUrl"
              type="url"
              maxLength={500}
              placeholder="https://www.youtube.com/watch?v=…"
              className={fieldClassName}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-900">
            <span>
              Description{" "}
              <span className="font-normal text-stone-500">Optional</span>
            </span>
            <textarea
              name="description"
              rows={3}
              maxLength={120}
              placeholder="Tuning, capo, or arrangement"
              className={cn(fieldClassName, "min-h-20 resize-y")}
            />
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name="youtubeUrl" value="" />
          <input type="hidden" name="description" value="" />
        </>
      )}

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
