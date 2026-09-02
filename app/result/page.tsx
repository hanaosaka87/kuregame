'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CHALLENGE_LABELS, EFFICIENCY_GRADE } from '@/lib/constants';
import AppFooter from '@/components/AppFooter';

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'result' | 'share'>('result');

  const spent      = Number(params.get('spent') || 0);
  const retail     = Number(params.get('retail') || 0);
  const count      = Number(params.get('count') || 0);
  const rate       = Number(params.get('rate') || 0);
  const challenge  = params.get('challenge') || 'free';
  const nickname   = params.get('nickname') || '名無しハンター';
  const prefecture = params.get('prefecture') || '';
  const skipped    = params.get('skipped') === '1';

  const grade  = EFFICIENCY_GRADE(rate);
  const profit = retail - spent;
  const challengeLabel = CHALLENGE_LABELS[challenge] ?? 'フリーモード';

  const shareText = [
    `🕹️ クレゲー戦績報告`,
    `${grade.emoji} 元取り率 ${rate}%（${grade.label}）`,
    `投入 ¥${spent.toLocaleString()} → 定価 ¥${retail.toLocaleString()}分（${count}個）`,
    challengeLabel !== 'フリーモード' ? `📌 ${challengeLabel}` : '',
    prefecture ? `📍 ${prefecture}` : '',
    ``,
    `#クレゲ #クレーンゲーム #ゲーセン ${prefecture ? `#${prefecture.replace('県','').replace('都','').replace('府','')}` : ''}`,
    `https://kuregame.vercel.app`,
  ].filter(Boolean).join('\n');

  async function copyText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 100px' }}>
      {/* グレード */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 6 }}>{grade.emoji}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: grade.color }}>{grade.label}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 4 }}>{nickname}さんの戦績</div>
      </div>

      {/* タブ切替 */}
      <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {(['result', 'share'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem',
              background: activeTab === t ? 'linear-gradient(135deg,var(--accent),#aa00ff)' : 'transparent',
              color: activeTab === t ? 'white' : 'var(--muted)',
            }}>
            {t === 'result' ? '📊 結果' : '📤 シェア'}
          </button>
        ))}
      </div>

      {/* ===== 結果タブ ===== */}
      {activeTab === 'result' && (
        <>
          {/* 元取り率 */}
          <div className="rate-display" style={{ borderRadius: 20, padding: '24px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 4 }}>元取り率</div>
            <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1, color: rate >= 100 ? 'var(--gold)' : 'var(--cyan)', textShadow: rate >= 100 ? '0 0 20px var(--gold)' : 'none' }}>
              {rate}%
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {challenge !== 'free' && (
                <span style={{ background: 'rgba(255,61,175,0.2)', padding: '3px 10px', borderRadius: 20, color: 'var(--accent)', fontSize: '0.78rem' }}>
                  {challengeLabel}
                </span>
              )}
              {prefecture && (
                <span style={{ background: 'rgba(0,229,255,0.15)', padding: '3px 10px', borderRadius: 20, color: 'var(--cyan)', fontSize: '0.78rem' }}>
                  📍 {prefecture}
                </span>
              )}
            </div>
          </div>

          {/* 内訳 */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            {[
              { label: '💰 投入金額', value: `¥${spent.toLocaleString()}`, color: 'var(--text)' },
              { label: '🎁 定価総額', value: `¥${retail.toLocaleString()}`, color: 'var(--green)' },
              { label: '📦 獲得数',   value: `${count}個`,                 color: 'var(--text)' },
              { label: profit >= 0 ? '🎉 定価比 得した額' : '😢 定価比 損した額',
                value: `${profit >= 0 ? '+' : ''}¥${profit.toLocaleString()}`,
                color: profit >= 0 ? 'var(--gold)' : 'var(--accent)' },
              ...(count > 0 ? [{ label: '🎯 1個あたりコスト', value: `¥${Math.round(spent/count).toLocaleString()}`, color: 'var(--text)' }] : []),
            ].map((row, i, arr) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
                {i < arr.length - 1 && <div style={{ borderBottom: '1px solid var(--card2)' }} />}
              </div>
            ))}
          </div>

          {skipped && (
            <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem', color: 'var(--muted)' }}>
              📊 ランキング登録はSupabase設定後に有効になります
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-primary" onClick={() => setActiveTab('share')}>📤 シェアする</button>
            <Link href="/challenge"><button className="btn-secondary">🎯 もう一回チャレンジ！</button></Link>
            <Link href="/ranking"><button className="btn-secondary">🏆 ランキングを見る</button></Link>
          </div>
        </>
      )}

      {/* ===== シェアタブ ===== */}
      {activeTab === 'share' && (
        <>
          {/* シェアテキスト */}
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 16, position: 'relative' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>📝 シェア用テキスト</div>
            <pre style={{ fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {shareText}
            </pre>
          </div>

          {/* 一括コピーボタン */}
          <button
            onClick={copyText}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, cursor: 'pointer',
              background: copied ? 'rgba(0,230,118,0.2)' : 'var(--card2)',
              color: copied ? 'var(--green)' : 'var(--text)',
              fontWeight: 700, fontSize: '1rem', marginBottom: 20,
              border: `2px solid ${copied ? 'var(--green)' : 'var(--card2)'}`,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✅ コピーしました！' : '📋 テキストを一括コピー'}
          </button>

          {/* SNS投稿ボタン */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>
              投稿先を選んでください（TikTok・Instagram はテキストをコピーしてからアプリで投稿）
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* X (Twitter) */}
              <a href={xUrl} target="_blank" rel="noopener noreferrer">
                <button style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #1d9bf0',
                  background: 'rgba(29,155,240,0.1)', color: '#1d9bf0', fontWeight: 700, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.735-8.845L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                  X (Twitter) に投稿
                </button>
              </a>

              {/* LINE */}
              <a href={lineUrl} target="_blank" rel="noopener noreferrer">
                <button style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #06c755',
                  background: 'rgba(6,199,85,0.1)', color: '#06c755', fontWeight: 700, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  💬 LINEでシェア
                </button>
              </a>

              {/* TikTok */}
              <button onClick={async () => { await copyText(); window.open('https://www.tiktok.com', '_blank'); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #010101',
                  background: 'rgba(1,1,1,0.3)', color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <span style={{ fontSize: '1.1rem' }}>🎵</span> TikTok（テキストをコピーしてから投稿）
              </button>

              {/* Instagram */}
              <button onClick={async () => { await copyText(); window.open('https://www.instagram.com', '_blank'); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #e1306c',
                  background: 'rgba(225,48,108,0.1)', color: '#e1306c', fontWeight: 700, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <span style={{ fontSize: '1.1rem' }}>📸</span> Instagram（テキストをコピーしてから投稿）
              </button>
            </div>
          </div>

          <Link href="/challenge"><button className="btn-secondary">🎯 もう一回チャレンジ！</button></Link>
        </>
      )}
      <AppFooter />
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>}>
      <ResultContent />
    </Suspense>
  );
}
