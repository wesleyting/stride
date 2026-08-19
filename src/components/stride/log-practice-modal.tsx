"use client";

import { useActionState, useEffect, useState } from "react";
import { Clock3, Gauge, Tag } from "lucide-react";
import { logPracticeAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizePracticeTags, serializePracticeTags } from "@/lib/practice-tags";

const initialState: MutationState = { success: false, error: null };
const fieldClassName =
  "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

type LogPracticeModalProps = {
  activitySlug: string;
  activityName: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
  itemSlug: string;
  itemName: string;
  hasHistory?: boolean;
  previousParts?: string[];
  currentFocus?: string;
  currentGoingWell?: string;
  currentStillWorkingOn?: string;
  currentConfidence?: number;
  lastEntryLabel?: string;
};

export function LogPracticeModal({
  activitySlug,
  activityName,
  activityKind,
  itemSlug,
  itemName,
  hasHistory = false,
  previousParts = [],
}: LogPracticeModalProps) {
  const [open, setOpen] = useState(false);
  const actionLabel =
    activityKind === "practice"
      ? hasHistory
        ? "Log practice"
        : "Log first practice"
      : activityKind === "fitness"
        ? "Log run"
        : activityKind === "journal"
          ? "Write entry"
          : "Log progress";

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
        title={`${actionLabel} — ${itemName}`}
        description="Capture enough context to make your next session easier."
        size="lg"
      >
        {open ? (
          <PracticeForm
            activitySlug={activitySlug}
            activityName={activityName}
            itemSlug={itemSlug}
            itemName={itemName}
            previousParts={previousParts}
            close={() => setOpen(false)}
          />
        ) : null}
      </DialogShell>
    </>
  );
}

function PracticeForm({
  activitySlug,
  activityName,
  itemSlug,
  itemName,
  previousParts,
  close,
}: {
  activitySlug: string;
  activityName: string;
  itemSlug: string;
  itemName: string;
  previousParts: string[];
  close: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    logPracticeAction,
    initialState,
  );
  const [rating, setRating] = useState(6);
  const [practiceParts, setPracticeParts] = useState("");
  const suggestionTags = normalizePracticeTags(previousParts.join(","));
  const selectedTags = normalizePracticeTags(practiceParts);

  function addSuggestedTag(tag: string) {
    setPracticeParts(serializePracticeTags([...selectedTags, tag].join(",")));
  }

  useEffect(() => {
    if (state.success) close();
  }, [close, state.success]);

  return (
    <form action={formAction} className="grid gap-6">
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

      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        <span className="font-semibold text-stone-900">{itemName}</span>
        <span className="mx-2 text-stone-300">/</span>
        {activityName}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="text-sm font-semibold text-stone-900">
          <span className="flex items-center gap-2">
            <Tag className="size-4 text-stone-500" aria-hidden="true" />
            What part did you work on?
          </span>
          <input
            name="practicePart"
            type="text"
            value={practiceParts}
            onChange={(event) => setPracticeParts(event.target.value)}
            onBlur={() => setPracticeParts(serializePracticeTags(practiceParts))}
            maxLength={160}
            placeholder="Intro, Chorus, Singing…"
            autoComplete="off"
            className={fieldClassName}
          />
          <span className="mt-1.5 block text-xs leading-5 font-normal text-stone-500">
            Optional. Separate multiple tags with commas.
          </span>
          {suggestionTags.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {suggestionTags.map((tag) => {
                const selected = selectedTags.some((selectedTag) => selectedTag.toLocaleLowerCase() === tag.toLocaleLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={selected}
                    onClick={() => addSuggestedTag(tag)}
                    className="cursor-pointer rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    {selected ? "✓ " : "+ "}{tag}
                  </button>
                );
              })}
            </span>
          ) : null}
        </label>

        <fieldset className="rounded-xl border border-stone-200 bg-white px-4 py-3">
          <legend className="px-1 text-sm font-semibold text-stone-900">
            <span className="flex items-center gap-2">
              <Gauge className="size-4 text-stone-500" aria-hidden="true" />
              Session rating
            </span>
          </legend>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-stone-500">How it felt today</span>
            <output className="text-2xl font-semibold tabular-nums text-stone-950">
              {rating}<span className="text-sm font-normal text-stone-400">/10</span>
            </output>
          </div>
          <input
            type="range"
            name="rating"
            min="1"
            max="10"
            step="1"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            aria-label="Session rating out of 10"
            className="mt-3 h-2 w-full cursor-pointer accent-stone-900"
          />
          <div className="mt-1 flex justify-between text-[0.7rem] text-stone-400">
            <span>Tough</span>
            <span>Great</span>
          </div>
        </fieldset>
      </div>

      <div>
        <label htmlFor="practice-note" className="text-sm font-semibold text-stone-950">
          How did it go?
        </label>
        <p id="practice-note-help" className="mt-1 text-sm leading-5 text-stone-500">
          Note what improved, what felt difficult, and what you want to remember next time.
        </p>
        <textarea
          id="practice-note"
          name="note"
          rows={7}
          required
          maxLength={500}
          aria-describedby="practice-note-help"
          placeholder="The picking pattern felt steadier. The transition into the chorus still needs slow practice…"
          className={cn(fieldClassName, "mt-3 min-h-44 resize-y py-3 leading-6")}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={close}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className={buttonVariants({ size: "lg" })}
        >
          {pending ? "Saving…" : "Save practice"}
        </button>
      </div>
    </form>
  );
}
