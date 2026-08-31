"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { updateItemDifficultyAction } from "@/app/actions";
import { cn } from "@/lib/utils";

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
  const [preview, setPreview] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleValue = preview ?? difficulty;

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
      <div
        className={cn("flex items-center", pending && "opacity-60")}
        role="radiogroup"
        aria-label="Song difficulty"
        onMouseLeave={() => setPreview(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={difficulty === star}
            aria-label={`Set difficulty to ${star} out of 5`}
            title={`Set difficulty to ${star} out of 5`}
            disabled={pending}
            onMouseEnter={() => setPreview(star)}
            onFocus={() => setPreview(star)}
            onBlur={() => setPreview(null)}
            onClick={() => updateDifficulty(star)}
            className="cursor-pointer rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:cursor-wait"
          >
            <Star
              className={cn(
                compact ? "size-3.5" : "size-4",
                star <= visibleValue
                  ? "fill-amber-400 text-amber-500"
                  : "fill-transparent text-stone-300",
              )}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
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
