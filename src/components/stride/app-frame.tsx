import Link from "next/link";
import {
  House,
  Library,
  Settings,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AppFrame({
  children,
  showSidebar = false,
  sidebarFooter,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-100 md:p-6">
      <div
        className={cn(
          "mx-auto min-h-screen overflow-hidden bg-background md:min-h-[calc(100vh-3rem)] md:rounded-lg md:border md:border-stone-300 md:shadow-sm",
          showSidebar ? "max-w-7xl md:flex" : "max-w-6xl",
        )}
      >
        {showSidebar ? <Sidebar footer={sidebarFooter} /> : null}
        {children}
      </div>
    </div>
  );
}

function Sidebar({ footer }: { footer?: React.ReactNode }) {
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
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200 hover:text-stone-950 focus-visible:bg-stone-200"
        >
          <House className="size-4" aria-hidden="true" />
          Home
        </Link>
        <Link href="/songs" className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200 hover:text-stone-950 focus-visible:bg-stone-200"><Library className="size-4" aria-hidden="true" />All songs</Link>
        <Link href="/community" className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200 hover:text-stone-950 focus-visible:bg-stone-200"><UsersRound className="size-4" aria-hidden="true" />Community</Link>
        <Link href="/settings" className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200 hover:text-stone-950 focus-visible:bg-stone-200"><Settings className="size-4" aria-hidden="true" />Settings</Link>
      </nav>

      <div className="mt-auto hidden pt-8 md:block">
        {footer}
      </div>
    </aside>
  );
}
