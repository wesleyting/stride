"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, Images, NotebookPen, SlidersHorizontal } from "lucide-react";
import { saveProfileAction, type MutationState } from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { DialogShell } from "@/components/stride/dialog-shell";
import { useToast } from "@/components/stride/toast-provider";
import { CustomSelect } from "@/components/ui/custom-select";
import { GUITAR_TUNINGS } from "@/lib/stride";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { useSettingsSection } from "@/components/stride/settings-tabs";
import { beginRouteNavigation } from "@/lib/route-loading";

export type ProfileSettings = {
  username: string;
  display_name: string;
  bio: string;
  is_public: boolean;
  share_song_library: boolean;
  share_practice_logs: boolean;
  share_song_resources: boolean;
  default_song_public: boolean;
  default_resource_public: boolean;
  default_tuning: string;
};

const initialState: MutationState = { success: false, error: null };
const fieldClass = "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20";

export function ProfileSettingsForm({
  profile,
  onSaved,
  showCancel = false,
}: {
  profile: ProfileSettings | null;
  onSaved?: () => void;
  showCancel?: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(!profile);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [defaultSongPublic, setDefaultSongPublic] = useState(profile?.default_song_public ?? false);
  const [confirmPublicDefault, setConfirmPublicDefault] = useState(false);
  const activeSection = useSettingsSection();
  const { showToast } = useToast();

  useEffect(() => {
    if (!state.success) return;
    queueMicrotask(() => setDirty(false));
    showToast("Settings saved.", { id: "profile-settings" });
    router.refresh();
    onSaved?.();
  }, [onSaved, router, showToast, state.success]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    const interceptLink = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0) return;
      const target = event.target as Element | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.origin !== window.location.origin) return;
      if (link.pathname === window.location.pathname && link.search === window.location.search && link.hash) return;
      event.preventDefault();
      setPendingHref(`${link.pathname}${link.search}${link.hash}`);
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [dirty]);

  function discardChanges() {
    formRef.current?.reset();
    setDefaultSongPublic(profile?.default_song_public ?? false);
    setDirty(false);
  }

  return (
    <form ref={formRef} action={action} onChange={() => setDirty(true)} className="grid gap-6 text-left">
      {dirty ? <div className="sticky top-3 z-20 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 shadow-lg backdrop-blur"><div><p className="text-sm font-semibold text-amber-950">{profile ? "You have unsaved changes" : "Finish setting up your profile"}</p><p className="text-xs text-amber-800">Save before leaving, or discard your changes.</p></div><div className="flex gap-2"><button type="button" onClick={discardChanges} className={buttonVariants({ variant: "outline", size: "sm" })}>Discard</button><button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>{pending ? "Saving…" : "Save Changes"}</button></div></div> : null}
      {state.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <section id="settings-panel-general" role="tabpanel" aria-label="General" hidden={activeSection !== "general"} aria-labelledby="general-heading">
        <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-stone-500" aria-hidden="true" /><h2 id="general-heading" className="text-base font-semibold text-stone-950">General</h2></div>
        <p className="mt-1 text-sm leading-6 text-stone-500">Choose the starting values used when you add songs and media.</p>
        <div className="mt-4"><label className="grid max-w-md gap-1.5 text-sm font-semibold text-stone-900">Default Tuning<CustomSelect name="defaultTuning" defaultValue={profile?.default_tuning ?? "standard"} onValueChange={() => setDirty(true)} ariaLabel="Default song tuning" options={GUITAR_TUNINGS.map((option) => ({ value: option.value, label: `${option.label} · ${option.notes}` }))} /></label></div>
        <div className="mt-4 grid gap-2">
          <input type="hidden" name="defaultSongPublic" value={defaultSongPublic ? "on" : ""} />
          <button type="button" role="switch" aria-checked={defaultSongPublic} onClick={() => { if (defaultSongPublic) { setDefaultSongPublic(false); setDirty(true); } else setConfirmPublicDefault(true); }} className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left transition hover:border-stone-300 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-500"><Eye className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-stone-900">New Songs Public</span><span className="mt-0.5 block text-xs leading-5 text-stone-500">Make future songs shareable by default. Existing songs never change.</span></span><SwitchMark checked={defaultSongPublic} /></button>
          <ShareOption name="defaultResourcePublic" defaultChecked={profile?.default_resource_public} icon={Images} title="New Media Public" description="Preselect Public when previewing a new upload. You still confirm before uploading." />
        </div>
      </section>

      <section id="settings-panel-profile" role="tabpanel" aria-label="Profile and sharing" hidden={activeSection !== "profile"} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-base font-semibold text-stone-950">Profile & Sharing</h2>
        <p className="mt-1 text-sm leading-6 text-stone-500">Manage your identity and exactly what other people can see.</p>
        {profile?.is_public ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><div><h3 className="text-sm font-semibold text-stone-950">Your Public Profile</h3><p className="mt-1 text-xs text-stone-500">Anyone with this link can view what you chose to share.</p></div><CopyLinkButton path={`/people/${profile.username}`} label="Copy Profile Link" /></div> : <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4"><h3 className="text-sm font-semibold text-stone-900">Profile Link</h3><p className="mt-1 text-sm leading-6 text-stone-500">Turn on Show Me in Community and save to create a shareable profile link.</p></div>}
      <div className="mt-4 grid gap-5">
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
      </div>

      <div className="mt-5 border-t border-stone-200 pt-5" aria-labelledby="privacy-heading">
        <h3 id="privacy-heading" className="text-sm font-semibold text-stone-950">Public Profile</h3>
        <p className="mt-1 text-sm leading-6 text-stone-500">You decide what other signed-in Stride users can see. New profiles start by sharing songs and resources, while written practice history stays private.</p>
        <label className="mt-4 flex cursor-pointer gap-3 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 transition hover:border-stone-400 focus-within:ring-2 focus-within:ring-stone-500">
          <input name="isPublic" type="checkbox" defaultChecked={profile?.is_public ?? true} className="mt-0.5 size-4 accent-stone-900" />
          <span>
            <span className="block text-sm font-semibold text-stone-900">Show Me in Community</span>
            <span className="mt-0.5 block text-xs leading-5 text-stone-500">Makes your profile, bio, and practice totals visible. Turn this off to hide the entire profile.</span>
          </span>
        </label>

        <div className="mt-3 grid gap-2">
          <ShareOption name="shareSongLibrary" defaultChecked={profile?.share_song_library ?? true} icon={BookOpen} title="Song Library" description="Song names, difficulty, tuning, capo, time practiced, and last practice date." />
          <ShareOption name="sharePracticeLogs" defaultChecked={profile?.share_practice_logs} icon={NotebookPen} title="Practice History" description="Practice notes, worked-on tags, session ratings, dates, and duration." />
          <ShareOption name="shareSongResources" defaultChecked={profile?.share_song_resources ?? true} icon={Images} title="Song Resources" description="Reference links and only the uploads you individually mark as shared." />
        </div>
      </div>
      </section>

      {showCancel && onSaved ? <div className="flex justify-end border-t border-stone-200 pt-4"><button type="button" onClick={onSaved} className={buttonVariants({ variant: "outline" })}>Close</button></div> : null}
      <DialogShell open={Boolean(pendingHref)} onOpenChange={(open) => { if (!open) setPendingHref(null); }} title="Discard Unsaved Changes?" description="Your profile and privacy changes have not been saved.">
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setPendingHref(null)} className={buttonVariants({ variant: "outline" })}>Keep Editing</button><button type="button" onClick={() => { const href = pendingHref; discardChanges(); setPendingHref(null); if (href) { beginRouteNavigation(new URL(href, window.location.origin).pathname); router.push(href); } }} className={buttonVariants({ variant: "destructive" })}>Discard and Leave</button></div>
      </DialogShell>
      <DialogShell open={confirmPublicDefault} onOpenChange={setConfirmPublicDefault} title="Make New Songs Public?" description="Future songs will be shareable as soon as you add them. Existing songs will not change." size="md">
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setConfirmPublicDefault(false)} className={buttonVariants({ variant: "outline" })}>Keep Private</button><button type="button" onClick={() => { setDefaultSongPublic(true); setDirty(true); setConfirmPublicDefault(false); }} className={buttonVariants()}>Use Public by Default</button></div>
      </DialogShell>
    </form>
  );
}

function SwitchMark({ checked }: { checked: boolean }) { return <span aria-hidden="true" className={`mt-0.5 flex h-5 w-9 shrink-0 rounded-full p-0.5 transition ${checked ? "justify-end bg-stone-900" : "justify-start bg-stone-300"}`}><span className="size-4 rounded-full bg-white shadow-sm" /></span>; }

function ShareOption({ name, defaultChecked, icon: Icon, title, description }: { name: string; defaultChecked?: boolean; icon: typeof BookOpen; title: string; description: string }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 px-4 py-3 transition hover:border-stone-300 hover:bg-stone-50 focus-within:ring-2 focus-within:ring-stone-500"><Icon className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-stone-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-stone-500">{description}</span></span><input name={name} type="checkbox" defaultChecked={defaultChecked ?? false} className="mt-0.5 size-4 shrink-0 accent-stone-900" /></label>;
}
