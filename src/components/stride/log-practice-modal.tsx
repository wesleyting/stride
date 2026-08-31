"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Gauge, Link2, Plus, Tags } from "lucide-react";
import { logPracticeAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { PracticeTagInput } from "@/components/stride/practice-tag-input";
import { cn } from "@/lib/utils";

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
  currentYoutubeUrl?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function LogPracticeModal({
  activitySlug,
  activityKind,
  itemSlug,
  itemName,
  previousParts = [],
  currentYoutubeUrl = "",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: LogPracticeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const actionLabel = activityKind === "fitness" ? "Log run" : activityKind === "journal" ? "Write entry" : activityKind === "projects" ? "Log progress" : "Log practice";

  return (
    <>
      {!hideTrigger ? <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonVariants({ size: "default" })}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        {actionLabel}
      </button> : null}
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title={itemName}
        size="lg"
      >
        <PracticeForm
            activitySlug={activitySlug}
            itemSlug={itemSlug}
            previousParts={previousParts}
            currentYoutubeUrl={currentYoutubeUrl}
            close={() => setOpen(false)}
        />
      </DialogShell>
    </>
  );
}

function PracticeForm({
  activitySlug,
  itemSlug,
  previousParts,
  currentYoutubeUrl,
  close,
}: {
  activitySlug: string;
  itemSlug: string;
  previousParts: string[];
  currentYoutubeUrl: string;
  close: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    logPracticeAction,
    initialState,
  );
  const [rating, setRating] = useState(6);
  const [showAreas, setShowAreas] = useState(false);
  const [showYoutube, setShowYoutube] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const areasRef = useRef<HTMLDivElement>(null);
  const youtubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      queueMicrotask(() => {
        setRating(6);
        setShowAreas(false);
        setShowYoutube(false);
        setResetSignal((value) => value + 1);
      });
      close();
    }
  }, [close, state.success]);

  return (
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
        <label htmlFor="practice-note" className="text-sm font-semibold text-stone-950">
          How did it go?
        </label>
        <textarea
          id="practice-note"
          name="note"
          rows={4}
          required
          maxLength={500}
          placeholder="What improved, what was difficult, or anything you want to remember…"
          className={cn(fieldClassName, "min-h-24 resize-y py-3 leading-6")}
        />
      </div>

      <fieldset className="rounded-xl border border-stone-200 bg-white px-4 py-3">
          <legend className="px-1 text-sm font-semibold text-stone-900">
            <span className="flex items-center gap-2">
              <Gauge className="size-4 text-stone-500" aria-hidden="true" />
              Session rating
            </span>
          </legend>
          <div className="mt-1 flex items-baseline justify-end">
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

      <div className="border-t border-stone-200 pt-5">
        <p className="text-sm font-semibold text-stone-950">Add details</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <OptionalButton active={showAreas} onClick={() => reveal(setShowAreas, areasRef)} icon={Tags}>Worked on</OptionalButton>
          <OptionalButton active={showYoutube} onClick={() => reveal(setShowYoutube, youtubeRef)} icon={Link2}>YouTube link</OptionalButton>
        </div>
      </div>

      <div ref={areasRef} className={showAreas ? "block" : "hidden"}><PracticeTagInput key={resetSignal} name="practicePart" suggestions={previousParts} /></div>
      <input type="hidden" name="nextAction" value="" />

      <div ref={youtubeRef} className={showYoutube ? "block" : "hidden"}>
        <label htmlFor="practice-youtube" className="text-sm font-semibold text-stone-950">YouTube link</label>
        <input id="practice-youtube" name="youtubeUrl" type="url" maxLength={500} defaultValue={currentYoutubeUrl} placeholder="https://www.youtube.com/watch?v=…" className={fieldClassName} />
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

function reveal(setVisible: React.Dispatch<React.SetStateAction<boolean>>, target: React.RefObject<HTMLDivElement | null>) {
  setVisible((visible) => {
    const next = !visible;
    if (next) requestAnimationFrame(() => target.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    return next;
  });
}

function OptionalButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Tags; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn(buttonVariants({ variant: active ? "secondary" : "outline", size: "sm" }), "rounded-full")}><Icon className="size-3.5" aria-hidden="true" />{children}</button>;
}
