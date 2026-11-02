import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import GA4Loader from '@/components/GA4Loader';
import TikTokPixelLoader from '@/components/TikTokPixelLoader';
import IOSInstallBanner from '@/components/IOSInstallBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'クレゲー| クレーンゲーム戦績＆元取りランキング',
  description: 'クレーンゲームの戦績を記録して元取り率を競おう！都道府県別・全国ランキング。月間チャンピオンは全国大会へ！',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'クレゲー',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#ff3daf',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&family=Chakra+Petch:wght@600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <GA4Loader />
        <TikTokPixelLoader />
      </head>
      <body>
        <Header />
        <IOSInstallBanner />
        {children}
      </body>
    </html>
  );
}
