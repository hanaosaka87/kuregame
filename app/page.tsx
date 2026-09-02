'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChallengeType } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
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

const MISSIONS = [
  { icon: '🎯', title: '初めてのチャレンジ', prog: '1/1', xp: '+50XP', done: false, pct: 0 },
  { icon: '🏆', title: '元取り率100%を達成', prog: '0/1', xp: '+100XP', done: false, pct: 0 },
  { icon: '👑', title: '元取り率200%を達成', prog: '0/1', xp: '+300XP', done: false, pct: 0, locked: true },
];

const BADGES = [
  { icon: '🎯', name: '初回挑戦', locked: false },
  { icon: '👑', name: '200%超え', locked: true },
  { icon: '🔥', name: '3連勝', locked: true },
  { icon: '🗾', name: '全国区', locked: true },
  { icon: '💰', name: '1万円投入', locked: true },
  { icon: '🎪', name: 'ゲーセン巡り', locked: true },
  { icon: '📅', name: '月間1位', locked: true },
  { icon: '🏅', name: '伝説の達人', locked: true },
];

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

  useEffect(() => { fetchRanking(activeTab); }, [activeTab]);

  async function fetchRanking(challenge: ChallengeType | 'all') {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?challenge=${challenge}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  const topRate = sessions.length > 0 ? sessions[0].efficiency_rate : 0;

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
          <span className="badge-timer">🏆 月間ランキング進行中</span>
        </div>
        <div className="hero-claw">🎮</div>
        <div className="hero-copy">
          <h1>クレゲー</h1>
          <p>元取り率で競う全国ランキング<br />あなたの"強さ"を証明しろ</p>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">CHALLENGES</div>
          <div className="stat-val">{sessions.length}<span style={{fontSize:'.7rem',fontWeight:400,color:'var(--muted)',fontFamily:'inherit'}}> 件</span></div>
          <div className="stat-note">今月の記録</div>
        </div>
        <div className="stat">
          <div className="stat-label">TOP RATE</div>
          <div className="stat-val" style={{color: topRate >= 200 ? 'var(--gold)' : 'var(--accent)'}}>{topRate}<span style={{fontSize:'.7rem',fontWeight:400,color:'var(--muted)',fontFamily:'inherit'}}>%</span></div>
          <div className="stat-note">最高元取り率</div>
        </div>
        <div className="stat">
          <div className="stat-label">CHALLENGERS</div>
          <div className="stat-val">{loading ? '—' : sessions.length}<span style={{fontSize:'.7rem',fontWeight:400,color:'var(--muted)',fontFamily:'inherit'}}> 人</span></div>
          <div className="stat-note">参加者数</div>
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
          <button className="btn-primary">
            <b>🎯 チャレンジ開始！</b>
            <small>1,000円〜1万円 or フリーモードで挑戦</small>
          </button>
        </Link>
        <div className="cta-row">
          <Link href="/ranking" style={{flex:1}}>
            <button className="btn-sub" style={{width:'100%'}}>🏆 全国ランキング</button>
          </Link>
          <Link href="/ranking?tab=monthly" style={{flex:1}}>
            <button className="btn-sub" style={{width:'100%'}}>👑 月間覇者</button>
          </Link>
        </div>
      </div>

      {/* ===== MISSIONS ===== */}
      <div className="sec-head">
        <h2>⚡ ミッション</h2>
        <span className="sec-note">クリアしてXPをゲット</span>
      </div>
      <div className="list">
        {MISSIONS.map((m, i) => (
          <div key={i} className={`mission${m.done ? ' done' : m.locked ? ' locked' : ''}`}>
            <div className="mission-icon">{m.icon}</div>
            <div className="mission-body">
              <div className="mission-title">{m.title}</div>
              <div className="bar"><span style={{width: `${m.pct}%`}} /></div>
            </div>
            <div className="mission-right">
              <div className="mission-prog">{m.prog}</div>
              <div className="mission-xp">{m.xp}</div>
            </div>
          </div>
        ))}
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

      {/* ===== BADGES ===== */}
      <div className="sec-head">
        <h2>🏅 バッジ</h2>
        <span className="sec-note">実績を解除しよう</span>
      </div>
      <div className="badges-grid">
        {BADGES.map((b, i) => (
          <div key={i} className={`badge-item${b.locked ? ' locked' : ''}`}>
            <div className="badge-item-icon">{b.icon}</div>
            <div className="badge-item-name">{b.name}</div>
          </div>
        ))}
      </div>

      {/* ===== HOW TO ===== */}
      <div className="howto">
        <h3>🕹️ 遊び方</h3>
        <div className="steps">
          <div className="step"><div className="step-n">1</div><p>チャレンジ金額を選ぶ（1,000円〜1万円 or フリー）</p></div>
          <div className="step"><div className="step-n">2</div><p>ゲットしたアイテムの名前と<strong style={{color:'var(--text)'}}>定価</strong>を入力</p></div>
          <div className="step"><div className="step-n">3</div><p>投入金額と定価の総額を比べて元取り率を計算！</p></div>
          <div className="step"><div className="step-n">4</div><p>ランキングに登録して全国と競おう 🏆</p></div>
        </div>
        <div className="howto-formula">
          元取り率 ＝ 定価合計 ÷ 投入金額 × 100<br />
          100%以上でプラス収支！200%超えで伝説級。
        </div>
      </div>

      <AppFooter />
    </main>
  );
}
