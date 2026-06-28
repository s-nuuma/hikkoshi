import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const htmlPath = `file:///${path.resolve(__dirname, '../index.html').replace(/\\/g, '/')}`;

test('verify added address', async ({ page }) => {
  await page.goto(htmlPath);

  // Navigate to 'property' tab
  await page.click('button:has-text("新居")');

  // Check if the address exists
  const addressLocator = page.locator('text=〒223-0052 神奈川県横浜市港北区綱島東１丁目１２−２３ ピーチウェアＣ 201号室');
  await expect(addressLocator).toBeVisible();

  // Check if the map link is correct
  const linkLocator = page.locator('a[href="https://maps.app.goo.gl/EoTaAjD97rvN6i7B6?g_st=ac"]');
  await expect(linkLocator).toBeVisible();

  // Wait a bit to ensure it is fully rendered, then screenshot
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(__dirname, '../test-results/verification.png') });
});
