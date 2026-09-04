"use client";

import { useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_DIFFICULTY = 0.5;
const MAX_DIFFICULTY = 5;

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  label = "Song difficulty",
}: {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const interactive = Boolean(onChange);
  const visibleValue = preview ?? value;
  const starSize = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4";
  const stars = <>{Array.from({ length: 5 }, (_, index) => <PartialStar key={index} fill={visibleValue - index} className={starSize} />)}</>;

  if (!interactive) {
    return <span className="inline-flex shrink-0" aria-label={`${label}: ${formatDifficulty(value)} out of 5`}>{stars}</span>;
  }

  function valueFromPoint(element: HTMLElement, clientX: number) {
    const bounds = element.getBoundingClientRect();
    const raw = ((clientX - bounds.left) / bounds.width) * MAX_DIFFICULTY;
    return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.ceil(raw * 2) / 2));
  }

  function previewPoint(event: PointerEvent<HTMLButtonElement>) {
    if (!disabled && event.pointerType !== "touch") setPreview(valueFromPoint(event.currentTarget, event.clientX));
  }

  function selectPoint(event: MouseEvent<HTMLButtonElement>) {
    if (!disabled && event.detail > 0) onChange?.(valueFromPoint(event.currentTarget, event.clientX));
  }

  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(MAX_DIFFICULTY, value + 0.5);
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(MIN_DIFFICULTY, value - 0.5);
    if (event.key === "Home") next = MIN_DIFFICULTY;
    if (event.key === "End") next = MAX_DIFFICULTY;
    if (next !== null) {
      event.preventDefault();
      onChange?.(next);
    }
  }

  return (
    <button
      type="button"
      role="slider"
      aria-label={label}
      aria-valuemin={MIN_DIFFICULTY}
      aria-valuemax={MAX_DIFFICULTY}
      aria-valuenow={value}
      aria-valuetext={`${formatDifficulty(value)} out of 5`}
      title={`${formatDifficulty(visibleValue)} out of 5`}
      disabled={disabled}
      onPointerMove={previewPoint}
      onPointerLeave={() => setPreview(null)}
      onBlur={() => setPreview(null)}
      onClick={selectPoint}
      onKeyDown={selectWithKeyboard}
      className="inline-flex shrink-0 cursor-pointer rounded-md p-0.5 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60"
    >
      {stars}
    </button>
  );
}

function PartialStar({ fill, className }: { fill: number; className: string }) {
  const percentage = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span className={cn("relative block shrink-0", className)} aria-hidden="true">
      <Star className="absolute inset-0 size-full fill-transparent text-stone-300" strokeWidth={1.8} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${percentage}%` }}>
        <Star className="absolute inset-0 size-full fill-amber-400 text-amber-500" strokeWidth={1.8} />
      </span>
    </span>
  );
}

function formatDifficulty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
