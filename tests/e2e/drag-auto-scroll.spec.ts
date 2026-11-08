import { expect, test } from "@playwright/test";
import { startDragAutoScroll } from "../../src/lib/drag-auto-scroll";

test("dragging near either edge scrolls the pane and stops after dropping", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.setContent('<div id="pane" style="position:absolute;top:50px;left:50px;width:500px;height:400px;overflow-y:auto"><div id="source" style="height:2400px">Song library</div></div>');
  await page.addScriptTag({ content: `(${startDragAutoScroll.toString()})(document.getElementById("source"));` });
  const pane = page.locator("#pane");
  await pane.evaluate((element) => { element.scrollTop = 800; });
  await pane.dispatchEvent("dragover", { clientX: 250, clientY: 55 });
  await expect.poll(() => pane.evaluate((element) => element.scrollTop)).toBeLessThan(700);
  await pane.dispatchEvent("dragover", { clientX: 250, clientY: 445 });
  const beforeDown = await pane.evaluate((element) => element.scrollTop);
  await expect.poll(() => pane.evaluate((element) => element.scrollTop)).toBeGreaterThan(beforeDown + 100);
  await pane.dispatchEvent("drop");
  const afterDrop = await pane.evaluate((element) => element.scrollTop);
  await page.waitForTimeout(200);
  expect(await pane.evaluate((element) => element.scrollTop)).toBe(afterDrop);
});

test("center and outside the pane do not scroll; dragend cleans up", async ({ page }) => {
  await page.setContent('<div id="pane" style="position:absolute;top:50px;left:50px;width:500px;height:400px;overflow-y:auto"><div id="source" style="height:2400px">Song library</div></div>');
  await page.addScriptTag({ content: `(${startDragAutoScroll.toString()})(document.getElementById("source"));` });
  const pane = page.locator("#pane");
  await pane.evaluate((element) => { element.scrollTop = 800; });
  for (const point of [{ clientX: 250, clientY: 250 }, { clientX: 600, clientY: 55 }]) {
    await pane.dispatchEvent("dragover", point);
    await page.waitForTimeout(150);
    expect(await pane.evaluate((element) => element.scrollTop)).toBe(800);
  }
  await pane.dispatchEvent("dragend");
  await pane.dispatchEvent("dragover", { clientX: 250, clientY: 55 });
  await page.waitForTimeout(150);
  expect(await pane.evaluate((element) => element.scrollTop)).toBe(800);
});

test("falls back to page scrolling when there is no overflow pane", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.setContent('<div id="source" style="height:3000px">Song library</div>');
  await page.addScriptTag({ content: `(${startDragAutoScroll.toString()})(document.getElementById("source"));` });
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.locator("#source").dispatchEvent("dragover", { clientX: 250, clientY: 5 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(700);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const stopped = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBe(stopped);
});
