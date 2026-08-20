import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  formatEntryDisplay,
  formatEntryMoment,
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
  const itemById = new Map(allItems.map((item) => [item.id, item]));
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
                      ? formatEntryMoment(latestEntryByItem.get(item.id)!.created_at)
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

        <div className="mt-5">
          {recentEntries.length > 0 ? <Card className="gap-0 py-0">
            <CardHeader className="border-b border-stone-200 py-4">
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="hidden grid-cols-[6rem_9rem_11rem_minmax(0,1fr)_7rem] gap-4 border-b border-stone-200 bg-stone-50 px-5 py-2 text-xs font-semibold text-stone-500 sm:grid">
                <span>When</span>
                <span>Song</span>
                <span>Worked on</span>
                <span>Note</span>
                <span className="text-right">Session rating</span>
              </div>
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => {
                  const date = formatEntryDisplay(entry.created_at);

                  return (
                    <Link
                      key={entry.id}
                      href={entry.item_id && itemById.get(entry.item_id) ? `/${activity.slug}/${itemById.get(entry.item_id)!.slug}` : `/${activity.slug}`}
                      className="grid gap-3 border-b border-stone-200 px-4 py-4 transition-colors last:border-b-0 hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400 sm:grid-cols-[6rem_9rem_11rem_minmax(0,1fr)_7rem] sm:items-center sm:gap-4 sm:px-5"
                    >
                      <p className="text-xs leading-5 text-stone-500">
                        <span className="block font-semibold text-stone-800">
                          {date.label}
                        </span>
                        <span>{date.time}</span>
                      </p>
                      <p className="truncate text-sm font-semibold text-stone-800">
                        {entry.item_id ? itemNameById.get(entry.item_id) ?? "Item" : activity.name}
                      </p>
                      <div className="flex min-w-0 flex-wrap gap-1">
                        {entry.practice_part ? normalizePracticeTags(entry.practice_part).map((tag) => <span key={tag} className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{tag}</span>) : <span className="text-xs text-stone-400">Not specified</span>}
                      </div>
                      <p className="min-w-0 truncate text-sm text-stone-600">
                        {entry.content}
                      </p>
                      <span className="text-right text-sm font-semibold tabular-nums text-stone-800">
                        {entry.rating
                          ? `${entry.rating} / 10`
                          : "Not rated"}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-stone-500">
                  No entries yet.
                </p>
              )}
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
    <div className={cn(
      "group grid gap-4 border-b border-stone-200 px-4 py-4 transition-colors last:border-b-0 focus-within:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_9rem_10rem] sm:items-center",
      latestEntry ? "hover:bg-stone-50" : "border-l-4 border-l-amber-400 bg-amber-50/60 pl-3 hover:bg-amber-50",
    )}>
      <Link
        href={`/${activitySlug}/${item.slug}`}
        className="-m-2 grid min-w-0 gap-3 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(15rem,1.2fr)] sm:items-center"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="block min-w-0 truncate text-sm font-semibold leading-5 text-stone-950">
            {item.name}
            </span>
            {!latestEntry ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Ready for a first log</span> : null}
          </div>
          {latestEntry ? <p className="mt-1 text-xs text-stone-500">Last practiced {lastEntryLabel}</p> : item.description ? <p className="mt-1 truncate text-xs text-stone-500">{item.description}</p> : null}
        </div>
        {latestEntry ? (
          <div className="min-w-0 border-stone-200 sm:border-l sm:pl-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500">Continue with</span>
              {normalizePracticeTags(latestEntry.practice_part || item.focus).map((tag) => <span key={tag} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{tag}</span>)}
            </div>
            <p className="mt-1.5 truncate text-xs leading-5 text-stone-500">
              {item.still_working_on ? `Needs attention: ${item.still_working_on}` : `Last note: ${latestEntry.content}`}
            </p>
          </div>
        ) : (
          <div className="border-stone-200 sm:border-l sm:pl-4">
            <p className="text-sm font-medium text-stone-800">Create your starting point</p>
            <p className="mt-1 text-xs text-stone-500">Log what you try first so Stride can show where to continue.</p>
          </div>
        )}
      </Link>
      <div className="flex justify-start sm:justify-end"><DifficultyControl
          itemId={item.id}
          itemSlug={item.slug}
          activitySlug={activitySlug}
          value={item.difficulty}
        /></div>
        <div className="[&>button]:w-full"><LogPracticeModal
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
        /></div>
    </div>
  );
}
