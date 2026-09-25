"use client";

import { useSyncExternalStore } from "react";
import {
  calculatePracticeStreak,
  formatCompactLogDate,
  formatEntryDisplay,
  formatTrackedTime,
} from "@/lib/stride";

type DateDisplay = "compact" | "relative" | "time";

const subscribe = () => () => {};

function useBrowserReady() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function LocalDateTime({
  value,
  display = "compact",
  className,
}: {
  value: string;
  display?: DateDisplay;
  className?: string;
}) {
  const browserReady = useBrowserReady();
  const formatted = browserReady
    ? display === "compact"
      ? formatCompactLogDate(value)
      : formatEntryDisplay(value)[display === "relative" ? "label" : "time"]
    : "\u00a0";

  return (
    <time
      dateTime={value}
      className={className}
      aria-label={browserReady ? formatted : undefined}
    >
      {formatted}
    </time>
  );
}

export function LocalPracticeStreak({
  createdDates,
  fallback,
}: {
  createdDates: string[];
  fallback: number;
}) {
  const browserReady = useBrowserReady();
  const streak = browserReady ? calculatePracticeStreak(createdDates) : fallback;
  return <>{streak ? `${streak} day${streak === 1 ? "" : "s"}` : "Start today"}</>;
}

export function LocalTrackedTimeToday({
  entries,
  fallback,
}: {
  entries: Array<{ created_at: string; duration_seconds?: number | null }>;
  fallback: number;
}) {
  const browserReady = useBrowserReady();
  const now = new Date();
  const seconds = browserReady
    ? entries.reduce((total, entry) => {
        const date = new Date(entry.created_at);
        const isToday = date.getFullYear() === now.getFullYear()
          && date.getMonth() === now.getMonth()
          && date.getDate() === now.getDate();
        return total + (isToday ? entry.duration_seconds ?? 0 : 0);
      }, 0)
    : fallback;
  return <>{formatTrackedTime(seconds)}</>;
}
