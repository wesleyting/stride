"use client";

import { createContext, useContext, useState } from "react";
import { Shield, SlidersHorizontal, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsSection = "general" | "profile" | "account";
const SettingsSectionContext = createContext<SettingsSection>("general");

const sections = [
  { id: "general" as const, label: "General", icon: SlidersHorizontal },
  { id: "profile" as const, label: "Profile & Sharing", icon: UserRound },
  { id: "account" as const, label: "Account", icon: Shield },
];

export function SettingsTabs({ children, account }: { children: React.ReactNode; account: React.ReactNode }) {
  const [active, setActive] = useState<SettingsSection>("general");

  return <SettingsSectionContext.Provider value={active}>
    <div className="mt-6">
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200" role="tablist" aria-label="Settings">
        {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={active === id} aria-controls={`settings-panel-${id}`} onClick={() => setActive(id)} className={cn("flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-stone-500", active === id ? "border-stone-900 text-stone-950" : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-900")}><Icon className="size-4" aria-hidden="true" />{label}</button>)}
      </div>
      <div hidden={active === "account"} className="pt-6">{children}</div>
      <div id="settings-panel-account" role="tabpanel" aria-label="Account" hidden={active !== "account"} className="pt-6">{account}</div>
    </div>
  </SettingsSectionContext.Provider>;
}

export function useSettingsSection() { return useContext(SettingsSectionContext); }
