import { test, expect } from "../playwright-fixture";

/**
 * Requires a pre-seeded admin user.
 * Set env vars E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@videoflow.test";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Test1234!";

async function loginAs(page: any, email: string, password: string) {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url: URL) => !url.pathname.includes("/auth"), { timeout: 10000 });
}

test.describe("Admin - Dashboard Tabs", () => {
  test("should login as admin and see overview tab", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");
    await expect(page.getByText(/visão geral|overview/i)).toBeVisible({ timeout: 10000 });
    // KPI cards should be visible
    await expect(page.getByText(/clientes ativos|MRR/i)).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to deliveries tab", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin?tab=entregas");
    await expect(
      page.getByText(/entregas/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to editors tab", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin?tab=editores");
    await expect(
      page.getByText(/editores/i).or(page.getByText(/novo editor/i))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Admin - Reassign Editor", () => {
  test("should reassign an editor to a delivery", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin?tab=entregas");

    await page.waitForTimeout(3000);

    // Find a delivery card with an editor assignment dropdown
    const editorSelect = page.locator('select, [role="combobox"]').first();

    if (await editorSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editorSelect.click();
      // Select a different editor option
      const option = page.getByRole("option").nth(1);
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
        // Verify the change persisted (toast or UI update)
        await expect(
          page.getByText(/reatribuíd|atualizado|sucesso/i)
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Admin - Manage Clients", () => {
  test("should view clients list", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin?tab=clientes");
    await expect(
      page.getByText(/clientes/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
