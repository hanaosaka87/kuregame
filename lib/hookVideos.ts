// 攻略ガイドページ下部の「フック設定 関連動画」用。
// YouTube全体を「フック設定 クレーンゲーム」で検索し（自社チャンネルに限定しない）、
// 攻略動画を投稿しているYouTuberの動画を新着順で抽出する。
// Next.jsのfetchキャッシュ(revalidate)任せで自動的に週1回再取得される設計のため、
// 専用の収集スクリプトやスケジューラータスクは不要。

const SEARCH_QUERY = 'フック設定 クレーンゲーム';
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7; // 1週間
const MAX_RESULTS = 12;

export interface HookVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
}

export async function getHookSettingVideos(): Promise<HookVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', SEARCH_QUERY);
    url.searchParams.set('type', 'video');
    url.searchParams.set('order', 'date');
    url.searchParams.set('maxResults', String(MAX_RESULTS));
    url.searchParams.set('relevanceLanguage', 'ja');
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const json = await res.json();
    const items: YoutubeSearchItem[] = json.items || [];

    const videos: HookVideo[] = [];
    for (const item of items) {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;
      const channelTitle = item.snippet?.channelTitle;
      if (!videoId || !title || !publishedAt) continue;
      // 「フック」を含まない結果（クレーンゲーム全般のノイズ）は除外する
      if (!title.includes('フック')) continue;
      videos.push({ videoId, title, channelTitle: channelTitle || '', publishedAt, url: `https://www.youtube.com/watch?v=${videoId}` });
    }

    videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return videos;
  } catch {
    return [];
  }
}
