"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
} from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { PageHeader } from "@/components/stride/page-header";
import { usePractice } from "@/components/stride/practice-provider";
import { RatingStars } from "@/components/stride/rating-stars";
import { SectionHeading } from "@/components/stride/section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function GuitarPage() {
  const { blackbird } = usePractice();

  const recentActivity = [
    ...(blackbird.lastPracticed === "Today"
      ? [["Today", "Blackbird", "15m"]]
      : []),
    ["Today", "Fast Car", "20m"],
    ["Yesterday", "Blackbird", "15m"],
    ["2 days ago", "Tears in Heaven", "20m"],
  ].slice(0, 3);

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref="/"
          backLabel="Back to activities"
          title="Guitar"
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
              <Button
                type="button"
                disabled
                title="Not included in this milestone"
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add song
              </Button>
            </>
          }
        />

        <section className="mt-7" aria-labelledby="focus-heading">
          <div id="focus-heading">
            <SectionHeading
              title="Currently focusing on"
              description="Your main priority songs"
            />
          </div>

          <Card className="mt-4 gap-0 py-0">
            <SongRow
              title="Blackbird"
              summary={blackbird.focus}
              rating={blackbird.confidence}
              href="/guitar/blackbird"
              logHref="/guitar/blackbird/log"
            />
            <SongRow
              title="Tears in Heaven"
              summary="Learning the intro"
              rating={2}
            />
            <SongRow
              title="Fast Car"
              summary="Getting comfortable singing while playing"
              rating={3}
            />
          </Card>

          <details className="group mt-3 rounded-lg border border-stone-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-stone-900">
              Other songs (1)
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-stone-200 px-4 py-3 text-sm text-stone-600">
              House of the Rising Sun · On the back burner
            </div>
          </details>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map(([date, song, duration]) => (
                <div
                  key={`${date}-${song}`}
                  className="grid grid-cols-[5.5rem_1fr_auto] gap-3 text-sm"
                >
                  <span className="text-stone-500">{date}</span>
                  <span className="font-medium text-stone-800">{song}</span>
                  <span className="text-stone-500">{duration}</span>
                </div>
              ))}
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
              <p className="text-sm font-medium text-stone-900">Focus this week:</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Clean transition into the second section of Blackbird.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppFrame>
  );
}

function SongRow({
  title,
  summary,
  rating,
  href,
  logHref,
}: {
  title: string;
  summary: string;
  rating: number;
  href?: string;
  logHref?: string;
}) {
  return (
    <div className="grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 border-b border-stone-200 px-3 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(10rem,1fr)_minmax(12rem,1.2fr)_auto] sm:px-4">
      <GripVertical className="hidden size-4 text-stone-400 sm:block" aria-hidden="true" />
      <div className="min-w-0">
        {href ? (
          <Link
            href={href}
            className="rounded-sm text-sm font-semibold text-stone-950 underline-offset-4 hover:underline"
          >
            {title}
          </Link>
        ) : (
          <p className="text-sm font-semibold text-stone-950">{title}</p>
        )}
        <RatingStars rating={rating} className="mt-1" />
      </div>
      <p className="col-start-2 text-sm leading-5 text-stone-600 sm:col-start-auto">
        {summary}
      </p>
      {logHref ? (
        <Link
          href={logHref}
          className={cn(
            buttonVariants({ size: "default" }),
            "col-span-2 mt-1 w-full sm:col-span-1 sm:mt-0 sm:w-auto",
          )}
        >
          Log practice
        </Link>
      ) : (
        <Button
          type="button"
          disabled
          title="Only Blackbird is included in this milestone"
          className="col-span-2 mt-1 w-full sm:col-span-1 sm:mt-0 sm:w-auto"
        >
          Log practice
        </Button>
      )}
    </div>
  );
}
