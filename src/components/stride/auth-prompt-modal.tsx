"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Waypoints } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { buttonVariants } from "@/components/ui/button";
import { authHref } from "@/lib/return-path";
import { cn } from "@/lib/utils";

export function AuthPromptModal({
  label = "Add Song",
  next = "/?action=add-song",
  className,
}: {
  label?: string;
  next?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(buttonVariants(), className)}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {label}
      </button>
      <DialogShell open={open} onOpenChange={setOpen} title="Start Your Guitar Log" size="md">
        <div className="grid gap-5">
          <div className="flex items-start gap-3 rounded-xl bg-stone-50 px-4 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-stone-200">
              <Waypoints className="size-4 text-stone-700" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-stone-950">Keep your practice easy to return to.</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">Create a free account to save songs, practice history, resources, and tracked time.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={authHref("/sign-up", next)} className={buttonVariants({ size: "lg" })}>Create Account</Link>
            <Link href={authHref("/sign-in", next)} className={buttonVariants({ variant: "outline", size: "lg" })}>Sign In</Link>
          </div>
          <p className="text-center text-xs text-stone-500">You can keep browsing without an account.</p>
        </div>
      </DialogShell>
    </>
  );
}
