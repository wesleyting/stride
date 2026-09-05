"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, Lock } from "lucide-react";
import { setSongVisibilityAction } from "@/app/actions";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { authHref } from "@/lib/return-path";

export function SongShareControl({ itemId, itemSlug, itemName, username, profilePublic, initialPublic, isGuest = false }: { itemId: string; itemSlug: string; itemName: string; username: string | null; profilePublic: boolean; initialPublic: boolean; isGuest?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = Boolean(username && profilePublic && !isGuest);
  const path = username ? `/people/${username}/songs/${itemSlug}` : "";

  function changeVisibility(next: boolean) {
    setError("");
    startTransition(async () => {
      const result = await setSongVisibilityAction({ itemId, itemSlug, isPublic: next });
      if (!result.success) { setError(result.error ?? "Could not update song sharing."); return; }
      setIsPublic(next);
      if (!next) setOpen(false);
    });
  }

  return <><span className="group/share relative inline-flex"><button type="button" onClick={() => setOpen(true)} aria-describedby={isGuest ? "guest-share-tooltip" : undefined} className={buttonVariants({ variant: "outline" })}>{isPublic && !isGuest ? <Eye data-icon="inline-start" aria-hidden="true" /> : <Lock data-icon="inline-start" aria-hidden="true" />}{isPublic && !isGuest ? "Public" : "Only Me"}</button>{isGuest ? <span id="guest-share-tooltip" role="tooltip" className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 w-max max-w-52 -translate-x-1/2 rounded-md bg-stone-950 px-2.5 py-1.5 text-center text-xs text-white opacity-0 shadow-md transition group-hover/share:opacity-100 group-focus-within/share:opacity-100">Create an account to publish</span> : null}</span><DialogShell open={open} onOpenChange={setOpen} title={isGuest ? "Publish This Song" : ready ? `Share ${itemName}` : "Set Up Song Sharing"} description={isGuest ? "Create an account to make this song public." : ready ? "Share this song directly without exposing anything beyond your chosen profile settings." : "A public profile is required so recipients know whose song they are viewing."} size="md">
    {isGuest ? <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline" })}>Not Now</button><Link href={authHref("/sign-up", `/songs/${itemSlug}`)} className={buttonVariants()}>Create Account</Link></div> : !ready ? <div className="grid gap-5"><div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><p className="text-sm font-semibold text-stone-900">Create or enable your public profile first</p><p className="mt-1 text-sm leading-6 text-stone-500">You can still keep your library hidden and share only this song by its direct link.</p></div><div className="flex justify-end"><Link href="/settings" className={buttonVariants()}>Open Settings</Link></div></div> : isPublic ? <div className="grid gap-5"><div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><Eye className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" /><div><p className="text-sm font-semibold text-stone-900">This song is public</p><p className="mt-1 text-xs leading-5 text-stone-500">Its practice history and resources appear only when those categories are enabled in your profile settings.</p></div></div>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => changeVisibility(false)} disabled={pending} className={buttonVariants({ variant: "ghost" })}><Lock data-icon="inline-start" aria-hidden="true" />Make Private</button><CopyLinkButton path={path} label="Copy Song Link" /></div></div> : <div className="grid gap-5"><div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><p className="text-sm font-semibold text-stone-900">Share only this song</p><p className="mt-1 text-sm leading-6 text-stone-500">The direct link will work for anyone. It appears in your profile library only if Song Library is enabled.</p></div>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline" })}>Cancel</button><button type="button" onClick={() => changeVisibility(true)} disabled={pending} className={buttonVariants()}>{pending ? "Sharing…" : "Make Song Public"}</button></div></div>}
  </DialogShell></>;
}
