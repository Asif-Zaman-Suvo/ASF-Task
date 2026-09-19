import { expect, test } from "@playwright/test";

const EMAIL = "admin@asf.local";
const PASSWORD = "Password123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/requests/);
}

test("unauthenticated users are redirected from protected pages", async ({ page }) => {
  await page.goto("/requests");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated API requests return 401", async ({ request }) => {
  const response = await request.get("/api/requests");
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error.code).toBe("UNAUTHORIZED");
});

test("login, list, search URL, details, refresh, and updates", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: "Service requests" })).toBeVisible();
  await expect(page.locator("table").getByText("REQ-").first()).toBeVisible();
  await expect(page.getByText("Showing")).toBeVisible();

  await page.getByLabel("Search").fill("Laptop");
  await expect(page).toHaveURL(/search=Laptop/, { timeout: 10_000 });
  await page.reload();
  await expect(page.getByLabel("Search")).toHaveValue("Laptop");

  await page.getByLabel("Status").selectOption("PENDING");
  await expect(page).toHaveURL(/status=PENDING/);

  const firstLink = page.locator("table").getByRole("link").filter({ hasText: "Laptop issue" }).first();
  await firstLink.click();
  await expect(page).toHaveURL(/\/requests\/req_/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();

  const status = page.locator("#request-status");
  const current = await status.inputValue();
  const next = current === "PENDING" ? "IN_PROGRESS" : "PENDING";
  await status.selectOption(next);
  await expect(page.getByText("Status updated").first()).toBeVisible();
  await expect(status).toHaveValue(next);
  await expect(status).toBeEnabled();

  const assignee = page.locator("#request-assignee");
  const currentAssignee = await assignee.inputValue();
  const nextAssignee = await assignee.evaluate((el, current) => {
    const select = el as HTMLSelectElement;
    return Array.from(select.options)
      .map((option) => option.value)
      .find((value) => value !== current) ?? "";
  }, currentAssignee);
  await assignee.selectOption(nextAssignee);
  await expect(page.getByText("Assignee updated").first()).toBeVisible();
});

test("unknown request shows not found", async ({ page }) => {
  await login(page);
  await page.goto("/requests/does-not-exist");
  await expect(page.getByRole("heading", { name: "Request not found" })).toBeVisible();
});

test("failed status mutation rolls back the selector", async ({ page }) => {
  await login(page);
  await page.goto("/requests/req_00001");
  await expect(page.locator("#request-status")).toBeVisible();

  const original = await page.locator("#request-status").inputValue();

  await page.route("**/api/requests/*/status", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL", message: "Simulated failure" } }),
    });
  });

  const next = original === "CLOSED" ? "PENDING" : "CLOSED";
  await page.locator("#request-status").selectOption(next);
  await expect(page.locator('[role="alert"]').filter({ hasText: "Simulated failure" })).toBeVisible();
  await expect(page.locator("#request-status")).toHaveValue(original);
});

test("mobile viewport can open the dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await expect(page.getByRole("heading", { name: "Service requests" })).toBeVisible();
});
