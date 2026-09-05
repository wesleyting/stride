import { expect, test } from "@playwright/test";

test("authentication entry points are usable on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/sign-in");

  await expect(page.getByRole("heading", { name: "Continue Your Practice" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up?next=%2F");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 375);
});

test("signed-out visitors can preview the dashboard without creating an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Guitar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add Your First Song" }).first()).toBeVisible();
  await expect(page.getByText(/No account required/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Song" }).first()).toBeVisible();
});

test("a visitor can start a guest library from Add Song", async ({ page }) => {
  test.skip(process.env.E2E_GUEST !== "1", "Set E2E_GUEST=1 for a Supabase project with Anonymous Sign-Ins enabled.");

  await page.goto("/");
  await page.getByRole("button", { name: "Add Song" }).first().click();
  await expect(page.getByRole("dialog", { name: "Add Song" })).toBeVisible();
  await expect(page.getByText("Using Stride as a guest")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("radio", { name: /Only Me/ })).toHaveAttribute("aria-checked", "true");
});

test("a signed-in user can create a song, log practice, and still see it after reload", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for a dedicated test account.");

  const songName = `E2E Song ${Date.now()}`;
  const note = `Persistence check ${Date.now()}`;

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "All songs" }).first().click();
  await page.getByRole("button", { name: "Add Song" }).click();
  await page.getByLabel("Name").fill(songName);
  await page.getByRole("dialog").getByRole("button", { name: "Add Song" }).click();
  await expect(page).toHaveURL(/\/songs\/e2e-song-\d+$/);
  await expect(page.getByText(songName, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Log practice" }).click();
  await page.getByLabel("How did it go?").fill(note);
  await page.getByRole("button", { name: "Save practice" }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
});
