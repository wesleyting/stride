import Link from "next/link";
import { CalendarDays, Clock3, Flame, Music2 } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { GuestStartButton } from "@/components/stride/guest-start-button";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { buttonVariants } from "@/components/ui/button";

export function SignedOutDashboard({ guestUnavailable = false }: { guestUnavailable?: boolean }) {
  return (
    <AppFrame sidebarFooter={<SessionSidebarFooter signedIn={false} next="/" />}>
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 sm:py-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Guitar</h1>
              <p className="mt-1 text-sm text-stone-500">Your songs and practice history will live here.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Link href="/sign-in?next=%2F" className={`${buttonVariants({ variant: "ghost" })} md:hidden`}>Sign In</Link>
              <Link href="/sign-up?next=%2F" className={`${buttonVariants({ variant: "outline" })} md:hidden`}>Create Account</Link>
              <GuestStartButton />
            </div>
          </div>

          <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Practice overview preview">
            <GuestMetric icon={Flame} value="Start today" label="Current practice streak" />
            <GuestMetric icon={CalendarDays} value="0" label="Sessions in the last 7 days" />
            <GuestMetric icon={Clock3} value="0m" label="Tracked practice this week" />
          </section>

          {guestUnavailable ? <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Guest mode could not start. Confirm Anonymous Sign-Ins is enabled in Supabase, then try again.</p> : null}

          <section className="mt-8" aria-labelledby="guest-pinned-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 id="guest-pinned-heading" className="text-base font-semibold text-stone-950">Pinned</h2>
              <Link href="/community" className={buttonVariants({ variant: "ghost" })}>Browse Community</Link>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center sm:py-14">
              <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
                <Music2 className="size-5 text-stone-600" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-stone-950">Add Your First Song</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-stone-500">No account required. Start with a name and save your progress later.</p>
              <div className="mt-4 flex justify-center"><GuestStartButton /></div>
            </div>
          </section>
        </main>
    </AppFrame>
  );
}

function GuestMetric({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-stone-100"><Icon className="size-4 text-stone-600" aria-hidden="true" /></span><div><p className="text-base font-semibold text-stone-950">{value}</p><p className="text-xs text-stone-500">{label}</p></div></div></div>;
}
