import { expect, test } from "@playwright/test";
import { scheduleNewSongScroll } from "../../src/lib/new-song-scroll";

test.beforeEach(async ({ page }) => {
  await page.route("http://stride.test/**", (route) => route.fulfill({ contentType: "text/html", body: '<div data-song-slug="new-song">Song</div>' }));
  await page.goto("http://stride.test/songs?added=new-song&notice=song-created&keep=1#library");
  await page.addScriptTag({ content: `window.scheduleScroll = ${scheduleNewSongScroll.toString()}; window.scrollCalls = 0; Element.prototype.scrollIntoView = function () { window.scrollCalls++; };` });
});

test("scrolls once and ignores refreshed data or remounts with stale creation props", async ({ page }) => {
  await page.evaluate("window.scheduleScroll('new-song')");
  await expect.poll(() => page.evaluate("window.scrollCalls")).toBe(1);
  await expect(page).toHaveURL("http://stride.test/songs?keep=1#library");
  await page.evaluate("window.scheduleScroll('new-song'); window.scheduleScroll('new-song')");
  await page.waitForTimeout(250);
  expect(await page.evaluate("window.scrollCalls")).toBe(1);
});

test("effect cleanup and replay still scroll once; a later creation can scroll again", async ({ page }) => {
  await page.evaluate("window.scheduleScroll('new-song')(); window.scheduleScroll('new-song')");
  await expect.poll(() => page.evaluate("window.scrollCalls")).toBe(1);
  await page.evaluate("history.replaceState(null, '', '/songs?added=another-song'); document.querySelector('div').dataset.songSlug = 'another-song'; window.scheduleScroll('another-song')");
  await expect.poll(() => page.evaluate("window.scrollCalls")).toBe(2);
});

test("does not pull the user back after navigating away", async ({ page }) => {
  await page.evaluate("window.scheduleScroll('new-song'); history.replaceState(null, '', '/settings')");
  await page.waitForTimeout(250);
  expect(await page.evaluate("window.scrollCalls")).toBe(0);
  await expect(page).toHaveURL("http://stride.test/settings");
});
