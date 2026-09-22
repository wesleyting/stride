const routeNavigationEvent = "stride:route-navigation";

export function beginRouteNavigation(pathname?: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(routeNavigationEvent, { detail: pathname ?? window.location.pathname }));
}

export function subscribeToRouteNavigation(listener: (pathname: string) => void) {
  const handleNavigation = (event: Event) => listener((event as CustomEvent<string>).detail || window.location.pathname);
  window.addEventListener(routeNavigationEvent, handleNavigation);
  return () => window.removeEventListener(routeNavigationEvent, handleNavigation);
}
