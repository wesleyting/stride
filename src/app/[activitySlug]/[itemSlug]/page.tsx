import { redirect } from "next/navigation";
import {
  CalendarDays,
  RefreshCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { EditItemModal } from "@/components/stride/edit-item-modal";
import { DeleteItemModal } from "@/components/stride/delete-item-modal";
import { PageHeader } from "@/components/stride/page-header";
import { SectionHeading } from "@/components/stride/section-heading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { normalizePracticeTags } from "@/lib/practice-tags";
import {
  formatEntryDisplay,
  formatEntryMoment,
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
  if (activitySlug === "guitar") redirect(`/songs/${itemSlug}`);
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
        "id, activity_id, name, slug, description, focus, going_well, still_working_on, confidence, difficulty, sort_order, is_archived, created_at, updated_at",
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
    .select("id, activity_id, item_id, content, rating, practice_part, created_at")
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
    ? formatEntryMoment(entries[0].created_at)
    : undefined;

  const hasState = Boolean(item.focus || item.going_well || item.still_working_on || entries.length > 0);
  const currentState = [
    { label: "Focus now", value: item.focus, icon: Target },
    { label: "Going well", value: item.going_well, icon: TrendingUp },
    {
      label: "Needs attention",
      value: item.still_working_on,
      icon: RefreshCcw,
    },
    {
      label: "Last practiced",
      value: entries[0] ? formatEntryMoment(entries[0].created_at) : "",
      icon: CalendarDays,
    },
  ].filter((state) => Boolean(state.value));

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref={`/${activity.slug}`}
          backLabel={`Back to ${activity.name}`}
          title={item.name}
          actions={
            <>
              <EditItemModal itemId={item.id} itemSlug={item.slug} activitySlug={activity.slug} itemName={item.name} description={item.description} />
              <DeleteItemModal itemId={item.id} activitySlug={activity.slug} itemName={item.name} leavePageAfterDelete />
              <LogPracticeModal
                activitySlug={activity.slug}
                activityName={activity.name}
                activityKind={activity.kind}
                itemSlug={item.slug}
                itemName={item.name}
                hasHistory={entries.length > 0}
                previousParts={Array.from(new Set(entries.map((entry) => entry.practice_part).filter((part): part is string => Boolean(part))))}
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
          {hasState ? <section aria-labelledby="current-state-heading">
            <div id="current-state-heading">
              <SectionHeading
                title="Pick up here"
                description="The useful context from your previous sessions"
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
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section> : null}

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
                      className="grid gap-3 border-b border-stone-200 px-4 py-4 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-4"
                    >
                      <p className="text-xs leading-5 text-stone-500">
                        <span className="block font-medium text-stone-700">
                          {date.label}
                        </span>
                        <span>{date.time}</span>
                      </p>
                      <div className="min-w-0">
                        {entry.practice_part ? <div className="mb-1.5 flex flex-wrap gap-1">{normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{tag}</span>)}</div> : null}
                        <p className="[overflow-wrap:anywhere] text-sm leading-5 text-stone-700">{entry.content}</p>
                      </div>
                      <span className="w-fit text-xs text-stone-500 sm:justify-self-end sm:text-right">
                        <span className="block">Session rating</span>
                        <span className="mt-0.5 block text-sm font-semibold tabular-nums text-stone-800">
                          {entry.rating ? `${entry.rating} / 10` : "Not rated"}
                        </span>
                      </span>
                    </article>
                  );
                })
              ) : (
                <div className="border-l-4 border-amber-400 bg-amber-50 px-5 py-5">
                  <p className="text-sm font-semibold text-stone-900">Ready for your first practice log</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">Capture what you start with so this page can show exactly where to pick up next time.</p>
                </div>
              )}
            </Card>
          </section>
        </div>

        {item.description ? <Card className="mt-5">
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
        </Card> : null}
      </main>
    </AppFrame>
  );
}
