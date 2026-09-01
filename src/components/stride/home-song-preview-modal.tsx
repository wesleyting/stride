"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { LogPracticeModal } from "@/components/stride/log-practice-modal";
import { buttonVariants } from "@/components/ui/button";
import { normalizePracticeTags } from "@/lib/practice-tags";
import {
  formatCompactLogDate,
  formatTrackedTime,
  titleCaseSongName,
  type EntryRecord,
  type ItemRecord,
} from "@/lib/stride";

export function HomeSongPreviewModal({
  song,
  entries,
}: {
  song: ItemRecord;
  entries: EntryRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const router = useRouter();
  const songName = titleCaseSongName(song.name);
  const songEntries = entries
    .filter((entry) => entry.item_id === song.id)
    .slice(0, 3);
  const previousParts = songEntries
    .map((entry) => entry.practice_part)
    .filter((value): value is string => Boolean(value));

  function openPracticeLog() {
    setOpen(false);
    setLogOpen(true);
  }

  function viewAllLogs() {
    setOpen(false);
    router.push(`/songs/${song.slug}?from=home`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-0 cursor-pointer truncate rounded-md text-left text-base font-semibold text-stone-950 transition hover:underline focus-visible:ring-2 focus-visible:ring-stone-500"
      >
        {songName}
      </button>

      <DialogShell open={open} onOpenChange={setOpen} title={songName} size="md">
        <div className="grid gap-5">
          <section aria-labelledby={`recent-practice-${song.id}`}>
            <h3
              id={`recent-practice-${song.id}`}
              className="text-sm font-semibold text-stone-950"
            >
              Recent Practice
            </h3>
            {songEntries.length ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
                {songEntries.map((entry) => {
                  const tags = entry.practice_part
                    ? normalizePracticeTags(entry.practice_part)
                    : [];

                  return (
                    <article
                      key={entry.id}
                      className="border-b border-stone-200 px-4 py-3 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
                        <time dateTime={entry.created_at}>
                          {formatCompactLogDate(entry.created_at)}
                        </time>
                        <span className="font-medium tabular-nums text-stone-700">
                          {[
                            entry.duration_seconds
                              ? formatTrackedTime(entry.duration_seconds)
                              : null,
                            entry.rating ? `${entry.rating}/10` : null,
                          ].filter(Boolean).join(" · ") || "Practice log"}
                        </span>
                      </div>
                      {tags.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-700">
                        {entry.content}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No practice logged yet.</p>
            )}
            <button
              type="button"
              onClick={viewAllLogs}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "mt-2 w-full justify-between",
              })}
            >
              View All Logs
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </button>
          </section>

          <div className="border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={openPracticeLog}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Log Practice
            </button>
          </div>
        </div>
      </DialogShell>

      <LogPracticeModal
        activitySlug="guitar"
        activityName="Guitar"
        activityKind="practice"
        itemSlug={song.slug}
        itemName={songName}
        hasHistory={songEntries.length > 0}
        previousParts={previousParts}
        currentYoutubeUrl={song.youtube_url}
        open={logOpen}
        onOpenChange={setLogOpen}
        hideTrigger
      />
    </>
  );
}
