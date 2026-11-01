'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';
import { shareApp } from '@/lib/share';

const PATTERNS = [
  {
    key: 'pattern1',
    label: 'パターン1',
    bg: '/flyer-pattern1-bg.jpg',
    bgPosition: 'center 55%',
  },
  {
    key: 'pattern2',
    label: 'パターン2',
    bg: '/flyer-pattern2-bg.jpg',
    bgPosition: 'center 32%',
  },
];

export default function FlyerPage() {
  const [shareToast, setShareToast] = useState('');

  async function handleShareApp() {
    const result = await shareApp();
    if (result === 'copied') {
      setShareToast('リンクをコピーしました！');
      setTimeout(() => setShareToast(''), 2500);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <Link href="/" style={{ color: 'var(--muted)', fontSize: '.82rem', display: 'inline-block', marginBottom: 24 }}>← トップへ戻る</Link>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: 8 }}>📣 店頭配布用フライヤー</h1>
      <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: 28, lineHeight: 1.7 }}>
        ゲームセンター等で配布しているクレゲーの紹介フライヤーです。2種類のデザインを掲載しています。気に入った方は下のボタンから友達にも教えてあげてください。
      </p>

      <button className="btn-share" style={{ width: '100%', marginBottom: 8 }} onClick={handleShareApp}>
        🤝 このアプリを友達に教える
      </button>
      {shareToast && (
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--green)', marginBottom: 8 }}>
          ✅ {shareToast}
        </div>
      )}

      {PATTERNS.map(p => (
        <section key={p.key} style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: '.92rem', fontWeight: 900, color: 'var(--cyan)', marginBottom: 10 }}>{p.label}</h2>

          <div style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
            {/* ===== 表面 ===== */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '141%', background: '#0e0620' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: '100%', aspectRatio: '3 / 2', flex: '0 0 auto', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.bg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: p.bgPosition, display: 'block' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%', background: 'linear-gradient(180deg, rgba(14,6,32,0) 0%, #0e0620 100%)' }} />
                </div>
                <div style={{ flex: '1 1 auto', minHeight: 0, boxSizing: 'border-box', padding: '10px 7% 5%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', letterSpacing: '.15em', color: '#FBBF24', fontWeight: 700 }}>元取り率で全国制覇</div>
                  <div style={{ fontWeight: 800, fontSize: '2.1rem', lineHeight: 1, color: '#fff', marginTop: 4, textShadow: '0 0 24px rgba(255,61,154,.65), 0 0 4px rgba(255,255,255,.6)' }}>クレゲー</div>
                  <div style={{ fontSize: '.72rem', color: '#e9d5ff', marginTop: 8, lineHeight: 1.5 }}>
                    友達・カップル・家族と、今ここで腕試し！<br />写真を撮るだけでAIが自動判定
                  </div>
                  <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: '22%', aspectRatio: '1 / 1', background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5%', boxSizing: 'border-box' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/flyer-qr.png" alt="ダウンロードQRコード" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#fff' }}>今すぐ無料ダウンロード</div>
                    <div style={{ fontSize: '.62rem', color: '#e9d5ff' }}>cranegame.hana.trickster.biz</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '.68rem', color: 'var(--muted2)', marginTop: 6, textAlign: 'center' }}>{p.label}・表面</p>
        </section>
      ))}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: '.92rem', fontWeight: 900, color: 'var(--cyan)', marginBottom: 10 }}>裏面（両パターン共通）</h2>
        <div style={{ background: 'linear-gradient(160deg,#3a1150 0%,#17092c 45%,#0e0620 100%)', borderRadius: 16, border: '1px solid var(--line)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>クレゲー</span>
            <span style={{ marginLeft: 'auto', fontSize: '.6rem', color: '#e9d5ff', background: 'rgba(236,29,150,.18)', border: '1px solid rgba(236,29,150,.5)', padding: '3px 8px', borderRadius: 20 }}>全国ランキング</span>
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.4 }}>
              その景品、<span style={{ color: '#FF3D9A' }}>いくらで</span>獲った？
            </div>
            <div style={{ fontSize: '.72rem', color: '#c9b8e6', marginTop: 4, lineHeight: 1.6 }}>
              友達・カップル・家族と、今ここで腕試し！<br />投入金額と獲得景品の定価から「元取り率」を算出。
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '📸', title: '写真を撮るだけでAI自動判定', desc: '商品名・定価をAIが自動で読み取り' },
              { icon: '🏆', title: '元取り率で全国ランキング対決', desc: '全国・都道府県別・月間で競える' },
              { icon: '👑', title: '月間チャンピオン制度', desc: '都道府県1位に全国大会出場チケット' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ width: 28, height: 28, flex: '0 0 auto', borderRadius: 8, background: 'linear-gradient(135deg,#FF3D9A,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>{f.icon}</div>
                <div style={{ fontSize: '.78rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
                  {f.title}
                  <div style={{ fontWeight: 400, color: '#c9b8e6', fontSize: '.68rem', marginTop: 1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#fff' }}>フリーモード・対戦モード・団体戦モードも搭載</div>
              <div style={{ fontSize: '.66rem', color: '#c9b8e6', marginTop: 2, lineHeight: 1.6 }}>
                金額上限なしで遊べる<br />友達と元取り率を競う<br />1,000円〜1万円の金額チャレンジも
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, rgba(255,61,154,.16), rgba(124,58,237,.16))', border: '1px solid rgba(255,61,154,.4)', borderRadius: 12, padding: '9px 10px' }}>
            <div style={{ flex: '0 0 auto', width: 46, height: 46, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, boxSizing: 'border-box' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flyer-qr.png" alt="ダウンロードQRコード" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '.78rem', fontWeight: 800, color: '#fff' }}>無料でダウンロード</div>
              <div style={{ fontSize: '.62rem', color: '#e9d5ff' }}>cranegame.hana.trickster.biz</div>
            </div>
          </div>
        </div>
      </section>

      <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 28, lineHeight: 1.7 }}>
        フライヤーの印刷データ（表裏・A6サイズ）については社内担当までお問い合わせください。
      </p>

      <AppFooter />
    </main>
  );
}
