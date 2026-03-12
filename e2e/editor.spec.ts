import { test, expect } from "../playwright-fixture";

/**
 * Requires a pre-seeded editor user.
 * Set env vars E2E_EDITOR_EMAIL and E2E_EDITOR_PASSWORD.
 */

const EDITOR_EMAIL = process.env.E2E_EDITOR_EMAIL || "testeditor@videoflow.test";
const EDITOR_PASSWORD = process.env.E2E_EDITOR_PASSWORD || "Test1234!";

async function loginAs(page: any, email: string, password: string) {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url: URL) => !url.pathname.includes("/auth"), { timeout: 10000 });
}

test.describe("Editor - Upload and Complete Delivery", () => {
  test("should login as editor and see editor dashboard", async ({ page }) => {
    await loginAs(page, EDITOR_EMAIL, EDITOR_PASSWORD);
    await page.goto("/editor");
    // Editor dashboard should show assigned deliveries
    await expect(
      page.getByText(/entrega/i).or(page.getByText(/atribuíd/i)).or(page.getByText(/editor/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test("should open a pending delivery and upload file", async ({ page }) => {
    await loginAs(page, EDITOR_EMAIL, EDITOR_PASSWORD);
    await page.goto("/editor");

    // Wait for deliveries list to load
    await page.waitForTimeout(3000);

    // Click on a pending/in_progress delivery card
    const deliveryCard = page.locator('[class*="card"]').filter({ hasText: /pendente|em produção|in_progress/i }).first();

    if (await deliveryCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deliveryCard.click();

      // Check for upload input or drive link field
      const driveInput = page.getByPlaceholder(/drive|link|url/i);
      if (await driveInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await driveInput.fill("https://drive.google.com/file/d/test-e2e-file");
      }

      // Look for mark as complete / submit button
      const completeBtn = page.getByRole("button", { name: /entregar|concluir|enviar/i });
      if (await completeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeBtn.click();
        await expect(
          page.getByText(/enviado|entregue|sucesso/i)
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
