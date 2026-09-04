export function safeReturnPath(value: unknown, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

export function authHref(path: "/sign-in" | "/sign-up", next: string) {
  const params = new URLSearchParams({ next: safeReturnPath(next) });
  return `${path}?${params.toString()}`;
}
