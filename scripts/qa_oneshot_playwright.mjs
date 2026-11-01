// 一撃ゲットチャレンジの本番動作確認：実際にブラウザでログイン→登録→結果確認までを行う。
// 実行: node scripts/qa_oneshot_playwright.mjs <email> <password>
'use strict';
import { chromium } from 'playwright';

const [, , EMAIL, PASSWORD] = process.argv;
if (!EMAIL || !PASSWORD) {
  console.error('使い方: node scripts/qa_oneshot_playwright.mjs <email> <password>');
  process.exit(1);
}

const BASE = 'https://cranegame.hana.trickster.biz';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  try {
    // ===== ログイン =====
    await page.goto(`${BASE}/auth`, { waitUntil: 'load' });
    await page.fill('input[placeholder="example@mail.com"]', EMAIL);
    await page.fill('input[placeholder="••••••••"]', PASSWORD);
    await page.click('button.btn-primary:has-text("ログイン")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scripts/qa_oneshot_0_after_login_click.png', fullPage: true });
    console.log('現在のURL:', page.url());
    const loginPageText = await page.textContent('body').catch(() => '');
    if (loginPageText.includes('⚠️')) {
      console.log('ログイン画面にエラーメッセージあり:', loginPageText.slice(loginPageText.indexOf('⚠️'), loginPageText.indexOf('⚠️') + 100));
    }
    if (!page.url().endsWith('/')) {
      await page.waitForURL(BASE + '/', { timeout: 15000 });
    }
    console.log('✅ ログイン成功、トップページへ遷移');

    // ===== /oneshot へ移動 =====
    await page.goto(`${BASE}/oneshot`, { waitUntil: 'load' });
    await page.screenshot({ path: 'scripts/qa_oneshot_1_before.png', fullPage: true });
    console.log('✅ /oneshot 表示、スクリーンショット保存: qa_oneshot_1_before.png');

    // ===== 登録フォームを開き、手動で景品を入力（写真なしで検証） =====
    await page.click('button:has-text("一撃ゲットを登録する")');
    await page.fill('input[placeholder="景品名"]', '【動作確認テスト】ぬいぐるみ');
    await page.fill('input[placeholder="定価（円）"]', '300');
    await page.screenshot({ path: 'scripts/qa_oneshot_2_form.png', fullPage: true });

    await page.click('button:has-text("登録する！")');
    await page.waitForSelector('text=一撃ゲット登録完了', { timeout: 15000 });
    await page.screenshot({ path: 'scripts/qa_oneshot_3_result.png', fullPage: true });
    console.log('✅ 登録完了カード表示、スクリーンショット保存: qa_oneshot_3_result.png');

    const bodyText = await page.textContent('body');
    const hasRate300 = bodyText.includes('300%');
    console.log(`元取り率300%表示: ${hasRate300 ? 'OK' : 'NG'}`);

    // ===== 記録タイル・ランキングの反映確認 =====
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scripts/qa_oneshot_4_stats.png', fullPage: true });
    const statsText = await page.textContent('body');
    console.log('--- あなたの記録付近のテキスト抜粋 ---');
    const idx = statsText.indexOf('あなたの記録');
    console.log(statsText.slice(idx, idx + 300));

    if (logs.length > 0) {
      console.log('--- ブラウザコンソールのエラー ---');
      logs.forEach(l => console.log(l));
    } else {
      console.log('✅ ブラウザコンソールエラーなし');
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('❌ 致命的エラー:', e); process.exit(1); });
