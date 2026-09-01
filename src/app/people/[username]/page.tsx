import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, LockKeyhole, TimerReset } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { requireUser } from "@/lib/auth";
import { formatTrackedTime, type PublicProfileRecord } from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: PageProps<"/people/[username]">) {
  const { username } = await params;
  const { supabase } = await requireUser();
  const result = await supabase.rpc("get_public_profile", { profile_username: username.toLowerCase() });
  if (result.error || !result.data?.length) notFound();
  const profile = result.data[0] as PublicProfileRecord;

  return <AppFrame><main className="px-4 py-6 sm:px-7 sm:py-8"><Link href="/community" className="inline-flex items-center gap-1.5 rounded-md text-sm text-stone-500 transition hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"><ArrowLeft className="size-4" aria-hidden="true" />Community</Link><header className="mt-5 border-b border-stone-200 pb-6"><span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">Public Profile</span><h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">{profile.display_name}</h1><p className="mt-1 text-sm text-stone-500">@{profile.username}</p>{profile.bio ? <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">{profile.bio}</p> : null}</header><section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Public practice totals"><ProfileMetric icon={Clock3} value={formatTrackedTime(Number(profile.tracked_seconds_7d))} label="Tracked this week" /><ProfileMetric icon={TimerReset} value={formatTrackedTime(Number(profile.tracked_seconds))} label="All tracked time" /><ProfileMetric icon={CalendarDays} value={`${profile.timed_sessions}`} label="Timed sessions" /><ProfileMetric icon={CalendarDays} value={`${profile.active_days_30 ?? 0}`} label="Active days in 30" /></section><div className="mt-6 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" /><p className="text-sm leading-6 text-stone-600">This is the complete public view. Their song library, practice notes, ratings, images, and links are private.</p></div></main></AppFrame>;
}

function ProfileMetric({ icon: Icon, value, label }: { icon: typeof Clock3; value: string; label: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white px-4 py-4"><Icon className="size-4 text-stone-500" aria-hidden="true" /><p className="mt-3 text-xl font-semibold tabular-nums text-stone-950">{value}</p><p className="mt-0.5 text-xs text-stone-500">{label}</p></div>;
}
