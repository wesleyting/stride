const routeNavigationEvent = "stride:route-navigation";

export function beginRouteNavigation() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(routeNavigationEvent));
}

export function subscribeToRouteNavigation(listener: () => void) {
  window.addEventListener(routeNavigationEvent, listener);
  return () => window.removeEventListener(routeNavigationEvent, listener);
}
