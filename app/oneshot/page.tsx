'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CATEGORY_LABELS, type OneshotRecord, type Prize } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PREFECTURES, MACHINE_TYPE_OPTIONS } from '@/lib/constants';
import AppFooter from '@/components/AppFooter';

const ONESHOT_SPEND = 100;
const COMBO_WINDOW_MINUTES_LABEL = '20分'; // app/api/oneshot/route.ts の COMBO_WINDOW_MINUTES と一致させること

interface MyStats {
  streakDays: number;
  streakDaysBest: number;
  comboStreak: number;
  comboStreakBest: number;
  dayCount: number;
  dayBestCount: number;
  monthCount: number;
}
const EMPTY_STATS: MyStats = { streakDays: 0, streakDaysBest: 0, comboStreak: 0, comboStreakBest: 0, dayCount: 0, dayBestCount: 0, monthCount: 0 };

function resizeImage(file: File, maxWidth = 1280): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function effClass(rate: number) {
  if (rate >= 500) return 'eff-excellent';
  if (rate >= 200) return 'eff-good';
  if (rate >= 100) return 'eff-ok';
  return 'eff-bad';
}
function effEmoji(rate: number) {
  if (rate >= 1000) return '👑';
  if (rate >= 500) return '🔥';
  if (rate >= 200) return '✨';
  return '💥';
}
function rankClass(i: number) {
  if (i === 0) return 'rank gold';
  if (i === 1) return 'rank silver';
  if (i === 2) return 'rank bronze';
  return 'rank';
}

