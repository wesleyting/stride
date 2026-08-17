"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
  activityKind: "practice" | "journal" | "fitness";
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createItemAction,
    initialState,
  );

  useEffect(() => {
    if (open) {
      formRef.current?.reset();
    }
  }, [open]);

  useEffect(() => {
    if (state.success) {
      const timeoutId = window.setTimeout(() => {
        formRef.current?.reset();
        setOpen(false);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [state.success]);

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
        <form ref={formRef} action={formAction} className="grid gap-4">
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
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={buttonVariants()}
            >
              {pending ? "Saving..." : actionLabel}
            </button>
          </div>
        </form>
      </DialogShell>
    </>
  );
}
