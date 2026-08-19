import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { CreateItemModal } from "@/components/stride/create-item-modal";
import { DifficultyControl } from "@/components/stride/difficulty-control";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
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
        "id, activity_id, name, slug, description, focus, going_well, still_working_on, confidence, difficulty, sort_order, is_archived, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("entries")
      .select("id, activity_id, item_id, content, rating, practice_part, created_at")
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
  const sectionTitle =
    activity.kind === "practice" ? "Pick up where you left off" : "Current items";
  const sectionDescription =
    activity.kind === "practice"
      ? "See what needs attention and continue from there"
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
                  latestEntry={latestEntryByItem.get(item.id)}
                  lastEntryLabel={
                    latestEntryByItem.get(item.id)
                      ? formatEntryDisplay(
                          latestEntryByItem.get(item.id)!.created_at,
                        ).label
                      : undefined
                  }
                  previousParts={Array.from(new Set(entries.filter((entry) => entry.item_id === item.id && entry.practice_part).map((entry) => entry.practice_part!)))}
                />
              ))
            ) : (
              <div className="px-5 py-8">
                <p className="text-base font-semibold text-stone-950">Nothing here yet</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">Add the first {activity.kind === "practice" ? "song" : "item"} you want to keep track of.</p>
                <div className="mt-4"><CreateItemModal activitySlug={activity.slug} activityKind={activity.kind} /></div>
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
                    className="grid gap-3 border-b border-stone-200 px-4 py-3 transition-colors last:border-b-0 hover:bg-stone-50 focus-within:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
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
                    <DifficultyControl
                      itemId={item.id}
                      itemSlug={item.slug}
                      activitySlug={activity.slug}
                      value={item.difficulty}
                    />
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recentEntries.length > 0 ? <Card className="md:col-span-2">
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
                        {entry.practice_part ? <div className="mt-1 flex flex-wrap gap-1">{normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{tag}</span>)}</div> : null}
                        <p className="mt-1 min-w-0 [overflow-wrap:anywhere] text-sm leading-5 text-stone-600">
                          {entry.content}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-stone-700">
                        {entry.rating
                          ? `Session rating ${entry.rating}/10`
                          : "Session rating not set"}
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
          </Card> : null}

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
  latestEntry,
  lastEntryLabel,
  previousParts,
}: {
  activitySlug: string;
  activityName: string;
  activityKind: "practice" | "journal" | "fitness" | "projects";
  item: ItemRecord;
  latestEntry?: EntryRecord;
  lastEntryLabel?: string;
  previousParts: string[];
}) {
  return (
    <div className="group grid gap-3 border-b border-stone-200 px-4 py-4 transition-colors last:border-b-0 hover:bg-stone-50 focus-within:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <Link
        href={`/${activitySlug}/${item.slug}`}
        className="-m-2 min-w-0 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
      >
        <div className="flex items-center gap-3">
          <span className="block min-w-0 truncate text-sm font-semibold leading-5 text-stone-950">
            {item.name}
          </span>
        </div>
        {latestEntry ? (
          <div className="mt-1.5 space-y-1">
            <p className="text-sm font-medium leading-5 text-stone-800">
              Continue: {latestEntry.practice_part || item.focus || "Review your last session"}
            </p>
            {item.still_working_on ? <p className="text-sm leading-5 text-stone-600">Needs attention: {item.still_working_on}</p> : null}
            <p className="line-clamp-1 text-xs leading-5 text-stone-500">Last time: {latestEntry.content}</p>
          </div>
        ) : (
          <div className="mt-1.5">
            {item.description ? <p className="text-sm leading-5 text-stone-600">{item.description}</p> : null}
            <p className="mt-1 text-xs font-medium text-stone-500">No practice logged yet</p>
          </div>
        )}
        {lastEntryLabel ? (
          <p className="mt-1 text-xs text-stone-500">
            {activityKind === "practice" ? "Last practiced" : "Last entry"}{" "}
            {lastEntryLabel}
          </p>
        ) : null}
      </Link>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <DifficultyControl
          itemId={item.id}
          itemSlug={item.slug}
          activitySlug={activitySlug}
          value={item.difficulty}
        />
        <LogPracticeModal
          activitySlug={activitySlug}
          activityName={activityName}
          activityKind={activityKind}
          itemSlug={item.slug}
          itemName={item.name}
          previousParts={previousParts}
          hasHistory={Boolean(lastEntryLabel)}
          currentFocus={item.focus}
          currentGoingWell={item.going_well}
          currentStillWorkingOn={item.still_working_on}
          currentConfidence={item.confidence}
          lastEntryLabel={lastEntryLabel}
        />
      </div>
    </div>
  );
}
