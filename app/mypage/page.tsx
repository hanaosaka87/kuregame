'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { CHALLENGE_LABELS } from '@/lib/constants';
import { getStreakBonusPercent, getNextStreakMilestone } from '@/lib/streakBonus';
import { todayStr, type GachaResult } from '@/lib/gacha';
import { resizeImage } from '@/lib/image';
import { shareImage } from '@/lib/share';
import { getLevelInfo, totalXpFromSessions } from '@/lib/level';
import { isLaunchCampaignActive, currentSpendYenPerPoint } from '@/lib/points';
import AppFooter from '@/components/AppFooter';
import PremiumUpgradeButton from '@/components/PremiumUpgradeButton';
import SnsIcon, { type SnsPlatform } from '@/components/SnsIcon';

interface Session {
  id: string;
  nickname: string;
  prefecture: string | null;
  challenge_type: string;
  total_spent: number;
  total_retail_value: number;
  prize_count: number;
  efficiency_rate: number;
  store_name: string | null;
  created_at: string;
  photo_url?: string | null;
}

interface HeadToHead {
  key: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
}

interface PointReward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
}

interface Redemption {
  id: string;
  code: string;
  status: 'issued' | 'used' | 'expired';
  points_spent: number;
  expires_at: string;
  created_at: string;
  point_rewards?: { name: string } | null;
}

