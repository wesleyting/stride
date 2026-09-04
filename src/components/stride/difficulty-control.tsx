"use client";

import { useState, useTransition } from "react";
import { updateItemDifficultyAction } from "@/app/actions";
import { StarRating } from "@/components/stride/star-rating";

export function DifficultyControl({
  itemId,
  itemSlug,
  activitySlug,
  value,
  compact = false,
}: {
  itemId: string;
  itemSlug: string;
  activitySlug: string;
  value: number;
  compact?: boolean;
}) {
  const [difficulty, setDifficulty] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDifficulty(nextDifficulty: number) {
    const previousDifficulty = difficulty;
    setDifficulty(nextDifficulty);
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("itemId", itemId);
      formData.set("itemSlug", itemSlug);
      formData.set("activitySlug", activitySlug);
      formData.set("difficulty", String(nextDifficulty));
      const result = await updateItemDifficultyAction(formData);

      if (!result.success) {
        setDifficulty(previousDifficulty);
        setError(result.error ?? "Could not update difficulty.");
      }
    });
  }

  return (
    <div className="relative inline-flex shrink-0 items-center gap-1.5">
      <StarRating value={difficulty} onChange={updateDifficulty} disabled={pending} size={compact ? "sm" : "md"} />
      {error ? (
        <span
          role="alert"
          title={error}
          className="absolute top-full right-0 mt-1 whitespace-nowrap text-xs text-red-600"
        >
          Update failed
        </span>
      ) : null}
    </div>
  );
}
