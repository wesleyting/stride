import { cn } from "@/lib/utils";
import { describeProficiency } from "@/lib/stride";

export function ProficiencyChip({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700",
        className,
      )}
    >
      {describeProficiency(level)}
    </span>
  );
}
