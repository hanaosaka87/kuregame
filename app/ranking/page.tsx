'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PREFECTURES, CHALLENGE_LABELS } from '@/lib/constants';
import AppFooter from '@/components/AppFooter';

type RankTab = 'national' | 'prefecture' | 'monthly_top' | 'monthly_champions';

interface Session {
  id: string; nickname: string; prefecture: string | null; challenge_type: string;
  total_spent: number; total_retail_value: number; prize_count: number;
  efficiency_rate: number; store_name: string | null; created_at: string;
}
interface Champion {
  year_month: string; prefecture: string; nickname: string;
  efficiency_rate: number; total_spent: number; total_retail_value: number;
  prize_count: number; session_id: string;
}

function effClass(r: number) {
  if (r >= 200) return 'efficiency-excellent';
  if (r >= 100) return 'efficiency-good';
  if (r >= 50)  return 'efficiency-ok';
  return 'efficiency-bad';
}

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

export default function RankingPage() {
  const [tab, setTab] = useState<RankTab>('national');
  const [challenge, setChallenge] = useState('all');
  const [selectedPref, setSelectedPref] = useState(PREFECTURES[12]); // 東京都
  const [month, setMonth] = useState(currentMonth);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [tab, challenge, selectedPref, month]);

  async function fetchData() {
    setLoading(true);
    try {
      let url = `/api/ranking?type=${tab}&limit=30`;
      if (tab === 'prefecture') url += `&prefecture=${encodeURIComponent(selectedPref)}`;
      if (tab === 'monthly_top' || tab === 'national') url += `&month=${month}`;
      if (tab === 'monthly_champions') url += `&month=${month}`;
      if (challenge !== 'all') url += `&challenge=${challenge}`;

      const res = await fetch(url);
      const data = await res.json();
      setSessions(data.sessions || []);
      setChampions(data.champions || []);
    } catch { setSessions([]); setChampions([]); }
    finally { setLoading(false); }
  }

  const TABS: { key: RankTab; label: string; emoji: string }[] = [
    { key: 'national',          label: '全国',       emoji: '🗾' },
    { key: 'prefecture',        label: '都道府県',   emoji: '📍' },
    { key: 'monthly_top',       label: '月間全国',   emoji: '📅' },
    { key: 'monthly_champions', label: '月間覇者',   emoji: '👑' },
  ];

  // 月リスト（過去6ヶ月）
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>🏆 ランキング</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 12 }}>元取り率で全国と競おう</p>

      {/* チャンピオンシップビジュアル */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/championship.png" alt="クレゲーチャンピオンシップ" style={{ width: '100%', borderRadius: 14, marginBottom: 20, display: 'block' }} />

      {/* タブ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 20, border: '2px solid',
              borderColor: tab === t.key ? 'var(--accent)' : 'var(--card2)',
              background: tab === t.key ? 'rgba(255,61,175,0.2)' : 'var(--card)',
              color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tab === 'prefecture' && (
          <select value={selectedPref} onChange={e => setSelectedPref(e.target.value)} style={{ flex: 1 }}>
            {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {(tab === 'monthly_top' || tab === 'monthly_champions') && (
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ flex: 1 }}>
            {months.map(m => <option key={m} value={m}>{m.replace('-','年')}月</option>)}
          </select>
        )}
        {tab !== 'monthly_champions' && (
          <select value={challenge} onChange={e => setChallenge(e.target.value)} style={{ flex: 1 }}>
            <option value="all">全チャレンジ</option>
            {Object.entries(CHALLENGE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {/* 月間覇者 */}
      {tab === 'monthly_champions' && (
        <div>
          <div style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--gold)' }}>
            👑 各都道府県の月間1位は<strong>全国大会出場チケット</strong>を獲得！
          </div>
          {loading ? <Loader /> : champions.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {champions.map((c, i) => (
                <div key={i} style={{ background: 'var(--card)', borderRadius: 14, padding: '12px 16px', border: '2px solid rgba(255,215,0,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: 'var(--gold)', borderRadius: 8, padding: '4px 8px', fontSize: '0.75rem', fontWeight: 900, color: '#000', flexShrink: 0 }}>{c.prefecture}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nickname}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>¥{c.total_spent.toLocaleString()} → ¥{c.total_retail_value.toLocaleString()}（{c.prize_count}個）</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <div className={effClass(c.efficiency_rate)} style={{ fontWeight: 900, fontSize: '1.2rem' }}>{c.efficiency_rate}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 通常ランキング */}
      {tab !== 'monthly_champions' && (
        <div>
          {loading ? <Loader /> : sessions.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s, i) => (
                <div key={s.id} style={{
                  background: 'var(--card)', borderRadius: 14, padding: '12px 16px',
                  border: `2px solid ${i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--card2)'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div className={`rank-badge rank-${i < 3 ? i+1 : 'other'}`}>{i === 0 ? '👑' : i+1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.nickname}</span>
                      {s.prefecture && <span style={{ fontSize: '0.7rem', background: 'var(--card2)', padding: '1px 6px', borderRadius: 8, color: 'var(--muted)' }}>{s.prefecture}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      ¥{s.total_spent.toLocaleString()} → ¥{s.total_retail_value.toLocaleString()}（{s.prize_count}個）
                      {s.store_name && <span> · {s.store_name}</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--card2)', marginTop: 2 }}>{CHALLENGE_LABELS[s.challenge_type] ?? s.challenge_type}</div>
                  </div>
                  <div className={effClass(s.efficiency_rate)} style={{ fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>{s.efficiency_rate}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/challenge"><button className="btn-primary">🎯 チャレンジする</button></Link>
      </div>
      <AppFooter />
    </main>
  );
}

function Loader() {
  return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>;
}
function Empty() {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎮</div>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>まだ記録がありません</p>
    </div>
  );
}
