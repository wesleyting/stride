"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, Lock, Plus } from "lucide-react";
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
  createdFrom = "songs",
  isGuest = false,
}: {
  activitySlug: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
  defaultOpen?: boolean;
  createdFrom?: "home" | "songs";
  isGuest?: boolean;
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
            createdFrom={createdFrom}
            isGuest={isGuest}
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
  createdFrom,
  isGuest,
  close,
}: {
  activitySlug: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
  actionLabel: string;
  createdFrom: "home" | "songs";
  isGuest: boolean;
  close: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createItemAction,
    initialState,
  );
  const [difficulty, setDifficulty] = useState(3);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (state.success) {
      close();
    }
  }, [close, state.success]);

  return (
    <form action={formAction} className="grid gap-5 text-left">
      <input type="hidden" name="activitySlug" value={activitySlug} />
      <input type="hidden" name="createdFrom" value={createdFrom} />

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

      {activityKind === "practice" ? <VisibilityField isPublic={isPublic} setIsPublic={setIsPublic} isGuest={isGuest} /> : null}

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

function VisibilityField({ isPublic, setIsPublic, isGuest }: { isPublic: boolean; setIsPublic: (value: boolean) => void; isGuest: boolean }) {
  const [showGuestHint, setShowGuestHint] = useState(false);

  return (
    <fieldset className="border-t border-stone-200 pt-4">
      <legend className="text-sm font-semibold text-stone-900">Visibility</legend>
      <input type="hidden" name="isPublic" value={String(isPublic)} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Song visibility">
        <button type="button" role="radio" aria-checked={!isPublic} onClick={() => setIsPublic(false)} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-stone-500 ${!isPublic ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900" : "border-stone-200 hover:border-stone-300"}`}>
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span><span className="block text-sm font-semibold">Only Me</span><span className="mt-0.5 block text-xs leading-5 text-stone-500">Private by default</span></span>
        </button>
        <div className="group/public relative">
          <button type="button" role="radio" aria-checked={isPublic} onClick={() => { if (isGuest) setShowGuestHint(true); else setIsPublic(true); }} aria-disabled={isGuest} aria-describedby={isGuest ? "guest-public-tooltip" : undefined} className={`flex h-full w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-stone-500 ${isPublic ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900" : isGuest ? "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300" : "border-stone-200 hover:border-stone-300"}`}>
            <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span><span className="block text-sm font-semibold">Public</span><span className="mt-0.5 block text-xs leading-5 text-stone-500">Share from your profile</span></span>
          </button>
          {isGuest ? <span id="guest-public-tooltip" role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-52 -translate-x-1/2 rounded-md bg-stone-950 px-2.5 py-1.5 text-center text-xs text-white opacity-0 shadow-md transition group-hover/public:opacity-100 group-focus-within/public:opacity-100">Sign up to publish songs</span> : null}
        </div>
      </div>
      {isGuest && showGuestHint ? <p role="status" className="mt-2 text-xs leading-5 text-stone-600">Add this song privately first. You can publish it from the song page after signing up.</p> : null}
    </fieldset>
  );
}
