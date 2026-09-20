"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScrollMetrics = {
  scrollable: boolean;
  thumbHeight: number;
  thumbTop: number;
};

const initialMetrics: ScrollMetrics = { scrollable: false, thumbHeight: 0, thumbTop: 0 };

export function ScrollPane({
  children,
  className,
  viewportClassName,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerY: number; scrollTop: number } | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [scrolling, setScrolling] = useState(false);

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const trackHeight = track.clientHeight;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    if (maxScroll <= 1 || trackHeight <= 0) {
      setMetrics(initialMetrics);
      return;
    }
    const thumbHeight = Math.max(40, trackHeight * (viewport.clientHeight / viewport.scrollHeight));
    const thumbTop = (trackHeight - thumbHeight) * (viewport.scrollTop / maxScroll);
    setMetrics({ scrollable: true, thumbHeight, thumbTop });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewport);
    observer.observe(content);
    updateMetrics();
    return () => observer.disconnect();
  }, [updateMetrics]);

  useEffect(() => () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  }, []);

  function handleScroll() {
    updateMetrics();
    setScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setScrolling(false), 500);
  }

  function scrollFromPointer(pointerY: number, initialPointerY: number, initialScrollTop: number) {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    const maxThumbTravel = track.clientHeight - metrics.thumbHeight;
    if (maxScroll <= 0 || maxThumbTravel <= 0) return;
    viewport.scrollTop = initialScrollTop + ((pointerY - initialPointerY) / maxThumbTravel) * maxScroll;
  }

  return <div className={cn("relative", className)}>
    <div ref={viewportRef} onScroll={handleScroll} className={cn("stride-native-scroll", viewportClassName)}>
      <div ref={contentRef} className={contentClassName}>{children}</div>
    </div>
    <div
      ref={trackRef}
      aria-hidden="true"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!viewport || !track) return;
        const targetTop = event.clientY - track.getBoundingClientRect().top - metrics.thumbHeight / 2;
        const maxThumbTravel = track.clientHeight - metrics.thumbHeight;
        const maxScroll = viewport.scrollHeight - viewport.clientHeight;
        viewport.scrollTo({ top: maxThumbTravel > 0 ? Math.max(0, Math.min(targetTop, maxThumbTravel)) / maxThumbTravel * maxScroll : 0, behavior: "smooth" });
      }}
      className={cn("group/scrollbar pointer-events-auto absolute top-1 right-0.5 bottom-1 z-20 hidden w-2 rounded-full md:block", !metrics.scrollable && "invisible")}
    >
      <div
        onPointerDown={(event) => {
          event.preventDefault();
          dragRef.current = { pointerY: event.clientY, scrollTop: viewportRef.current?.scrollTop ?? 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
          setScrolling(true);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          scrollFromPointer(event.clientY, dragRef.current.pointerY, dragRef.current.scrollTop);
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
          setScrolling(false);
        }}
        onPointerCancel={() => { dragRef.current = null; setScrolling(false); }}
        className={cn(
          "mx-auto w-1 cursor-grab rounded-full bg-stone-300 transition-colors duration-300 ease-out active:cursor-grabbing group-hover/scrollbar:bg-stone-900",
          scrolling && "bg-stone-900",
        )}
        style={{ height: metrics.thumbHeight, transform: `translateY(${metrics.thumbTop}px)` }}
      />
    </div>
  </div>;
}
