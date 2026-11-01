'use client';

import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ChallengeType, Prize, BattleRoom, TeamBattle } from '@/lib/supabase';
import { CATEGORY_LABELS, getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { PREFECTURES, MACHINE_TYPE_OPTIONS } from '@/lib/constants';
import { getParticipantKey } from '@/lib/participant';
import { saveBattleRoom, loadBattleRoom, clearBattleRoom, saveTeamBattle, loadTeamBattle, clearTeamBattle } from '@/lib/battleState';
import { trackTikTokCompleteRegistration } from '@/lib/tiktokPixel';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';
import BattleProgressList from '@/components/BattleProgressList';

const CHALLENGES: { type: ChallengeType; label: string; emoji: string }[] = [
  { type: '1000', label: '1,000円', emoji: '🪙' },
  { type: '3000', label: '3,000円', emoji: '💴' },
  { type: '5000', label: '5,000円', emoji: '💵' },
  { type: '10000', label: '1万円', emoji: '💶' },
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

function ChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();

  const [step, setStep] = useState<'select' | 'battle' | 'record' | 'confirm'>('select');
  // ステップ切り替え時、前のステップのスクロール位置が残り元取り率が画面外になるのを防ぐ
  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  const [challengeType, setChallengeType] = useState<ChallengeType>('free');
  const [storeName, setStoreName] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [machineType, setMachineType] = useState('フック設定');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [editing, setEditing] = useState<Prize>({ ...EMPTY_PRIZE });
  const [showManual, setShowManual] = useState(false);
  const [spentInput, setSpentInput] = useState('');
  const [recordMode, setRecordMode] = useState<'batch' | 'realtime'>('batch');
  const [pullSpentInput, setPullSpentInput] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  // ランキング登録時の必須写真（当日ゲットしたカゴいっぱいの証拠写真・真実性の担保）
  const basketPhotoInputRef = useRef<HTMLInputElement>(null);
  const [basketPhoto, setBasketPhoto] = useState<{ base64: string; mediaType: string } | null>(null);
  const [basketPhotoPreview, setBasketPhotoPreview] = useState<string | null>(null);
  const [basketPhotoError, setBasketPhotoError] = useState('');

  async function handleBasketPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBasketPhotoError('');
    setBasketPhotoPreview(URL.createObjectURL(file));
    try {
      const resized = await resizeImage(file);
      setBasketPhoto(resized);
    } catch {
      setBasketPhotoError('写真の読み込みに失敗しました。もう一度お試しください。');
      setBasketPhoto(null);
      setBasketPhotoPreview(null);
    }
  }

  // ===== 対戦モード =====
  const [battleTab, setBattleTab] = useState<'create' | 'join'>('create');
  const [battleRoom, setBattleRoom] = useState<BattleRoom | null>(null);
  const [battleStoreInput, setBattleStoreInput] = useState('');
  const [battleBudgetInput, setBattleBudgetInput] = useState('');
  const [battleCodeInput, setBattleCodeInput] = useState('');
  const [battleBusy, setBattleBusy] = useState(false);
  const [battleError, setBattleError] = useState('');
  const [participantKey, setParticipantKey] = useState('');

  // 対戦相手と進行状況を共有するための端末ローカルID（初回マウント時に発行・以後再利用）
  useEffect(() => {
    setParticipantKey(getParticipantKey());
  }, []);

  // 共有リンク（?battle=CODE）から来た場合は自動で部屋情報を取得
  // URLにコードが無い場合も、写真解析時のタブ再読み込み等でstateが消えていないか
  // sessionStorageから復元を試みる（復元に成功したら再取得は不要）
  useEffect(() => {
    const code = searchParams.get('battle');
    if (!code) {
      const restored = loadBattleRoom();
      if (restored && restored.status !== 'closed') {
        setBattleRoom(restored);
        setChallengeType('battle');
        setStoreName(restored.store_name);
      } else if (restored) {
        clearBattleRoom();
      }
      return;
    }
    (async () => {
      setBattleBusy(true);
      try {
        const res = await fetch(`/api/battle/${code.toUpperCase()}`);
        const data = await res.json();
        if (data.room && data.room.status === 'closed') {
          setBattleError('この対戦はすでに終了しています');
        } else if (data.room) {
          setBattleRoom(data.room);
          saveBattleRoom(data.room);
          setChallengeType('battle');
          setStoreName(data.room.store_name);
          setStep('battle');
        } else {
          setBattleError('この対戦コードは見つかりませんでした');
        }
      } catch {
        setBattleError('対戦情報の取得に失敗しました');
      } finally {
        setBattleBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 団体戦（3対3・金額チャレンジ方式）=====
  // 共有リンク（?teamBattle=CODE&team=A|B）から来た場合、自分のチームの1人として記録に直行する
  const [teamBattle, setTeamBattle] = useState<TeamBattle | null>(null);
  const [teamSide, setTeamSide] = useState<'A' | 'B' | null>(null);
  const [teamBattleError, setTeamBattleError] = useState('');

  useEffect(() => {
    const code = searchParams.get('teamBattle');
    const team = searchParams.get('team');
    if (!code || (team !== 'A' && team !== 'B')) {
      const restored = loadTeamBattle();
      if (restored) {
        setTeamBattle(restored.battle);
        setTeamSide(restored.team);
        setChallengeType('battle');
        setStoreName(restored.battle.store_name);
        if (restored.battle.prefecture) setPrefecture(restored.battle.prefecture);
      }
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/team-battle/${code.toUpperCase()}`);
        const data = await res.json();
        if (data.battle && data.battle.mode === 'fixed_budget') {
          setTeamBattle(data.battle);
          setTeamSide(team as 'A' | 'B');
          saveTeamBattle(data.battle, team as 'A' | 'B');
          setChallengeType('battle');
          setStoreName(data.battle.store_name);
          if (data.battle.prefecture) setPrefecture(data.battle.prefecture);
          setStep('record');
        } else {
          setTeamBattleError('この団体戦コードは見つかりませんでした');
        }
      } catch {
        setTeamBattleError('団体戦情報の取得に失敗しました');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createBattleRoom() {
    if (!battleStoreInput || !battleBudgetInput || Number(battleBudgetInput) <= 0) {
      setBattleError('店舗名と金額を入力してください');
      return;
    }
    setBattleError('');
    setBattleBusy(true);
    try {
      const res = await fetch('/api/battle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: battleStoreInput,
          budget: Number(battleBudgetInput),
          host_nickname: nickname || profile?.nickname || null,
          participant_key: participantKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) throw new Error(data.error || '部屋の作成に失敗しました');
      setBattleRoom(data.room);
      saveBattleRoom(data.room);
      setStoreName(data.room.store_name);
    } catch (e) {
      setBattleError(e instanceof Error ? e.message : '部屋の作成に失敗しました');
    } finally {
      setBattleBusy(false);
    }
  }

  async function joinBattleRoom() {
    if (!battleCodeInput) { setBattleError('招待コードを入力してください'); return; }
    setBattleError('');
    setBattleBusy(true);
    try {
      const res = await fetch(`/api/battle/${battleCodeInput.trim().toUpperCase()}`);
      const data = await res.json();
      if (!data.room) throw new Error('その招待コードの対戦部屋は見つかりませんでした');
      if (data.room.status === 'closed') throw new Error('この対戦はすでに終了しています');
      setBattleRoom(data.room);
      saveBattleRoom(data.room);
      setStoreName(data.room.store_name);
    } catch (e) {
      setBattleError(e instanceof Error ? e.message : '参加に失敗しました');
    } finally {
      setBattleBusy(false);
    }
  }

  // ログイン済みならプロフィール情報を自動入力
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      if (profile.prefecture) setPrefecture(profile.prefecture);
    }
  }, [profile]);

  // 写真解析（アルバムから最大10枚まで一括選択可）
  const MAX_PHOTOS = 10;
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [lastAnalyzedCount, setLastAnalyzedCount] = useState(0);

  const totalRetail = prizes.reduce((s, p) => s + p.retail_price * p.quantity, 0);
  const totalPrizes = prizes.reduce((s, p) => s + p.quantity, 0);
  const totalSpent = recordMode === 'realtime'
    ? prizes.reduce((s, p) => s + (p.spent || 0), 0)
    : (Number(spentInput) || 0);
  const efficiencyRate = totalSpent > 0 ? Math.round((totalRetail / totalSpent) * 1000) / 10 : 0;
  const challengeAmount = challengeType === 'battle'
    ? (teamBattle?.budget || battleRoom?.budget || 0)
    : (challengeType !== 'free' ? Number(challengeType) : 0);

  // 対戦相手にも見えるよう、記録中の進行状況（投入額・獲得数・元取り率）を定期的に共有する
  useEffect(() => {
    if (!battleRoom || !participantKey || step !== 'record') return;
    const timer = setTimeout(() => {
      getSupabase()
        .from('battle_progress')
        .upsert({
          battle_room_id: battleRoom.id,
          participant_key: participantKey,
          nickname: nickname || profile?.nickname || '名無しハンター',
          total_spent: totalSpent,
          total_retail_value: totalRetail,
          prize_count: totalPrizes,
          efficiency_rate: efficiencyRate,
        }, { onConflict: 'battle_room_id,participant_key' })
        .then(() => {});
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleRoom, participantKey, step, totalSpent, totalRetail, totalPrizes, efficiencyRate, nickname, profile?.nickname]);

  function addPrizeItems(items: Prize[]) {
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
  }

  async function analyzeOnePhoto(file: File): Promise<Prize[]> {
    const { base64, mediaType } = await resizeImage(file);
    const res = await fetch('/api/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mediaType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return (data.items || []).map((item: Prize) => {
      const category = item.category || 'other';
      const defaultPrice = category === 'figure' ? 800 : 500;
      return {
        name: item.name || '不明な商品',
        category,
        retail_price: Math.max(1, Number(item.retail_price) || defaultPrice),
        quantity: Math.max(1, Number(item.quantity) || 1),
      };
    });
  }

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || []);
    if (allFiles.length === 0) return;

    const files = allFiles.slice(0, MAX_PHOTOS);
    const truncated = allFiles.length > MAX_PHOTOS;

    setAnalyzeError('');
    setLastAnalyzedCount(0);

    // プレビュー表示（複数枚まとめて）
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)));

    setAnalyzing(true);
    setBatchProgress({ current: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;
    let recognizedCount = 0;

    for (let i = 0; i < files.length; i++) {
      try {
        const items = await analyzeOnePhoto(files[i]);
        if (items.length > 0) {
          addPrizeItems(items);
          recognizedCount++;
        }
        successCount++;
      } catch {
        failCount++;
      }
      setBatchProgress({ current: i + 1, total: files.length });
    }

    setAnalyzing(false);
    setBatchProgress(null);
    setLastAnalyzedCount(recognizedCount);

    if (recognizedCount === 0) {
      setAnalyzeError('商品を認識できませんでした。定価が不明な商品は¥500で手動追加してください。');
    } else if (failCount > 0) {
      setAnalyzeError(`${files.length}枚中${failCount}枚の解析に失敗しました（残りは反映済み）。失敗分は手動追加してください。`);
    } else if (truncated) {
      setAnalyzeError(`一度に登録できるのは${MAX_PHOTOS}枚までのため、最初の${MAX_PHOTOS}枚のみ解析しました。`);
    }

    // 同じファイルを再選択できるようinputをリセット
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRealtimePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const spent = Number(pullSpentInput);
    if (!pullSpentInput || spent <= 0) {
      setAnalyzeError('先に「今回使った金額」を入力してから撮影・選択してください');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAnalyzeError('');
    setLastAnalyzedCount(0);
    setPhotoPreviews([URL.createObjectURL(file)]);
    setAnalyzing(true);

    try {
      const items = await analyzeOnePhoto(file);
      if (items.length > 0) {
        setPrizes(prev => [...prev, ...items.map((item, idx) => ({ ...item, spent: idx === 0 ? spent : 0 }))]);
        setLastAnalyzedCount(1);
        setPullSpentInput('');
      } else {
        setAnalyzeError('商品を認識できませんでした。下の「手動でアイテムを追加」から記録してください。');
      }
    } catch {
      setAnalyzeError('AI解析に失敗しました。下の「手動でアイテムを追加」から記録してください。');
    } finally {
      setAnalyzing(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pullSpentInput]);

  function updatePrize(index: number, field: keyof Prize, value: string | number) {
    setPrizes(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function removePrize(index: number) {
    setPrizes(prev => prev.filter((_, i) => i !== index));
  }

  function addManual() {
    if (!editing.name || editing.retail_price <= 0) return;
    if (recordMode === 'realtime' && (!editing.spent || editing.spent <= 0)) return;
    setPrizes(prev => [...prev, { ...editing }]);
    setEditing({ ...EMPTY_PRIZE });
    setShowManual(false);
  }

  const PHOTO_REQUIRED_THRESHOLD = 120;
  const photoRequired = efficiencyRate >= PHOTO_REQUIRED_THRESHOLD;

  async function submit() {
    if (totalSpent <= 0) { setError('投入金額を入力してください'); return; }
    if (prizes.length === 0) { setError('獲得アイテムを追加してください'); return; }
    if (photoRequired && !basketPhoto) { setError('元取り率120%以上のランキング登録には、当日ゲットしたカゴいっぱいの写真の添付が必須です'); return; }
    setError('');
    setRequiresUpgrade(false);
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
          machine_type: machineType || null,
          user_id: user?.id || null,
          battle_room_id: battleRoom?.id || null,
          team_battle_id: teamBattle?.id || null,
          team_side: teamSide || null,
          basket_photo_base64: basketPhoto?.base64 || null,
          basket_photo_media_type: basketPhoto?.mediaType || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresUpgrade) {
          setError(data.error || 'チャレンジの記録にはスタンダード会員以上のご登録が必要です');
          setRequiresUpgrade(true);
          setSubmitting(false);
          return;
        }
        throw new Error(data.error);
      }
      if (teamBattle && !data.skipped) {
        clearTeamBattle();
        router.push(`/battle/team/${teamBattle.code}`);
        return;
      }
      if (battleRoom && !data.skipped) {
        if (participantKey) {
          getSupabase().from('battle_progress').delete()
            .eq('battle_room_id', battleRoom.id).eq('participant_key', participantKey).then(() => {});
        }
        clearBattleRoom();
        router.push(`/battle/${battleRoom.code}`);
        return;
      }
      const params = new URLSearchParams({
        spent: String(totalSpent), retail: String(totalRetail),
        count: String(totalPrizes), rate: String(data.session?.efficiency_rate ?? efficiencyRate),
        challenge: challengeType, nickname: nickname || '名無しハンター',
        prefecture: prefecture || '',
        skipped: data.skipped ? '1' : '0',
        ...(data.isNewBest && data.session?.id ? { sessionId: data.session.id, newBest: '1' } : {}),
        ...((data.streakBonusPercent || data.gachaBonusPercent) ? {
          streakBonus: String(data.streakBonusPercent || 0),
          gachaBonus: String(data.gachaBonusPercent || 0),
          baseRate: String(data.baseEfficiencyRate),
        } : {}),
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
      <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '24px 20px 100px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🎯 チャレンジ選択</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>今回の投入上限金額を選んでください</p>

        <div className={`challenge-chip ${challengeType === 'free' ? 'selected' : ''}`} onClick={() => { setChallengeType('free'); setBattleRoom(null); clearBattleRoom(); setTeamBattle(null); clearTeamBattle(); }} style={{ marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🕹️</span>
          <span style={{ marginLeft: 8, fontSize: '1rem', fontWeight: 900 }}>フリーモード</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>金額上限なしで記録</div>
        </div>
        <div className={`challenge-chip ${challengeType === 'battle' ? 'selected' : ''}`} onClick={() => setChallengeType('battle')} style={{ marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>⚔️</span>
          <span style={{ marginLeft: 8, fontSize: '1rem', fontWeight: 900 }}>対戦モード</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>友達・家族と同じ店舗・同じ金額で元取り率を競う（2〜6人で遊べるゲーム）</div>
        </div>
        <div className="challenge-chip" onClick={() => router.push('/battle/team/new')} style={{ marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🤝</span>
          <span style={{ marginLeft: 8, fontSize: '1rem', fontWeight: 900 }}>団体戦（3対3）</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>3人チーム同士で対決。短期決戦（何勝何敗）と金額チャレンジ団体戦の2種類</div>
        </div>
        {teamBattleError && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 12 }}>{teamBattleError}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {CHALLENGES.map((c) => (
            <div key={c.type} className={`challenge-chip ${challengeType === c.type ? 'selected' : ''}`} onClick={() => { setChallengeType(c.type); setBattleRoom(null); clearBattleRoom(); setTeamBattle(null); clearTeamBattle(); }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{c.emoji}</div>
              <div style={{ fontSize: '1rem', fontWeight: 900 }}>{c.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>チャレンジ</div>
            </div>
          ))}
        </div>

        {challengeType !== 'battle' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🏪 店舗名（任意）</label>
            <input type="text" placeholder="例：ラウンドワン渋谷店" value={storeName} onChange={e => setStoreName(e.target.value)} />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            🕹️ 挑戦機種（任意・ランキングを機種別に絞り込めます）
          </label>
          <select value={machineType} onChange={e => setMachineType(e.target.value)}>
            <option value="">選択しない</option>
            {MACHINE_TYPE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
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
        <button
          className="btn-primary"
          onClick={() => {
            if (challengeType !== 'battle') trackTikTokCompleteRegistration();
            setStep(challengeType === 'battle' ? 'battle' : 'record');
          }}
        >
          {challengeType === 'battle' ? '対戦へ進む' : '記録スタート！'}
        </button>

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

  // ===== STEP 1.5: 対戦モード（部屋を作る／参加する） =====
  if (step === 'battle') {
    return (
      <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '24px 20px 100px' }}>
        <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>⚔️ 対戦モード</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          同じ店舗・同じ金額で挑戦して、元取り率No.1を競おう！2〜6人で遊べるゲームです。
        </p>

        {battleRoom ? (
          <div>
            <div className="rate-display" style={{ borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>招待コード</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: 4, color: 'var(--accent)' }}>{battleRoom.code}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 10 }}>
                🏪 {battleRoom.store_name}　💰 {battleRoom.budget.toLocaleString()}円チャレンジ
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              このコードを一緒に遊ぶ人に共有してください。参加者は「対戦モード」→「コードで参加」からこのコードを入力するか、下のリンクをそのまま送るだけで参加できます。
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={async () => {
                  const url = `https://cranegame.hana.trickster.biz/battle/${battleRoom.code}`;
                  try { await navigator.clipboard.writeText(url); } catch {}
                }}
              >
                🔗 招待リンクをコピー
              </button>
            </div>
            <button className="btn-primary" onClick={() => setStep('record')}>この対戦に参加して記録スタート！</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setBattleTab('create')}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', background: battleTab === 'create' ? 'var(--accent)' : 'var(--card2)', color: battleTab === 'create' ? '#fff' : 'var(--text)' }}
              >
                部屋を作る
              </button>
              <button
                onClick={() => setBattleTab('join')}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', background: battleTab === 'join' ? 'var(--accent)' : 'var(--card2)', color: battleTab === 'join' ? '#fff' : 'var(--text)' }}
              >
                コードで参加
              </button>
            </div>

            {battleTab === 'create' ? (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🏪 店舗名</label>
                  <input type="text" placeholder="例：ラウンドワン渋谷店" value={battleStoreInput} onChange={e => setBattleStoreInput(e.target.value)} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>💰 みんなの投入金額（円）</label>
                  <input type="number" placeholder="例：3000" inputMode="numeric" value={battleBudgetInput} onChange={e => setBattleBudgetInput(e.target.value)} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>全員がこの金額を目安に挑戦し、元取り率で競います</p>
                </div>
                {battleError && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>{battleError}</p>}
                <button className="btn-primary" onClick={createBattleRoom} disabled={battleBusy}>
                  {battleBusy ? '作成中...' : '対戦部屋を作る'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>招待コード（6文字）</label>
                  <input
                    type="text"
                    placeholder="例：AB3XY9"
                    value={battleCodeInput}
                    maxLength={6}
                    onChange={e => setBattleCodeInput(e.target.value.toUpperCase())}
                    style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 900, letterSpacing: 4 }}
                  />
                </div>
                {battleError && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>{battleError}</p>}
                <button className="btn-primary" onClick={joinBattleRoom} disabled={battleBusy}>
                  {battleBusy ? '確認中...' : '参加する'}
                </button>
              </div>
            )}
          </div>
        )}
        <AppFooter />
      </main>
    );
  }

  // ===== STEP 2: 記録 =====
  if (step === 'record') {
    return (
      <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '24px 20px 140px' }}>
        <button onClick={() => setStep(challengeType === 'battle' ? 'battle' : 'select')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>

        {battleRoom && (
          <div style={{ background: 'rgba(255,61,175,0.1)', border: '1px solid var(--accent)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem' }}>
            ⚔️ 対戦中：{battleRoom.store_name}／招待コード <b>{battleRoom.code}</b>
          </div>
        )}
        {teamBattle && teamSide && (
          <div style={{ background: 'rgba(255,61,175,0.1)', border: '1px solid var(--accent)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem' }}>
            🤝 団体戦中：{teamBattle.store_name}／
            <b>{teamSide === 'A' ? teamBattle.team_a_name : teamBattle.team_b_name}</b>
            　招待コード <b>{teamBattle.code}</b>
          </div>
        )}

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
                {challengeAmount.toLocaleString()}円チャレンジ
                {challengeAmount > totalSpent
                  ? `（残り¥${(challengeAmount - totalSpent).toLocaleString()}）`
                  : `（¥${(totalSpent - challengeAmount).toLocaleString()}オーバー）`}
              </span>
            )}
          </div>
        </div>

        {battleRoom && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
              ⚔️ みんなの進行状況（自動更新）
            </h3>
            <BattleProgressList battleRoomId={battleRoom.id} budget={battleRoom.budget} myParticipantKey={participantKey} />
          </div>
        )}

        {/* 記録モード切替 */}
        <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {([
            { key: 'batch', label: '🎯 まとめて入力' },
            { key: 'realtime', label: '⚡ その場で記録' },
          ] as const).map(m => (
            <button
              key={m.key}
              onClick={() => setRecordMode(m.key)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                background: recordMode === m.key ? 'linear-gradient(135deg,var(--accent),#aa00ff)' : 'transparent',
                color: recordMode === m.key ? 'white' : 'var(--muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          {recordMode === 'batch'
            ? '投入金額をあとでまとめて入力する、従来どおりの記録方法です。'
            : '1個ゲットするたびに「使った金額」→「写真」の順にその場で記録します。投入金額の合計は自動で計算されます。'}
        </p>

        {/* 投入金額（まとめて入力モード） */}
        {recordMode === 'batch' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>💰 実際に投入した金額（円）</label>
            <input type="number" placeholder="例：1500" value={spentInput} onChange={e => setSpentInput(e.target.value)} inputMode="numeric" />
          </div>
        )}

        {/* 今回使った金額（その場で記録モード） */}
        {recordMode === 'realtime' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>💰 今回使った金額（円）</label>
            <input type="number" placeholder="例：300" value={pullSpentInput} onChange={e => setPullSpentInput(e.target.value)} inputMode="numeric" disabled={analyzing} />
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6 }}>入力してから、下の「📷 撮って記録」または「🖼️ アルバムから」でその1個を追加してください</p>
          </div>
        )}

        {/* 写真撮影セクション */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 20, border: '2px dashed var(--accent)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>
            {recordMode === 'batch' ? '📸 写真で自動判定（AI）' : '📸 ゲットしたら即記録（AI）'}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            {recordMode === 'batch'
              ? <>ゲットした商品を撮影するとAIが商品名と定価を自動で読み取ります。複数商品まとめて撮影もOK。アルバムからなら最大{MAX_PHOTOS}枚を一括で選んで一気に登録できます。定価不明は¥500に設定されます。</>
              : '1枚だけ撮影・選択してください。AIが商品名と定価を自動で読み取り、上で入力した金額と一緒にリストへ追加します。'}
          </p>

          {/* プレビュー（複数枚） */}
          {photoPreviews.length > 0 && (
            <div style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {photoPreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '2px solid var(--card2)', aspectRatio: '1' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`選択した画像${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {batchProgress && i < batchProgress.current && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✅</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {analyzing && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--accent)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🔍</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                AIが解析中...{batchProgress && batchProgress.total > 1 ? `（${batchProgress.current}/${batchProgress.total}枚）` : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>商品名と定価を調べています</div>
            </div>
          )}

          {analyzeError && !analyzing && (
            <div style={{ fontSize: '0.82rem', color: 'var(--accent)', marginBottom: 12, padding: '8px 12px', background: 'rgba(255,61,175,0.1)', borderRadius: 8 }}>
              ⚠️ {analyzeError}
            </div>
          )}

          {lastAnalyzedCount > 0 && !analyzing && (
            <div style={{ fontSize: '0.82rem', color: 'var(--green)', marginBottom: 12, padding: '8px 12px', background: 'rgba(0,230,118,0.1)', borderRadius: 8 }}>
              ✅ {lastAnalyzedCount}枚から商品を認識してリストに追加しました！内容を確認・修正してください
              {recordMode === 'realtime' && challengeAmount > 0 && (
                <div style={{ marginTop: 4, fontWeight: 700 }}>
                  {challengeAmount > totalSpent
                    ? `💰 残り¥${(challengeAmount - totalSpent).toLocaleString()}使えます`
                    : `⚠️ 予算を¥${(totalSpent - challengeAmount).toLocaleString()}オーバーしています`}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={recordMode === 'batch'}
            style={{ display: 'none' }}
            onChange={recordMode === 'realtime' ? handleRealtimePhotoChange : handlePhotoChange}
          />

          {(() => {
            const captureDisabled = analyzing || (recordMode === 'realtime' && (!pullSpentInput || Number(pullSpentInput) <= 0));
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={captureDisabled}
                  style={{
                    background: captureDisabled ? 'var(--card2)' : 'linear-gradient(135deg, var(--accent) 0%, #aa00ff 100%)',
                    color: 'white', border: 'none', borderRadius: 10, padding: '12px 8px',
                    fontWeight: 700, fontSize: '0.88rem', cursor: captureDisabled ? 'not-allowed' : 'pointer',
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
                  disabled={captureDisabled}
                  style={{
                    background: 'var(--card2)', color: 'var(--text)', border: '2px solid var(--accent)',
                    borderRadius: 10, padding: '12px 8px', fontWeight: 700, fontSize: '0.88rem',
                    cursor: captureDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  🖼️ アルバムから
                </button>
              </div>
            );
          })()}
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
                {recordMode === 'realtime' && (
                  <input type="number" placeholder="このアイテムに使った金額（円）例：300" value={editing.spent || ''} onChange={e => setEditing({ ...editing, spent: Number(e.target.value) })} inputMode="numeric" />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(() => {
                    const manualDisabled = !editing.name || editing.retail_price <= 0 || (recordMode === 'realtime' && (!editing.spent || editing.spent <= 0));
                    return (
                      <button className="btn-primary" onClick={addManual} disabled={manualDisabled} style={{ opacity: manualDisabled ? 0.5 : 1 }}>追加</button>
                    );
                  })()}
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
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '24px 20px 100px' }}>
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
              {teamBattle && teamSide
                ? `🤝 団体戦：${teamSide === 'A' ? teamBattle.team_a_name : teamBattle.team_b_name}`
                : challengeType === 'battle' ? `⚔️ 対戦：${battleRoom?.store_name || ''}` : `${challengeAmount.toLocaleString()}円チャレンジ`}
            </span>
          </div>
        )}
      </div>

      {/* 獲得内訳確認 */}
      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>📦 獲得内訳</div>
        {prizes.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '5px 0', borderBottom: i < prizes.length - 1 ? '1px solid var(--card2)' : 'none' }}>
            <span>{p.name} ×{p.quantity}{!!p.spent && <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>（使った金額¥{p.spent.toLocaleString()}）</span>}</span>
            <span style={{ color: 'var(--green)' }}>¥{(p.retail_price * p.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>ニックネーム（最大12文字）</label>
        <input type="text" placeholder="例：クレゲの達人" value={nickname} maxLength={12} onChange={e => setNickname(e.target.value)} />
      </div>

      {/* ランキング登録の写真（元取り率120%以上は必須・真実性の担保） */}
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 20, border: `2px dashed ${basketPhoto ? 'var(--green)' : photoRequired ? 'var(--accent)' : 'var(--card2)'}` }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4, color: basketPhoto ? 'var(--green)' : photoRequired ? 'var(--accent)' : 'var(--muted)' }}>
          📸 カゴいっぱいの写真{photoRequired ? '（必須）' : '（任意）'}
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
          {photoRequired
            ? `元取り率120%以上のランキング登録には、本日ゲットした景品をカゴいっぱいに集めた写真の添付が必須です。記録の真実性を担保するためのルールです。`
            : `元取り率120%未満は写真の添付は任意です（120%以上になると必須になります）。`}
        </p>
        {photoRequired && (
          <p style={{ fontSize: '0.72rem', color: 'var(--gold)', marginBottom: 14, lineHeight: 1.6, background: 'rgba(255,215,0,.06)', border: '1px solid rgba(255,215,0,.2)', borderRadius: 8, padding: '8px 10px' }}>
            ⚠️ 運営事務局にて、添付写真と申告内容（投入金額・獲得数など）の整合性を随時確認しています。不整合が確認された記録は、事前の通知なくAIにより自動的に削除される場合があります。
          </p>
        )}

        {basketPhotoPreview && (
          <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '2px solid var(--card2)', maxWidth: 220 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={basketPhotoPreview} alt="カゴいっぱいの写真" style={{ width: '100%', display: 'block' }} />
          </div>
        )}
        {basketPhotoError && <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 10 }}>{basketPhotoError}</p>}

        <input ref={basketPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBasketPhotoChange} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => { basketPhotoInputRef.current?.setAttribute('capture', 'environment'); basketPhotoInputRef.current?.click(); }}
            style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #aa00ff 100%)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            📷 カメラで撮影
          </button>
          <button
            onClick={() => { basketPhotoInputRef.current?.removeAttribute('capture'); basketPhotoInputRef.current?.click(); }}
            style={{ background: 'var(--card2)', color: 'var(--text)', border: '2px solid var(--accent)', borderRadius: 10, padding: '12px 8px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            🖼️ アルバムから
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: requiresUpgrade ? 6 : 10 }}>{error}</p>}
      {requiresUpgrade && (
        <Link href="/premium" style={{
          display: 'block', textAlign: 'center', marginBottom: 10, padding: '10px', borderRadius: 10,
          background: 'linear-gradient(135deg,var(--accent),var(--purple))', color: '#fff', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
        }}>
          ⭐ 会員登録・プランを見る →
        </Link>
      )}

      <button className="btn-primary" onClick={submit} disabled={submitting || (photoRequired && !basketPhoto)} style={{ opacity: submitting || (photoRequired && !basketPhoto) ? 0.5 : 1 }}>
        {submitting ? '登録中...' : (photoRequired && !basketPhoto) ? '📸 写真を添付してください' : 'ランキングに登録！🚀'}
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

export default function ChallengePage() {
  return (
    <Suspense fallback={null}>
      <ChallengeContent />
    </Suspense>
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
            {!!prize.spent && <> · 使った金額¥{prize.spent.toLocaleString()}</>}
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
