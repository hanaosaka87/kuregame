'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'ios_install_banner_dismissed';

/**
 * iOS Safariは`beforeinstallprompt`（Android/Chrome用のインストール促進イベント）に対応していないため、
 * 「共有→ホーム画面に追加」を手動で案内するバナー。既にホーム画面から起動済み（standalone）の場合は表示しない。
 */
export default function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !('MSStream' in window);
      const nav = window.navigator as Navigator & { standalone?: boolean };
      const isStandalone = nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
      if (isIOS && !isStandalone && !dismissed) setShow(true);
    } catch {
      // localStorage/matchMedia不可の環境では表示しない
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="ホーム画面に追加"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 9999,
        background: '#1f2937',
        color: '#fff',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>ホーム画面に追加できます</strong>
        <div style={{ opacity: 0.85, marginTop: 2 }}>
          共有ボタン<span aria-hidden="true"> ⬆️ </span>から「ホーム画面に追加」を選ぶと、アプリのように使えます
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="このバナーを閉じる"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          opacity: 0.6,
          fontSize: 18,
          cursor: 'pointer',
          flexShrink: 0,
          padding: 4,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
