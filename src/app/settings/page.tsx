import { AppFrame } from "@/components/stride/app-frame";
import { GuestSavePrompt } from "@/components/stride/guest-save-prompt";
import { ProfileSettingsForm, type ProfileSettings } from "@/components/stride/profile-settings-form";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { requireUser } from "@/lib/auth";
import { DeleteAccountModal } from "@/components/stride/delete-account-modal";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { SettingsTabs } from "@/components/stride/settings-tabs";

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
          <SettingsTabs account={<>
            <section aria-labelledby="account-heading">
              <h2 id="account-heading" className="text-base font-semibold text-stone-950">Account</h2><p className="mt-1 text-sm text-stone-500">Download your practice information or manage your account.</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-5"><div><h3 className="text-sm font-semibold text-stone-950">Email & Password</h3><p className="mt-1 text-xs text-stone-500">{user.email ?? "Signed-in account"}</p></div><Link href="/forgot-password" className={buttonVariants({ variant: "outline" })}>Change Password</Link></div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-5"><div><h3 className="text-sm font-semibold text-stone-950">Export Practice Data</h3><p className="mt-1 text-xs leading-5 text-stone-500">Download songs, logs, folders, references, and media details as JSON.</p></div><a href="/api/export" download className={buttonVariants({ variant: "outline" })}><Download data-icon="inline-start" aria-hidden="true" />Download Export</a></div>
            </section>
            <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-white px-5 py-5"><div><h2 className="text-sm font-semibold text-stone-950">Delete Account</h2><p className="mt-1 text-sm text-stone-500">Permanently remove your account and all Stride data.</p></div><DeleteAccountModal /></section>
          </>}>
            <ProfileSettingsForm profile={profile} />
          </SettingsTabs>
        </div>
      </main>
    </AppFrame>
  );
}
