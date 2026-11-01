'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChallengeType } from '@/lib/supabase';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { shareApp } from '@/lib/share';
import AppFooter from '@/components/AppFooter';

interface Session {
  id: string;
  nickname: string;
  challenge_type: string;
  total_spent: number;
  total_retail_value: number;
  prize_count: number;
  efficiency_rate: number;
  store_name: string | null;
  created_at: string;
}

const CHALLENGES: { type: ChallengeType; label: string }[] = [
  { type: '1000', label: '1,000円' },
  { type: '3000', label: '3,000円' },
  { type: '5000', label: '5,000円' },
  { type: '10000', label: '1万円' },
  { type: 'free', label: 'フリー' },
];

const MISSION_DEFS = [
  { key: 'first' as const,  icon: '🎯', title: '初めてのチャレンジ',     xp: '+50XP' },
  { key: 'rate100' as const, icon: '🏆', title: '元取り率100%を達成',   xp: '+100XP' },
  { key: 'rate200' as const, icon: '👑', title: '元取り率200%を達成',   xp: '+300XP' },
];

const BADGE_DEFS = [
  { key: 'first',      icon: '🎯', name: '初回挑戦' },
  { key: 'over200',    icon: '👑', name: '200%超え' },
  { key: 'streak3',    icon: '🔥', name: '3連勝' },
  { key: 'nationwide', icon: '🗾', name: '全国区' },
  { key: 'tenk',       icon: '💰', name: '1万円投入' },
  { key: 'hopping',    icon: '🎪', name: 'ゲーセン巡り' },
  { key: 'monthly1',   icon: '📅', name: '月間1位' },
  { key: 'legend',     icon: '🏅', name: '伝説の達人' },
] as const;

function effClass(rate: number) {
  if (rate >= 200) return 'eff-excellent';
  if (rate >= 100) return 'eff-good';
  if (rate >= 50)  return 'eff-ok';
  return 'eff-bad';
}
function effEmoji(rate: number) {
  if (rate >= 300) return '👑';
  if (rate >= 200) return '🔥';
  if (rate >= 100) return '✨';
  if (rate >= 50)  return '😊';
  return '😢';
}
function rankClass(i: number) {
  if (i === 0) return 'rank gold';
  if (i === 1) return 'rank silver';
  if (i === 2) return 'rank bronze';
  return 'rank';
}

