"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setSongHiddenAction } from "@/app/actions";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";

export function SongVisibilityButton({ itemId, itemName, hidden }: { itemId: string; itemName: string; hidden: boolean }) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const label = hidden ? `Show ${itemName}` : `Hide ${itemName}`;
  return <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await setSongHiddenAction(itemId, !hidden); if (result.success) showToast(hidden ? "Song is visible again." : "Song marked as hidden."); else showToast(result.error ?? "Could not update the song.", { tone: "error" }); })} title={label} aria-label={label} className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} group/visibility`}><span className="relative size-4">{hidden ? <><EyeOff className="absolute inset-0 size-4 transition group-hover/visibility:scale-75 group-hover/visibility:opacity-0" aria-hidden="true" /><Eye className="absolute inset-0 size-4 scale-75 opacity-0 transition group-hover/visibility:scale-100 group-hover/visibility:opacity-100" aria-hidden="true" /></> : <><Eye className="absolute inset-0 size-4 transition group-hover/visibility:scale-75 group-hover/visibility:opacity-0" aria-hidden="true" /><EyeOff className="absolute inset-0 size-4 scale-75 opacity-0 transition group-hover/visibility:scale-100 group-hover/visibility:opacity-100" aria-hidden="true" /></>}</span></button>;
}
