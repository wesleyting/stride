"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Library, Settings, UsersRound, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/", label: "Home", icon: House },
  { href: "/songs", label: "All songs", icon: Library },
  { href: "/community", label: "Community", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/songs") return pathname.startsWith("/songs");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-stone-200 bg-stone-50 px-3 py-5 md:flex xl:w-56">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-base font-semibold text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-500"
        aria-label="Stride home"
      >
        <Waypoints className="size-5" aria-hidden="true" />
        Stride
      </Link>

      <nav className="mt-6" aria-label="Primary navigation">
        {destinations.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-stone-500",
                active
                  ? "bg-stone-200 text-stone-950"
                  : "text-stone-700 hover:bg-stone-200 hover:text-stone-950",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">{footer}</div>
    </aside>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-200 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_18px_rgba(0,0,0,0.05)] backdrop-blur md:hidden"
    >
      {destinations.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.6875rem] font-medium transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500",
              active ? "bg-stone-100 text-stone-950" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
