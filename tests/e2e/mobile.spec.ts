import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

for (const width of [320, 390, 430]) {
  test(`phone navigation and timer fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      localStorage.setItem("stride-practice-timer-v1", JSON.stringify({
        sessionId: "mobile-layout-test", itemId: "test-song", itemSlug: "test-song",
        itemName: "A Long Song Name That Should Still Fit On A Phone",
        createdAt: Date.now(), startedAt: Date.now(), accumulatedSeconds: 60,
      }));
    });
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Primary navigation" }).filter({ visible: true });
    await expect(navigation).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
    const pause = page.getByRole("button", { name: "Pause timer", exact: true });
    await expect(pause).toBeVisible();
    const bounds = await pause.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: testInfo.outputPath("mobile-timer.png") });
    await pause.tap();
    await expect(page.getByRole("button", { name: "Resume timer", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Finish", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Finish Practice?" });
    await expect(dialog).toBeVisible();
    const panel = await dialog.locator("section").boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.width).toBeLessThanOrEqual(width);
    expect(panel!.height).toBeLessThanOrEqual(740);
    await page.screenshot({ path: testInfo.outputPath("mobile-dialog.png") });
    await dialog.getByRole("button", { name: "Close dialog" }).tap();
    await expect(dialog).not.toBeVisible();
    await navigation.getByRole("button", { name: "More", exact: true }).tap();
    const account = page.getByRole("dialog", { name: "Account & More" });
    await expect(account).toBeVisible();
    await expect(account.getByRole("link", { name: "Sign In", exact: true })).toBeVisible();
    await expect(account.getByRole("link", { name: "Privacy", exact: true })).toBeVisible();
    await account.getByRole("link", { name: "Privacy", exact: true }).tap();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(account).not.toBeVisible();
  });
}
