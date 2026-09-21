"use client";

import { useCallback, useEffect, useRef, useState, ViewTransition, type MouseEvent as ReactMouseEvent } from "react";
import { usePathname } from "next/navigation";
import { DesktopNavigation, MobileNavigation } from "@/components/stride/app-navigation";
import { ScrollPane } from "@/components/ui/scroll-pane";
import { beginRouteNavigation, subscribeToRouteNavigation } from "@/lib/route-loading";
import { cn } from "@/lib/utils";

export function AppFrame({
  children,
  showSidebar = true,
  sidebarFooter,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarFooter?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const loadingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishNavigation = useCallback(() => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (loadingSafetyRef.current) clearTimeout(loadingSafetyRef.current);
    loadingDelayRef.current = null;
    loadingSafetyRef.current = null;
    setNavigating(false);
  }, []);

  const startNavigation = useCallback(() => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (loadingSafetyRef.current) clearTimeout(loadingSafetyRef.current);
    loadingDelayRef.current = setTimeout(() => setNavigating(true), 120);
    loadingSafetyRef.current = setTimeout(finishNavigation, 12_000);
  }, [finishNavigation]);

  useEffect(() => {
    const unsubscribe = subscribeToRouteNavigation(startNavigation);
    window.addEventListener("popstate", startNavigation);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", startNavigation);
    };
  }, [startNavigation]);

  useEffect(() => {
    queueMicrotask(finishNavigation);
  }, [children, finishNavigation, pathname]);

  useEffect(() => () => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (loadingSafetyRef.current) clearTimeout(loadingSafetyRef.current);
  }, []);

  function handleNavigationClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
    if (!link || link.target === "_blank" || link.hasAttribute("download") || link.origin !== window.location.origin) return;
    const current = new URL(window.location.href);
    const destination = new URL(link.href);
    if (destination.pathname === current.pathname && destination.search === current.search) return;
    beginRouteNavigation();
  }

  return (
    <div onClickCapture={handleNavigationClick} className={cn("min-h-screen bg-stone-100 md:h-dvh md:min-h-0 md:overflow-hidden md:p-4 xl:p-6", showSidebar && "pb-16 md:pb-4 xl:pb-6")}>
      <div
        className={cn(
          "mx-auto min-h-screen overflow-hidden bg-background md:h-full md:min-h-0 md:rounded-lg md:border md:border-stone-300 md:shadow-sm",
          showSidebar ? "max-w-[82rem] md:flex" : "max-w-6xl",
        )}
      >
        {showSidebar ? <DesktopNavigation footer={sidebarFooter} /> : null}
        <ViewTransition
          name="stride-page-content"
          share="stride-page"
          enter="stride-page-enter"
          exit="stride-page-exit"
          default="none"
        >
          <ScrollPane className={cn("min-w-0 flex-1", showSidebar && "md:h-full md:min-h-0")} viewportClassName={cn(showSidebar && "md:h-full md:overflow-y-auto md:overscroll-contain")}>
            {navigating ? <RouteLoadingSkeleton /> : children}
          </ScrollPane>
        </ViewTransition>
      </div>
      {showSidebar ? <MobileNavigation /> : null}
    </div>
  );
}

function RouteLoadingSkeleton() {
  return <main className="min-w-0 flex-1" aria-busy="true" aria-label="Loading page">
    <div className="stride-loading-bar h-0.5 bg-stone-900" />
    <div className="space-y-7 px-4 py-7 sm:px-7 sm:py-9">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2"><div className="h-7 w-32 animate-pulse rounded-md bg-stone-200" /><div className="h-4 w-56 max-w-[65vw] animate-pulse rounded bg-stone-100" /></div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-stone-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-stone-100" />)}</div>
      <div className="space-y-3"><div className="h-5 w-24 animate-pulse rounded bg-stone-200" /><div className="h-48 animate-pulse rounded-xl bg-stone-100 sm:h-64" /></div>
    </div>
  </main>;
}
