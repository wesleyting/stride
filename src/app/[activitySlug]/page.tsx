import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { PageHeader } from "@/components/stride/page-header";
import { RatingStars } from "@/components/stride/rating-stars";
import { SectionHeading } from "@/components/stride/section-heading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  ensureSeedData,
  formatEntryDisplay,
  type ActivityRecord,
  type EntryRecord,
  type ItemRecord,
} from "@/lib/stride";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  params,
  searchParams,
}: PageProps<"/[activitySlug]">) {
  const { activitySlug } = await params;
  const { supabase, user } = await requireUser();
  await ensureSeedData(supabase, user.id);

  const [activityResult, itemsResult, entriesResult] = await Promise.all([
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
      .eq("is_archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("entries")
      .select("id, activity_id, item_id, content, rating, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (activityResult.error) {
    redirect("/");
  }

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (entriesResult.error) {
    throw entriesResult.error;
  }

  const activity = activityResult.data as ActivityRecord;
  const allItems = (itemsResult.data ?? []).filter(
    (item): item is ItemRecord => item.activity_id === activity.id,
  );
  const entries = (entriesResult.data ?? []).filter(
    (entry): entry is EntryRecord => entry.activity_id === activity.id,
  );
  const paramsObject = await searchParams;
  const error = typeof paramsObject.error === "string" ? paramsObject.error : "";

  const itemNameById = new Map(allItems.map((item) => [item.id, item.name]));
  const latestEntryByItem = new Map<string, EntryRecord>();
  entries.forEach((entry) => {
    if (entry.item_id && !latestEntryByItem.has(entry.item_id)) {
      latestEntryByItem.set(entry.item_id, entry);
    }
  });
  const focusItems = allItems.slice(0, 3);
  const otherItems = allItems.slice(3);
  const recentEntries = entries.slice(0, 3);
  const currentItem = allItems[0];
  const sectionTitle =
    activity.kind === "practice" ? "Currently focusing on" : "Current items";
  const sectionDescription =
    activity.kind === "practice"
      ? "Your main priority songs"
      : "Your main priority items";
  const otherLabel =
    activity.kind === "practice" ? "Other songs" : "Other items";

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref="/"
          backLabel="Back to activities"
          title={activity.name}
          actions={
            <>
              <CreateItemModal
                activitySlug={activity.slug}
                activityKind={activity.kind}
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

        <section className="mt-7" aria-labelledby="focus-heading">
          <div id="focus-heading">
            <SectionHeading
              title={sectionTitle}
              description={sectionDescription}
            />
          </div>

          <Card className="mt-4 gap-0 py-0">
            {focusItems.length > 0 ? (
              focusItems.map((item) => (
                <ItemRow
                  key={item.id}
                  activitySlug={activity.slug}
                  activityName={activity.name}
                  activityKind={activity.kind}
                  item={item}
                  lastEntryLabel={
                    latestEntryByItem.get(item.id)
                      ? formatEntryDisplay(
                          latestEntryByItem.get(item.id)!.created_at,
                        ).label
                      : undefined
                  }
                />
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-stone-500">
                No songs yet. Add one below to get started.
              </div>
            )}
          </Card>

          {otherItems.length > 0 ? (
            <details className="group mt-3 rounded-lg border border-stone-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400">
                {otherLabel} ({otherItems.length})
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-stone-200">
                {otherItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 border-b border-stone-200 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/${activity.slug}/${item.slug}`}
                        className="block truncate text-sm font-medium text-stone-900 transition-colors hover:text-stone-950 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm text-stone-500">
                        {item.description || item.focus || "On the back burner"}
                      </p>
                    </div>
                    <RatingStars rating={item.confidence} className="sm:justify-self-end" />
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => {
                  const date = formatEntryDisplay(entry.created_at);

                  return (
                    <article
                      key={entry.id}
                      className="grid gap-2 border-b border-stone-200 px-0 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[4.5rem_1fr_auto] sm:gap-4"
                    >
                      <p className="text-xs leading-5 text-stone-500">
                        <span className="block font-medium text-stone-700">
                          {date.label}
                        </span>
                        {date.detail ? <span>{date.detail}</span> : null}
                      </p>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800">
                          {entry.item_id ? itemNameById.get(entry.item_id) ?? "Item" : activity.name}
                        </p>
                        <p className="mt-1 min-w-0 [overflow-wrap:anywhere] text-sm leading-5 text-stone-600">
                          {entry.content}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-stone-700">
                        {entry.rating}/5
                      </span>
                    </article>
                  );
                })
              ) : (
                <p className="text-sm text-stone-500">
                  No entries yet.
                </p>
              )}
              <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-sm font-medium text-stone-500">
                View all history
                <ChevronRight className="size-4" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-stone-900">
                {activity.kind === "practice" ? "Focus this week:" : "Current notes:"}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                {currentItem?.still_working_on || activity.description}
              </p>
            </CardContent>
          </Card>
        </div>

      </main>
    </AppFrame>
  );
}

function ItemRow({
  activitySlug,
  activityName,
  activityKind,
  item,
  lastEntryLabel,
}: {
  activitySlug: string;
  activityName: string;
  activityKind: "practice" | "journal" | "fitness";
  item: ItemRecord;
  lastEntryLabel?: string;
}) {
  return (
    <div className="grid gap-3 border-b border-stone-200 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/${activitySlug}/${item.slug}`}
            className="block min-w-0 truncate text-sm font-semibold text-stone-950 transition-colors hover:text-stone-950 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
          >
            {item.name}
          </Link>
          <RatingStars rating={item.confidence} className="shrink-0 pt-0.5" />
        </div>
        <p className="mt-1 text-sm leading-5 text-stone-600">
          {item.focus || item.description || "Add a note about what matters here."}
        </p>
        {lastEntryLabel ? (
          <p className="mt-1 text-xs text-stone-500">
            {activityKind === "practice" ? "Last practiced" : "Last entry"}{" "}
            {lastEntryLabel}
          </p>
        ) : null}
      </div>
      <LogPracticeModal
        activitySlug={activitySlug}
        activityName={activityName}
        activityKind={activityKind}
        itemSlug={item.slug}
        itemName={item.name}
        currentFocus={item.focus}
        currentGoingWell={item.going_well}
        currentStillWorkingOn={item.still_working_on}
        currentConfidence={item.confidence}
        lastEntryLabel={lastEntryLabel}
      />
    </div>
  );
}
