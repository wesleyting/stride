"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/stride/toast-provider";

export function CopyLinkButton({ path, label = "Copy Link", className }: { path: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      showToast("Link copied.", { id: "copied-link", duration: 1800 });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Could not copy the link.", { tone: "error" });
    }
  }
  return <button type="button" onClick={copy} className={cn(buttonVariants({ variant: "outline" }), className)}>{copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}{copied ? "Copied" : label}</button>;
}
