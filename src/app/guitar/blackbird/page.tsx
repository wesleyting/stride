"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  RefreshCcw,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { PageHeader } from "@/components/stride/page-header";
import { usePractice } from "@/components/stride/practice-provider";
import { SectionHeading } from "@/components/stride/section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function BlackbirdPage() {
  const { blackbird } = usePractice();

  const currentState = [
    { label: "Focus", value: blackbird.focus, icon: Target },
    { label: "Going well", value: blackbird.goingWell, icon: TrendingUp },
    {
      label: "Still working on",
      value: blackbird.stillWorkingOn,
      icon: RefreshCcw,
    },
    {
      label: "Confidence",
      value: `${blackbird.confidence} / 5`,
      icon: Star,
    },
    {
      label: "Last practiced",
      value: blackbird.lastPracticed,
      icon: CalendarDays,
    },
  ];

  return (
    <AppFrame>
      <main className="px-4 py-6 sm:px-7 sm:py-8">
        <PageHeader
          backHref="/guitar"
          backLabel="Back to Guitar"
          title="Blackbird"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled
                title="Not included in this milestone"
              >
                Edit song
              </Button>
              <Link
                href="/guitar/blackbird/log"
                className={cn(buttonVariants({ size: "default" }))}
              >
                Log practice
              </Link>
            </>
          }
        />

        {blackbird.updateNotice ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-700"
          >
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-stone-800" aria-hidden="true" />
            <p>{blackbird.updateNotice}</p>
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
                      {value}
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
              {blackbird.recentProgress.map((entry) => (
                <article
                  key={entry.id}
                  className="grid gap-2 border-b border-stone-200 px-4 py-4 last:border-b-0 sm:grid-cols-[4.5rem_1fr_auto] sm:gap-4"
                >
                  <p className="text-xs leading-5 text-stone-500">
                    <span className="block font-medium text-stone-700">{entry.date}</span>
                    {entry.dateDetail ? <span>{entry.dateDetail}</span> : null}
                  </p>
                  <p className="min-w-0 [overflow-wrap:anywhere] text-sm leading-5 text-stone-700">
                    {entry.note}
                  </p>
                  <span className="text-sm font-medium text-stone-700">
                    {entry.rating}/5
                  </span>
                </article>
              ))}
              <div className="flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-500">
                View all history
                <ChevronRight className="size-4" aria-hidden="true" />
              </div>
            </Card>
          </section>
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-sm">About this song (your notes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600">
              Arranged in DADGAD. Capo on 2nd fret.
            </p>
          </CardContent>
        </Card>
      </main>
    </AppFrame>
  );
}
