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
        "flex flex-wrap items-center gap-2 text-stone-500",
        compact ? "text-xs" : "text-sm",
      )}
      aria-label={`${selectedTuning.label} tuning${capo ? `, capo ${capo}` : ", no capo"}`}
    >
      <span>{selectedTuning.label} tuning</span>
      {capo ? (
        <><span aria-hidden="true">·</span><span>Capo on {ordinal(capo)} fret</span></>
      ) : null}
    </div>
  );
}

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}
