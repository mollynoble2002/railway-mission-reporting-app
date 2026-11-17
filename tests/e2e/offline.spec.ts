import { expect, test, type Page } from '@playwright/test';

/**
 * The core Phase 1 promise, tested in a real browser with the real service worker:
 * install once online, go offline, reload, create and queue a report, reload again,
 * reconnect, and only then see it confirmed as submitted.
 */

async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // First visit installs the worker; a reload lets it control the page for offline loads.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 20_000 });
}

test.describe('offline-first behaviour', () => {
  test('a report created offline is saved, survives reload, and is only submitted after reconnecting', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.getByText('SYNTHETIC DATA ONLY')).toBeVisible();
    await waitForServiceWorker(page);

    // Go offline (browser-level), then reload: the app shell must load from the service worker cache.
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'OFFLINE' })).toBeVisible();

    // Create a welfare interaction (placeholder form) while offline.
    await page.getByRole('link', { name: /Record a welfare interaction/ }).click();
    await expect(page.getByRole('heading', { name: 'Support Interaction Form' })).toBeVisible();
    await page.getByLabel(/Date of interaction/).fill('2026-11-14');
    await page.getByLabel(/Location \(free text\)/).fill('SYNTHETIC: Offline Test Platform');
    await page.getByLabel(/Type of interaction/).selectOption('type_a');
    await page.getByLabel(/Support provided/).fill('SYNTHETIC: queued while offline');

    await page.getByRole('button', { name: 'Complete and queue for sending' }).click();

    // Queued, not submitted.
    await expect(page.getByRole('heading', { name: 'Drafts and waiting to send' })).toBeVisible();
    await expect(page.getByText('Waiting to send').first()).toBeVisible();
    await expect(page.getByText('Queued. It will send automatically')).toBeVisible();

    // Reload while still offline: the queued report must still be there.
    await page.reload();
    await expect(page.getByText('Waiting to send').first()).toBeVisible();

    // Reconnect. The engine sends automatically on the browser's online event.
    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: /ONLINE|SYNCING/ }).first()).toBeVisible({
      timeout: 20_000,
    });

    // Only now is it submitted, with a receipt.
    await page.getByRole('link', { name: 'Submitted' }).first().click();
    await expect(page.getByRole('heading', { name: 'Submitted reports' })).toBeVisible();
    await expect(page.getByText(/Ref SIM-RCPT-/).first()).toBeVisible({ timeout: 30_000 });
  });

  test('simulated server failure keeps the report queued and shows SYNC FAILED, not submitted', async ({ page }) => {
    await page.goto('/settings');
    await waitForServiceWorker(page);

    await page.getByLabel('Server failing').check();

    await page.goto('/');
    await page.getByRole('link', { name: /Record a welfare interaction/ }).click();
    await page.getByLabel(/Date of interaction/).fill('2026-11-14');
    await page.getByLabel(/Location \(free text\)/).fill('SYNTHETIC: Failing Server Test');
    await page.getByLabel(/Type of interaction/).selectOption('type_b');
    await page.getByRole('button', { name: 'Complete and queue for sending' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'SYNC FAILED' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Not sent yet. Will retry').first()).toBeVisible();

    // Restore a healthy server so later tests are not affected.
    await page.goto('/settings');
    await page.getByLabel('Online', { exact: true }).check();
  });

  test('a required-field error is shown and the report is not queued', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Record a welfare interaction/ }).click();
    await page.getByRole('button', { name: 'Complete and queue for sending' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByText('Required').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Drafts and waiting to send' })).toHaveCount(0);
  });
});
