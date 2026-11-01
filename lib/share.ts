export const APP_URL = 'https://cranegame.hana.trickster.biz';
export const APP_SHARE_TEXT = '🕹️クレーンゲームの「元取り率」で競う無料アプリ「クレゲー」\n友達・家族と対戦モードでも勝負できるよ！';

// Web Share APIがあれば共有シートを開き、無ければクリップボードにコピーする
export async function shareApp(): Promise<'shared' | 'copied' | 'failed'> {
  const shareData = { title: 'クレゲー', text: APP_SHARE_TEXT, url: APP_URL };
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch {
      // ユーザーがキャンセルした場合等はコピーにフォールバックしない（何もしない）
      return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(`${APP_SHARE_TEXT}\n${APP_URL}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// 画像を実ファイルとしてOSの共有シートに渡す（LINE/Instagram/Xアプリ等に直接送れる）。
// 非対応環境ではキャプション＋画像URLをクリップボードにコピーする
export async function shareImage(imageUrl: string, caption: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const file = new File([blob], 'kuregame.jpg', { type: blob.type || 'image/jpeg' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'クレゲー', text: caption });
      return 'shared';
    }
  } catch {
    // ユーザーキャンセル・画像取得失敗等はコピーにフォールバック
  }
  try {
    await navigator.clipboard.writeText(`${caption}\n${imageUrl}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
