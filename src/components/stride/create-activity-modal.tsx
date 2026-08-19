"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  createActivityAction as createActivityActionFn,
  type MutationState,
} from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: MutationState = {
  success: false,
  error: null,
};

const fieldClassName =
  "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export function CreateActivityModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonVariants({ size: "default" })}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        New activity
      </button>

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title="Create activity"
        description="Add a new place to keep track of practice, journal, or fitness work."
        size="md"
      >
        {open ? (
          <ActivityForm
            close={() => setOpen(false)}
            createActivityAction={createActivityActionFn}
          />
        ) : null}
      </DialogShell>
    </>
  );
}

function ActivityForm({
  close,
  createActivityAction,
}: {
  close: () => void;
  createActivityAction: typeof createActivityActionFn;
}) {
  const [state, formAction, pending] = useActionState(
    createActivityAction,
    initialState,
  );
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (state.success) {
      close();
    }
  }, [close, state.success]);

  return (
    <form action={formAction} className="grid gap-4">
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
          placeholder="Guitar, Running, Wellbeing..."
          className={fieldClassName}
        />
      </label>

      <fieldset className="grid gap-2 text-sm font-medium text-stone-700">
        <legend>How do you want to use this?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["practice", "Practice & learn", "Songs, instruments, skills, and studying."],
            ["journal", "Journal", "Thoughts, wellbeing, reflection, or free writing."],
            ["fitness", "Fitness", "Running, workouts, and physical goals."],
            ["projects", "Projects", "Development, creative work, and ongoing work."],
          ].map(([value, label, hint]) => (
            <label key={value} className="cursor-pointer rounded-lg border border-stone-200 p-3 transition-colors hover:bg-stone-50 has-[:checked]:border-stone-800 has-[:checked]:bg-stone-50">
              <input className="sr-only" type="radio" name="kind" value={value} defaultChecked={value === "practice"} />
              <span className="block text-sm font-semibold text-stone-900">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-stone-500">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <button type="button" onClick={() => setShowDetails((value) => !value)} className="cursor-pointer text-sm font-medium text-stone-600 underline-offset-4 hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400">
          {showDetails ? "Hide details" : "+ Add details"}
        </button>
        {showDetails ? <label className="mt-3 grid gap-1.5 text-sm font-medium text-stone-700">
          Description
          <textarea name="description" rows={3} maxLength={120} placeholder="Optional note about what this is for" className={cn(fieldClassName, "min-h-24 resize-y")} />
        </label> : null}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={close}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </button>
        <button type="submit" disabled={pending} className={buttonVariants()}>
          {pending ? "Creating..." : "Create activity"}
        </button>
      </div>
    </form>
  );
}
