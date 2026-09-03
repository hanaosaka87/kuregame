'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ChallengeType, Prize } from '@/lib/supabase';
import { CATEGORY_LABELS } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PREFECTURES } from '@/lib/constants';
import AppFooter from '@/components/AppFooter';

const CHALLENGES: { type: ChallengeType; label: string; emoji: string }[] = [
  { type: '1000', label: '1,000円', emoji: '🪙' },
  { type: '3000', label: '3,000円', emoji: '💴' },
  { type: '5000', label: '5,000円', emoji: '💵' },
  { type: '10000', label: '1万円', emoji: '💶' },
  { type: 'free', label: 'フリー', emoji: '🕹️' },
];

const EMPTY_PRIZE: Prize = { name: '', category: 'other', retail_price: 0, quantity: 1 };

// 画像をCanvas経由でリサイズしてbase64に変換（容量削減）
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
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mediaType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ChallengePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();

  const [step, setStep] = useState<'select' | 'record' | 'confirm'>('select');
  const [challengeType, setChallengeType] = useState<ChallengeType>('1000');
  const [storeName, setStoreName] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [editing, setEditing] = useState<Prize>({ ...EMPTY_PRIZE });
  const [showManual, setShowManual] = useState(false);
  const [spentInput, setSpentInput] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ログイン済みならプロフィール情報を自動入力
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      if (profile.prefecture) setPrefecture(profile.prefecture);
    }
  }, [profile]);

  // 写真解析
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [lastAnalyzed, setLastAnalyzed] = useState(false);

  const totalRetail = prizes.reduce((s, p) => s + p.retail_price * p.quantity, 0);
  const totalPrizes = prizes.reduce((s, p) => s + p.quantity, 0);
  const totalSpent = Number(spentInput) || 0;
  const efficiencyRate = totalSpent > 0 ? Math.round((totalRetail / totalSpent) * 1000) / 10 : 0;
  const challengeAmount = challengeType !== 'free' ? Number(challengeType) : 0;

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzeError('');
    setLastAnalyzed(false);

    // プレビュー表示
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // リサイズ & 解析
    setAnalyzing(true);
    try {
      const { base64, mediaType } = await resizeImage(file);
      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const items: Prize[] = (data.items || []).map((item: Prize) => ({
        name: item.name || '不明な商品',
        category: item.category || 'other',
        retail_price: Math.max(1, Number(item.retail_price) || 500),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));

      if (items.length === 0) {
        setAnalyzeError('商品を認識できませんでした。定価が不明な商品は¥500で手動追加してください。');
      } else {
        setPrizes(prev => {
          // 既存リストにマージ（同名は数量を合算）
          const merged = [...prev];
          for (const item of items) {
            const idx = merged.findIndex(p => p.name === item.name);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + item.quantity };
            } else {
              merged.push(item);
            }
          }
          return merged;
        });
        setLastAnalyzed(true);
      }
    } catch {
      setAnalyzeError('解析に失敗しました。もう一度お試しください。');
    } finally {
      setAnalyzing(false);
      // 同じファイルを再選択できるようinputをリセット
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  function updatePrize(index: number, field: keyof Prize, value: string | number) {
    setPrizes(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function removePrize(index: number) {
    setPrizes(prev => prev.filter((_, i) => i !== index));
  }

  function addManual() {
    if (!editing.name || editing.retail_price <= 0) return;
    setPrizes(prev => [...prev, { ...editing }]);
    setEditing({ ...EMPTY_PRIZE });
    setShowManual(false);
  }

  async function submit() {
    if (!spentInput || totalSpent <= 0) { setError('投入金額を入力してください'); return; }
    if (prizes.length === 0) { setError('獲得アイテムを追加してください'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname || '名無しハンター',
          store_name: storeName || null,
          challenge_type: challengeType,
          total_spent: totalSpent,
          prizes,
          prefecture: prefecture || null,
          user_id: user?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const params = new URLSearchParams({
        spent: String(totalSpent), retail: String(totalRetail),
        count: String(totalPrizes), rate: String(efficiencyRate),
        challenge: challengeType, nickname: nickname || '名無しハンター',
        prefecture: prefecture || '',
        skipped: data.skipped ? '1' : '0',
      });
      router.push(`/result?${params}`);
    } catch {
      const params = new URLSearchParams({
        spent: String(totalSpent), retail: String(totalRetail),
        count: String(totalPrizes), rate: String(efficiencyRate),
        challenge: challengeType, nickname: nickname || '名無しハンター',
        prefecture: prefecture || '',
        skipped: '1',
      });
      router.push(`/result?${params}`);
    }
  }

  // ===== STEP 1: チャレンジ選択 =====
  if (step === 'select') {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 100px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🎯 チャレンジ選択</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>今回の投入上限金額を選んでください</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {CHALLENGES.filter(c => c.type !== 'free').map((c) => (
            <div key={c.type} className={`challenge-chip ${challengeType === c.type ? 'selected' : ''}`} onClick={() => setChallengeType(c.type)}>
              <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{c.emoji}</div>
              <div style={{ fontSize: '1rem', fontWeight: 900 }}>{c.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>チャレンジ</div>
            </div>
          ))}
        </div>
        <div className={`challenge-chip ${challengeType === 'free' ? 'selected' : ''}`} onClick={() => setChallengeType('free')} style={{ marginBottom: 28 }}>
          <span style={{ fontSize: '1.4rem' }}>🕹️</span>
          <span style={{ marginLeft: 8, fontSize: '1rem', fontWeight: 900 }}>フリーモード</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>金額上限なしで記録</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🏪 店舗名（任意）</label>
          <input type="text" placeholder="例：ラウンドワン渋谷店" value={storeName} onChange={e => setStoreName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            📍 都道府県（ランキング参加に必要）
          </label>
          <select value={prefecture} onChange={e => setPrefecture(e.target.value)}>
            <option value="">選択してください（任意）</option>
            {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {!user && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
              ※ <a href="/auth" style={{ color: 'var(--accent)' }}>ログイン</a>すると戦績が蓄積されます（ゲストは記録されません）
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={() => setStep('record')}>記録スタート！</button>

        <div style={{ marginTop: 24, borderRadius: 14, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hook-crane-promo.png"
            alt="フック設定で豪華景品を狙え！"
            style={{ width: '100%', display: 'block' }}
          />
        </div>

        <AppFooter />
      </main>
    );
  }

  // ===== STEP 2: 記録 =====
  if (step === 'record') {
    return (
      <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 140px' }}>
        <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>

        {/* リアルタイム集計 */}
        <div className="rate-display" style={{ borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>投入金額</div>
              <div style={{ fontWeight: 900, fontSize: '1.3rem' }}>¥{totalSpent.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>元取り率</div>
              <div style={{ fontWeight: 900, fontSize: '1.8rem', color: efficiencyRate >= 100 ? 'var(--gold)' : efficiencyRate > 0 ? 'var(--cyan)' : 'var(--muted)' }}>
                {totalSpent > 0 ? `${efficiencyRate}%` : '--%'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>定価総額</div>
              <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'var(--green)' }}>¥{totalRetail.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
            {totalPrizes}個獲得
            {challengeAmount > 0 && (
              <span style={{ marginLeft: 8, color: challengeAmount > totalSpent ? 'var(--green)' : 'var(--accent)' }}>
                {Number(challengeType).toLocaleString()}円チャレンジ
              </span>
            )}
          </div>
        </div>

        {/* 投入金額 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>💰 実際に投入した金額（円）</label>
          <input type="number" placeholder="例：1500" value={spentInput} onChange={e => setSpentInput(e.target.value)} inputMode="numeric" />
        </div>

        {/* 写真撮影セクション */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 20, border: '2px dashed var(--accent)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>
            📸 写真で自動判定（AI）
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            ゲットした商品を撮影するとAIが商品名と定価を自動で読み取ります。
            複数商品まとめて撮影もOK。定価不明は¥500に設定されます。
          </p>

          {/* プレビュー */}
          {photoPreview && (
            <div style={{ marginBottom: 14, borderRadius: 10, overflow: 'hidden', border: '2px solid var(--card2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="撮影した景品" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {analyzing && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--accent)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🔍</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>AIが解析中...</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>商品名と定価を調べています</div>
            </div>
          )}

          {analyzeError && !analyzing && (
            <div style={{ fontSize: '0.82rem', color: 'var(--accent)', marginBottom: 12, padding: '8px 12px', background: 'rgba(255,61,175,0.1)', borderRadius: 8 }}>
              ⚠️ {analyzeError}
            </div>
          )}

          {lastAnalyzed && !analyzing && (
            <div style={{ fontSize: '0.82rem', color: 'var(--green)', marginBottom: 12, padding: '8px 12px', background: 'rgba(0,230,118,0.1)', borderRadius: 8 }}>
              ✅ リストに追加しました！内容を確認・修正してください
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              disabled={analyzing}
              style={{
                background: analyzing ? 'var(--card2)' : 'linear-gradient(135deg, var(--accent) 0%, #aa00ff 100%)',
                color: 'white', border: 'none', borderRadius: 10, padding: '12px 8px',
                fontWeight: 700, fontSize: '0.88rem', cursor: analyzing ? 'not-allowed' : 'pointer',
              }}
            >
              📷 カメラで撮影
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture');
                  fileInputRef.current.click();
                }
              }}
              disabled={analyzing}
              style={{
                background: 'var(--card2)', color: 'var(--text)', border: '2px solid var(--accent)',
                borderRadius: 10, padding: '12px 8px', fontWeight: 700, fontSize: '0.88rem',
                cursor: analyzing ? 'not-allowed' : 'pointer',
              }}
            >
              🖼️ アルバムから
            </button>
          </div>
        </div>

        {/* 獲得リスト */}
        {prizes.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>
              📦 獲得リスト（タップして編集できます）
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prizes.map((p, i) => (
                <PrizeEditCard key={i} prize={p} onUpdate={(field, value) => updatePrize(i, field, value)} onRemove={() => removePrize(i)} />
              ))}
            </div>
          </div>
        )}

        {/* 手動追加 */}
        <div style={{ marginBottom: 20 }}>
          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              style={{ background: 'none', border: '2px dashed var(--card2)', borderRadius: 12, padding: '12px', width: '100%', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
            >
              ＋ 手動でアイテムを追加
            </button>
          ) : (
            <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, color: 'var(--cyan)' }}>＋ 手動追加</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="text" placeholder="アイテム名（例：カップ焼きそば UFO）" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as Prize['category'] })}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="number" placeholder="数量" value={editing.quantity} onChange={e => setEditing({ ...editing, quantity: Number(e.target.value) })} inputMode="numeric" min={1} />
                </div>
                <input type="number" placeholder="定価（円）例：198" value={editing.retail_price || ''} onChange={e => setEditing({ ...editing, retail_price: Number(e.target.value) })} inputMode="numeric" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn-primary" onClick={addManual} disabled={!editing.name || editing.retail_price <= 0} style={{ opacity: (!editing.name || editing.retail_price <= 0) ? 0.5 : 1 }}>追加</button>
                  <button className="btn-secondary" onClick={() => setShowManual(false)}>キャンセル</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>{error}</p>}

        <button className="btn-primary" onClick={() => setStep('confirm')} disabled={prizes.length === 0 || totalSpent <= 0} style={{ opacity: prizes.length === 0 || totalSpent <= 0 ? 0.5 : 1 }}>
          結果を見る！
        </button>
        <AppFooter />
      </main>
    );
  }

  // ===== STEP 3: ランキング登録 =====
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 100px' }}>
      <button onClick={() => setStep('record')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🏆 ランキング登録</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>ニックネームを登録してランキングに参加しよう！</p>

      <div className="rate-display" style={{ borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6 }}>元取り率</div>
        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: efficiencyRate >= 100 ? 'var(--gold)' : 'var(--cyan)' }}>
          {efficiencyRate}%
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 8 }}>
          投入¥{totalSpent.toLocaleString()} → 定価¥{totalRetail.toLocaleString()}（{totalPrizes}個）
        </div>
        {challengeType !== 'free' && (
          <div style={{ marginTop: 6 }}>
            <span style={{ background: 'rgba(255,61,175,0.2)', padding: '3px 10px', borderRadius: 20, color: 'var(--accent)', fontSize: '0.78rem' }}>
              {Number(challengeType).toLocaleString()}円チャレンジ
            </span>
          </div>
        )}
      </div>

      {/* 獲得内訳確認 */}
      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>📦 獲得内訳</div>
        {prizes.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '5px 0', borderBottom: i < prizes.length - 1 ? '1px solid var(--card2)' : 'none' }}>
            <span>{p.name} ×{p.quantity}</span>
            <span style={{ color: 'var(--green)' }}>¥{(p.retail_price * p.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>ニックネーム（最大12文字）</label>
        <input type="text" placeholder="例：クレゲの達人" value={nickname} maxLength={12} onChange={e => setNickname(e.target.value)} />
      </div>

      {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>{error}</p>}

      <button className="btn-primary" onClick={submit} disabled={submitting}>
        {submitting ? '登録中...' : 'ランキングに登録！🚀'}
      </button>
      <div style={{ marginTop: 12 }}>
        <button className="btn-secondary" onClick={() => {
          const params = new URLSearchParams({ spent: String(totalSpent), retail: String(totalRetail), count: String(totalPrizes), rate: String(efficiencyRate), challenge: challengeType, nickname: 'ゲスト' });
          router.push(`/result?${params}`);
        }}>
          登録せずに結果だけ見る
        </button>
      </div>
      <AppFooter />
    </main>
  );
}

// 編集可能な景品カード
function PrizeEditCard({ prize, onUpdate, onRemove }: {
  prize: Prize;
  onUpdate: (field: keyof Prize, value: string | number) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="prize-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prize.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
            {CATEGORY_LABELS[prize.category]} · ×{prize.quantity}個 · 定価¥{prize.retail_price.toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.9rem' }}>
            ¥{(prize.retail_price * prize.quantity).toLocaleString()}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={prize.name}
            onChange={e => onUpdate('name', e.target.value)}
            placeholder="商品名"
            onClick={e => e.stopPropagation()}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="number"
              value={prize.retail_price || ''}
              onChange={e => onUpdate('retail_price', Number(e.target.value))}
              placeholder="定価（円）"
              inputMode="numeric"
              onClick={e => e.stopPropagation()}
            />
            <input
              type="number"
              value={prize.quantity}
              onChange={e => onUpdate('quantity', Math.max(1, Number(e.target.value)))}
              placeholder="数量"
              inputMode="numeric"
              min={1}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <select
            value={prize.category}
            onChange={e => onUpdate('category', e.target.value)}
            onClick={e => e.stopPropagation()}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ background: 'rgba(255,61,175,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 8, padding: '8px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
          >
            🗑️ 削除
          </button>
        </div>
      )}
    </div>
  );
}
