'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PREFECTURES, CHALLENGE_LABELS, MACHINE_TYPE_OPTIONS } from '@/lib/constants';
import { getSupabase } from '@/lib/supabase';
import AppFooter from '@/components/AppFooter';
import SnsIcon, { type SnsPlatform } from '@/components/SnsIcon';
import { getLevelInfo } from '@/lib/level';

type RankTab = 'overall' | 'national' | 'prefecture' | 'monthly_top' | 'monthly_champions';

interface SnsLinks {
  sns_x?: string | null;
  sns_instagram?: string | null;
  sns_tiktok?: string | null;
  sns_youtube?: string | null;
}
interface Session extends SnsLinks {
  id: string; nickname: string; prefecture: string | null; challenge_type: string;
  total_spent: number; total_retail_value: number; prize_count: number;
  efficiency_rate: number; store_name: string | null; created_at: string;
  avatar_emoji?: string | null;
  avatar_url?: string | null;
  founding_member?: boolean;
}
interface OverallRow extends SnsLinks {
  user_id: string; nickname: string; prefecture: string | null;
  total_count: number; total_spent: number; total_retail_value: number;
  efficiency_rate: number; total_xp: number;
  avatar_emoji?: string | null;
  avatar_url?: string | null;
  founding_member?: boolean;
}
interface Champion extends SnsLinks {
  year_month: string; prefecture: string; nickname: string;
  efficiency_rate: number; total_spent: number; total_retail_value: number;
  prize_count: number; session_id: string;
  avatar_emoji?: string | null;
  avatar_url?: string | null;
  founding_member?: boolean;
}

function FoundingBadge() {
  return (
    <span title="先着1,000名の創業メンバー特典" style={{ fontSize: '0.7rem', background: 'rgba(255,215,0,0.15)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: 8, padding: '1px 5px', flexShrink: 0 }}>
      🌟創業メンバー
    </span>
  );
}

interface PrizeDetail {
  id: string;
  name: string;
  category: string;
  retail_price: number;
  quantity: number;
}
interface SessionDetail {
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

function Avatar({ url, emoji }: { url?: string | null; emoji?: string | null }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, overflow: 'hidden' }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (emoji || '🎮')}
    </div>
  );
}

