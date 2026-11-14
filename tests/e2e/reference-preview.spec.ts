import { expect, test } from "@playwright/test";
import { referencePreviewUrl } from "../../src/lib/reference-preview";

test("reference previews preserve video timestamps, playlists, and tab fragments", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=example&t=123&list=playlist",
    "https://tabs.ultimate-guitar.com/tab/example#verse",
    "http://example.com/chords",
  ]) expect(referencePreviewUrl(` ${url} `)).toBe(url);
});

test("reference previews reject incomplete links, executable URLs, and embedded credentials", () => {
  for (const url of ["", "youtube.com", "/songs", "https://", "javascript:alert(1)", "data:text/html,test", "file:///test", "https://user:password@example.com/"]) {
    expect(referencePreviewUrl(url)).toBeNull();
  }
});
