"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export function CustomSelect({
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  ariaLabel,
  className,
}: {
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const setTriggerRef = useCallback((trigger: HTMLButtonElement | null) => {
    if (!trigger) return;
    setPortalContainer(trigger.closest("dialog") ?? document.body);
  }, []);

  return (
    <Select.Root
      items={options}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(nextValue) => { if (nextValue !== null) onValueChange?.(nextValue); }}
    >
      <Select.Trigger ref={setTriggerRef} aria-label={ariaLabel} className={cn("flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white px-3 text-left text-sm text-stone-900 shadow-sm outline-none transition hover:border-stone-400 focus-visible:border-stone-500 focus-visible:ring-2 focus-visible:ring-stone-500/20 data-[popup-open]:border-stone-500 data-[popup-open]:ring-2 data-[popup-open]:ring-stone-500/20", className)}>
        <Select.Value className="min-w-0 flex-1 truncate" />
        <Select.Icon><ChevronDown className="size-4 shrink-0 text-stone-500 transition-transform data-[popup-open]:rotate-180" aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Positioner sideOffset={6} align="start" className="z-[100] outline-none">
          <Select.Popup className="max-h-72 min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl outline-none transition data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Select.List>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className="grid cursor-pointer grid-cols-[minmax(0,1fr)_1rem] items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-700 outline-none transition data-[highlighted]:bg-stone-100 data-[highlighted]:text-stone-950 data-[selected]:font-semibold">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator><Check className="size-4" aria-hidden="true" /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
