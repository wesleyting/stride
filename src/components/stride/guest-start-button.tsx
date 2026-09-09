"use client";

import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { startGuestAction } from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TurnstileField } from "@/components/stride/turnstile-field";

export function GuestStartButton({ className }: { className?: string }) {
  return (
    <form action={startGuestAction}>
      <input type="hidden" name="next" value="/?action=add-song" />
      <TurnstileField action="start_guest" />
      <GuestSubmit className={className} />
    </form>
  );
}

function GuestSubmit({ className }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} data-shortcut-add-song aria-keyshortcuts="N" title="Add Song (N)" className={cn(buttonVariants(), className)}>
      <Plus data-icon="inline-start" aria-hidden="true" />
      {pending ? "Starting…" : "Add Song"}
    </button>
  );
}