function effClass(r: number) {
  if (r >= 200) return 'efficiency-excellent';
  if (r >= 100) return 'efficiency-good';
  if (r >= 50)  return 'efficiency-ok';
  return 'efficiency-bad';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MyPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<'standard' | 'premium' | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimedLocally, setClaimedLocally] = useState(false);
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [snsX, setSnsX] = useState('');
  const [snsInstagram, setSnsInstagram] = useState('');
  const [snsTiktok, setSnsTiktok] = useState('');
  const [snsYoutube, setSnsYoutube] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [accountDeleteConfirmText, setAccountDeleteConfirmText] = useState('');
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState('');

  async function deleteAccount() {
    if (!user || accountDeleteConfirmText !== '削除') return;
    setAccountDeleting(true);
    setAccountDeleteError('');
    try {
      const { data: sessionData } = await getSupabase().auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('認証情報の取得に失敗しました');
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '削除に失敗しました');
      await signOut();
      window.location.href = '/';
    } catch (e) {
      setAccountDeleteError(e instanceof Error ? e.message : '削除に失敗しました。もう一度お試しください。');
    } finally {
      setAccountDeleting(false);
    }
  }

  async function deleteSession(id: string) {
    if (!user) return;
    setDeletingSessionId(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('削除に失敗しました。もう一度お試しください。');
    } finally {
      setDeletingSessionId(null);
      setConfirmDeleteId(null);
    }
  }

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [snsEditOpen, setSnsEditOpen] = useState(false);
  const [favoriteStores, setFavoriteStores] = useState<string[]>([]);
  const [favoriteEditOpen, setFavoriteEditOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [gachaPulling, setGachaPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [gachaError, setGachaError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [referralRedeemed, setReferralRedeemed] = useState<string | null>(null);

  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redeemBusyId, setRedeemBusyId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState('');
  const [redeemResult, setRedeemResult] = useState<{ reward_name: string; code: string; expires_at: string } | null>(null);
  const [pointsOverride, setPointsOverride] = useState<number | null>(null);

  async function pullGacha() {
    if (!user) return;
    setGachaPulling(true);
    setGachaError('');
    try {
      const res = await fetch('/api/gacha/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.alreadyPulled) {
        setGachaError('本日のガチャは引き済みです。また明日挑戦してください！');
      } else if (data.result) {
        setGachaResult(data.result);
      } else {
        setGachaError('ガチャに失敗しました。もう一度お試しください。');
      }
    } catch {
      setGachaError('ガチャに失敗しました。もう一度お試しください。');
    } finally {
      setGachaPulling(false);
    }
  }
  const [headToHead, setHeadToHead] = useState<HeadToHead[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const showcaseInputRef = useRef<HTMLInputElement>(null);
  const [showcaseUploading, setShowcaseUploading] = useState(false);
  const [showcaseError, setShowcaseError] = useState('');
  const [showcasePhotoUrl, setShowcasePhotoUrl] = useState<string | null>(null);
  const [showcaseShareBusy, setShowcaseShareBusy] = useState(false);
  const [showcaseShareToast, setShowcaseShareToast] = useState('');

  async function handleShareShowcase() {
    if (!showcasePhotoUrl) return;
    setShowcaseShareBusy(true);
    try {
      const result = await shareImage(showcasePhotoUrl, 'カートいっぱいの自慢の1枚！🕹️クレゲーで記録しました');
      if (result === 'copied') {
        setShowcaseShareToast('画像リンクをコピーしました！');
        setTimeout(() => setShowcaseShareToast(''), 2500);
      }
    } finally {
      setShowcaseShareBusy(false);
    }
  }

  useEffect(() => {
    setShowcasePhotoUrl(profile?.showcase_photo_url ?? null);
    setAvatarEmoji(profile?.avatar_emoji || '🎮');
    setAvatarUrl(profile?.avatar_url ?? null);
    setSnsX(profile?.sns_x || '');
    setSnsInstagram(profile?.sns_instagram || '');
    setSnsTiktok(profile?.sns_tiktok || '');
    setSnsYoutube(profile?.sns_youtube || '');
    setFavoriteStores(profile?.favorite_stores && profile.favorite_stores.length > 0 ? profile.favorite_stores : []);
    setPointsOverride(null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getSupabase()
      .from('referral_redemptions')
      .select('registered_at, partner_referral_codes(issuer_label)')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as unknown as { partner_referral_codes?: { issuer_label?: string } | null } | null;
        if (row?.partner_referral_codes?.issuer_label) {
          setReferralRedeemed(row.partner_referral_codes.issuer_label);
        }
      });
  }, [user]);

  useEffect(() => {
    fetch('/api/points/rewards').then(res => res.json()).then(data => setRewards(data.rewards || [])).catch(() => setRewards([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    getSupabase()
      .from('point_redemptions')
      .select('id, code, status, points_spent, expires_at, created_at, point_rewards(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRedemptions((data as unknown as Redemption[]) || []));
  }, [user]);

  async function redeemReward(rewardId: string) {
    if (!user) return;
    setRedeemBusyId(rewardId);
    setRedeemError('');
    try {
      const res = await fetch('/api/points/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, reward_id: rewardId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setRedeemError(data.error || '交換に失敗しました');
        return;
      }
      setRedeemResult({ reward_name: data.reward_name, code: data.code, expires_at: data.expires_at });
      setPointsOverride((prev) => (prev ?? profile?.points ?? 0) - data.points_spent);
      // 交換履歴を再取得して画面に反映
      getSupabase()
        .from('point_redemptions')
        .select('id, code, status, points_spent, expires_at, created_at, point_rewards(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data: rows }) => setRedemptions((rows as unknown as Redemption[]) || []));
    } catch {
      setRedeemError('交換に失敗しました。もう一度お試しください');
    } finally {
      setRedeemBusyId(null);
    }
  }

  async function redeemReferralCode() {
    if (!user || !referralCode.trim()) return;
    setReferralBusy(true);
    setReferralError('');
    try {
      const res = await fetch('/api/referral/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, code: referralCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReferralError(data.error || '登録に失敗しました');
        return;
      }
      setReferralRedeemed(data.issuer_label || '登録済み');
      setReferralCode('');
    } catch {
      setReferralError('登録に失敗しました。もう一度お試しください');
    } finally {
      setReferralBusy(false);
    }
  }

  async function handleAvatarPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const { base64, mediaType } = await resizeImage(file, 400);
      const ext = mediaType.split('/')[1] || 'jpg';
      const path = `avatar-${user.id}-${Date.now()}.${ext}`;
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const supabase = getSupabase();
      const { error: uploadErr } = await supabase.storage
        .from('best-photos')
        .upload(path, bytes, { contentType: mediaType, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from('best-photos').getPublicUrl(path);
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      setAvatarUrl(pub.publicUrl);
    } catch {
      setAvatarError('画像の保存に失敗しました。もう一度お試しください。');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function removeAvatarPhoto() {
    if (!user) return;
    setAvatarUploading(true);
    try {
      await getSupabase().from('user_profiles').update({ avatar_url: null }).eq('id', user.id);
      setAvatarUrl(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile(): Promise<boolean> {
    if (!user) return false;
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileSaveError('');
    try {
      const { error } = await getSupabase().from('user_profiles').update({
        avatar_emoji: avatarEmoji,
        sns_x: snsX || null,
        sns_instagram: snsInstagram || null,
        sns_tiktok: snsTiktok || null,
        sns_youtube: snsYoutube || null,
        favorite_stores: favoriteStores.map(s => s.trim()).filter(Boolean),
      }).eq('id', user.id);
      if (error) throw error;
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      return true;
    } catch (e) {
      setProfileSaveError(e instanceof Error ? e.message : '保存に失敗しました。もう一度お試しください。');
      return false;
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveAndClose(close: () => void) {
    const ok = await saveProfile();
    if (ok) close();
  }

  async function handleShowcasePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setShowcaseError('');
    setShowcaseUploading(true);
    try {
      const { base64, mediaType } = await resizeImage(file);
      const ext = mediaType.split('/')[1] || 'jpg';
      const path = `showcase-${user.id}-${Date.now()}.${ext}`;
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const supabase = getSupabase();
      const { error: uploadErr } = await supabase.storage
        .from('best-photos')
        .upload(path, bytes, { contentType: mediaType, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from('best-photos').getPublicUrl(path);
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ showcase_photo_url: pub.publicUrl, showcase_updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      setShowcasePhotoUrl(pub.publicUrl);
    } catch {
      setShowcaseError('写真の保存に失敗しました。もう一度お試しください。');
    } finally {
      setShowcaseUploading(false);
      if (showcaseInputRef.current) showcaseInputRef.current.value = '';
    }
  }

  useEffect(() => {
    if (!user) { setPlan(null); return; }
    (async () => {
      try {
        const { data } = await getSupabase()
          .from('subscriptions')
          .select('plan, status, current_period_end')
          .eq('user_id', user.id)
          .single();
        const active = !!data && data.status === 'active' && !!data.current_period_end && new Date(data.current_period_end) > new Date();
        setPlan(active ? (data.plan === 'premium' ? 'premium' : 'standard') : null);
      } catch {
        setPlan(null);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data } = await getSupabase()
          .from('game_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setSessions(data || []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) { setHeadToHead([]); return; }
    (async () => {
      try {
        const res = await fetch(`/api/battle/head-to-head?user_id=${user.id}`);
        const data = await res.json();
        setHeadToHead(data.records || []);
      } catch {
        setHeadToHead([]);
      }
    })();
  }, [user]);

  if (authLoading || loading) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 20px 100px' }}>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>
        <AppFooter />
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 20px 100px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>📊 マイ戦績</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 24 }}>これまでのチャレンジ結果を振り返れます</p>
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--card)', borderRadius: 16 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔒</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 20 }}>
            マイ戦績を見るにはログインが必要です。<br />ゲストの記録は蓄積されません。
          </p>
          <Link href="/auth"><button className="btn-primary">ログイン / 新規登録</button></Link>
        </div>
        <AppFooter />
      </main>
    );
  }

  const totalCount = sessions.length;
  const totalSpent = sessions.reduce((s, r) => s + r.total_spent, 0);
  const totalRetail = sessions.reduce((s, r) => s + r.total_retail_value, 0);
  const totalPrizes = sessions.reduce((s, r) => s + r.prize_count, 0);
  const bestRate = sessions.reduce((m, r) => Math.max(m, r.efficiency_rate), 0);
  const levelInfo = getLevelInfo(totalXpFromSessions(sessions));

  // 月単位（YYYY-MM）でグルーピング
  const monthlyMap = new Map<string, { count: number; spent: number; retail: number; prizes: number; best: number }>();
  for (const s of sessions) {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    const m = monthlyMap.get(key) || { count: 0, spent: 0, retail: 0, prizes: 0, best: 0 };
    m.count += 1;
    m.spent += s.total_spent;
    m.retail += s.total_retail_value;
    m.prizes += s.prize_count;
    m.best = Math.max(m.best, s.efficiency_rate);
    monthlyMap.set(key, m);
  }
  const monthlyStats = Array.from(monthlyMap.entries()); // sessionsが降順なのでこのままでOK

  const bestPhotoSession = sessions.reduce<Session | null>((best, s) => {
    if (!s.photo_url) return best;
    if (!best || s.efficiency_rate > best.efficiency_rate) return s;
    return best;
  }, null);

  // 自己ベストの記録（写真の有無を問わない）。ここに写真をアップロード・差し替えできるようにする
  const bestSession = sessions.reduce<Session | null>((best, s) => {
    if (!best || s.efficiency_rate > best.efficiency_rate) return s;
    return best;
  }, null);

  async function handleBestPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bestSession) return;
    setPhotoError('');
    setPhotoUploading(true);
    try {
      const { base64, mediaType } = await resizeImage(file);
      const res = await fetch(`/api/sessions/${bestSession.id}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions(prev => prev.map(s => s.id === bestSession.id ? { ...s, photo_url: data.photo_url } : s));
    } catch {
      setPhotoError('写真の保存に失敗しました。もう一度お試しください。');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handleClaimFoundingMember() {
    if (!claimCode.trim() || !user) return;
    setClaiming(true);
    setClaimError('');
    try {
      const res = await fetch('/api/founding-member/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, code: claimCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '合言葉が違います');
      setClaimedLocally(true);
      setClaimCode('');
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : '処理に失敗しました');
    } finally {
      setClaiming(false);
    }
  }

  const displayedPoints = pointsOverride ?? profile?.points ?? 0;

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>📊 マイ戦績</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 16 }}>
        {profile?.nickname || 'あなた'}さんのこれまでの記録
      </p>

      {totalCount > 0 && (
        <div style={{ marginBottom: 16, background: 'var(--card)', borderRadius: 14, padding: '14px 16px', border: '2px solid var(--purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--purple)' }}>⭐ Lv.{levelInfo.level}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              {levelInfo.level >= 100 ? 'カンスト達成！🎉' : `次のレベルまで あと${levelInfo.xpToNext?.toLocaleString()}XP`}
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: 'var(--card2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(levelInfo.progress * 100)}%`, background: 'linear-gradient(90deg, var(--accent), var(--purple))', borderRadius: 6, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 6 }}>
            累計経験値 {levelInfo.xp.toLocaleString()} XP（挑戦するたびに、その回の元取り率ぶんのXPを獲得。上手いほど多くもらえます）
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20, background: 'var(--card)', borderRadius: 14, padding: '14px 16px', border: '2px solid #2fcf8c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#2fcf8c' }}>💎 {displayedPoints.toLocaleString()} pt</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>マイポイント</span>
        </div>
        {isLaunchCampaignActive() && (
          <div style={{
            display: 'inline-block', background: 'linear-gradient(135deg,#2fcf8c,#00e5ff)', color: '#001a12',
            fontSize: '0.68rem', fontWeight: 900, padding: '3px 10px', borderRadius: 20, marginBottom: 8,
          }}>
            🎉 公開記念！還元率2倍キャンペーン中
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          実際に使った金額¥{currentSpendYenPerPoint()}につき1pt
          {isLaunchCampaignActive() && <span style={{ color: '#2fcf8c', fontWeight: 700 }}>（公開記念で通常の2倍！期間限定）</span>}
          ／毎日ログイン＋10pt／連続ログイン達成で+30〜2,000pt／対戦勝利+20pt／フィードの「スゲー！」を送る・もらうで+5pt／紹介コード登録+50pt／月間チャンピオンで+500pt。
          <br />下の「ポイント交換」から引換券と交換できます。ポイントは提携店で順次使えるようにすすめてまいります。
        </div>
      </div>

      {rewards.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>🎁 ポイント交換</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rewards.map(r => {
              const affordable = displayedPoints >= r.points_cost;
              return (
                <div key={r.id} style={{ background: 'var(--card)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>{r.description}</div>}
                    <div style={{ fontSize: '0.78rem', color: '#2fcf8c', fontWeight: 700, marginTop: 4 }}>{r.points_cost.toLocaleString()}pt</div>
                  </div>
                  <button
                    className="btn-primary"
                    disabled={!user || !affordable || redeemBusyId === r.id}
                    onClick={() => redeemReward(r.id)}
                    style={{ fontSize: '.78rem', padding: '8px 14px', flexShrink: 0, width: 'auto', display: 'inline-block', animation: 'none', whiteSpace: 'nowrap', opacity: affordable ? 1 : 0.5 }}
                  >
                    {redeemBusyId === r.id ? '交換中...' : affordable ? '交換する' : 'ポイント不足'}
                  </button>
                </div>
              );
            })}
          </div>
          {redeemError && <p style={{ color: 'var(--accent)', fontSize: '.78rem', marginTop: 8 }}>{redeemError}</p>}
        </div>
      )}

      {redeemResult && (
        <div
          onClick={() => setRedeemResult(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', border: '2px solid #2fcf8c' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>{redeemResult.reward_name}</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 14 }}>この画面を提携店舗のスタッフに見せてください</p>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.15em', background: 'var(--card2)', borderRadius: 10, padding: '14px 10px', marginBottom: 10 }}>
              {redeemResult.code}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 16 }}>
              有効期限：{new Date(redeemResult.expires_at).toLocaleDateString('ja-JP')}まで
            </p>
            <button className="btn-secondary" onClick={() => setRedeemResult(null)} style={{ width: '100%' }}>閉じる</button>
          </div>
        </div>
      )}

      {redemptions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>🎟️ 交換履歴</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {redemptions.map(r => (
              <div key={r.id} style={{ background: 'var(--card)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{r.point_rewards?.name ?? '景品'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--num)' }}>{r.code}</div>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                  background: r.status === 'used' ? 'var(--card2)' : r.status === 'expired' ? 'rgba(255,61,175,.12)' : 'rgba(47,207,140,.15)',
                  color: r.status === 'used' ? 'var(--muted)' : r.status === 'expired' ? 'var(--accent)' : '#2fcf8c',
                }}>
                  {r.status === 'used' ? '使用済み' : r.status === 'expired' ? '期限切れ' : '未使用'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(profile?.founding_member || claimedLocally) ? (
        <div style={{ marginBottom: 16, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--gold)', marginBottom: 4 }}>🌟 創業メンバー認定</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>
            永久に使える無料特典・創業メンバー限定バッチ・「アイデア広場」への投稿権を<strong>ずっと</strong>ご利用いただけます。
          </p>
          <Link href="/ideas" style={{
            display: 'inline-block', fontSize: '.78rem', fontWeight: 700, color: 'var(--gold)',
            border: '1px solid rgba(255,215,0,0.35)', borderRadius: 8, padding: '6px 12px', textDecoration: 'none',
          }}>
            💡 アイデア広場でクレゲーを一緒に良くする →
          </Link>
        </div>
      ) : (
        <div style={{ marginBottom: 16, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontWeight: 900, fontSize: '0.92rem', marginBottom: 4 }}>🌟 先着1,000名 創業メンバー特典</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>
            公式LINEを友だち追加して「クレゲー」と送信すると、合言葉が届きます。ここに入力すると永久無料特典を受け取れます。
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: claimError ? 6 : 0 }}>
            <input
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="合言葉を入力"
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: '.82rem' }}
            />
            <button type="button" onClick={handleClaimFoundingMember} disabled={claiming || !claimCode.trim()} className="btn-primary" style={{ fontSize: '.78rem', padding: '8px 14px', whiteSpace: 'nowrap' }}>
              {claiming ? '確認中...' : '受け取る'}
            </button>
          </div>
          {claimError && <p style={{ color: 'var(--accent)', fontSize: '.74rem' }}>{claimError}</p>}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <PremiumUpgradeButton userId={user.id} email={user.email} plan={plan} foundingMember={profile?.founding_member || claimedLocally} />
      </div>

      <div style={{ marginBottom: 24, background: 'var(--card)', borderRadius: 14, padding: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>🙂 プロフィール設定</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>アイコン画像（任意・自分の写真を設定できます）</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{
              width: avatarUrl ? 92 : 56, height: avatarUrl ? 92 : 56, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', flexShrink: 0, border: `2px solid ${avatarUrl ? 'var(--accent)' : 'var(--line)'}`,
              transition: 'width .2s, height .2s',
            }}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="アイコン" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : avatarEmoji}
            </div>
            <div style={{ display: 'flex', gap: 6, flexDirection: avatarUrl ? 'column' : 'row' }}>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPhotoChange} />
              <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                className="btn-secondary" style={avatarUrl ? { fontSize: '.68rem', padding: '4px 10px' } : { fontSize: '.78rem', padding: '8px 12px' }}>
                {avatarUploading ? '処理中...' : avatarUrl ? '変更' : '画像を設定'}
              </button>
              {avatarUrl && (
                <button type="button" onClick={removeAvatarPhoto} disabled={avatarUploading} className="btn-secondary" style={{ fontSize: '.68rem', padding: '4px 10px' }}>
                  削除
                </button>
              )}
            </div>
          </div>
          {avatarError && <p style={{ color: 'var(--accent)', fontSize: '.78rem', marginBottom: 8 }}>{avatarError}</p>}
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{avatarUrl ? '画像を削除した場合に使う絵文字アイコン' : '絵文字アイコン'}</label>
          {emojiPickerOpen ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['🎮', '🕹️', '👾', '🎯', '🧸', '🎁', '🐱', '🐶', '🦊', '🐻', '🌟', '🔥', '👑', '💎', '🍀', '⚡'].map(e => (
                <button key={e} type="button" onClick={() => { setAvatarEmoji(e); setEmojiPickerOpen(false); }}
                  style={{
                    width: 38, height: 38, fontSize: '1.2rem', borderRadius: '50%', cursor: 'pointer',
                    border: `2px solid ${avatarEmoji === e ? 'var(--accent)' : 'var(--line)'}`,
                    background: avatarEmoji === e ? 'rgba(255,61,175,.18)' : 'var(--card2)',
                  }}>
                  {e}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: avatarUrl ? 38 : 64, height: avatarUrl ? 38 : 64, fontSize: avatarUrl ? '1.2rem' : '2rem',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--accent)', background: 'rgba(255,61,175,.18)', transition: 'width .2s, height .2s',
              }}>
                {avatarEmoji}
              </div>
              <button type="button" onClick={() => setEmojiPickerOpen(true)} className="btn-secondary"
                style={avatarUrl ? { fontSize: '.76rem', padding: '6px 10px' } : { fontSize: '.68rem', padding: '4px 10px' }}>
                絵文字を変更
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            SNSアカウント（URL・任意）
            {plan !== 'premium' && (
              <span style={{ color: 'var(--muted2)' }}>　※プレミアム会員は目指せランキング入り！上位30位以内でSNSが表示・宣伝されます</span>
            )}
          </label>
          {snsEditOpen ? (
            <>
              <input type="text" placeholder="X（Twitter）のURL" value={snsX} onChange={e => setSnsX(e.target.value)} style={{ marginBottom: 6 }} />
              <input type="text" placeholder="InstagramのURL" value={snsInstagram} onChange={e => setSnsInstagram(e.target.value)} style={{ marginBottom: 6 }} />
              <input type="text" placeholder="TikTokのURL" value={snsTiktok} onChange={e => setSnsTiktok(e.target.value)} style={{ marginBottom: 6 }} />
              <input type="text" placeholder="YouTubeのURL" value={snsYoutube} onChange={e => setSnsYoutube(e.target.value)} style={{ marginBottom: 8 }} />
              {profileSaveError && <p style={{ color: 'var(--accent)', fontSize: '.74rem', marginBottom: 6 }}>{profileSaveError}</p>}
              <button type="button" disabled={profileSaving} onClick={() => saveAndClose(() => setSnsEditOpen(false))} className="btn-primary" style={{ fontSize: '.76rem', padding: '6px 10px' }}>
                {profileSaving ? '保存中...' : '保存して閉じる'}
              </button>
            </>
          ) : (
            <div>
              {[
                { v: snsX, label: 'X', platform: 'x' as SnsPlatform }, { v: snsInstagram, label: 'Instagram', platform: 'instagram' as SnsPlatform },
                { v: snsTiktok, label: 'TikTok', platform: 'tiktok' as SnsPlatform }, { v: snsYoutube, label: 'YouTube', platform: 'youtube' as SnsPlatform },
              ].filter(s => s.v).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {[
                    { v: snsX, label: 'X', platform: 'x' as SnsPlatform, bg: '#000000', border: '1px solid rgba(255,255,255,.4)' },
                    { v: snsInstagram, label: 'Instagram', platform: 'instagram' as SnsPlatform, bg: 'linear-gradient(135deg,#feda75,#d62976,#4f5bd5)' },
                    { v: snsTiktok, label: 'TikTok', platform: 'tiktok' as SnsPlatform, bg: '#000000' },
                    { v: snsYoutube, label: 'YouTube', platform: 'youtube' as SnsPlatform, bg: '#FF0000' },
                  ].filter(s => s.v).map(s => (
                    <a key={s.label} href={s.v} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                        textDecoration: 'none', background: s.bg, border: s.border || 'none',
                        borderRadius: 14, padding: '10px 16px', minWidth: 72,
                      }}>
                      <SnsIcon platform={s.platform} size={30} />
                      <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#fff' }}>{s.label}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 8 }}>まだ登録されていません</p>
              )}
              <button type="button" onClick={() => setSnsEditOpen(true)} className="btn-secondary" style={{ fontSize: '.76rem', padding: '6px 10px' }}>
                SNSリンクを{[snsX, snsInstagram, snsTiktok, snsYoutube].some(Boolean) ? '編集' : '登録'}する
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 4, marginTop: 16 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            🏪 お気に入り店舗（任意・複数登録できます）
          </label>
          {favoriteEditOpen ? (
            <>
              {favoriteStores.map((store, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="text"
                    placeholder="店舗名（例：GiGO秋葉原店）"
                    value={store}
                    onChange={e => setFavoriteStores(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                    style={{ flex: '1 1 auto', minWidth: 0, width: 'auto' }}
                  />
                  <button
                    type="button"
                    onClick={() => setFavoriteStores(prev => prev.filter((_, idx) => idx !== i))}
                    className="btn-secondary"
                    style={{ fontSize: '.76rem', padding: '6px 10px', flex: '0 0 auto', width: 'auto' }}
                  >
                    削除
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 8 }}>
                {favoriteStores.length < 10 && (
                  <button type="button" onClick={() => setFavoriteStores(prev => [...prev, ''])} className="btn-secondary" style={{ fontSize: '.76rem', padding: '6px 10px' }}>
                    + 店舗を追加
                  </button>
                )}
                <button type="button" disabled={profileSaving} onClick={() => saveAndClose(() => setFavoriteEditOpen(false))} className="btn-primary" style={{ fontSize: '.76rem', padding: '6px 10px' }}>
                  {profileSaving ? '保存中...' : '保存して閉じる'}
                </button>
              </div>
              {profileSaveError && <p style={{ color: 'var(--accent)', fontSize: '.74rem', marginTop: 6 }}>{profileSaveError}</p>}
            </>
          ) : (
            <div>
              {favoriteStores.filter(Boolean).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {favoriteStores.filter(Boolean).map((store, i) => (
                    <span key={i} style={{ fontSize: '.76rem', background: 'var(--card2)', borderRadius: 20, padding: '4px 12px', color: 'var(--text)', border: '1px solid var(--line)' }}>
                      🏪 {store}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 8 }}>まだ登録されていません</p>
              )}
              <button type="button" onClick={() => setFavoriteEditOpen(true)} className="btn-secondary" style={{ fontSize: '.76rem', padding: '6px 10px' }}>
                お気に入り店舗を{favoriteStores.filter(Boolean).length > 0 ? '編集' : '登録'}する
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 4, marginTop: 16 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            🎟️ 紹介コード（任意）
          </label>
          {referralRedeemed ? (
            <p style={{ fontSize: '.78rem', color: 'var(--text)' }}>✅ 「{referralRedeemed}」さん経由で登録済みです</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  type="text"
                  placeholder="紹介コードをお持ちの方はこちら"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  style={{ flex: '1 1 auto', minWidth: 0, width: 'auto' }}
                />
                <button type="button" onClick={redeemReferralCode} disabled={referralBusy || !referralCode.trim()} className="btn-secondary" style={{ fontSize: '.76rem', padding: '6px 10px', flex: '0 0 auto', width: 'auto' }}>
                  {referralBusy ? '登録中...' : '登録'}
                </button>
              </div>
              {referralError && <p style={{ color: 'var(--accent)', fontSize: '.76rem' }}>⚠️ {referralError}</p>}
            </>
          )}
        </div>

        {profileSaveError && <p style={{ color: 'var(--accent)', fontSize: '.78rem', marginTop: 10 }}>⚠️ {profileSaveError}</p>}
        <button type="button" onClick={saveProfile} disabled={profileSaving} className="btn-secondary" style={{ marginTop: 10 }}>
          {profileSaving ? '保存中...' : profileSaved ? '✅ 保存しました' : '保存する'}
        </button>
      </div>

      {!!profile?.login_streak && (
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 2 }}>🔥 連続ログイン</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)' }}>{profile.login_streak}日目</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            {(() => {
              const next = getNextStreakMilestone(profile.login_streak || 0);
              const current = getStreakBonusPercent(profile.login_streak || 0);
              return (
                <>
                  {current > 0 && <div style={{ color: 'var(--green)' }}>今の元取り率ボーナス +{current}%</div>}
                  {next && <div>あと{next.days - (profile.login_streak || 0)}日で+{next.bonus}%</div>}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 本日のガチャ */}
      <div style={{ background: 'var(--card)', borderRadius: 14, padding: '16px', marginBottom: 20, border: '2px dashed var(--purple)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>🎰 本日のガチャ</h3>
        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          1日1回引ける無料ガチャ。当たると本日中のチャレンジの元取り率にボーナスがつきます。
        </p>

        {gachaResult ? (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>{gachaResult.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: gachaResult.percent > 0 ? 'var(--gold)' : 'var(--muted)' }}>{gachaResult.label}</div>
            {gachaResult.percent > 0 && (
              <p style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 6 }}>本日中に登録するチャレンジの元取り率に+{gachaResult.percent}%されます</p>
            )}
          </div>
        ) : (
          <>
            {profile?.last_gacha_date === todayStr() ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                本日は引き済みです（{profile?.gacha_bonus_percent ? `+${profile.gacha_bonus_percent}%適用中` : 'はずれ'}）。また明日！
              </p>
            ) : (
              <button className="btn-primary" onClick={pullGacha} disabled={gachaPulling}>
                {gachaPulling ? '抽選中...' : '🎰 ガチャを引く'}
              </button>
            )}
            {gachaError && <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: 8 }}>{gachaError}</p>}
          </>
        )}
      </div>

      {totalCount > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>📊 通算実績</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[
              { label: '挑戦回数', value: `${totalCount}回` },
              { label: '自己ベスト', value: `${bestRate}%` },
              { label: '獲得アイテム', value: `${totalPrizes}個` },
              { label: '定価比 得した額', value: `${totalRetail - totalSpent >= 0 ? '+' : ''}¥${(totalRetail - totalSpent).toLocaleString()}` },
              { label: '通算投入金額', value: `¥${totalSpent.toLocaleString()}` },
              { label: '通算元取り率', value: `${totalSpent > 0 ? Math.round((totalRetail / totalSpent) * 1000) / 10 : 0}%` },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthlyStats.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>📅 月別戦績</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monthlyStats.map(([month, m]) => (
              <div key={month} style={{ background: 'var(--card)', borderRadius: 14, padding: '12px 16px', border: '2px solid var(--card2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{month}</span>
                  <span className={effClass(m.best)} style={{ fontWeight: 900, fontSize: '1.05rem' }}>自己ベスト {m.best}%</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  挑戦{m.count}回 ・ 投入¥{m.spent.toLocaleString()} → 定価¥{m.retail.toLocaleString()}（{m.prizes}個）
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {headToHead.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>⚔️ 対戦成績</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {headToHead.map((r) => (
              <div key={r.key} style={{ background: 'var(--card)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>対 {r.name}さん</span>
                <span style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 900 }}>{r.wins}勝</span>
                  {' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{r.losses}敗</span>
                  {r.draws > 0 && <span style={{ color: 'var(--muted)' }}> {r.draws}分</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bestSession && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>🏆 最高ゲット写真</h3>
          {bestPhotoSession ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '2px solid var(--gold)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bestPhotoSession.photo_url!} alt="最高ゲット写真" style={{ width: '100%', display: 'block' }} />
              <div style={{ padding: '8px 14px', background: 'var(--card)', fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{formatDate(bestPhotoSession.created_at)} ・ 元取り率 <span className={effClass(bestPhotoSession.efficiency_rate)} style={{ fontWeight: 900 }}>{bestPhotoSession.efficiency_rate}%</span></span>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}
                >
                  {photoUploading ? '保存中...' : '🖼 写真を変更'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, textAlign: 'center', border: '2px dashed var(--card2)' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
                自己ベスト（{bestSession.efficiency_rate}%）の写真がまだありません
              </p>
              <button className="btn-secondary" onClick={() => photoInputRef.current?.click()} disabled={photoUploading}>
                {photoUploading ? '保存中...' : '📸 写真を追加'}
              </button>
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBestPhotoUpload}
          />
          {photoError && <p style={{ color: 'var(--accent)', fontSize: '0.78rem', marginTop: 8 }}>{photoError}</p>}
        </div>
      )}

      {totalCount === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎮</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 20 }}>まだ記録がありません</p>
          <Link href="/challenge"><button className="btn-primary">🎯 チャレンジする</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ background: 'var(--card)', borderRadius: 14, padding: '12px 16px', border: '2px solid var(--card2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{formatDate(s.created_at)}</span>
                    {s.prefecture && <span style={{ fontSize: '0.7rem', background: 'var(--card2)', padding: '1px 6px', borderRadius: 8, color: 'var(--muted)' }}>{s.prefecture}</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    ¥{s.total_spent.toLocaleString()} → ¥{s.total_retail_value.toLocaleString()}（{s.prize_count}個）
                    {s.store_name && <span style={{ color: 'var(--muted)' }}> · {s.store_name}</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--card2)', marginTop: 2 }}>{CHALLENGE_LABELS[s.challenge_type] ?? s.challenge_type}</div>
                </div>
                <div className={effClass(s.efficiency_rate)} style={{ fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>{s.efficiency_rate}%</div>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', flexShrink: 0, padding: 4 }}
                  aria-label="この記録を削除"
                >
                  🗑
                </button>
              </div>
              {confirmDeleteId === s.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--card2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>登録間違いなどで削除しますか？この操作は取り消せません。</span>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    disabled={deletingSessionId === s.id}
                    style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {deletingSessionId === s.id ? '削除中...' : '削除する'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/challenge"><button className="btn-primary">🎯 もう一度チャレンジする</button></Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>📸 自慢の一枚</h3>
        {showcasePhotoUrl ? (
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '2px solid var(--gold)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={showcasePhotoUrl} alt="自慢の一枚" style={{ width: '100%', display: 'block' }} />
            <div style={{ padding: '8px 14px', background: 'var(--card)', fontSize: '0.78rem', display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
              <button
                onClick={handleShareShowcase}
                disabled={showcaseShareBusy}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {showcaseShareBusy ? '準備中...' : '📤 SNS投稿・友達に送る'}
              </button>
              <button
                onClick={() => showcaseInputRef.current?.click()}
                disabled={showcaseUploading}
                style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {showcaseUploading ? '保存中...' : '🖼 写真を変更'}
              </button>
            </div>
            {showcaseShareToast && (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--green)', padding: '0 14px 10px', background: 'var(--card)' }}>
                ✅ {showcaseShareToast}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, textAlign: 'center', border: '2px dashed var(--card2)' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>
              カートいっぱいの自慢の1枚を記録しよう。
            </p>
            <button className="btn-secondary" onClick={() => showcaseInputRef.current?.click()} disabled={showcaseUploading}>
              {showcaseUploading ? '保存中...' : '📸 写真を追加'}
            </button>
          </div>
        )}
        <input
          ref={showcaseInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleShowcasePhotoChange}
        />
        {showcaseError && <p style={{ color: 'var(--accent)', fontSize: '0.78rem', marginTop: 8 }}>{showcaseError}</p>}
      </div>

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px dashed var(--card2)' }}>
        <button
          type="button"
          onClick={() => setAccountDeleteOpen((v) => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
        >
          ⚠️ アカウントを削除する
        </button>
        {accountDeleteOpen && (
          <div style={{ marginTop: 12, background: 'var(--card)', borderRadius: 14, padding: 16, border: '2px solid var(--accent)' }}>
            <p style={{ fontSize: '0.8rem', marginBottom: 8 }}>
              アカウントを削除すると、プロフィール・チャレンジ記録・獲得アイテム写真・ポイント・プレミアム会員情報など、あなたのすべてのデータが削除されます。<strong>この操作は取り消せません。</strong>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
              削除を実行するには「削除」と入力してください。
            </p>
            <input
              type="text"
              value={accountDeleteConfirmText}
              onChange={(e) => setAccountDeleteConfirmText(e.target.value)}
              placeholder="削除"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '2px solid var(--card2)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.85rem', marginBottom: 10 }}
            />
            {accountDeleteError && <p style={{ color: 'var(--accent)', fontSize: '0.78rem', marginBottom: 10 }}>{accountDeleteError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={accountDeleteConfirmText !== '削除' || accountDeleting}
                style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: accountDeleteConfirmText === '削除' ? 'pointer' : 'not-allowed', opacity: accountDeleteConfirmText === '削除' ? 1 : 0.5 }}
              >
                {accountDeleting ? '削除中...' : 'アカウントを完全に削除する'}
              </button>
              <button
                type="button"
                onClick={() => { setAccountDeleteOpen(false); setAccountDeleteConfirmText(''); setAccountDeleteError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      <AppFooter />
    </main>
  );
}
