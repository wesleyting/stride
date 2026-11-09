import { expect, test } from "@playwright/test";
import { installPointerLibraryDrag } from "../../src/lib/pointer-library-drag";
import { startDragAutoScroll } from "../../src/lib/drag-auto-scroll";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.setContent(`<div id="pane" style="position:absolute;left:50px;top:50px;width:500px;height:400px;overflow:auto"><div id="library">
    <div id="song" draggable="true" style="height:80px;background:#eee">Song <button id="edit" data-song-controls>Edit</button></div>
    <div style="height:800px"></div><button id="folder" draggable="true" style="height:80px;width:100%">Folder</button><div style="height:1500px"></div>
  </div></div>`);
  await page.addScriptTag({ content: `
    (${installPointerLibraryDrag.toString()})(document.getElementById("library"));
    document.getElementById("library").addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", event.target.id);
      document.body.dataset.started = event.target.id;
      (${startDragAutoScroll.toString()})(document.getElementById("library"));
    });
    document.getElementById("library").addEventListener("drop", event => {
      document.body.dataset.dropped = event.dataTransfer.getData("text/plain");
      document.body.dataset.target = event.target.id;
    });
    document.getElementById("song").addEventListener("click", () => { document.body.dataset.clicked = "yes"; });
  ` });
});

test("wheel scrolls while holding a song and drops onto the newly revealed folder", async ({ page }) => {
  await page.mouse.move(150, 90);
  await page.mouse.down();
  await page.mouse.move(200, 240, { steps: 8 });
  await expect(page.locator("body")).toHaveAttribute("data-started", "song");
  await expect(page.locator('[aria-hidden="true"][draggable="true"]')).toHaveCount(1);
  await page.mouse.wheel(0, 730);
  await expect.poll(() => page.locator("#pane").evaluate((element) => element.scrollTop)).toBeGreaterThan(700);
  await page.mouse.up();
  await expect(page.locator("body")).toHaveAttribute("data-dropped", "song");
  await expect(page.locator("body")).toHaveAttribute("data-target", "folder");
  await expect(page.locator("body")).not.toHaveAttribute("data-clicked", "yes");
  await expect(page.locator('[aria-hidden="true"][draggable="true"]')).toHaveCount(0);
});

test("normal clicks work and Escape cancels dragging without a drop", async ({ page }) => {
  await page.locator("#song").click({ position: { x: 10, y: 15 } });
  await expect(page.locator("body")).toHaveAttribute("data-clicked", "yes");
  await expect(page.locator("body")).not.toHaveAttribute("data-started");
  await page.mouse.move(150, 90);
  await page.mouse.down();
  await page.mouse.move(200, 240, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-dropped");
  await expect(page.locator('[aria-hidden="true"][draggable="true"]')).toHaveCount(0);
});

test("action buttons do not initiate a drag", async ({ page }) => {
  const edit = await page.locator("#edit").boundingBox();
  await page.mouse.move(edit!.x + 5, edit!.y + 5);
  await page.mouse.down();
  await page.mouse.move(200, 240, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-started");
});
