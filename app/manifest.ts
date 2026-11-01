import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'クレゲー',
    short_name: 'クレゲー',
    description: 'クレーンゲームの戦績を記録して元取り率で全国のプレイヤーと競うアプリ。',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0018',
    theme_color: '#ff3daf',
    icons: [
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
