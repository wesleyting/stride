import { AppFrame } from "@/components/stride/app-frame";
import { GuestSavePrompt } from "@/components/stride/guest-save-prompt";
import { ProfileSettingsForm, type ProfileSettings } from "@/components/stride/profile-settings-form";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { requireUser } from "@/lib/auth";
import { DeleteAccountModal } from "@/components/stride/delete-account-modal";
import { Download, SlidersHorizontal, UserRound, Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser("/settings");
  if (user.is_anonymous) {
    return <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn isGuest next="/settings" />}><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8"><div className="mx-auto w-full max-w-3xl"><header className="border-b border-stone-200 pb-5"><h1 className="text-2xl font-semibold tracking-tight text-stone-950">Settings</h1><p className="mt-1 text-sm text-stone-500">Your private guest practice is ready to use.</p></header><div className="mt-6"><GuestSavePrompt next="/settings" /></div><section className="mt-6 rounded-xl border border-stone-200 bg-white px-5 py-5"><h2 className="text-sm font-semibold text-stone-950">Sharing and profile settings</h2><p className="mt-1 text-sm leading-6 text-stone-500">Create an account before publishing a profile, sharing songs, or uploading practice media. Songs, notes, timers, and reference links remain available in guest mode.</p></section><section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-white px-5 py-5"><div><h2 className="text-sm font-semibold text-stone-950">Clear Guest Data</h2><p className="mt-1 text-sm text-stone-500">Permanently remove this browser’s guest practice data.</p></div><DeleteAccountModal isGuest /></section></div></main></AppFrame>;
  }
  const result = await supabase
    .from("profiles")
    .select("username, display_name, bio, is_public, share_song_library, share_practice_logs, share_song_resources, default_song_public, default_resource_public, default_tuning")
    .eq("user_id", user.id)
    .maybeSingle();

  const settingsMigrationMissing = result.error?.code === "42703" || result.error?.code === "PGRST204";
  let profile = result.data as ProfileSettings | null;

  if (settingsMigrationMissing) {
    const fallback = await supabase
      .from("profiles")
      .select("username, display_name, bio, is_public")
      .eq("user_id", user.id)
      .maybeSingle();
    profile = fallback.data ? {
      ...fallback.data,
      share_song_library: false,
      share_practice_logs: false,
      share_song_resources: false,
      default_song_public: false,
      default_resource_public: false,
      default_tuning: "standard",
    } : null;
  }

  return (
    <AppFrame showSidebar sidebarFooter={<SessionSidebarFooter signedIn next="/settings" />}>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">
          <header className="border-b border-stone-200 pb-5">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Settings</h1>
            <p className="mt-1 text-sm text-stone-500">Manage your defaults, sharing, and account.</p>
          </header>
          {settingsMigrationMissing ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Run Supabase migration <code>0024_user_preferences.sql</code> before saving the new defaults.</div> : null}
          <div className="mt-6 grid items-start gap-7 lg:grid-cols-[11rem_minmax(0,1fr)]">
            <nav className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:grid lg:overflow-visible lg:pb-0" aria-label="Settings sections">
              <SettingsLink href="#general" icon={SlidersHorizontal}>General</SettingsLink>
              <SettingsLink href="#profile" icon={UserRound}>Profile & Sharing</SettingsLink>
              <SettingsLink href="#account" icon={Shield}>Account</SettingsLink>
            </nav>
            <div className="min-w-0">
            {profile?.is_public ? <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><div><h2 className="text-sm font-semibold text-stone-950">Your Public Profile</h2><p className="mt-1 text-xs text-stone-500">Anyone with this link can view what you chose to share.</p></div><CopyLinkButton path={`/people/${profile.username}`} label="Copy Profile Link" /></section> : <section className="mb-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4"><h2 className="text-sm font-semibold text-stone-900">Profile Link</h2><p className="mt-1 text-sm leading-6 text-stone-500">Turn on Show Me in Community and save to create a shareable profile link.</p></section>}
            <ProfileSettingsForm profile={profile} />
            <section id="account" className="mt-6 scroll-mt-6 border-t border-stone-200 pt-6" aria-labelledby="account-heading">
              <h2 id="account-heading" className="text-base font-semibold text-stone-950">Account</h2><p className="mt-1 text-sm text-stone-500">Download your practice information or manage your account.</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-5"><div><h3 className="text-sm font-semibold text-stone-950">Email & Password</h3><p className="mt-1 text-xs text-stone-500">{user.email ?? "Signed-in account"}</p></div><Link href="/forgot-password" className={buttonVariants({ variant: "outline" })}>Change Password</Link></div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-5"><div><h3 className="text-sm font-semibold text-stone-950">Export Practice Data</h3><p className="mt-1 text-xs leading-5 text-stone-500">Download songs, logs, folders, references, and media details as JSON.</p></div><a href="/api/export" download className={buttonVariants({ variant: "outline" })}><Download data-icon="inline-start" aria-hidden="true" />Download Export</a></div>
            </section>
            <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-white px-5 py-5">
              <div><h2 className="text-sm font-semibold text-stone-950">Delete Account</h2><p className="mt-1 text-sm text-stone-500">Permanently remove your account and all Stride data.</p></div>
              <DeleteAccountModal />
            </section>
            </div>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}

function SettingsLink({ href, icon: Icon, children }: { href: string; icon: typeof Shield; children: React.ReactNode }) { return <a href={href} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><Icon className="size-4" aria-hidden="true" />{children}</a>; }
