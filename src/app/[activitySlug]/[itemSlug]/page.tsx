import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  RefreshCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { ProficiencyChip } from "@/components/stride/proficiency-chip";
import { PageHeader } from "@/components/stride/page-header";
import { SectionHeading } from "@/components/stride/section-heading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  formatEntryDisplay,
  type ActivityRecord,
  type EntryRecord,
  type ItemRecord,
} from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
  searchParams,
}: PageProps<"/[activitySlug]/[itemSlug]">) {
  const { activitySlug, itemSlug } = await params;
  const { supabase, user } = await requireUser();

  const [activityResult, itemResult] = await Promise.all([
    supabase
      .from("activities")
      .select("id, name, slug, kind, description, sort_order, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("slug", activitySlug)
      .single(),
    supabase
      .from("items")
      .select(
        "id, activity_id, name, slug, description, focus, going_well, still_working_on, confidence, sort_order, is_archived, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .eq("slug", itemSlug)
      .single(),
  ]);

  if (activityResult.error || itemResult.error) {
    redirect("/");
  }

  const activity = activityResult.data as ActivityRecord;
  const item = itemResult.data as ItemRecord;

  if (item.activity_id !== activity.id) {
    redirect(`/${activity.slug}`);
  }

  const entriesResult = await supabase
    .from("entries")
    .select("id, activity_id, item_id, content, rating, created_at")
    .eq("user_id", user.id)
    .eq("item_id", item.id)
    .order("created_at", { ascending: false });

  if (entriesResult.error) {
    throw entriesResult.error;
  }

  const entries = (entriesResult.data ?? []) as EntryRecord[];
  const paramsObject = await searchParams;
  const error = typeof paramsObject.error === "string" ? paramsObject.error : "";
  const lastEntryLabel = entries[0]
    ? formatEntryDisplay(entries[0].created_at).label
    : undefined;

  const currentState = [
    { label: "Focus", value: item.focus, icon: Target },
    { label: "Going well", value: item.going_well, icon: TrendingUp },
    {
      label: "Still working on",
      value: item.still_working_on,
      icon: RefreshCcw,
    },
    {
      label: "Proficiency",
      value: <ProficiencyChip level={item.confidence} />,
      icon: BadgeCheck,
    },
    {
      label: "Last practiced",
      value: entries[0]
        ? formatEntryDisplay(entries[0].created_at).label
        : "Not yet",
      icon: CalendarDays,
    },
  ];

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref={`/${activity.slug}`}
          backLabel={`Back to ${activity.name}`}
          title={item.name}
          actions={
            <>
              <LogPracticeModal
                activitySlug={activity.slug}
                activityName={activity.name}
                activityKind={activity.kind}
                itemSlug={item.slug}
                itemName={item.name}
                currentFocus={item.focus}
                currentGoingWell={item.going_well}
                currentStillWorkingOn={item.still_working_on}
                currentConfidence={item.confidence}
                lastEntryLabel={lastEntryLabel}
              />
            </>
          }
        />

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 lg:grid-cols-[0.95fr_1.25fr]">
          <section aria-labelledby="current-state-heading">
            <div id="current-state-heading">
              <SectionHeading
                title="Current state"
                description="What you’re working on right now"
              />
            </div>
            <Card className="mt-4 gap-0 py-0">
              <dl>
                {currentState.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(8.75rem,0.9fr)_1.2fr] items-center gap-3 border-b border-stone-200 px-3 py-3 last:border-b-0 sm:px-4"
                  >
                    <dt className="flex items-center gap-2 text-sm text-stone-700">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-100">
                        <Icon
                          className="size-4"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="font-medium">{label}</span>
                    </dt>
                    <dd className="min-w-0 [overflow-wrap:anywhere] text-sm leading-5 text-stone-800">
                      {value ?? "Not set yet"}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>

          <section aria-labelledby="recent-progress-heading">
            <div id="recent-progress-heading">
              <SectionHeading title="Recent progress" />
            </div>
            <Card className="mt-4 gap-0 py-0">
              {entries.length > 0 ? (
                entries.map((entry) => {
                  const date = formatEntryDisplay(entry.created_at);

                  return (
                    <article
                      key={entry.id}
                      className="grid gap-2 border-b border-stone-200 px-4 py-4 last:border-b-0 sm:grid-cols-[4.5rem_1fr_auto] sm:gap-4"
                    >
                      <p className="text-xs leading-5 text-stone-500">
                        <span className="block font-medium text-stone-700">
                          {date.label}
                        </span>
                        {date.detail ? <span>{date.detail}</span> : null}
                      </p>
                      <p className="min-w-0 [overflow-wrap:anywhere] text-sm leading-5 text-stone-700">
                        {entry.content}
                      </p>
                      <span className="text-sm font-medium text-stone-700">
                        {entry.rating
                          ? `Session rating ${entry.rating}/5`
                          : "Session rating not set"}
                      </span>
                    </article>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-sm text-stone-500">
                  No entries yet.
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-500">
                View all history
                <ChevronRight className="size-4" aria-hidden="true" />
              </div>
            </Card>
          </section>
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-sm">
              {activity.kind === "practice"
                ? "About this song (your notes)"
                : "About this item (your notes)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600">
              {item.description || "No notes yet."}
            </p>
          </CardContent>
        </Card>
      </main>
    </AppFrame>
  );
}
