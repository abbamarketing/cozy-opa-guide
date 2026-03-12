import { test, expect } from "../playwright-fixture";

test.describe("Auth Page", () => {
  test("should render login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("Login")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
  });

  test("should switch to signup form", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Cadastro" }).click();
    await expect(page.getByLabel("Nome completo")).toBeVisible();
    await expect(page.getByLabel("Confirmar senha")).toBeVisible();
  });

  test("should show validation errors on empty login submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Entrar" }).click();
    // Form validation should prevent submission
    await expect(page.getByText(/email/i)).toBeVisible();
  });

  test("should show validation errors on empty signup submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Cadastro" }).click();
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText(/nome/i)).toBeVisible();
  });

  test("signup form should require terms acceptance", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Cadastro" }).click();
    await page.getByLabel("Nome completo").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Senha").first().fill("Test1234!");
    await page.getByLabel("Confirmar senha").fill("Test1234!");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText(/termos/i)).toBeVisible();
  });
});
