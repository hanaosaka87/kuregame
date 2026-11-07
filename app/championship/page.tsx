'use client';

import { useEffect, useState } from 'react';
import AppFooter from '@/components/AppFooter';

interface Championship {
  id: string;
  name: string;
  start_at: string;
  status: 'upcoming' | 'live' | 'ended';
  rules_text: string | null;
  prize_text: string | null;
}
interface Venue {
  id: string;
  store_name: string;
  prefecture: string | null;
  status: 'scheduled' | 'verified';
  verified_nickname: string | null;
  verified_efficiency_rate: number | null;
}

function useCountdown(startAt: string | null) {
  const [remain, setRemain] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!startAt) return;
    const target = new Date(startAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemain({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setRemain({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startAt]);
  return remain;
}

export default function ChampionshipPage() {
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const remain = useCountdown(championship?.start_at || null);

  useEffect(() => {
    fetch('/api/championship')
      .then(res => res.json())
      .then(data => { setChampionship(data.championship); setVenues(data.venues || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main style={{ maxWidth: '100%', margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>読み込み中...</main>;
  }

  if (!championship) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 16 }}>🏆 全国統一チャンピオン大会</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 40, lineHeight: 1.7 }}>
          現在、開催予定の大会はありません。<br />決まり次第このページでお知らせします。
        </p>
        <AppFooter />
      </main>
    );
  }

  const isLive = championship.status === 'live' || (remain && remain.d === 0 && remain.h === 0 && remain.m === 0 && remain.s === 0);

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🏆 {championship.name}</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>
        全国の参加店舗が同じ日時に一斉スタート。各会場にはスタッフが派遣され、記録を確認します。
      </p>

      <div className="rate-display" style={{ borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
        {isLive ? (
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--gold)' }}>🔴 開催中！</div>
        ) : remain ? (
          <>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>大会開始まで</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              {[{ v: remain.d, l: '日' }, { v: remain.h, l: '時間' }, { v: remain.m, l: '分' }, { v: remain.s, l: '秒' }].map((u, i) => (
                <div key={i}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent)' }}>{u.v}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{u.l}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 14 }}>
          {new Date(championship.start_at).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} スタート
        </div>
      </div>

      {championship.rules_text && (
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>📋 ルール</h3>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{championship.rules_text}</p>
        </div>
      )}

      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: 'var(--gold)' }}>🎁 賞金・賞品</h3>
        <p style={{ fontSize: '0.82rem', lineHeight: 1.7 }}>{championship.prize_text || '協賛募集中（確定次第このページで発表します）'}</p>
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>🏪 参加会場（{venues.length}店舗）</h3>
      {venues.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '16px 0', textAlign: 'center' }}>会場は準備中です</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {venues.map(v => (
            <div key={v.id} className="prize-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{v.store_name}</div>
                {v.prefecture && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{v.prefecture}</div>}
                {v.status === 'verified' && v.verified_nickname && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: 4 }}>
                    確認済み記録：{v.verified_nickname}（{v.verified_efficiency_rate}%）
                  </div>
                )}
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                background: v.status === 'verified' ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.08)',
                color: v.status === 'verified' ? 'var(--green)' : 'var(--muted)',
              }}>
                {v.status === 'verified' ? '✅ 確認済み' : '⏳ 予定'}
              </span>
            </div>
          ))}
        </div>
      )}

      <AppFooter />
    </main>
  );
}
