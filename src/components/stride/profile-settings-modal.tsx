"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, UserRoundPlus } from "lucide-react";
import { saveProfileAction, type MutationState } from "@/app/actions";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";

const initialState: MutationState = { success: false, error: null };
const fieldClass = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function ProfileSettingsModal({
  profile,
}: {
  profile: {
    username: string;
    display_name: string;
    bio: string;
    is_public: boolean;
  } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: profile ? "outline" : "default" })}>
        {profile ? <Pencil data-icon="inline-start" aria-hidden="true" /> : <UserRoundPlus data-icon="inline-start" aria-hidden="true" />}
        {profile ? "Edit Profile" : "Create Profile"}
      </button>
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title={profile ? "Edit Public Profile" : "Create Public Profile"}
        description="Share practice totals without sharing your songs, notes, screenshots, or private logs."
        size="md"
      >
        {open ? <ProfileForm profile={profile} close={() => setOpen(false)} /> : null}
      </DialogShell>
    </>
  );
}

function ProfileForm({
  profile,
  close,
}: {
  profile: {
    username: string;
    display_name: string;
    bio: string;
    is_public: boolean;
  } | null;
  close: () => void;
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initialState);

  useEffect(() => {
    if (state.success) close();
  }, [close, state.success]);

  return (
    <form action={action} className="grid gap-5 text-left">
      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <label className="text-sm font-semibold text-stone-900">
        Display Name
        <input name="displayName" required minLength={2} maxLength={50} defaultValue={profile?.display_name ?? ""} placeholder="Your name" className={fieldClass} />
      </label>
      <label className="text-sm font-semibold text-stone-900">
        Username
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-400">@</span>
          <input name="username" required minLength={3} maxLength={30} defaultValue={profile?.username ?? ""} placeholder="guitarplayer" className={`${fieldClass} mt-0 pl-7 lowercase`} />
        </div>
        <span className="mt-1 block text-xs font-normal text-stone-500">Lowercase letters, numbers, underscores, or hyphens.</span>
      </label>
      <label className="text-sm font-semibold text-stone-900">
        Bio <span className="font-normal text-stone-500">Optional</span>
        <textarea name="bio" rows={3} maxLength={160} defaultValue={profile?.bio ?? ""} placeholder="A little about your guitar practice" className={`${fieldClass} resize-y`} />
      </label>
      <label className="flex cursor-pointer gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 hover:border-stone-300 focus-within:ring-2 focus-within:ring-stone-500">
        <input name="isPublic" type="checkbox" defaultChecked={profile?.is_public ?? false} className="mt-0.5 size-4 accent-stone-900" />
        <span>
          <span className="block text-sm font-semibold text-stone-900">Show Me in Community</span>
          <span className="mt-0.5 block text-xs leading-5 text-stone-500">Other signed-in users can see your bio and aggregate practice time.</span>
        </span>
      </label>
      <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
        <button type="button" onClick={close} className={buttonVariants({ variant: "outline" })}>Cancel</button>
        <button type="submit" disabled={pending} className={buttonVariants()}>{pending ? "Saving…" : "Save Profile"}</button>
      </div>
    </form>
  );
}
