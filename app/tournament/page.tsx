'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';

interface Champion {
  year_month: string;
  prefecture: string;
  nickname: string;
  efficiency_rate: number;
  total_spent: number;
  total_retail_value: number;
  prize_count: number;
  session_id: string;
}

interface RegionData {
  key: string;
  label: string;
  emoji: string;
  prefectureCount: number;
  qualifiedCount: number;
  members: Champion[];
  regionChampion: Champion | null;
}

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export default function TournamentPage() {
  const [month, setMonth] = useState(currentMonth);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRegion, setOpenRegion] = useState<string | null>(null);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tournament?month=${month}`)
      .then(r => r.json())
      .then(d => setRegions(d.regions || []))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>🏯 全国大会への道</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 16, lineHeight: 1.7 }}>
        各都道府県の月間チャンピオンが所属地域ブロックで競い、地域No.1が四半期プレーオフ・年1回の全国大会へ進みます。
      </p>

      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 14, marginBottom: 20, fontSize: '.76rem', color: 'var(--lav)', lineHeight: 1.9 }}>
        <b style={{ color: 'var(--text)' }}>🗺️ 道のり：</b>
        都道府県 月間1位 → <b style={{ color: 'var(--gold)' }}>地域ブロック代表</b> → 四半期プレーオフ（3ヶ月の地域代表同士）→ 年1回の全国大会
      </div>

      <select value={month} onChange={e => setMonth(e.target.value)} style={{ marginBottom: 20 }}>
        {months.map(m => <option key={m} value={m}>{m.replace('-', '年')}月</option>)}
      </select>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regions.map(r => (
            <div key={r.key} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenRegion(openRegion === r.key ? null : r.key)}
                style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{r.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{r.label}ブロック</span>
                  <span style={{ fontSize: '.68rem', color: 'var(--muted)' }}>（{r.qualifiedCount}/{r.prefectureCount}県 エントリー中）</span>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{openRegion === r.key ? '▲' : '▼'}</span>
              </button>

              {r.regionChampion ? (
                <div style={{ padding: '0 16px 14px' }}>
                  <div style={{ background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.35)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '.65rem', color: 'var(--gold)', fontWeight: 700 }}>👑 地域チャンピオン</div>
                      <div style={{ fontWeight: 900, fontSize: '.9rem' }}>{r.regionChampion.nickname}<span style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 400 }}>（{r.regionChampion.prefecture}）</span></div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--gold)' }}>{r.regionChampion.efficiency_rate}%</div>
                  </div>
                </div>
              ) : (
                <p style={{ padding: '0 16px 14px', fontSize: '.76rem', color: 'var(--muted)' }}>この月はまだ都道府県代表がいません</p>
              )}

              {openRegion === r.key && r.members.length > 1 && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--card2)', marginTop: 4, paddingTop: 10 }}>
                  {r.members.map((m, i) => (
                    <div key={m.session_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--lav)' }}>
                      <span>{i + 1}. {m.nickname}（{m.prefecture}）</span>
                      <span style={{ color: 'var(--cyan)' }}>{m.efficiency_rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/ranking"><button className="btn-secondary">🏆 都道府県ランキングを見る</button></Link>
      </div>
      <div style={{ marginTop: 10 }}>
        <Link href="/challenge"><button className="btn-primary">🎯 都道府県代表を目指す！</button></Link>
      </div>
      <AppFooter />
    </main>
  );
}
