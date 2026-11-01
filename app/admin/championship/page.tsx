'use client';

import { useEffect, useState } from 'react';

interface Venue {
  id: string;
  store_name: string;
  prefecture: string | null;
  staff_name: string | null;
  status: 'scheduled' | 'verified';
  verified_nickname: string | null;
  verified_efficiency_rate: number | null;
}
interface Championship {
  id: string;
  name: string;
  start_at: string;
  status: 'upcoming' | 'live' | 'ended';
  rules_text: string | null;
  prize_text: string | null;
  championship_venues: Venue[];
}

export default function AdminChampionshipPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [list, setList] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(false);

  // 新規大会作成フォーム
  const [name, setName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [rules, setRules] = useState('');
  const [prize, setPrize] = useState('協賛募集中（確定次第発表）');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 会場追加フォーム（大会IDごとの入力状態）
  const [venueForm, setVenueForm] = useState<Record<string, { store: string; pref: string; staff: string }>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/championships');
      const data = await res.json();
      setList(data.championships || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/admin/login').then(res => {
      if (res.ok) { setAuthed(true); load(); } else setAuthed(false);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }),
    });
    if (res.ok) { setAuthed(true); load(); } else setLoginError('パスワードが違います');
  }

  async function createChampionship() {
    if (!name || !startAt) { setCreateError('大会名と開始日時は必須です'); return; }
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/championships', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_at: new Date(startAt).toISOString(), rules_text: rules || null, prize_text: prize || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName(''); setStartAt(''); setRules(''); setPrize('協賛募集中（確定次第発表）');
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/championships/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    await load();
  }

  async function addVenue(championshipId: string) {
    const f = venueForm[championshipId] || { store: '', pref: '', staff: '' };
    if (!f.store) return;
    await fetch(`/api/admin/championships/${championshipId}/venues`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_name: f.store, prefecture: f.pref || null, staff_name: f.staff || null }),
    });
    setVenueForm(prev => ({ ...prev, [championshipId]: { store: '', pref: '', staff: '' } }));
    await load();
  }

  async function verifyVenue(championshipId: string, venueId: string) {
    const nickname = window.prompt('確認したニックネームを入力してください');
    if (nickname === null) return;
    const rateStr = window.prompt('確認した元取り率（%）を入力してください');
    if (rateStr === null) return;
    await fetch(`/api/admin/championships/${championshipId}/venues/${venueId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'verified', verified_nickname: nickname, verified_efficiency_rate: Number(rateStr) || 0 }),
    });
    await load();
  }

  if (authed === null) return <main style={{ padding: 40, textAlign: 'center' }}>読み込み中...</main>;

  if (!authed) {
    return (
      <main style={{ maxWidth: 360, margin: '80px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 20 }}>管理者ログイン（チャンピオン大会）</h1>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="パスワード" value={pw} onChange={e => setPw(e.target.value)} style={{ marginBottom: 10 }} />
          {loginError && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>{loginError}</p>}
          <button className="btn-primary" type="submit">ログイン</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: 20 }}>🏆 チャンピオン大会 管理</h1>

      <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 28 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>新規大会を作成</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="text" placeholder="大会名（例：第1回クレゲー全国統一チャンピオン大会）" value={name} onChange={e => setName(e.target.value)} />
          <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          <textarea placeholder="ルール（任意）" value={rules} onChange={e => setRules(e.target.value)} rows={3} />
          <input type="text" placeholder="賞金・賞品テキスト" value={prize} onChange={e => setPrize(e.target.value)} />
          {createError && <p style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{createError}</p>}
          <button className="btn-primary" onClick={createChampionship} disabled={creating}>{creating ? '作成中...' : '大会を作成'}</button>
        </div>
      </div>

      {loading ? <p>読み込み中...</p> : list.map(c => (
        <div key={c.id} style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 900 }}>{c.name}</h3>
            <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}>
              <option value="upcoming">開催予定</option>
              <option value="live">開催中</option>
              <option value="ended">終了</option>
            </select>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>
            {new Date(c.start_at).toLocaleString('ja-JP')}
          </p>

          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 8 }}>会場一覧（{c.championship_venues.length}）</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {c.championship_venues.map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card2)', borderRadius: 8, padding: '8px 10px', fontSize: '0.82rem' }}>
                <span>
                  {v.store_name}{v.prefecture ? `（${v.prefecture}）` : ''}
                  {v.staff_name && <span style={{ color: 'var(--muted)' }}> ／ 担当:{v.staff_name}</span>}
                  {v.status === 'verified' && <span style={{ color: 'var(--green)' }}> ✅ {v.verified_nickname} {v.verified_efficiency_rate}%</span>}
                </span>
                {v.status !== 'verified' && (
                  <button onClick={() => verifyVenue(c.id, v.id)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    確認済みにする
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text" placeholder="店舗名"
              value={venueForm[c.id]?.store || ''}
              onChange={e => setVenueForm(prev => ({ ...prev, [c.id]: { ...(prev[c.id] || { store: '', pref: '', staff: '' }), store: e.target.value } }))}
              style={{ flex: 2 }}
            />
            <input
              type="text" placeholder="都道府県"
              value={venueForm[c.id]?.pref || ''}
              onChange={e => setVenueForm(prev => ({ ...prev, [c.id]: { ...(prev[c.id] || { store: '', pref: '', staff: '' }), pref: e.target.value } }))}
              style={{ flex: 1 }}
            />
            <input
              type="text" placeholder="担当スタッフ"
              value={venueForm[c.id]?.staff || ''}
              onChange={e => setVenueForm(prev => ({ ...prev, [c.id]: { ...(prev[c.id] || { store: '', pref: '', staff: '' }), staff: e.target.value } }))}
              style={{ flex: 1 }}
            />
            <button onClick={() => addVenue(c.id)} style={{ background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 700, cursor: 'pointer' }}>追加</button>
          </div>
        </div>
      ))}
    </main>
  );
}
