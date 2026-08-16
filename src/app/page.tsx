import Link from "next/link";
import {
  Brain,
  ChevronRight,
  Code2,
  Footprints,
  Guitar,
  Music2,
  Plus,
  Waypoints,
} from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  buildActivitySummary,
  ensureSeedData,
  formatRelativeDate,
  type ActivityRecord,
  type EntryRecord,
} from "@/lib/stride";
import { createActivityAction, signOutAction } from "./actions";

export const dynamic = "force-dynamic";

const iconMap: Record<string, typeof Guitar> = {
  guitar: Guitar,
  running: Footprints,
  wellbeing: Brain,
  piano: Music2,
  development: Code2,
};

const fieldClassName =
  "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export default async function HomePage({
  searchParams,
}: PageProps<"/">) {
  const { supabase, user } = await requireUser();
  await ensureSeedData(supabase, user.id);

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  const [activitiesResult, itemsResult, entriesResult] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, slug, kind, description, sort_order, created_at, updated_at")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("items")
      .select("id, activity_id")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("entries")
      .select("id, activity_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (activitiesResult.error) {
    throw activitiesResult.error;
  }

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (entriesResult.error) {
    throw entriesResult.error;
  }

  const activities = (activitiesResult.data ?? []) as ActivityRecord[];
  const items = itemsResult.data ?? [];
  const entries = (entriesResult.data ?? []) as EntryRecord[];

  const itemCountByActivity = new Map<string, number>();
  items.forEach((item) => {
    itemCountByActivity.set(
      item.activity_id,
      (itemCountByActivity.get(item.activity_id) ?? 0) + 1,
    );
  });

  const latestEntryByActivity = new Map<string, EntryRecord>();
  entries.forEach((entry) => {
    if (!latestEntryByActivity.has(entry.activity_id)) {
      latestEntryByActivity.set(entry.activity_id, entry);
    }
  });

  const activityRows = activities.map((activity) => {
    const itemCount = itemCountByActivity.get(activity.id) ?? 0;
    const latestEntry = latestEntryByActivity.get(activity.id);

    return {
      ...activity,
      item_count: itemCount,
      summary: buildActivitySummary(activity, itemCount),
      last_active_label: latestEntry
        ? formatRelativeDate(latestEntry.created_at)
        : formatRelativeDate(activity.updated_at),
    };
  });

  return (
    <AppFrame
      showSidebar
      sidebarFooter={
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 text-sm text-stone-600"
          >
            Sign out
          </Button>
        </form>
      }
    >
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        {error || message ? (
          <div
            role={error ? "alert" : "status"}
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-stone-200 bg-stone-50 text-stone-700"
            }`}
          >
            {error || message}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
            Your activities
          </h1>
          <Link
            href="#create-activity"
            className={buttonVariants({ size: "default" })}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            New activity
          </Link>
        </div>

        <section className="mt-6" aria-label="Activities">
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            {activityRows.map((activity) => (
              <ActivityRow
                key={activity.id}
                href={`/${activity.slug}`}
                name={activity.name}
                summary={activity.summary}
                lastActive={activity.last_active_label}
                icon={iconMap[activity.slug] ?? Waypoints}
              />
            ))}
          </div>
        </section>

        <Card id="create-activity" className="mt-5">
          <CardHeader>
            <CardTitle>Create activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createActivityAction} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                  Name
                  <input
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    placeholder="Guitar, Running, Wellbeing..."
                    className={fieldClassName}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                  Template
                  <select name="kind" defaultValue="practice" className={fieldClassName}>
                    <option value="practice">Practice</option>
                    <option value="journal">Journal</option>
                    <option value="fitness">Fitness</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                Description
                <textarea
                  name="description"
                  rows={3}
                  maxLength={120}
                  placeholder="A short note about what this activity is for"
                  className={fieldClassName}
                />
              </label>
              <div className="flex justify-end">
                <Button type="submit">Create activity</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppFrame>
  );
}

function ActivityRow({
  href,
  name,
  summary,
  lastActive,
  icon: Icon,
}: {
  href: string;
  name: string;
  summary: string;
  lastActive: string;
  icon: typeof Guitar;
}) {
  return (
    <Link
      href={href}
      className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-stone-200 px-4 py-4 last:border-b-0 hover:bg-stone-50"
      aria-label={`Open ${name}. ${summary}. Last active ${lastActive}.`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
        <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-stone-950">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-sm text-stone-500">
          {summary}
        </span>
      </span>
      <span className="hidden text-xs text-stone-500 sm:block">
        {lastActive}
      </span>
      <ChevronRight className="size-4 text-stone-500" aria-hidden="true" />
    </Link>
  );
}
