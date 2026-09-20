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

async function expectUnauthorized(response: import("@playwright/test").APIResponse) {
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error.code).toBe("UNAUTHORIZED");
}

test("unauthenticated users are redirected from protected pages", async ({ page }) => {
  await page.goto("/requests");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated API requests return 401", async ({ request }) => {
  const list = await request.get("/api/requests");
  await expectUnauthorized(list);

  const detail = await request.get("/api/requests/req_00001");
  await expectUnauthorized(detail);

  const status = await request.patch("/api/requests/req_00001/status", {
    data: { status: "PENDING" },
  });
  await expectUnauthorized(status);

  const assignee = await request.patch("/api/requests/req_00001/assignee", {
    data: { assigneeId: null },
  });
  await expectUnauthorized(assignee);

  const report = await request.get("/api/reports/assignees");
  await expectUnauthorized(report);
});

test("login, list, search URL, details, refresh, and updates", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: "Service requests" })).toBeVisible();
  await expect(page.locator("table").getByText("REQ-").first()).toBeVisible();
  await expect(page.getByText("Showing")).toBeVisible();

  await page.locator("#search").fill("Laptop");
  await expect(page).toHaveURL(/search=Laptop/, { timeout: 10_000 });
  await page.reload();
  await expect(page.locator("#search")).toHaveValue("Laptop");

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

test("filter, sort, and pagination state is preserved in the URL after refresh", async ({ page }) => {
  await login(page);

  await page.locator("#search").fill("Laptop");
  await expect(page).toHaveURL(/search=Laptop/, { timeout: 10_000 });

  await page.locator("#status").selectOption("PENDING");
  await page.locator("#priority").selectOption("HIGH");
  await page.locator("#sort").selectOption("priority");
  await page.locator("#order").selectOption("asc");

  await expect(page).toHaveURL(/status=PENDING/);
  await expect(page).toHaveURL(/priority=HIGH/);
  await expect(page).toHaveURL(/sort=priority/);
  await expect(page).toHaveURL(/order=asc/);

  const pagination = page.getByRole("navigation", { name: "Pagination" });
  await expect(pagination).toBeVisible({ timeout: 10_000 });
  await pagination.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);

  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.locator("#search")).toHaveValue("Laptop");
  await expect(page.locator("#status")).toHaveValue("PENDING");
  await expect(page.locator("#priority")).toHaveValue("HIGH");
  await expect(page.locator("#sort")).toHaveValue("priority");
  await expect(page.locator("#order")).toHaveValue("asc");
});

test("category and assignee filters stay in the URL after refresh", async ({ page }) => {
  await login(page);

  await page.locator("#categoryId").selectOption("cat_it");
  await page.locator("#assigneeId").selectOption("unassigned");
  await expect(page).toHaveURL(/categoryId=cat_it/);
  await expect(page).toHaveURL(/assigneeId=unassigned/);

  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.locator("#categoryId")).toHaveValue("cat_it");
  await expect(page.locator("#assigneeId")).toHaveValue("unassigned");
});

test("out-of-range page redirects to the last page", async ({ page }) => {
  await login(page);
  await page.goto("/requests?page=9999");
  await expect(page).not.toHaveURL(/page=9999/);
  await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();
  const label = page.getByText(/Page \d+ of \d+/);
  await expect(label).toBeVisible();
  const text = await label.textContent();
  const match = text?.match(/Page (\d+) of (\d+)/);
  expect(match?.[1]).toBe(match?.[2]);
});

test("unknown request shows not found", async ({ page }) => {
  await login(page);
  await page.goto("/requests/does-not-exist");
  await expect(page.getByRole("heading", { name: "Request not found" })).toBeVisible();
});

test("logout returns to login and blocks protected pages", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Service requests" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/requests");
  await expect(page).toHaveURL(/\/login/);
});

test("conflicted status mutation rolls back the selector", async ({ page }) => {
  await login(page);
  await page.goto("/requests/req_00001");
  await expect(page.locator("#request-status")).toBeVisible();

  const original = await page.locator("#request-status").inputValue();

  await page.route("**/api/requests/*/status", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "CONFLICT", message: "Request was updated by someone else" },
      }),
    });
  });

  const next = original === "CLOSED" ? "PENDING" : "CLOSED";
  await page.locator("#request-status").selectOption(next);
  await expect(
    page.locator('[role="alert"]').filter({ hasText: "Request was updated by someone else" }),
  ).toBeVisible();
  await expect(page.locator("#request-status")).toHaveValue(original);
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

test("failed assignee mutation rolls back and blocks duplicate submits", async ({ page }) => {
  await login(page);
  await page.goto("/requests/req_00001");

  const assignee = page.locator("#request-assignee");
  await expect(assignee).toBeVisible();
  const original = await assignee.inputValue();
  const next = await assignee.evaluate((el, current) => {
    const select = el as HTMLSelectElement;
    return Array.from(select.options)
      .map((option) => option.value)
      .find((value) => value !== current) ?? "";
  }, original);

  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route("**/api/requests/*/assignee", async (route) => {
    await gate;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL", message: "Simulated failure" } }),
    });
  });

  await assignee.selectOption(next);
  await expect(assignee).toBeDisabled();
  await expect(page.locator("#request-status")).toBeDisabled();
  release();

  await expect(page.locator('[role="alert"]').filter({ hasText: "Simulated failure" })).toBeVisible();
  await expect(assignee).toHaveValue(original);
  await expect(assignee).toBeEnabled();
});

test("mobile viewport can open the dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await expect(page.getByRole("heading", { name: "Service requests" })).toBeVisible();
});
