// クレゲーのiOSアプリ（Capacitor, server.url方式）からのアクセスかどうかを判定するヘルパー。
//
// Apple App Store審査ガイドライン3.1.1（アプリ内で使えるデジタル機能・サブスクリプションは
// Apple公式のIn-App Purchase経由でなければならず、Stripe等の外部決済をアプリ内に表示するのは禁止）
// に対応するため、iOSアプリ版では有料会員限定機能（チャレンジ記録等）を無料開放し、
// Stripeの購入導線も一切表示しない。capacitor.config.tsのios.appendUserAgentで
// User-Agentにマーカーを付与し、これをサーバー・クライアント双方で検出する。
export const IOS_APP_UA_MARKER = 'KuregameIOSApp';

export function isIOSAppRequest(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(IOS_APP_UA_MARKER);
}

export function isNativeIOSApp(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };
  if (w.Capacitor?.isNativePlatform?.() && w.Capacitor?.getPlatform?.() === 'ios') return true;
  return isIOSAppRequest(window.navigator?.userAgent);
}
