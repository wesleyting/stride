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
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const loadingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishNavigation = useCallback(() => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (loadingSafetyRef.current) clearTimeout(loadingSafetyRef.current);
    loadingDelayRef.current = null;
    loadingSafetyRef.current = null;
    setLoadingPath(null);
  }, []);

  const startNavigation = useCallback((destination = window.location.pathname) => {
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    if (loadingSafetyRef.current) clearTimeout(loadingSafetyRef.current);
    loadingDelayRef.current = setTimeout(() => setLoadingPath(destination), 120);
    loadingSafetyRef.current = setTimeout(finishNavigation, 12_000);
  }, [finishNavigation]);

  useEffect(() => {
    const unsubscribe = subscribeToRouteNavigation(startNavigation);
    const handlePopState = () => startNavigation(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", handlePopState);
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
    beginRouteNavigation(destination.pathname);
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
            {loadingPath ? <RouteLoadingSkeleton pathname={loadingPath} /> : children}
          </ScrollPane>
        </ViewTransition>
      </div>
      {showSidebar ? <MobileNavigation /> : null}
    </div>
  );
}

function RouteLoadingSkeleton({ pathname }: { pathname: string }) {
  const pulse = "animate-pulse rounded-lg bg-stone-100 motion-reduce:animate-none";
  const isLibrary = pathname === "/songs";
  const isSong = pathname.startsWith("/songs/") || pathname.includes("/songs/");
  const isCommunity = pathname === "/community" || pathname.startsWith("/people/");
  const isSettings = pathname === "/settings";

  return <main className="min-w-0 flex-1" aria-busy="true" aria-label={`Loading ${isLibrary ? "song library" : isSong ? "song" : isCommunity ? "community" : isSettings ? "settings" : "page"}`}>
    <div className="stride-loading-bar h-0.5 bg-stone-900" />
    <div className="space-y-7 px-4 py-7 sm:px-7 sm:py-9">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2"><div className="h-7 w-32 animate-pulse rounded-md bg-stone-200 motion-reduce:animate-none" /><div className={`${pulse} h-4 w-56 max-w-[65vw]`} /></div>
        <div className={`${pulse} h-9 w-28 bg-stone-200`} />
      </div>
      {isLibrary ? <LibrarySkeleton pulse={pulse} /> : isSong ? <SongSkeleton pulse={pulse} /> : isCommunity ? <CommunitySkeleton pulse={pulse} /> : isSettings ? <SettingsSkeleton pulse={pulse} /> : <HomeSkeleton pulse={pulse} />}
    </div>
  </main>;
}

function LibrarySkeleton({ pulse }: { pulse: string }) {
  return <><div className="flex flex-wrap gap-2"><div className={`${pulse} h-10 w-24`} /><div className={`${pulse} h-10 w-20`} /><div className={`${pulse} h-10 w-24`} /></div><div className="space-y-5">{Array.from({ length: 2 }, (_, group) => <section key={group} className="space-y-2"><div className={`${pulse} h-5 w-28 bg-stone-200`} />{Array.from({ length: 3 }, (_, row) => <div key={row} className={`${pulse} h-16 border border-stone-100 bg-stone-50`} />)}</section>)}</div></>;
}

function SongSkeleton({ pulse }: { pulse: string }) {
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"><div className={`${pulse} h-72 border border-stone-100`} /><div className="grid gap-5"><div className={`${pulse} h-28 border border-stone-100`} /><div className={`${pulse} h-36 border border-stone-100`} /><div className={`${pulse} h-48 border border-stone-100`} /></div></div>;
}

function CommunitySkeleton({ pulse }: { pulse: string }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className={`${pulse} h-36 border border-stone-100`} />)}</div>;
}

function SettingsSkeleton({ pulse }: { pulse: string }) {
  return <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]"><div className="space-y-2">{Array.from({ length: 3 }, (_, index) => <div key={index} className={`${pulse} h-10`} />)}</div><div className="space-y-4"><div className={`${pulse} h-24 border border-stone-100`} /><div className={`${pulse} h-44 border border-stone-100`} /><div className={`${pulse} h-20 border border-stone-100`} /></div></div>;
}

function HomeSkeleton({ pulse }: { pulse: string }) {
  return <><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className={`${pulse} h-16`} />)}</div><div className="space-y-3"><div className={`${pulse} h-5 w-24 bg-stone-200`} /><div className={`${pulse} h-52 border border-stone-100 sm:h-64`} /></div></>;
}