export default function OneshotPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myStats, setMyStats] = useState<MyStats>(EMPTY_STATS);
  const [records, setRecords] = useState<OneshotRecord[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ base64: string; mediaType: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  const [prizeName, setPrizeName] = useState('');
  const [category, setCategory] = useState<Prize['category']>('other');
  const [retailPrice, setRetailPrice] = useState('');
  const [storeName, setStoreName] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [machineType, setMachineType] = useState('フック設定');

  const [error, setError] = useState('');
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ rate: number; prizeName: string; comboStreak: number } | null>(null);

  const fetchRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const res = await fetch('/api/oneshot?type=ranking&limit=30');
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const fetchMyStats = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/oneshot?type=mystats&user_id=${userId}`);
      const data = await res.json();
      setMyStats(data.stats || EMPTY_STATS);
    } catch {
      setMyStats(EMPTY_STATS);
    }
  }, []);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);
  useEffect(() => {
    if (user) fetchMyStats(user.id);
    else setMyStats(EMPTY_STATS);
  }, [user, fetchMyStats]);
  useEffect(() => {
    if (profile?.prefecture) setPrefecture(profile.prefecture);
  }, [profile]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzeError('');
    setPhotoPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: resized.base64, mediaType: resized.mediaType }),
      });
      const data = await res.json();
      const item = (data.items || [])[0];
      if (item) {
        setPrizeName(item.name || '');
        setCategory((item.category || 'other') as Prize['category']);
        const defaultPrice = item.category === 'figure' ? 800 : 500;
        setRetailPrice(String(Math.max(1, Number(item.retail_price) || defaultPrice)));
      } else {
        setAnalyzeError('商品を認識できませんでした。景品名と定価を手動で入力してください。');
      }
    } catch {
      setAnalyzeError('AI解析に失敗しました。景品名と定価を手動で入力してください。');
    } finally {
      setAnalyzing(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetForm() {
    setShowForm(false);
    setPhotoPreview(null);
    setPhoto(null);
    setPrizeName('');
    setCategory('other');
    setRetailPrice('');
    setAnalyzeError('');
    setError('');
    setRequiresUpgrade(false);
    setLastResult(null);
  }

  async function submit() {
    if (!user) { setError('ログインが必要です'); return; }
    if (!prizeName || !retailPrice || Number(retailPrice) <= 0) { setError('景品名と定価を入力してください'); return; }
    setError('');
    setRequiresUpgrade(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/oneshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          nickname: profile?.nickname || '名無しハンター',
          prefecture: prefecture || null,
          store_name: storeName || null,
          machine_type: machineType || null,
          prize_name: prizeName,
          category,
          retail_price: Number(retailPrice),
          photo_base64: photo?.base64 || null,
          photo_media_type: photo?.mediaType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresUpgrade) setRequiresUpgrade(true);
        setError(data.error || '登録に失敗しました');
        setSubmitting(false);
        return;
      }
      setLastResult({ rate: data.record.efficiency_rate, prizeName: data.record.prize_name, comboStreak: data.stats?.comboStreak || 1 });
      if (data.stats) setMyStats(data.stats);
      setShowForm(false);
      setPhotoPreview(null);
      setPhoto(null);
      setPrizeName('');
      setCategory('other');
      setRetailPrice('');
      fetchRanking();
    } catch {
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 20px 100px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>💥 一撃ゲットチャレンジ</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 4 }}>
        <strong style={{ color: 'var(--gold)' }}>100円（1プレイ）だけ</strong>でゲットした景品を記録する専用チャレンジです。
      </p>
      <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 20, lineHeight: 1.6 }}>
        通常の元取り率ランキングとは別の<strong style={{ color: 'var(--text)' }}>専用ランキング</strong>に挑戦できます。立て続けに何回一撃ゲットできたか（本日の一撃連チャン）、1日の合計回数（本日の一撃合計）、何日連続で一撃ゲットできたか（連日一撃記録）、今月の合計回数（今月の一撃合計）も自動で記録されます。
      </p>

      {/* ===== 自分の記録 ===== */}
      {!authLoading && user ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>📊 あなたの記録</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StatTile label="⚡ 本日の一撃連チャン" value={`${myStats.comboStreak}連チャン`} sub={`ベスト ${myStats.comboStreakBest}連チャン`} />
            <StatTile label="🎯 本日の一撃合計" value={`${myStats.dayCount}回`} sub={`1日のベスト ${myStats.dayBestCount}回`} />
            <StatTile label="🔥 連日一撃記録" value={`${myStats.streakDays}日`} sub={`ベスト ${myStats.streakDaysBest}日`} />
            <StatTile label="📅 今月の一撃合計" value={`${myStats.monthCount}回`} sub="" />
          </div>
          <p style={{ fontSize: '.62rem', color: 'var(--muted2)', marginTop: 10, lineHeight: 1.5 }}>
            ⚡本日の一撃連チャンは「立て続けに」ゲットできた回数（前回から{COMBO_WINDOW_MINUTES_LABEL}以内に次も一撃ゲットすると継続）。🎯本日の一撃合計は、間に一撃ゲットできなかった回を挟んでも、その日にゲットできた総数です。
          </p>
        </div>
      ) : !authLoading && (
        <div className="guest" style={{ margin: '0 0 20px' }}>
          <div className="guest-title">🎯 一撃ゲットを記録しよう！</div>
          <p>ログインすると連日記録・連チャン記録が自動で蓄積されます。</p>
          <Link href="/auth"><button className="guest-btn">無料でログイン・登録</button></Link>
        </div>
      )}

      {lastResult && (
        <div style={{ background: 'rgba(255,215,0,.1)', border: '1px solid var(--gold)', borderRadius: 14, padding: 16, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>🎉 一撃ゲット登録完了！</div>
          <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: 6 }}>{lastResult.prizeName}</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gold)' }}>{lastResult.rate}%</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>元取り率（定価÷100円）</div>
          {lastResult.comboStreak > 1 && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>⚡ {lastResult.comboStreak}連チャン中！</div>
          )}
        </div>
      )}

      {/* ===== 登録フォーム ===== */}
      {!showForm ? (
        <button
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #ff9500 100%)', color: '#1a1200', marginBottom: 24 }}
          onClick={() => { setShowForm(true); setLastResult(null); }}
        >
          <b>💥 一撃ゲットを登録する</b>
          <small style={{ color: 'rgba(0,0,0,.6)' }}>景品の写真を撮るだけでAIが自動判定</small>
        </button>
      ) : (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 24, border: '2px dashed var(--gold)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, color: 'var(--gold)' }}>📸 ゲットした景品を撮影</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            100円（1プレイ）でゲットした景品だけを撮影してください。AIが景品名と定価を自動で読み取ります。
          </p>

          {photoPreview && (
            <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '2px solid var(--card2)', maxWidth: 220 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="ゲットした景品" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          {analyzing && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--gold)' }}>
              <div style={{ fontSize: '1.3rem' }}>🔍</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>AIが解析中...</div>
            </div>
          )}
          {analyzeError && !analyzing && (
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 12, padding: '8px 12px', background: 'rgba(255,61,175,0.1)', borderRadius: 8 }}>
              ⚠️ {analyzeError}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => { fileInputRef.current?.setAttribute('capture', 'environment'); fileInputRef.current?.click(); }}
              disabled={analyzing}
              style={{ background: analyzing ? 'var(--card2)' : 'linear-gradient(135deg, var(--gold) 0%, #ff9500 100%)', color: '#1a1200', border: 'none', borderRadius: 10, padding: '12px 8px', fontWeight: 700, fontSize: '0.88rem', cursor: analyzing ? 'not-allowed' : 'pointer' }}
            >
              📷 カメラで撮影
            </button>
            <button
              onClick={() => { fileInputRef.current?.removeAttribute('capture'); fileInputRef.current?.click(); }}
              disabled={analyzing}
              style={{ background: 'var(--card2)', color: 'var(--text)', border: '2px solid var(--gold)', borderRadius: 10, padding: '12px 8px', fontWeight: 700, fontSize: '0.88rem', cursor: analyzing ? 'not-allowed' : 'pointer' }}
            >
              🖼️ アルバムから
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <input type="text" placeholder="景品名" value={prizeName} onChange={e => setPrizeName(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select value={category} onChange={e => setCategory(e.target.value as Prize['category'])}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="number" placeholder="定価（円）" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} inputMode="numeric" />
            </div>
            <input type="text" placeholder="店舗名（任意）" value={storeName} onChange={e => setStoreName(e.target.value)} />
            <select value={machineType} onChange={e => setMachineType(e.target.value)}>
              <option value="">機種を選択しない</option>
              {MACHINE_TYPE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={prefecture} onChange={e => setPrefecture(e.target.value)}>
              <option value="">都道府県を選択（任意）</option>
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {retailPrice && Number(retailPrice) > 0 && (
            <div style={{ textAlign: 'center', marginBottom: 14, fontSize: '0.8rem', color: 'var(--muted)' }}>
              元取り率：<strong style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>{Math.round(Number(retailPrice) / ONESHOT_SPEND * 100 * 10) / 10}%</strong>
            </div>
          )}

          {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: requiresUpgrade ? 6 : 10 }}>{error}</p>}
          {requiresUpgrade && (
            <Link href="/premium" style={{ display: 'block', textAlign: 'center', marginBottom: 10, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),var(--purple))', color: '#fff', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
              ⭐ 会員登録・プランを見る →
            </Link>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn-primary" onClick={submit} disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
              {submitting ? '登録中...' : '登録する！'}
            </button>
            <button className="btn-secondary" onClick={resetForm}>キャンセル</button>
          </div>
        </div>
      )}

      {/* ===== 専用ランキング ===== */}
      <div className="sec-head">
        <h2>🏆 一撃ゲット専用ランキング</h2>
        {!rankingLoading && <span className="sec-count">{records.length} 件</span>}
      </div>
      <div style={{ padding: '0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rankingLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>💥</div>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>まだ記録がありません。<br />最初の一撃ゲットを記録しよう！</p>
          </div>
        ) : (
          records.map((r, i) => (
            <div key={r.id} className={rankClass(i)}>
              <div className="rank-badge">{i === 0 ? '👑' : i + 1}</div>
              <div className="rank-info">
                <div className="rank-name">
                  <strong>{r.nickname}</strong>
                  <span className="rank-chip">{r.prize_name}</span>
                </div>
                <div className="rank-detail">
                  定価¥{r.retail_price.toLocaleString()}（100円でゲット）{r.store_name ? ` · ${r.store_name}` : ''}{r.prefecture ? ` · ${r.prefecture}` : ''}
                </div>
              </div>
              <div className="rank-rate">
                <div className={`rate-val ${effClass(r.efficiency_rate || 0)}`}>{effEmoji(r.efficiency_rate || 0)} {r.efficiency_rate}%</div>
                <div className="rate-label">元取り率</div>
              </div>
            </div>
          ))
        )}
      </div>

      <AppFooter />
    </main>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: 'var(--card-dark)', border: '1px solid var(--line-soft)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: '.66rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '.62rem', color: 'var(--muted2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
