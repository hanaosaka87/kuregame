'use client';

import { Suspense, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CHALLENGE_LABELS, EFFICIENCY_GRADE } from '@/lib/constants';
import { shareApp } from '@/lib/share';
import { resizeImage } from '@/lib/image';
import AppFooter from '@/components/AppFooter';
import ShareIcons from '@/components/ShareIcons';

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [inviteToast, setInviteToast] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const sessionId = params.get('sessionId') || '';
  const isNewBest = params.get('newBest') === '1' && !!sessionId;

  async function handleBestPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setPhotoError('');
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const { base64, mediaType } = await resizeImage(file);
      const res = await fetch(`/api/sessions/${sessionId}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoUploaded(true);
    } catch {
      setPhotoError('写真の保存に失敗しました。もう一度お試しください。');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleInviteFriends() {
    const result = await shareApp();
    if (result === 'copied') {
      setInviteToast('招待メッセージをコピーしました！');
      setTimeout(() => setInviteToast(''), 2500);
    }
  }
  const [activeTab, setActiveTab] = useState<'result' | 'share'>('result');

  const spent      = Number(params.get('spent') || 0);
  const retail     = Number(params.get('retail') || 0);
  const count      = Number(params.get('count') || 0);
  const rate       = Number(params.get('rate') || 0);
  const challenge  = params.get('challenge') || 'free';
  const nickname   = params.get('nickname') || '名無しハンター';
  const prefecture = params.get('prefecture') || '';
  const skipped    = params.get('skipped') === '1';
  const streakBonus = Number(params.get('streakBonus') || 0);
  const gachaBonus  = Number(params.get('gachaBonus') || 0);
  const baseRate    = Number(params.get('baseRate') || 0);

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
    `https://cranegame.hana.trickster.biz`,
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


  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 20px 100px' }}>
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
            {(streakBonus > 0 || gachaBonus > 0) && (
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--gold)' }}>
                {streakBonus > 0 && <div>🔥 連続ログインボーナス +{streakBonus}%</div>}
                {gachaBonus > 0 && <div>🎰 本日のガチャボーナス +{gachaBonus}%</div>}
                <div>（{baseRate}% → {rate}%）</div>
              </div>
            )}
          </div>

          {/* 自己ベスト達成時：カート内写真アップロード */}
          {isNewBest && (
            <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 20, border: '2px solid var(--gold)' }}>
              <p style={{ fontWeight: 900, fontSize: '0.95rem', marginBottom: 4, color: 'var(--gold)' }}>
                👑 自己ベスト更新おめでとう！
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                カート・かごに山盛りの獲得品を写真に残して、マイ戦績に飾りませんか？
              </p>

              {photoPreview && (
                <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '2px solid var(--card2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="最高ゲット写真プレビュー" style={{ width: '100%', display: 'block' }} />
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleBestPhotoChange}
              />

              {photoUploaded ? (
                <div style={{ textAlign: 'center', color: 'var(--green)', fontSize: '0.85rem', fontWeight: 700 }}>✅ 保存しました！マイ戦績に表示されます</div>
              ) : (
                <button
                  className="btn-primary"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoUploading ? '保存中...' : '📸 写真を選んで保存'}
                </button>
              )}
              {photoError && <p style={{ color: 'var(--accent)', fontSize: '0.78rem', marginTop: 8 }}>{photoError}</p>}
            </div>
          )}

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
          <ShareIcons text={shareText} />
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: -8, marginBottom: 16 }}>
            ※YouTube・TikTok・Instagramはテキストをコピーしてからアプリで投稿してください
          </p>

          {/* 友達招待 */}
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 20, border: '2px dashed var(--accent)' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>🤝 友達を誘って対戦しよう！</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
              友達・カップル・家族を誘って「対戦モード」で元取り率を競えます。
            </p>
            <button className="btn-primary" onClick={handleInviteFriends}>友達を誘う</button>
            {inviteToast && (
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--green)', marginTop: 8 }}>
                ✅ {inviteToast}
              </div>
            )}
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
