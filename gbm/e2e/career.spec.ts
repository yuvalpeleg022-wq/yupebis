import { expect, test, type Page } from '@playwright/test';

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
}

test('create a career, choose a club, play, save, close, reopen and continue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByTestId('manager-name').fill('E2E Coach');
  await page.getByTestId('roster-policy').selectOption('placeholders');
  await page.getByTestId('create-career').click();
  await expect(page.getByText('Choose your club')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('club-search').fill('Panathinaikos');
  await page.getByTestId('club-row').first().click();
  await page.getByTestId('take-job').click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Panathinaikos').first()).toBeVisible();

  // Play until the first game has been simulated.
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('advance-next').click();
    await expect(page.getByTestId('advance-next')).toBeEnabled({ timeout: 60_000 });
    if (await page.getByText(/^(Win|Loss) /).count()) break;
  }
  await page.getByRole('button', { name: 'Match Center' }).click();
  await expect(page.getByText('Box score')).toBeVisible();
  await expect(page.locator('table').first()).toContainText('Q1');
  const score = await page.locator('.text-3xl').first().innerText();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByTestId('save-now').click();
  const date = await page.locator('header .tabular').first().innerText();

  // Close the app completely and reopen it.
  await page.reload();
  await page.getByTestId('continue-career').first().click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('header .tabular').first()).toHaveText(date);
  await page.getByRole('button', { name: 'Match Center' }).click();
  await expect(page.locator('.text-3xl').first()).toHaveText(score);
  // Continue playing after the restart.
  await page.getByTestId('advance-next').click();
  await expect(page.getByTestId('advance-next')).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator('header .tabular').first()).not.toHaveText(date);
});

for (const width of [360, 390, 430, 768, 1280, 1920]) {
  test(`layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 });
    await page.goto('/');
    await noHorizontalOverflow(page);
    await page.getByTestId('manager-name').fill('Layout');
    await page.getByTestId('roster-policy').selectOption('placeholders');
    await page.getByTestId('create-career').click();
    await expect(page.getByText('Choose your club')).toBeVisible({ timeout: 60_000 });
    await noHorizontalOverflow(page);
    await page.getByTestId('club-row').first().click();
    await page.getByTestId('take-job').click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const screens = ['Squad', 'Tactics', 'Transfers', 'Competitions', 'Qualification', 'Competition Rules', 'Finances', 'Staff', 'Statistics', 'Data Sources', 'Settings'];
    for (const s of screens) {
      if (width < 1024) {
        const direct = page.locator('nav.fixed').getByRole('button', { name: s });
        if (await direct.count()) await direct.click();
        else { await page.getByTestId('more-menu').click(); await page.locator('div.fixed').getByRole('button', { name: s }).click(); }
      } else {
        await page.locator('aside').getByRole('button', { name: s }).click();
      }
      await page.waitForTimeout(150);
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `test-results/screens/${width}-${s.replace(/\s/g, '')}.png` });
    }
  });
}

test('real-only mode reports missing rosters instead of inventing players', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByTestId('manager-name').fill('Real Only');
  await page.getByTestId('create-career').click();
  await expect(page.getByText('Choose your club')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/cannot be simulated because real player rosters are missing/)).toBeVisible();
});

test('real players appear with provenance markers; unknown facts are not invented', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByTestId('manager-name').fill('Real Players');
  await page.getByTestId('roster-policy').selectOption('placeholders');
  await page.getByTestId('create-career').click();
  await expect(page.getByText('Choose your club')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('club-search').fill('Celtics');
  await page.getByTestId('club-row').first().click();
  await page.getByTestId('take-job').click();
  await page.locator('aside').getByRole('button', { name: 'Squad' }).click();
  await page.getByRole('button', { name: 'Jayson Tatum' }).click();
  await expect(page.getByRole('heading', { name: 'Jayson Tatum' })).toBeVisible();
  await expect(page.getByText('Real', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Provisional rating')).toBeVisible();
  await expect(page.getByText('height unknown')).toBeVisible();
  await expect(page.getByText('game estimate · not verified')).toBeVisible();
  await expect(page.getByText('(slot unverified)')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/real-player-profile.png' });
});