function SnsLinkIcons({ links }: { links: SnsLinks }) {
  const items: { key: keyof SnsLinks; platform: SnsPlatform }[] = [
    { key: 'sns_x', platform: 'x' }, { key: 'sns_instagram', platform: 'instagram' },
    { key: 'sns_tiktok', platform: 'tiktok' }, { key: 'sns_youtube', platform: 'youtube' },
  ];
  const active = items.filter(i => links[i.key]);
  if (active.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      {active.map(i => (
        <a key={i.key} href={links[i.key] as string} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ textDecoration: 'none' }}>
          <SnsIcon platform={i.platform} size={26} />
        </a>
      ))}
    </div>
  );
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
  const [machineType, setMachineType] = useState('フック設定');
  const [selectedPref, setSelectedPref] = useState(PREFECTURES[12]); // 東京都
  const [month, setMonth] = useState(currentMonth);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [overallRows, setOverallRows] = useState<OverallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailPrizes, setDetailPrizes] = useState<PrizeDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => { fetchData(); }, [tab, challenge, machineType, selectedPref, month]);

  async function openDetail(id: string) {
    setModalOpen(true);
    setDetail(null);
    setDetailPrizes([]);
    setDetailError('');
    setDetailLoading(true);
    try {
      const supabase = getSupabase();
      const [{ data: session, error: sessionErr }, { data: prizes }] = await Promise.all([
        supabase.from('game_sessions').select('*').eq('id', id).maybeSingle(),
        supabase.from('prizes').select('*').eq('session_id', id),
      ]);
      if (sessionErr || !session) throw new Error();
      setDetail(session);
      setDetailPrizes(prizes || []);
    } catch {
      setDetailError('戦績の取得に失敗しました。もう一度お試しください。');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setModalOpen(false);
    setDetail(null);
    setDetailPrizes([]);
    setDetailError('');
    setDetailLoading(false);
  }

  async function fetchData() {
    setLoading(true);
    try {
      if (tab === 'overall') {
        const res = await fetch(`/api/ranking?type=overall&limit=30`);
        const data = await res.json();
        setOverallRows(data.sessions || []);
        return;
      }

      let url = `/api/ranking?type=${tab}&limit=30`;
      if (tab === 'prefecture') url += `&prefecture=${encodeURIComponent(selectedPref)}`;
      if (tab === 'monthly_top' || tab === 'national') url += `&month=${month}`;
      if (tab === 'monthly_champions') url += `&month=${month}`;
      if (challenge !== 'all') url += `&challenge=${challenge}`;
      if (machineType) url += `&machine_type=${encodeURIComponent(machineType)}`;

      const res = await fetch(url);
      const data = await res.json();
      setSessions(data.sessions || []);
      setChampions(data.champions || []);
    } catch { setSessions([]); setChampions([]); setOverallRows([]); }
    finally { setLoading(false); }
  }

  const TABS: { key: RankTab; label: string; emoji: string }[] = [
    { key: 'overall',           label: '通算',       emoji: '📈' },
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
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>🏆 ランキング</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>元取り率で全国と競おう</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.74rem', marginBottom: 12 }}>特別な参加登録は不要。チャレンジを記録すれば自動でランクインします</p>

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
        {tab !== 'monthly_champions' && tab !== 'overall' && (
          <select value={challenge} onChange={e => setChallenge(e.target.value)} style={{ flex: 1 }}>
            <option value="all">全チャレンジ</option>
            {Object.entries(CHALLENGE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        {tab !== 'monthly_champions' && tab !== 'overall' && (
          <select value={machineType} onChange={e => setMachineType(e.target.value)} style={{ flex: 1 }}>
            <option value="">全機種</option>
            {MACHINE_TYPE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* 通算ランキング */}
      {tab === 'overall' && (
        <div>
          <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            📈 これまでの全チャレンジを通算した元取り率ランキングです（公平のため3回以上挑戦した人が対象）。レベルは挑戦のたびに元取り率ぶんの経験値が貯まって上がります。
          </div>
          {loading ? <Loader /> : overallRows.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overallRows.map((r, i) => {
                const lv = getLevelInfo(r.total_xp);
                return (
                  <div key={r.user_id} style={{
                    background: 'var(--card)', borderRadius: 14, padding: '12px 16px',
                    border: `2px solid ${i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--card2)'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div className={`rank-badge rank-${i < 3 ? i+1 : 'other'}`}>{i === 0 ? '👑' : i+1}</div>
                    <Avatar url={r.avatar_url} emoji={r.avatar_emoji} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{r.nickname}</span>
                        <span style={{ fontSize: '0.68rem', background: 'rgba(168,85,247,0.15)', color: 'var(--purple)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 8, padding: '1px 6px', flexShrink: 0, fontWeight: 700 }}>Lv.{lv.level}</span>
                        {r.founding_member && <FoundingBadge />}
                        {r.prefecture && <span style={{ fontSize: '0.7rem', background: 'var(--card2)', padding: '1px 6px', borderRadius: 8, color: 'var(--muted)' }}>{r.prefecture}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        ¥{r.total_spent.toLocaleString()} → ¥{r.total_retail_value.toLocaleString()}（通算{r.total_count}回）
                      </div>
                      <SnsLinkIcons links={r} />
                    </div>
                    <div className={effClass(r.efficiency_rate)} style={{ fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>{r.efficiency_rate}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 月間覇者 */}
      {tab === 'monthly_champions' && (
        <div>
          <div style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--gold)' }}>
            👑 各都道府県の月間1位は<strong>地域ブロック代表</strong>として全国大会への道が開かれます！
            <Link href="/tournament" style={{ display: 'block', marginTop: 6, fontSize: '.76rem', color: 'var(--accent)', fontWeight: 700 }}>🏯 全国大会への道を見る →</Link>
          </div>
          {loading ? <Loader /> : champions.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {champions.map((c, i) => (
                <div key={i} onClick={() => openDetail(c.session_id)} style={{ cursor: 'pointer', background: 'var(--card)', borderRadius: 14, padding: '12px 16px', border: '2px solid rgba(255,215,0,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: 'var(--gold)', borderRadius: 8, padding: '4px 8px', fontSize: '0.75rem', fontWeight: 900, color: '#000', flexShrink: 0 }}>{c.prefecture}</div>
                  <Avatar url={c.avatar_url} emoji={c.avatar_emoji} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nickname}</span>
                      {c.founding_member && <FoundingBadge />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>¥{c.total_spent.toLocaleString()} → ¥{c.total_retail_value.toLocaleString()}（{c.prize_count}個）</div>
                    <SnsLinkIcons links={c} />
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
      {tab !== 'monthly_champions' && tab !== 'overall' && (
        <div>
          {loading ? <Loader /> : sessions.length === 0 ? <Empty /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s, i) => (
                <div key={s.id} onClick={() => openDetail(s.id)} style={{
                  cursor: 'pointer',
                  background: 'var(--card)', borderRadius: 14, padding: '12px 16px',
                  border: `2px solid ${i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--card2)'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div className={`rank-badge rank-${i < 3 ? i+1 : 'other'}`}>{i === 0 ? '👑' : i+1}</div>
                  <Avatar url={s.avatar_url} emoji={s.avatar_emoji} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.nickname}</span>
                      {s.founding_member && <FoundingBadge />}
                      {s.prefecture && <span style={{ fontSize: '0.7rem', background: 'var(--card2)', padding: '1px 6px', borderRadius: 8, color: 'var(--muted)' }}>{s.prefecture}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      ¥{s.total_spent.toLocaleString()} → ¥{s.total_retail_value.toLocaleString()}（{s.prize_count}個）
                      {s.store_name && <span> · {s.store_name}</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--card2)', marginTop: 2 }}>{CHALLENGE_LABELS[s.challenge_type] ?? s.challenge_type}</div>
                    <SnsLinkIcons links={s} />
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

      {modalOpen && (
        <div
          onClick={closeDetail}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 'min(100vw, 820px)', maxHeight: '85vh', overflowY: 'auto', padding: '20px 20px 32px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0 }}>📋 戦績詳細</h3>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {detailLoading && <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>読み込み中...</div>}
            {detailError && <div style={{ textAlign: 'center', padding: 20, color: 'var(--accent)', fontSize: '0.85rem' }}>{detailError}</div>}

            {!detailLoading && detail && (
              <div>
                <div className="rate-display" style={{ borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{detail.nickname}</div>
                  <div className={effClass(detail.efficiency_rate)} style={{ fontWeight: 900, fontSize: '2.2rem' }}>{detail.efficiency_rate}%</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 6 }}>
                    投入¥{detail.total_spent.toLocaleString()} → 定価¥{detail.total_retail_value.toLocaleString()}（{detail.prize_count}個）
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                    {CHALLENGE_LABELS[detail.challenge_type] ?? detail.challenge_type}
                    {detail.store_name && <> ・ {detail.store_name}</>}
                    {detail.prefecture && <> ・ {detail.prefecture}</>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--card2)', marginTop: 4 }}>
                    {new Date(detail.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>

                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>📸 エビデンス写真</h4>
                {detail.photo_url ? (
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: '2px solid var(--card2)', marginBottom: 18 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.photo_url} alt="ゲット写真" style={{ width: '100%', display: 'block' }} />
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '10px 0', marginBottom: 18 }}>この記録には写真が添付されていません</p>
                )}

                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>📦 獲得内訳</h4>
                {detailPrizes.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>内訳データがありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detailPrizes.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--card2)' }}>
                        <span>{p.name} ×{p.quantity}</span>
                        <span style={{ color: 'var(--green)' }}>¥{(p.retail_price * p.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
