"use client";

import { useState, useTransition } from "react";
import { updateItemDifficultyAction } from "@/app/actions";
import { StarRating } from "@/components/stride/star-rating";
import { useToast } from "@/components/stride/toast-provider";

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
  value: number | null;
  compact?: boolean;
}) {
  const [difficulty, setDifficulty] = useState(value);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function updateDifficulty(nextDifficulty: number) {
    const previousDifficulty = difficulty;
    setDifficulty(nextDifficulty);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("itemId", itemId);
      formData.set("itemSlug", itemSlug);
      formData.set("activitySlug", activitySlug);
      formData.set("difficulty", String(nextDifficulty));
      const result = await updateItemDifficultyAction(formData);

      if (!result.success) {
        setDifficulty(previousDifficulty);
        showToast(result.error ?? "Could not update difficulty.", { tone: "error" });
        return;
      }
      showToast("Difficulty updated.", { id: `difficulty-${itemId}` });
    });
  }

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5">
      <StarRating value={difficulty} onChange={updateDifficulty} disabled={pending} size={compact ? "sm" : "md"} />
    </div>
  );
}
