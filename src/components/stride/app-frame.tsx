import Link from "next/link";
import {
  Archive,
  Clock3,
  House,
  Settings,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AppFrame({
  children,
  showSidebar = false,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
}) {
  return (
    <div className="min-h-screen bg-stone-100 md:p-6">
      <div
        className={cn(
          "mx-auto min-h-screen overflow-hidden bg-background md:min-h-[calc(100vh-3rem)] md:rounded-lg md:border md:border-stone-300 md:shadow-sm",
          showSidebar ? "max-w-7xl md:flex" : "max-w-6xl",
        )}
      >
        {showSidebar ? <Sidebar /> : null}
        {children}
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex border-b border-stone-200 bg-stone-50 px-4 py-3 md:w-52 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:px-3 md:py-5">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-base font-semibold text-stone-950"
        aria-label="Stride home"
      >
        <Waypoints className="size-5" aria-hidden="true" />
        Stride
      </Link>

      <nav className="ml-auto flex items-center md:mt-6 md:ml-0 md:block" aria-label="Primary navigation">
        <Link
          href="/"
          aria-current="page"
          className="flex items-center gap-2 rounded-md bg-stone-200 px-3 py-2 text-sm font-medium text-stone-950"
        >
          <House className="size-4" aria-hidden="true" />
          Activities
        </Link>
        <div className="mt-1 hidden space-y-1 md:block">
          <SidebarPlaceholder icon={Clock3} label="Recent" />
          <SidebarPlaceholder icon={Archive} label="Archive" />
        </div>
      </nav>

      <div className="mt-auto hidden pt-8 md:block">
        <SidebarPlaceholder icon={Settings} label="Settings" />
      </div>
    </aside>
  );
}

function SidebarPlaceholder({
  icon: Icon,
  label,
}: {
  icon: typeof House;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled
      title="Not included in this milestone"
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-stone-500 disabled:cursor-not-allowed"
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
