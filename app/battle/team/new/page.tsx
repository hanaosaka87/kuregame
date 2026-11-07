'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeamBattleMode } from '@/lib/supabase';
import { PREFECTURES } from '@/lib/constants';
import AppFooter from '@/components/AppFooter';

export default function NewTeamBattlePage() {
  const router = useRouter();
  const [mode, setMode] = useState<TeamBattleMode>('sudden_death');
  const [storeName, setStoreName] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [budget, setBudget] = useState('');
  const [teamAName, setTeamAName] = useState('チームA');
  const [teamBName, setTeamBName] = useState('チームB');
  const [hostNickname, setHostNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function createTeamBattle() {
    if (!storeName) { setError('店舗名を入力してください'); return; }
    if (mode === 'fixed_budget' && (!budget || Number(budget) <= 0)) {
      setError('1人あたりの投入金額を入力してください');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/team-battle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          store_name: storeName,
          prefecture: prefecture || null,
          budget: mode === 'fixed_budget' ? Number(budget) : null,
          team_a_name: teamAName || 'チームA',
          team_b_name: teamBName || 'チームB',
          host_nickname: hostNickname || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.battle) throw new Error(data.error || '団体戦の作成に失敗しました');
      router.push(`/battle/team/${data.battle.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '団体戦の作成に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🤝 団体戦（3対3）を作る</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.6 }}>
        3人ずつのチームに分かれて対決しよう！作成後に発行される招待コードを両チームに共有してください。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div
          className={`challenge-chip ${mode === 'sudden_death' ? 'selected' : ''}`}
          onClick={() => setMode('sudden_death')}
        >
          <span style={{ fontSize: '1.3rem' }}>⚡</span>
          <span style={{ marginLeft: 8, fontSize: '0.95rem', fontWeight: 900 }}>短期決戦（何勝何敗）</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            1人ずつ交互にチャレンジし、先に景品を獲得したチームがそのラウンドの勝ち。ラウンドを重ねて何勝何敗かを競います。
          </div>
        </div>
        <div
          className={`challenge-chip ${mode === 'fixed_budget' ? 'selected' : ''}`}
          onClick={() => setMode('fixed_budget')}
        >
          <span style={{ fontSize: '1.3rem' }}>💰</span>
          <span style={{ marginLeft: 8, fontSize: '0.95rem', fontWeight: 900 }}>金額チャレンジ団体戦</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
            基本の金額チャレンジを3対3で対戦化。両チーム計6人が同じ金額に挑戦し、チーム合計の元取り率で競います。
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🅰️ チームA名</label>
          <input type="text" placeholder="チームA" value={teamAName} onChange={e => setTeamAName(e.target.value)} maxLength={16} />
        </div>
        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🅱️ チームB名</label>
          <input type="text" placeholder="チームB" value={teamBName} onChange={e => setTeamBName(e.target.value)} maxLength={16} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>🏪 店舗名</label>
        <input type="text" placeholder="例：ラウンドワン渋谷店" value={storeName} onChange={e => setStoreName(e.target.value)} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>📍 都道府県（任意）</label>
        <select value={prefecture} onChange={e => setPrefecture(e.target.value)}>
          <option value="">選択しない</option>
          {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {mode === 'fixed_budget' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>💰 1人あたりの投入金額（円）</label>
          <input type="number" placeholder="例：3000" inputMode="numeric" value={budget} onChange={e => setBudget(e.target.value)} />
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>両チーム全6人がこの金額を目安に挑戦し、チーム合計の元取り率で競います</p>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>あなたのニックネーム（任意・幹事として記録されます）</label>
        <input type="text" placeholder="例：クレゲの達人" value={hostNickname} maxLength={12} onChange={e => setHostNickname(e.target.value)} />
      </div>

      {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}

      <button className="btn-primary" onClick={createTeamBattle} disabled={busy}>
        {busy ? '作成中...' : '団体戦を作る'}
      </button>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <a href="/battle/team/join" style={{ color: 'var(--cyan)', fontSize: '0.85rem' }}>招待コードを持っている方はこちら →</a>
      </div>

      <AppFooter />
    </main>
  );
}
