/** Only ordinary web URLs may be opened from an unsaved reference field. */
export function referencePreviewUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
