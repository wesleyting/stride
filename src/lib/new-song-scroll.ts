/** Consume the creation URL once, not on every refreshed library render. */
export function scheduleNewSongScroll(slug: string) {
  if (new URL(window.location.href).searchParams.get("added") !== slug) return;

  const timer = window.setTimeout(() => {
    const url = new URL(window.location.href);
    if (url.pathname !== "/songs" || url.searchParams.get("added") !== slug) return;
    url.searchParams.delete("added");
    if (url.searchParams.get("notice") === "song-created") url.searchParams.delete("notice");
    // Passing Next's internal history state bypasses its URL synchronization.
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    document.querySelector<HTMLElement>(`[data-song-slug="${CSS.escape(slug)}"]`)
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  }, 140);

  // Effect replay can reschedule safely: the URL is consumed only when run.
  return () => window.clearTimeout(timer);
}
