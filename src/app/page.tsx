"use client";

import Link from "next/link";
import {
  Brain,
  ChevronRight,
  Code2,
  Footprints,
  Guitar,
  Music2,
  Plus,
} from "lucide-react";
import { AppFrame } from "@/components/stride/app-frame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const activities = [
  {
    name: "Running",
    description: "Building endurance",
    lastActive: "2 days ago",
    icon: Footprints,
  },
  {
    name: "Wellbeing",
    description: "Journal & reflection",
    lastActive: "5 days ago",
    icon: Brain,
  },
  {
    name: "Piano",
    description: "Learning & practice",
    lastActive: "1 week ago",
    icon: Music2,
  },
  {
    name: "Development",
    description: "Side projects & learning",
    lastActive: "1 week ago",
    icon: Code2,
  },
];

export default function HomePage() {
  return (
    <AppFrame showSidebar>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
            Your activities
          </h1>
          <Button
            type="button"
            disabled
            title="Not included in this milestone"
            className="hidden sm:inline-flex"
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            New activity
          </Button>
        </div>

        <section className="mt-6" aria-label="Activities">
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <ActivityRow
              href="/guitar"
              name="Guitar"
              description="4 songs · Practicing regularly"
              lastActive="Today"
              icon={Guitar}
            />
            {activities.map((activity) => (
              <ActivityRow key={activity.name} {...activity} />
            ))}
          </div>
        </section>

        <button
          type="button"
          disabled
          title="Not included in this milestone"
          className="mt-5 flex w-full cursor-not-allowed items-center gap-4 rounded-lg border border-dashed border-stone-300 bg-white px-5 py-4 text-left opacity-75"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-300">
            <Plus className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-stone-900">
              Quick record
            </span>
            <span className="mt-0.5 block text-sm text-stone-500">
              Capture a thought, note, or progress update…
            </span>
          </span>
        </button>
      </main>
    </AppFrame>
  );
}

function ActivityRow({
  href,
  name,
  description,
  lastActive,
  icon: Icon,
}: {
  href?: string;
  name: string;
  description: string;
  lastActive: string;
  icon: typeof Guitar;
}) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
        <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-950">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-sm text-stone-500">
          {description}
        </span>
      </span>
      <span className="hidden text-xs text-stone-500 sm:block">
        {lastActive}
      </span>
      {href ? (
        <ChevronRight className="size-4 text-stone-500" aria-hidden="true" />
      ) : null}
    </>
  );

  const rowClass = cn(
    "flex min-h-16 items-center gap-3 border-b border-stone-200 px-4 py-3 last:border-b-0",
    href
      ? "transition-colors hover:bg-stone-50"
      : "cursor-default text-stone-700",
  );

  return href ? (
    <Link
      href={href}
      className={rowClass}
      aria-label={`Open ${name}. ${description}. Last active ${lastActive}.`}
    >
      {content}
    </Link>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}
