"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { logPracticeAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: MutationState = {
  success: false,
  error: null,
};

const feelingLabels = [
  "Very difficult",
  "Difficult",
  "Neutral",
  "Good",
  "Very good",
];

const fieldClassName =
  "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export function LogPracticeModal({
  activitySlug,
  activityName,
  activityKind,
  itemSlug,
  itemName,
  currentFocus,
  currentGoingWell,
  currentStillWorkingOn,
  currentConfidence,
  lastEntryLabel,
}: {
  activitySlug: string;
  activityName: string;
  activityKind: "practice" | "journal" | "fitness";
  itemSlug: string;
  itemName: string;
  currentFocus: string;
  currentGoingWell: string;
  currentStillWorkingOn: string;
  currentConfidence: number;
  lastEntryLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    logPracticeAction,
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
      ? "Log practice"
      : activityKind === "fitness"
        ? "Log run"
        : "Write entry";

  const title =
    activityKind === "practice"
      ? "Log practice"
      : activityKind === "fitness"
        ? "Log run"
        : "Write entry";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonVariants({ size: "default" })}
      >
        <Clock3 data-icon="inline-start" aria-hidden="true" />
        {actionLabel}
      </button>

      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title={`${title} — ${itemName}`}
        description="Write what happened, choose a rating, and save it to the item."
        size="xl"
      >
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
            <p className="font-medium text-stone-950">
              {activityName} → {itemName}
            </p>
            <div className="mt-3 space-y-2 leading-6">
              <p>{currentFocus || "No current focus set yet."}</p>
              <p>
                Going well:{" "}
                <span className="font-medium text-stone-950">
                  {currentGoingWell || "Not set yet"}
                </span>
              </p>
              <p>
                Still working on:{" "}
                <span className="font-medium text-stone-950">
                  {currentStillWorkingOn || "Not set yet"}
                </span>
              </p>
              <p>
                Confidence:{" "}
                <span className="font-medium text-stone-950">
                  {currentConfidence} / 5
                </span>
              </p>
              <p>
                Last entry:{" "}
                <span className="font-medium text-stone-950">
                  {lastEntryLabel ?? "Not yet"}
                </span>
              </p>
            </div>
          </section>

          <form ref={formRef} action={formAction} className="grid gap-6">
            <input type="hidden" name="activitySlug" value={activitySlug} />
            <input type="hidden" name="itemSlug" value={itemSlug} />

            {state.error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {state.error}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="practice-note"
                className="text-sm font-semibold text-stone-950"
              >
                How did it go?{" "}
                <span className="font-normal text-stone-500">(required)</span>
              </label>
              <p id="practice-note-help" className="mt-1 text-sm text-stone-500">
                Write it the way you’d want to remember it later.
              </p>
              <textarea
                id="practice-note"
                name="note"
                rows={8}
                required
                maxLength={500}
                aria-describedby="practice-note-help"
                placeholder="Tell me what you worked on, what went well, what’s still hard, anything else..."
                className={cn(
                  fieldClassName,
                  "mt-3 min-h-56 resize-y px-3 py-3 leading-6",
                )}
              />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-stone-950">
                How are you feeling about it?
              </legend>
              <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
                {feelingLabels.map((label, index) => {
                  const value = index + 1;

                  return (
                    <label
                      key={label}
                      className="min-w-0 cursor-pointer text-center"
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={value}
                        defaultChecked={value === currentConfidence}
                        className="peer sr-only"
                      />
                      <span className="flex h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-base font-medium text-stone-800 transition-colors peer-checked:border-stone-800 peer-checked:bg-stone-800 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-stone-500 peer-focus-visible:ring-offset-2">
                        {value}
                      </span>
                      <span className="mt-2 block text-[0.65rem] leading-4 text-stone-500 sm:text-xs">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className={buttonVariants({ size: "lg" })}
              >
                {pending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </DialogShell>
    </>
  );
}
