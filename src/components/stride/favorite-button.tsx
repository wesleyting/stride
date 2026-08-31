"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  itemId,
  initialFavorite,
  compact = false,
}: {
  itemId: string;
  initialFavorite: boolean;
  compact?: boolean;
}) {
  const [favorite, setFavorite] = useOptimistic(initialFavorite);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle() {
    const nextValue = !favorite;
    setError("");
    startTransition(async () => {
      setFavorite(nextValue);
      const result = await toggleFavoriteAction(itemId, nextValue);
      if (!result.success) setError(result.error ?? "Could not update favorite.");
    });
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorite}
        aria-label={favorite ? "Remove from home" : "Show on home"}
        title={favorite ? "Remove from home" : "Show on home"}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-stone-500 transition hover:bg-amber-50 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-stone-500 disabled:opacity-60",
          compact ? "size-8" : "h-9 gap-2 px-3 text-sm font-medium",
        )}
      >
        <Star
          className={cn("size-4", favorite && "fill-amber-400 text-amber-500")}
          aria-hidden="true"
        />
        {!compact ? (favorite ? "On home" : "Add to home") : null}
      </button>
      {error ? (
        <span role="alert" className="absolute top-full right-0 z-20 mt-1 w-64 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm">
          {error}
        </span>
      ) : null}
    </span>
  );
}
