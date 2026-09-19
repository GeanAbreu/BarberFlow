import { expect, test } from '@playwright/test';

test('rejeita credenciais inválidas', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('invalido@example.com');
  await page.getByLabel('Senha').fill('senha-incorreta');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
});

test('administrador acessa agenda, operação e financeiro', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(process.env.SEED_ADMIN_EMAIL!);
  await page.getByLabel('Senha').fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.getByRole('heading', { name: /agenda diária/i })).toBeVisible();
  await page.getByRole('link', { name: /operação e caixa/i }).click();
  await expect(page.getByRole('heading', { name: /operação e caixa/i })).toBeVisible();
  await expect(page.getByText('SALDO OPERACIONAL')).toBeVisible();
  await page.getByRole('link', { name: /financeiro/i }).click();
  await expect(page.getByRole('heading', { name: /panorama financeiro/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /exportar csv/i })).toBeEnabled();
});
