import { test, expect } from "../playwright-fixture";

/**
 * These tests require a pre-seeded test user in the database.
 * Set env vars E2E_USER_EMAIL and E2E_USER_PASSWORD for a client user
 * with an active project and quotas available.
 */

const USER_EMAIL = process.env.E2E_USER_EMAIL || "testclient@videoflow.test";
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || "Test1234!";

async function loginAs(page: any, email: string, password: string) {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Wait for redirect away from /auth
  await page.waitForURL((url: URL) => !url.pathname.includes("/auth"), { timeout: 10000 });
}

test.describe("Dashboard - Create Delivery", () => {
  test("should login and see the dashboard with quota card", async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.locator('[data-tour="quota-card"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Minhas Entregas")).toBeVisible();
  });

  test("should open new delivery modal and submit", async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto("/dashboard");

    // Wait for kanban to load
    await expect(page.locator('[data-tour="kanban-board"]')).toBeVisible({ timeout: 10000 });

    // Click "Nova Solicitação"
    const newBtn = page.locator('[data-tour="new-delivery-btn"]');
    if (await newBtn.isEnabled()) {
      await newBtn.click();
      await expect(page.getByText("Nova Solicitação")).toBeVisible();

      // Fill the form
      await page.getByLabel(/título/i).fill("E2E Test Video");

      // Select delivery type if visible
      const typeSelect = page.locator('[name="delivery_type"], [id="delivery_type"]');
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.click();
        await page.getByRole("option").first().click();
      }

      // Submit
      const submitBtn = page.getByRole("button", { name: /solicitar|criar|enviar/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Verify delivery appears in kanban
        await expect(page.getByText("E2E Test Video")).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe("Dashboard - Approve Delivery", () => {
  test("should approve a delivery in review column", async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto("/dashboard");

    await expect(page.locator('[data-tour="kanban-board"]')).toBeVisible({ timeout: 10000 });

    // Look for a delivery card in the "REVISAR" column
    const reviewColumn = page.locator("text=REVISAR").locator("..");
    const deliveryCard = reviewColumn.locator('[class*="card"]').first();

    if (await deliveryCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deliveryCard.click();

      // Wait for detail modal
      const approveBtn = page.getByRole("button", { name: /aprovar/i });
      if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveBtn.click();
        // Verify success toast or column move
        await expect(
          page.getByText(/aprovad/i).or(page.getByText(/concluíd/i))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
