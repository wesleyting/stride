import { Music2 } from "lucide-react";
import { formatTuning } from "@/lib/stride";
import { cn } from "@/lib/utils";

export function SongSetup({
  tuning,
  capo,
  compact = false,
}: {
  tuning?: string | null;
  capo?: number | null;
  compact?: boolean;
}) {
  const selectedTuning = formatTuning(tuning);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-stone-600",
        compact ? "text-xs" : "text-sm",
      )}
      aria-label={`${selectedTuning.label} tuning${capo ? `, capo ${capo}` : ", no capo"}`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 font-medium">
        <Music2 className="size-3.5 text-stone-500" aria-hidden="true" />
        {selectedTuning.label}
      </span>
      {capo ? (
        <span className="rounded-md bg-stone-100 px-2 py-1 font-medium">Capo {capo}</span>
      ) : null}
    </div>
  );
}
