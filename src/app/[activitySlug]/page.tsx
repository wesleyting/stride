import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { PageHeader } from "@/components/stride/page-header";
import { RatingStars } from "@/components/stride/rating-stars";
import { SectionHeading } from "@/components/stride/section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { createItemAction } from "../actions";

export const dynamic = "force-dynamic";

const fieldClassName =
  "mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

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
  const focusItems = allItems.slice(0, 3);
  const otherItems = allItems.slice(3);
  const recentEntries = entries.slice(0, 3);
  const currentItem = allItems[0];
  const actionLabel = activity.kind === "practice" ? "Add song" : "Add item";
  const logLabel =
    activity.kind === "practice"
      ? "Log practice"
      : activity.kind === "fitness"
      ? "Log run"
      : "Write entry";
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
              <Button
                type="button"
                variant="outline"
                disabled
                title="Not included in this milestone"
              >
                Manage songs
              </Button>
              <Link
                href="#add-item"
                className={buttonVariants({ size: "default" })}
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                {actionLabel}
              </Link>
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
                  item={item}
                  actionLabel={logLabel}
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
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-stone-900">
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
                    className="grid gap-2 border-b border-stone-200 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-start"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/${activity.slug}/${item.slug}`}
                        className="block truncate text-sm font-medium text-stone-900 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm text-stone-500">
                        {item.description || item.focus || "On the back burner"}
                      </p>
                    </div>
                    <RatingStars
                      rating={item.confidence}
                      className="justify-self-start sm:justify-self-end"
                    />
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

        <Card id="add-item" className="mt-5">
          <CardHeader>
            <CardTitle>{actionLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createItemAction} className="grid gap-4">
              <input type="hidden" name="activitySlug" value={activity.slug} />
              <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                  Name
                  <input
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    placeholder={activity.kind === "practice" ? "Blackbird" : "Current focus"}
                    className={fieldClassName}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                  Type
                  <input
                    value={activity.kind === "practice" ? "Song" : "Item"}
                    readOnly
                    className={fieldClassName}
                  />
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-stone-700">
                Description
                <textarea
                  name="description"
                  rows={3}
                  maxLength={120}
                  placeholder="A short note about what this item is for"
                  className={fieldClassName}
                />
              </label>
              <div className="flex justify-end">
                <Button type="submit">{actionLabel}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppFrame>
  );
}

function ItemRow({
  activitySlug,
  item,
  actionLabel,
}: {
  activitySlug: string;
  item: ItemRecord;
  actionLabel: string;
}) {
  return (
    <div className="grid gap-3 border-b border-stone-200 px-4 py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <Link
          href={`/${activitySlug}/${item.slug}`}
          className="block truncate text-sm font-semibold text-stone-950 hover:underline"
        >
          {item.name}
        </Link>
        <RatingStars rating={item.confidence} className="mt-1.5" />
      </div>
      <p className="min-w-0 text-sm leading-5 text-stone-600">
        {item.focus || item.description || "Add a note about what matters here."}
      </p>
      <Link
        href={`/${activitySlug}/${item.slug}/log`}
        className={buttonVariants({ size: "default" })}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
