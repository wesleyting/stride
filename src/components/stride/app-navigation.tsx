"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Ellipsis, House, Library, Settings, UsersRound, Waypoints } from "lucide-react";
import { DialogShell } from "@/components/stride/dialog-shell";
import { ScrollPane } from "@/components/ui/scroll-pane";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/", label: "Home", icon: House },
  { href: "/songs", label: "All songs", icon: Library },
  { href: "/community", label: "Community", icon: UsersRound },
];
const mobileDestinations = [...destinations, { href: "/settings", label: "Settings", icon: Settings }];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/songs") return pathname.startsWith("/songs");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full min-h-0 w-52 shrink-0 border-r border-stone-200 bg-stone-50 md:block xl:w-56">
      <ScrollPane className="h-full" viewportClassName="h-full overflow-y-auto overscroll-contain" contentClassName="flex min-h-full flex-col px-3 py-5">
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
      </ScrollPane>
    </aside>
  );
}

export function MobileNavigation({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
    <nav
      aria-label="Primary navigation"
      className={cn("fixed inset-x-0 bottom-0 z-30 grid border-t border-stone-200 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_18px_rgba(0,0,0,0.05)] backdrop-blur md:hidden", footer ? "grid-cols-5" : "grid-cols-4")}
    >
      {mobileDestinations.map(({ href, label, icon: Icon }) => {
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
      {footer ? <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.6875rem] font-medium text-stone-500 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-500"><Ellipsis className="size-4" aria-hidden="true" /><span>More</span></button> : null}
    </nav>
    {footer ? <DialogShell open={moreOpen} onOpenChange={setMoreOpen} title="Account & More"><div onClick={(event) => { if ((event.target as HTMLElement).closest("a[href]")) setMoreOpen(false); }} className="[&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_button]:min-h-11">{footer}</div></DialogShell> : null}
    </>
  );
}
