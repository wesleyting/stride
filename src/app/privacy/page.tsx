import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Privacy",
  description: "How Stride stores and shares your guitar practice data.",
  robots: { index: true, follow: true },
};

const sections = [
  ["What Stride Stores", "Your songs, practice logs, timer totals, profile settings, and any media you upload are stored with your Supabase account. Guest data is also stored in Supabase under a temporary anonymous account."],
  ["What Other People See", "Your practice is private by default. A public profile, public song, practice history, or uploaded file is only visible when its matching sharing control is enabled."],
  ["Services Used", "Supabase provides authentication, database, and file storage. Vercel hosts the app and provides privacy-conscious performance and usage analytics."],
  ["Your Control", "You can change sharing choices in Settings, make individual songs or uploads private, or permanently delete your account and all associated Stride data."],
] as const;

export default async function PrivacyPage() {
  const { user } = await getUser();
  const isGuest = user?.is_anonymous === true;

  return (
    <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn={Boolean(user)} isGuest={isGuest} next="/privacy" />}>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <header className="border-b border-stone-200 pb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700"><ShieldCheck className="size-5" aria-hidden="true" /></div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">Privacy, in Plain Language</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Stride keeps your practice private unless you deliberately share it.</p>
          </header>
          <div className="divide-y divide-stone-200">
            {sections.map(([title, body]) => <section key={title} className="py-6"><h2 className="text-sm font-semibold text-stone-950">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{body}</p></section>)}
          </div>
          <p className="border-t border-stone-200 pt-5 text-xs text-stone-500">Last updated September 7, 2026.</p>
        </div>
      </main>
    </AppFrame>
  );
}
