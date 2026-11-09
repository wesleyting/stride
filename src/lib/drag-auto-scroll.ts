/** Scroll the actual overflow container, not just the window, during native dragging. */
export function startDragAutoScroll(source: HTMLElement): () => void {
  let viewport: HTMLElement | null = source.parentElement;
  while (viewport && !/(auto|scroll)/.test(getComputedStyle(viewport).overflowY)) {
    viewport = viewport.parentElement;
  }
  const scroller = viewport ?? document.scrollingElement as HTMLElement;
  const pageScroll = scroller === document.scrollingElement;
  let pointer: { x: number; y: number } | null = null;
  let frame = 0;
  let previousTime = 0;
  let stopped = false;
  let manualScrollUntil = 0;

  function wheel(event: WheelEvent) {
    if (!event.ctrlKey && (pageScroll || scroller.contains(event.target as Node))) {
      // Let normal wheel/trackpad scrolling win over edge scrolling briefly.
      manualScrollUntil = performance.now() + 600;
    }
  }

  function track(event: DragEvent) {
    pointer = { x: event.clientX, y: event.clientY };
  }

  function tick(time: number) {
    if (stopped) return;
    const elapsed = previousTime ? Math.min(time - previousTime, 40) / 1000 : 0;
    previousTime = time;
    if (pointer && time >= manualScrollUntil) {
      const rect = scroller.getBoundingClientRect();
      const top = pageScroll ? 0 : Math.max(0, rect.top);
      const bottom = pageScroll ? window.innerHeight : Math.min(window.innerHeight, rect.bottom);
      const left = pageScroll ? 0 : rect.left;
      const right = pageScroll ? window.innerWidth : rect.right;
      const edge = Math.min(88, (bottom - top) / 3);
      let speed = 0;
      if (edge > 0 && pointer.x >= left && pointer.x <= right && pointer.y >= top - 24 && pointer.y <= bottom + 24) {
        if (pointer.y < top + edge) speed = -Math.min(1, (top + edge - pointer.y) / edge);
        else if (pointer.y > bottom - edge) speed = Math.min(1, (pointer.y - bottom + edge) / edge);
      }
      if (speed) scroller.scrollBy({ top: speed * 700 * elapsed, behavior: "instant" });
    }
    frame = requestAnimationFrame(tick);
  }

  function leave(event: DragEvent) {
    if (!event.relatedTarget) pointer = null;
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    document.removeEventListener("dragover", track, true);
    document.removeEventListener("dragleave", leave, true);
    document.removeEventListener("drop", stop, true);
    document.removeEventListener("dragend", stop, true);
    document.removeEventListener("wheel", wheel, true);
    window.removeEventListener("blur", stop);
  }

  document.addEventListener("dragover", track, true);
  document.addEventListener("dragleave", leave, true);
  document.addEventListener("drop", stop, true);
  document.addEventListener("dragend", stop, true);
  document.addEventListener("wheel", wheel, { capture: true, passive: true });
  window.addEventListener("blur", stop);
  frame = requestAnimationFrame(tick);
  return stop;
}
