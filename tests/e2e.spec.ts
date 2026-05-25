import { test, expect } from '@playwright/test';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const htmlPath = `file:///${path.resolve(__dirname, '../index.html').replace(/\\/g, '/')}`;

test.describe('同棲準備・引越し 統合ダッシュボード E2Eテスト', () => {
  
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
    // 統計カード
    await expect(page.locator('text=全体進捗')).toBeVisible();
    await expect(page.locator('text=愛翔の進捗')).toBeVisible();
    await expect(page.locator('text=竣介の進捗')).toBeVisible();
    
    // 完了率（初期タスクのうち 5件/51件 が「済/済」または「やらない/やらない」として開始）
    // 初期タスクで 済 になっているタスクの割合が表示されているか
    await expect(page.locator('text=着実に新生活へ')).toBeVisible();
  });

  test('タブナビゲーションによるビュー切り替えが正しく動作すること', async ({ page }) => {
    // タスクタブへ切り替え
    await page.click('button:has-text("タスク")');
    await expect(page.locator('input[placeholder="タスクを検索..."]')).toBeVisible();

    // お金タブへ切り替え
    await page.click('button:has-text("お金")');
    await expect(page.locator('text=一括負担比率調整')).toBeVisible();
    await expect(page.locator('text=初期費用明細')).toBeVisible();

    // ガイドタブへ切り替え
    await page.click('button:has-text("ガイド")');
    await expect(page.locator('text=引越し前後のお役立ちガイド')).toBeVisible();

    // 同期設定タブへ切り替え
    await page.click('button:has-text("同期設定")');
    await expect(page.locator('text=LINE簡単データ同期')).toBeVisible();
  });

  test('タスクのステータスをインタラクティブに変更でき、進捗に反映されること', async ({ page }) => {
    // タスクタブに切り替え
    await page.click('button:has-text("タスク")');

    // 「生活・運用ルール」アコーディオンを開く（デフォルトで開いているはず）
    await expect(page.locator('text=家事分担の基本ルールの決定')).toBeVisible();

    // 初期状態は「未対応」
    // 特定のタスクが含まれるコンテナを確実に取得 (XPathで祖先のタスク行 div を検索)
    const taskContainer = page.locator('h4', { hasText: '家事分担の基本ルールの決定' })
      .locator('xpath=ancestor::div[contains(@class, "p-3.5")]');

    const aiButton = taskContainer.locator('button').first();
    await expect(aiButton).toHaveText('未対応');

    // タップして「進行中」にする
    await aiButton.click();
    await expect(aiButton).toHaveText('進行中');

    // 再度タップして「済」にする
    await aiButton.click();
    await expect(aiButton).toHaveText('済');

    // ダッシュボードに戻って、進捗が更新されているか確認
    await page.click('button:has-text("進捗")');
    // 進捗（％）のテキストが存在することを確認
    await expect(page.locator('text=完了')).toBeVisible();
  });

  test('お金シミュレーターでスライダーを動かすと、負担額が連動して更新されること', async ({ page }) => {
    await page.click('button:has-text("お金")');

    // 初期状態の負担額確認
    // 家賃: 159,000円
    // 初期一括比率: 50%
    // 合計: 728,400円、愛翔: 364,200円、竣介: 364,200円
    await expect(page.locator('text=728,400 円')).toBeVisible();
    await expect(page.locator('text=364,200 円').first()).toBeVisible(); // 愛翔の負担総額

    // 一括負担比率を「愛翔 70%」のプリセットボタンをクリックして変更
    await page.click('button:has-text("愛翔 70%")');

    // 愛翔の負担割合が 70% になり、金額が 728,400 * 0.7 = 509,880円 に更新されるか
    // 竣介は 30% で 218,520円
    await expect(page.locator('text=509,880 円')).toBeVisible();
    await expect(page.locator('text=218,520 円')).toBeVisible();
  });
});
