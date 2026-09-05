import Link from "next/link";
import { Cloud } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { authHref } from "@/lib/return-path";

export function GuestSavePrompt({ next = "/" }: { next?: string }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3" aria-label="Guest account notice">
      <div className="flex min-w-0 items-start gap-3">
        <Cloud className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-stone-900">Guest progress stays on this device</p>
          <p className="mt-0.5 text-xs leading-5 text-stone-500">Create an account to use another device or return after 90 days away.</p>
        </div>
      </div>
      <Link href={authHref("/sign-up", next)} className={buttonVariants({ variant: "outline", size: "sm" })}>Create Account</Link>
    </section>
  );
}
