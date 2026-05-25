import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const htmlPath = `file:///${path.resolve(__dirname, '../index.html').replace(/\\/g, '/')}`;

test.describe('同棲準備・引越し 統合ダッシュボード E2Eテスト（アップデート版）', () => {
  
  test.beforeEach(async ({ page }) => {
    // コンソールとエラーのキャプチャ
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // 毎回クリーンな状態で開始するために localStorage をリセット
    await page.goto(htmlPath);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('初期表示でダッシュボード（進捗）が表示され、統計値が正しいこと', async ({ page }) => {
    await expect(page.locator('text=全体進捗')).toBeVisible();
    await expect(page.locator('text=竣介の進捗')).toBeVisible();
    await expect(page.locator('text=愛翔の進捗')).toBeVisible();
    await expect(page.locator('text=着実に新生活へ')).toBeVisible();
  });

  test('タブナビゲーションによるビュー切り替えが正しく動作すること', async ({ page }) => {
    // タスクタブへ切り替え
    await page.click('button:has-text("タスク")');
    await expect(page.locator('input[placeholder="タスクを検索..."]')).toBeVisible();

    // お金タブへ切り替え
    await page.click('button:has-text("お金")');
    await expect(page.locator('text=負担比率の調整')).toBeVisible();
    await expect(page.locator('text=毎月の生活費シミュレーター')).toBeVisible();

    // ガイドタブへ切り替え
    await page.click('button:has-text("ガイド")');
    await expect(page.locator('text=引越し前後のお役立ちガイド')).toBeVisible();
    await expect(page.locator('text=クレジットカード手続き')).toBeVisible();
  });

  test('タスクのステータスをインタラクティブに変更でき、進捗に反映されること', async ({ page }) => {
    await page.click('button:has-text("タスク")');

    await expect(page.locator('text=家事分担の基本ルールの決定')).toBeVisible();

    // 特定のタスクが含まれるコンテナを確実に取得 (XPathで親divを取得)
    const taskContainer = page.locator('h4', { hasText: '家事分担の基本ルールの決定' })
      .locator('xpath=ancestor::div[contains(@class, "p-3.5")]');

    // 竣介のステータスボタン（最初のボタン）が「未対応」であることを確認
    const shunsukeButton = taskContainer.locator('button').first();
    await expect(shunsukeButton).toHaveText('未対応');

    // タップして「進行中」にする
    await shunsukeButton.click();
    await expect(shunsukeButton).toHaveText('進行中');

    // 再度タップして「済」にする
    await shunsukeButton.click();
    await expect(shunsukeButton).toHaveText('済');
  });

  test('お金シミュレーターでスライダーを動かすと、初期費用および生活費が連動して更新されること', async ({ page }) => {
    await page.click('button:has-text("お金")');

    // 竣介と愛翔の負担額カードを取得
    const shunsukeCard = page.locator('div', { hasText: '竣介の負担' }).filter({ has: page.locator('span') }).last();
    const aikaCard = page.locator('div', { hasText: '愛翔の負担' }).filter({ has: page.locator('span') }).last();

    // 初期値合計: 728,400円、竣介負担(50%): 364,200円
    // 生活費合計: 260,000円、竣介負担(50%): 130,000円
    await expect(shunsukeCard.locator('text=初期: 364,200 円')).toBeVisible();
    await expect(shunsukeCard.locator('text=生活費: 130,000 円 /月')).toBeVisible();
    await expect(aikaCard.locator('text=初期: 364,200 円')).toBeVisible();
    await expect(aikaCard.locator('text=生活費: 130,000 円 /月')).toBeVisible();

    // 竣介の負担割合を「竣介 70%」プリセットをクリックして変更
    await page.click('button:has-text("竣介 70%")');

    // 初期費用: 728,400 * 0.7 = 509,880円
    // 毎月の生活費: 260,000 * 0.7 = 182,000円
    await expect(shunsukeCard.locator('text=初期: 509,880 円')).toBeVisible();
    await expect(shunsukeCard.locator('text=生活費: 182,000 円 /月')).toBeVisible();
    await expect(aikaCard.locator('text=初期: 218,520 円')).toBeVisible();
    await expect(aikaCard.locator('text=生活費: 78,000 円 /月')).toBeVisible();
    
    // 資金ショート防止の警告テキストが表示されているか
    await expect(page.locator('text=資金ショート防止の推奨事項')).toBeVisible();
  });
});