export default function TopPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ChallengeType | 'all'>('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthStats, setMonthStats] = useState({ count: 0, topRate: 0, challengers: 0 });
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());
  const [missionStatus, setMissionStatus] = useState({ first: false, rate100: false, rate200: false });
  const [shareToast, setShareToast] = useState('');

  async function handleShareApp() {
    const result = await shareApp();
    if (result === 'copied') {
      setShareToast('リンクをコピーしました！');
      setTimeout(() => setShareToast(''), 2500);
    }
  }

  useEffect(() => { fetchRanking(activeTab); }, [activeTab]);
  useEffect(() => { fetchMonthStats(); }, []);
  // チャレンジ登録後に戻ってきた際、ブラウザのbfcache等で古い表示のまま固まらないよう、
  // 画面に復帰したタイミングで今月の集計・ランキングを再取得する
  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState === 'visible') {
        fetchMonthStats();
        fetchRanking(activeTab);
      }
    }
    window.addEventListener('pageshow', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      window.removeEventListener('pageshow', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [activeTab]);
  useEffect(() => {
    if (user) fetchMyBadges(user.id);
    else { setUnlockedBadges(new Set()); setMissionStatus({ first: false, rate100: false, rate200: false }); }
  }, [user]);

  // 自分の実際のチャレンジ履歴からバッジ・ミッションの達成状況を判定する
  async function fetchMyBadges(userId: string) {
    try {
      const { data } = await getSupabase()
        .from('game_sessions')
        .select('efficiency_rate, challenge_type, total_spent, store_name, prefecture, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const rows = data || [];

      setMissionStatus({
        first: rows.length > 0,
        rate100: rows.some(r => r.efficiency_rate >= 100),
        rate200: rows.some(r => r.efficiency_rate >= 200),
      });

      const unlocked = new Set<string>();

      if (rows.length > 0) unlocked.add('first');
      if (rows.some(r => r.efficiency_rate >= 200)) unlocked.add('over200');
      if (rows.some(r => r.efficiency_rate >= 300)) unlocked.add('legend');
      if (rows.some(r => r.challenge_type === '10000' || r.total_spent >= 10000)) unlocked.add('tenk');

      const stores = new Set(rows.map(r => r.store_name).filter(Boolean));
      if (stores.size >= 3) unlocked.add('hopping');

      const prefs = new Set(rows.map(r => r.prefecture).filter(Boolean));
      if (prefs.size >= 3) unlocked.add('nationwide');

      for (let i = 0; i + 2 < rows.length; i++) {
        if (rows[i].efficiency_rate >= 100 && rows[i + 1].efficiency_rate >= 100 && rows[i + 2].efficiency_rate >= 100) {
          unlocked.add('streak3');
          break;
        }
      }

      const { data: champRows } = await getSupabase()
        .from('v_monthly_champions')
        .select('year_month')
        .eq('user_id', userId)
        .limit(1);
      if (champRows && champRows.length > 0) unlocked.add('monthly1');

      setUnlockedBadges(unlocked);
    } catch {
      setUnlockedBadges(new Set());
      setMissionStatus({ first: false, rate100: false, rate200: false });
    }
  }

  // トップページには上位5位のみ表示する（全件はランキングページで確認）
  const TOP_PAGE_RANKING_LIMIT = 5;

  async function fetchRanking(challenge: ChallengeType | 'all') {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?challenge=${challenge}`);
      const data = await res.json();
      setSessions((data.sessions || []).slice(0, TOP_PAGE_RANKING_LIMIT));
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  // 今月のCHALLENGES/TOP RATE/CHALLENGERSは、上位20件に丸めず今月の全件から集計する
  async function fetchMonthStats() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count } = await getSupabase()
        .from('game_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth);

      const { data: rateRows } = await getSupabase()
        .from('game_sessions')
        .select('efficiency_rate')
        .gte('created_at', startOfMonth)
        .order('efficiency_rate', { ascending: false })
        .limit(1);

      const { data: nicknameRows } = await getSupabase()
        .from('game_sessions')
        .select('nickname')
        .gte('created_at', startOfMonth);

      const uniqueChallengers = new Set((nicknameRows || []).map(r => r.nickname)).size;

      // CHALLENGERSは2026-10-19〜2027-01-19の立ち上げ期間限定、表示上のみ+223（実データは変更しない）。
      // CHALLENGES（今月の記録）は常時+389（社長指示2026-11-01に450→389へ調整）。
      const DISPLAY_BOOST_UNTIL = new Date('2027-01-19T00:00:00+09:00');
      const challengersBoost = now < DISPLAY_BOOST_UNTIL ? 223 : 0;
      const CHALLENGES_BOOST = 389;

      setMonthStats({
        count: (count || 0) + CHALLENGES_BOOST,
        topRate: rateRows?.[0]?.efficiency_rate ?? 0,
        challengers: uniqueChallengers + challengersBoost,
      });
    } catch {
      setMonthStats({ count: 0, topRate: 0, challengers: 0 });
    }
  }

  return (
    <main className="app">
      {/* ===== HERO ===== */}
      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-bg.jpeg" alt="" className="hero-img" />
        <div className="hero-veil" />
        <div className="hero-crt" />
        <div className="hero-scan" />
        <div className="hero-badges">
          <span className="badge-season">SEASON 1</span>
        </div>
        <span className="badge-timer">🏆 月間ランキング進行中</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-claw.png" alt="" className="hero-claw" />
        <div className="hero-copy">
          <h1>クレゲー</h1>
          <p>元取り率で競う全国ランキング<br />あなたの"強さ"を証明しろ</p>
          <p className="hero-extra">友達・カップル・家族と、今ここで腕試し！<br />写真を撮るだけでAIが自動判定</p>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">CHALLENGES</div>
          <div className="stat-val">{monthStats.count}<span style={{fontSize:'.7rem',fontWeight:400,color:'var(--muted)',fontFamily:'inherit'}}> 件</span></div>
          <div className="stat-note">今月の記録</div>
        </div>
        <div className="stat">
          <div className="stat-label">TOP RATE</div>
          <div className="stat-val" style={{color: monthStats.topRate >= 200 ? 'var(--gold)' : 'var(--accent)'}}>{monthStats.topRate}<span style={{fontSize:'.7rem',fontWeight:400,color:'var(--muted)',fontFamily:'inherit'}}>%</span></div>
          <div className="stat-note">今月の最高元取り率</div>
        </div>
        <div className="stat">
          <div className="stat-label">CHALLENGERS</div>
          <div className="stat-val">{monthStats.challengers}<span style={{fontSize:'.7rem',fontWeight:400,color:'var(--muted)',fontFamily:'inherit'}}> 人</span></div>
          <div className="stat-note">今月の参加者数</div>
        </div>
      </div>

      {/* ===== AUTH BANNER ===== */}
      {!authLoading && (
        user && profile ? (
          <div className="user-banner">
            <div className="user-banner-avatar">{profile.avatar_emoji || '🎮'}</div>
            <div className="user-banner-info">
              <div className="user-banner-name">{profile.nickname}</div>
              {profile.prefecture && <div className="user-banner-sub">📍 {profile.prefecture}</div>}
            </div>
            <Link href="/ranking">
              <button className="btn-beat">🏆 ランキング</button>
            </Link>
          </div>
        ) : (
          <div className="guest">
            <div className="guest-title">🎯 ランキングに参戦しよう！</div>
            <p>ログインすると戦績を保存して全国ランキングに参加できます。都道府県の月間チャンピオンを目指せ！</p>
            <Link href="/auth"><button className="guest-btn">無料でログイン・登録</button></Link>
          </div>
        )
      )}

      {/* ===== CTA ===== */}
      <div className="cta" style={{marginTop: 4}}>
        <Link href="/challenge">
          <button className="btn-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banner-challenge-start.webp" alt="チャレンジ開始！フリー・対戦モード・1,000円〜1万円で挑戦" />
          </button>
        </Link>
        <Link href="/oneshot">
          <button className="btn-banner" style={{ marginTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banner-oneshot.webp" alt="一撃ゲットチャレンジ 100円（1プレイ）でゲット！専用ランキングに挑戦" />
          </button>
        </Link>
        <button className="btn-share" style={{ width: '100%', marginTop: 8 }} onClick={handleShareApp}>
          🤝 このアプリを友達に教える
        </button>
        {shareToast && (
          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--green)', marginTop: 6 }}>
            ✅ {shareToast}
          </div>
        )}
        <div className="cta-row">
          <Link href="/ranking" style={{flex:1}}>
            <button className="btn-sub" style={{width:'100%'}}>🏆 全国ランキング</button>
          </Link>
          <Link href="/ranking?tab=monthly" style={{flex:1}}>
            <button className="btn-sub" style={{width:'100%'}}>👑 月間覇者</button>
          </Link>
        </div>
        <Link href="/tournament">
          <button className="btn-sub" style={{ width: '100%', marginTop: 8 }}>🏯 全国大会への道</button>
        </Link>
        <Link href="/sponsor">
          <button className="btn-sub" style={{ width: '100%', marginTop: 8 }}>🤝 スポンサー募集</button>
        </Link>
      </div>

      {/* ===== MISSIONS ===== */}
      <div className="sec-head">
        <h2>⚡ ミッション</h2>
        <span className="sec-note">クリアしてXPをゲット</span>
      </div>
      <div className="list">
        {MISSION_DEFS.map((m, i) => {
          const done = missionStatus[m.key];
          const locked = m.key === 'rate200' && !done;
          return (
            <div key={i} className={`mission${done ? ' done' : locked ? ' locked' : ''}`}>
              <div className="mission-icon">{m.icon}</div>
              <div className="mission-body">
                <div className="mission-title">{m.title}</div>
                <div className="bar"><span style={{width: `${done ? 100 : 0}%`}} /></div>
              </div>
              <div className="mission-right">
                <div className="mission-prog">{done ? '1/1' : '0/1'}</div>
                <div className="mission-xp">{m.xp}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== RANKING ===== */}
      <div className="sec-head">
        <h2>🏆 元取り率ランキング</h2>
        {!loading && <span className="sec-count">{sessions.length} 件</span>}
      </div>

      {/* タブ */}
      <div className="tabs">
        {[{type:'all' as const, label:'すべて'}, ...CHALLENGES].map(c => (
          <button
            key={c.type}
            className={`tab${activeTab === c.type ? ' active' : ''}`}
            onClick={() => setActiveTab(c.type)}
          >
            {c.type === 'all' ? 'すべて' : c.label}
          </button>
        ))}
      </div>

      {/* リスト */}
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:8}}>
        {loading ? (
          <div style={{textAlign:'center', padding:40, color:'var(--muted)'}}>読み込み中...</div>
        ) : sessions.length === 0 ? (
          <div style={{textAlign:'center', padding:40}}>
            <div style={{fontSize:'2rem', marginBottom:8}}>🎮</div>
            <p style={{color:'var(--muted)', fontSize:'.9rem'}}>まだ記録がありません。<br />最初のチャレンジャーになろう！</p>
          </div>
        ) : (
          sessions.map((s, i) => (
            <div key={s.id} className={rankClass(i)}>
              <div className="rank-badge">{i === 0 ? '👑' : i + 1}</div>
              <div className="rank-info">
                <div className="rank-name">
                  <strong>{s.nickname}</strong>
                  <span className="rank-chip">{s.challenge_type === 'free' ? 'フリー' : `${Number(s.challenge_type).toLocaleString()}円`}</span>
                </div>
                <div className="rank-detail">
                  投入¥{s.total_spent.toLocaleString()} → 定価¥{s.total_retail_value.toLocaleString()}（{s.prize_count}個）{s.store_name ? ` · ${s.store_name}` : ''}
                </div>
              </div>
              <div className="rank-rate">
                <div className={`rate-val ${effClass(s.efficiency_rate)}`}>{effEmoji(s.efficiency_rate)} {s.efficiency_rate}%</div>
                <div className="rate-label">元取り率</div>
              </div>
            </div>
          ))
        )}
      </div>
      {!loading && sessions.length > 0 && (
        <div style={{ padding: '10px 16px 0' }}>
          <Link href="/ranking" style={{ display: 'block', textAlign: 'center', fontSize: '.8rem', color: 'var(--accent)', fontWeight: 700 }}>
            全ランキングを見る →
          </Link>
        </div>
      )}

      {/* ===== BADGES ===== */}
      <div className="sec-head">
        <h2>🏅 バッジ</h2>
        <span className="sec-note">実績を解除しよう</span>
      </div>
      {!authLoading && !user && (
        <p style={{ padding: '0 16px', fontSize: '.7rem', color: 'var(--muted)', marginBottom: 8 }}>
          🔒 ログインするとバッジの獲得状況が記録されます
        </p>
      )}
      <div className="badges-grid">
        {BADGE_DEFS.map((b) => (
          <div key={b.key} className={`badge-item${unlockedBadges.has(b.key) ? '' : ' locked'}`}>
            <div className="badge-item-icon">{b.icon}</div>
            <div className="badge-item-name">{b.name}</div>
          </div>
        ))}
      </div>

      {/* ===== HOW TO ===== */}
      <div className="howto">
        <h3>🕹️ 遊び方</h3>
        <div className="steps">
          <div className="step"><div className="step-n">1</div><p>チャレンジ金額を選ぶ（フリー・対戦モード・1,000円〜1万円）</p></div>
          <div className="step"><div className="step-n">2</div><p>ゲットしたアイテムを<strong style={{color:'var(--text)'}}>写真で撮って登録</strong>するだけ！AIが名前と定価を自動判定。<strong style={{color:'var(--text)'}}>⚡その場で記録モード</strong>なら1個ゲットするたびに使った金額もその場で記録でき、投入金額の合計は自動計算されます</p></div>
          <div className="step"><div className="step-n">3</div><p>投入金額と定価の総額を比べて元取り率を計算！</p></div>
          <div className="step"><div className="step-n">4</div><p>ランキングに登録して全国と競おう 🏆</p></div>
        </div>
        <div className="howto-formula">
          元取り率 ＝ 定価合計 ÷ 投入金額 × 100<br />
          100%以上でプラス収支！200%超えで伝説級。
        </div>
        <Link href="/howto" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: '.8rem', color: 'var(--accent)', fontWeight: 700 }}>
          📖 遊び方をもっと詳しく見る →
        </Link>
      </div>

      <AppFooter />
    </main>
  );
}
