import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'biz.trickster.hana.cranegame.app',
  appName: 'クレゲー',
  webDir: 'public',
  // Next.jsのAPI Routes・Supabase認証をそのまま使うため、静的バンドルではなく
  // 本番URLをそのままネイティブWebViewで開くリモート方式を採用（Android TWA方式と同じ発想）
  server: {
    url: 'https://cranegame.hana.trickster.biz',
    cleartext: false,
  },
  ios: {
    // コンテンツがステータスバー（時計・電波アイコン等）の下に隠れる問題の対策。
    // 常にセーフエリア分の余白を確保してWebViewを配置する
    contentInset: 'always',
    // サーバー側でiOSアプリからのリクエストを判別するためのUser-Agentマーカー
    // （Apple審査対応：有料会員限定機能の無料開放・Stripe購入導線の非表示に使用。lib/iosApp.ts参照）
    appendUserAgent: 'KuregameIOSApp',
  },
};

export default config;
