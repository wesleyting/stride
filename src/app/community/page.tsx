import Link from "next/link";
import { ChevronRight, Settings, Trophy, UsersRound } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { SessionSidebarFooter } from "@/components/stride/session-sidebar-footer";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { authHref } from "@/lib/return-path";
import { formatTrackedTime, type PublicProfileRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const { supabase, user } = await getUser();
  const [ownProfileResult, profilesResult] = await Promise.all([
    user ? supabase.from("profiles").select("username, display_name, bio, is_public").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.rpc("list_public_profiles"),
  ]);
  const ready = !ownProfileResult.error && !profilesResult.error;
  const ownProfile = ready ? ownProfileResult.data : null;
  const profiles = ready ? (profilesResult.data ?? []) as PublicProfileRecord[] : [];

  const isGuest = user?.is_anonymous === true;
  const footer = <SessionSidebarFooter signedIn={Boolean(user)} isGuest={isGuest} next="/community" />;

  return <AppFrame showSidebar sidebarFooter={footer}><main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-stone-500">Public Profiles</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Community</h1></div>{ready ? isGuest ? <Link href={authHref("/sign-up", "/community")} className={buttonVariants()}>Save Progress to Create a Profile</Link> : user ? <Link href="/settings" className={buttonVariants({ variant: "outline" })}><Settings data-icon="inline-start" aria-hidden="true" />Profile Settings</Link> : <Link href={authHref("/sign-up", "/community")} className={buttonVariants()}>Create Your Profile</Link> : null}</header><div className="mt-6 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><UsersRound className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" /><p className="text-sm leading-6 text-stone-600">Each person controls what they share. Open a profile to see its practice totals and any songs, logs, or resources they chose to publish.</p></div>{!ready ? <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-5"><h2 className="font-semibold text-amber-950">Community setup required</h2><p className="mt-1 text-sm leading-6 text-amber-900">Run Supabase migrations <code>0007_practice_time_and_public_profiles.sql</code> and <code>0008_public_profile_sharing.sql</code>.</p></section> : <section className="mt-7" aria-labelledby="practice-this-week"><div className="flex items-center gap-2"><Trophy className="size-4 text-stone-500" aria-hidden="true" /><h2 id="practice-this-week" className="text-base font-semibold text-stone-950">Practice This Week</h2></div>{profiles.length ? <div className="mt-3 grid gap-3">{profiles.map((profile, index) => <Link key={profile.username} href={`/people/${profile.username}`} className="group grid gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 transition hover:border-stone-300 hover:bg-stone-50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-stone-500 sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_8rem_auto] sm:items-center"><span className="flex size-8 items-center justify-center rounded-lg bg-stone-100 text-sm font-semibold text-stone-600">{index + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-stone-950 group-hover:underline">{profile.display_name}</span><span className="mt-0.5 block truncate text-xs text-stone-500">@{profile.username}{ownProfile?.username === profile.username ? " · You" : ""}</span></span><span><span className="block text-sm font-semibold tabular-nums text-stone-900">{formatTrackedTime(Number(profile.tracked_seconds_7d))}</span><span className="text-xs text-stone-500">This week</span></span><span><span className="block text-sm font-semibold tabular-nums text-stone-900">{profile.timed_sessions}</span><span className="text-xs text-stone-500">Timed sessions</span></span><ChevronRight className="size-4 text-stone-400" aria-hidden="true" /></Link>)}</div> : <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center"><UsersRound className="mx-auto size-5 text-stone-400" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-stone-900">No Public Profiles Yet</h3><p className="mt-1 text-sm text-stone-500">Create yours when you are ready to share.</p></div>}</section>}</main></AppFrame>;
}
