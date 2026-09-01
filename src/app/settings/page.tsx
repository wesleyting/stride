import { signOutAction } from "@/app/actions";
import { AppFrame } from "@/components/stride/app-frame";
import { ProfileSettingsForm, type ProfileSettings } from "@/components/stride/profile-settings-form";
import { CopyLinkButton } from "@/components/stride/copy-link-button";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const result = await supabase
    .from("profiles")
    .select("username, display_name, bio, is_public, share_song_library, share_practice_logs, share_song_resources")
    .eq("user_id", user.id)
    .maybeSingle();

  const sharingMigrationMissing = result.error?.code === "42703" || result.error?.code === "PGRST204";
  let profile = result.data as ProfileSettings | null;

  if (sharingMigrationMissing) {
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
    } : null;
  }

  return (
    <AppFrame showSidebar sidebarFooter={<form action={signOutAction}><button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900">Sign out</button></form>}>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <header className="border-b border-stone-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Settings</h1>
          <p className="mt-1 text-sm text-stone-500">Manage your profile and what you share with the Stride community.</p>
        </header>
        {sharingMigrationMissing ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Run Supabase migration <code>0008_public_profile_sharing.sql</code> before saving these sharing controls.</div> : null}
        <div className="mt-6 max-w-2xl">
          {profile?.is_public ? <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><div><h2 className="text-sm font-semibold text-stone-950">Your Public Profile</h2><p className="mt-1 text-xs text-stone-500">Anyone with this link can view what you chose to share.</p></div><CopyLinkButton path={`/people/${profile.username}`} label="Copy Profile Link" /></section> : <section className="mb-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4"><h2 className="text-sm font-semibold text-stone-900">Profile Link</h2><p className="mt-1 text-sm leading-6 text-stone-500">Turn on Show Me in Community and save to create a shareable profile link.</p></section>}
          <ProfileSettingsForm profile={profile} />
        </div>
      </main>
    </AppFrame>
  );
}
