declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
    };
  }
}

export function trackTikTokCompleteRegistration() {
  try {
    window.ttq?.track('CompleteRegistration');
  } catch {
    // Pixel未読み込み等は無視（計測失敗でユーザー操作をブロックしない）
  }
}
