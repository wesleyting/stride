"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setSongHiddenAction } from "@/app/actions";
import { useToast } from "@/components/stride/toast-provider";
import { buttonVariants } from "@/components/ui/button";

export function SongVisibilityButton({ itemId, itemName, hidden }: { itemId: string; itemName: string; hidden: boolean }) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const label = hidden ? `Return ${itemName} to active repertoire` : `Hide ${itemName} from active repertoire`;
  return <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await setSongHiddenAction(itemId, !hidden); if (result.success) showToast(hidden ? "Song is visible again." : "Song marked as hidden."); else showToast(result.error ?? "Could not update the song.", { tone: "error" }); })} title={label} aria-label={label} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>{hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}</button>;
}
