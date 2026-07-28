import { expect, test } from '@playwright/test';

// Core-workflow smoke test against the production build. Runs without a
// backend: it verifies routing, auth gating, honest data states and the
// unified studio shell — processing itself is covered by backend tests.

test('public landing renders with sign-in', async ({ page }) => {
  await page.goto('.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('release-ready');
  await expect(page.getByText('Sign in')).toBeVisible();
});

test('docs deep link works and shows honest statuses', async ({ page }) => {
  await page.goto('docs');
  await expect(page.locator('.docs-shell')).toBeVisible();
  await expect(page.getByText('statuses reflect what is actually implemented')).toBeVisible();
  await page.getByText('Analysis & processing').click();
  await expect(page.getByText('BPM and key detection').first()).toBeVisible();
  await expect(page.getByText('Planned').first()).toBeVisible();
});

test('app routes are auth-gated', async ({ page }) => {
  await page.goto('app');
  await expect(page).toHaveURL(/\/login/);
});

test('local sign-in reaches an honest empty dashboard', async ({ page }) => {
  await page.goto('login');
  await page.getByText('Local fallback').click();
  await page.getByPlaceholder('Your artist or producer name').fill('Smoke Tester');
  await page.getByText('Start local dashboard').click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('No projects yet').first()).toBeVisible();
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toContain('Midnight Prayer');
  expect(body).not.toContain('18.6 GB');
});

test('project creation opens the unified studio workspace', async ({ page }) => {
  await page.goto('login');
  await page.getByText('Local fallback').click();
  await page.getByPlaceholder('Your artist or producer name').fill('Smoke Tester');
  await page.getByText('Start local dashboard').click();
  await page.getByText('Create first project').click();
  await page.getByPlaceholder('Song title or session name').fill('Smoke Song');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/projects\/project_/);
  await expect(page.getByText('Step 1 — Import')).toBeVisible();
  await expect(page.getByText('Vocal + Beat').first()).toBeVisible();
  // Workspace survives refresh (SPA deep link)
  await page.reload();
  await expect(page.getByText('Step 1 — Import')).toBeVisible();
});

test('session restores after reload and demo mode is labelled', async ({ page }) => {
  await page.goto('login');
  await page.getByText('Local fallback').click();
  await page.getByText('Use demo artist account').click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('Demo data').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Demo data').first()).toBeVisible();
});
