import Link from "next/link";
import { redirect } from "next/navigation";
import { AppFrame } from "@/components/stride/app-frame";
import { PageHeader } from "@/components/stride/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth";
import { ensureSeedData, formatEntryDisplay, type ActivityRecord, type ItemRecord } from "@/lib/stride";
import { logPracticeAction } from "../../../actions";

export const dynamic = "force-dynamic";

const feelingLabels = [
  "Very difficult",
  "Difficult",
  "Neutral",
  "Good",
  "Very good",
];

const fieldClassName =
  "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-500/20";

export default async function LogPracticePage({
  params,
  searchParams,
}: PageProps<"/[activitySlug]/[itemSlug]/log">) {
  const { activitySlug, itemSlug } = await params;
  const { supabase, user } = await requireUser();
  await ensureSeedData(supabase, user.id);

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
    redirect(`/${activity.slug}/${item.slug}`);
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

  const paramsObject = await searchParams;
  const error = typeof paramsObject.error === "string" ? paramsObject.error : "";

  const entries = entriesResult.data ?? [];
  const lastEntry = entries.length > 0 ? formatEntryDisplay(entries[0].created_at) : null;

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref={`/${activity.slug}/${item.slug}`}
          backLabel={`Back to ${item.name}`}
          title={`${
            activity.kind === "practice"
              ? "Log practice"
              : activity.kind === "fitness"
                ? "Log run"
                : "Write entry"
          } — ${item.name}`}
        />

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CardSummary activity={activity} item={item} lastEntryLabel={lastEntry?.label} />

          <form action={logPracticeAction} className="space-y-7">
            <input type="hidden" name="activitySlug" value={activity.slug} />
            <input type="hidden" name="itemSlug" value={item.slug} />

            <div className="max-w-3xl">
              <Label htmlFor="practice-note" className="text-sm font-semibold">
                How did it go? <span className="font-normal text-stone-500">(required)</span>
              </Label>
              <p id="practice-note-help" className="mt-1 text-sm text-stone-500">
                Write it the way you’d want to remember it later.
              </p>
              <Textarea
                id="practice-note"
                name="note"
                rows={6}
                required
                maxLength={500}
                aria-describedby="practice-note-help"
                placeholder="Tell me what you worked on, what went well, what’s still hard, anything else..."
                className={`${fieldClassName} mt-3 min-h-40 resize-y px-3 py-3 leading-6`}
              />
            </div>

            <fieldset className="max-w-3xl">
              <legend className="text-sm font-semibold text-stone-950">
                How are you feeling about it?
              </legend>
              <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
                {feelingLabels.map((label, index) => {
                  const value = index + 1;

                  return (
                    <label
                      key={label}
                      className="min-w-0 cursor-pointer text-center"
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={value}
                        defaultChecked={value === 4}
                        className="peer sr-only"
                      />
                      <span className="flex h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-base font-medium text-stone-800 transition-colors peer-checked:border-stone-800 peer-checked:bg-stone-800 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-stone-500 peer-focus-visible:ring-offset-2">
                        {value}
                      </span>
                      <span className="mt-2 block text-[0.65rem] leading-4 text-stone-500 sm:text-xs">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                href={`/${activity.slug}/${item.slug}`}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Cancel
              </Link>
              <Button type="submit" size="lg">
                Save
              </Button>
            </div>
          </form>
        </div>
      </main>
    </AppFrame>
  );
}

function CardSummary({
  activity,
  item,
  lastEntryLabel,
}: {
  activity: ActivityRecord;
  item: ItemRecord;
  lastEntryLabel?: string;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-sm">Current item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-stone-700">
        <p className="font-medium text-stone-950">{activity.name} → {item.name}</p>
        <p>{item.focus || "No current focus set yet."}</p>
        <p>
          Confidence: <span className="font-medium text-stone-950">{item.confidence} / 5</span>
        </p>
        <p>
          Last entry:{" "}
          <span className="font-medium text-stone-950">
            {lastEntryLabel ?? "Not yet"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
