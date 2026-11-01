'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Prize {
  id: string;
  name: string;
  category: string;
  retail_price: number;
  quantity: number;
}

interface Session {
  id: string;
  nickname: string;
  store_name: string | null;
  prefecture: string | null;
  challenge_type: string;
  total_spent: number;
  total_retail_value: number;
  prize_count: number;
  efficiency_rate: number;
  photo_url: string | null;
  created_at: string;
  prizes: Prize[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface Stats {
  generatedAt: string;
  users: { totalProfiles: number; new7d: number; new30d: number };
  sessions: { total: number; new7d: number; new30d: number };
  activeUsers: { last7d: number; last30d: number };
  foundingMember: { totalClaims: number; claims7d: number };
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{value}</div>
      {sub && <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoOnly, setPhotoOnly] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSpent, setEditSpent] = useState('');
  const [editRetail, setEditRetail] = useState('');
  const [editCount, setEditCount] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  async function load(withPhotoOnly = photoOnly) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions?limit=200${withPhotoOnly ? '&photoOnly=1' : ''}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/admin/login').then(res => {
      if (res.ok) { setAuthed(true); load(true); loadStats(); } else setAuthed(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) { setAuthed(true); load(true); } else setLoginError('パスワードが違います');
  }

  function startEdit(s: Session) {
    setEditId(s.id);
    setEditSpent(String(s.total_spent));
    setEditRetail(String(s.total_retail_value));
    setEditCount(String(s.prize_count));
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_spent: Number(editSpent),
          total_retail_value: Number(editRetail),
          prize_count: Number(editCount),
        }),
      });
      if (res.ok) { setEditId(null); load(); }
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm('この記録を削除しますか？（ランキングから完全に消えます）')) return;
    await fetch(`/api/admin/sessions/${id}`, { method: 'DELETE' });
    load();
  }

  if (authed === null) return null;

  if (!authed) {
    return (
      <main style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 16 }}>🔒 管理画面ログイン</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="管理者パスワード" value={pw} onChange={e => setPw(e.target.value)} />
          {loginError && <p style={{ color: 'var(--accent)', fontSize: '.82rem' }}>{loginError}</p>}
          <button className="btn-primary" type="submit">ログイン</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px' }}>
      <Link href="/" style={{ fontSize: '.82rem', color: 'var(--muted)', display: 'block', marginBottom: 12 }}>← ホームに戻る</Link>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: 10 }}>📊 利用統計</h1>
      {statsLoading && !stats ? (
        <p style={{ color: 'var(--muted)', fontSize: '.8rem', marginBottom: 16 }}>集計中...</p>
      ) : stats ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <StatCard label="累計登録者（プロフィール作成済み）" value={stats.users.totalProfiles} />
            <StatCard label="新規登録（7日間）" value={stats.users.new7d} />
            <StatCard label="新規登録（30日間）" value={stats.users.new30d} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <StatCard label="アクティブ利用者（7日間）" value={stats.activeUsers.last7d} sub="戦績記録をした人数" />
            <StatCard label="アクティブ利用者（30日間）" value={stats.activeUsers.last30d} sub="戦績記録をした人数" />
            <StatCard label="累計戦績記録数" value={stats.sessions.total} sub={`直近7日:${stats.sessions.new7d} / 30日:${stats.sessions.new30d}`} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <StatCard label="創業メンバー特典クレーム（累計）" value={stats.foundingMember.totalClaims} sub={`直近7日: ${stats.foundingMember.claims7d}`} />
          </div>
          <p style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 10 }}>
            集計時刻: {new Date(stats.generatedAt).toLocaleString('ja-JP')}（プロフィール作成済みユーザーのみを集計。Supabaseプロジェクトを他アプリと同居しているため、auth.users全体の人数とは一致しません）
          </p>
        </div>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: '.8rem', marginBottom: 16 }}>統計を取得できませんでした</p>
      )}

      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: 4 }}>🔎 ランキング登録の確認</h1>
      <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 16 }}>
        添付されたカゴいっぱいの写真と申告内容（投入金額・定価総額・獲得数）に整合性があるか確認できます。不整合があれば修正・削除してください。
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem', marginBottom: 16 }}>
        <input type="checkbox" checked={photoOnly} onChange={e => { setPhotoOnly(e.target.checked); load(e.target.checked); }} />
        写真が添付されている記録のみ表示
      </label>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>読み込み中...</p>
      ) : sessions.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>該当する記録がありません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map(s => (
            <div key={s.id} style={{ background: 'var(--card)', borderRadius: 14, padding: 14, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 88, height: 88, borderRadius: 8, overflow: 'hidden', background: 'var(--card2)', flexShrink: 0 }}>
                  {s.photo_url ? (
                    <a href={s.photo_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.photo_url} alt="添付写真" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '.65rem', color: 'var(--muted)' }}>写真なし</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{s.nickname}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{formatDate(s.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 4 }}>
                    {s.prefecture || '都道府県未設定'}{s.store_name ? ` ・ ${s.store_name}` : ''}
                  </div>
                  {editId === s.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '.72rem', width: 70 }}>投入金額</span>
                        <input type="number" value={editSpent} onChange={e => setEditSpent(e.target.value)} style={{ flex: 1, padding: '4px 8px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '.72rem', width: 70 }}>定価総額</span>
                        <input type="number" value={editRetail} onChange={e => setEditRetail(e.target.value)} style={{ flex: 1, padding: '4px 8px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '.72rem', width: 70 }}>獲得数</span>
                        <input type="number" value={editCount} onChange={e => setEditCount(e.target.value)} style={{ flex: 1, padding: '4px 8px' }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '.82rem' }}>
                      ¥{s.total_spent.toLocaleString()} → ¥{s.total_retail_value.toLocaleString()}（{s.prize_count}個） ・ <b style={{ color: 'var(--gold)' }}>{s.efficiency_rate}%</b>
                    </div>
                  )}
                </div>
              </div>

              {s.prizes?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card2)', fontSize: '.72rem', color: 'var(--muted)' }}>
                  {s.prizes.map(p => `${p.name} ×${p.quantity}（¥${p.retail_price}）`).join(' / ')}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {editId === s.id ? (
                  <>
                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '.78rem' }} disabled={savingId === s.id} onClick={() => saveEdit(s.id)}>
                      {savingId === s.id ? '保存中...' : '保存'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '.78rem' }} onClick={() => setEditId(null)}>キャンセル</button>
                  </>
                ) : (
                  <>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '.78rem' }} onClick={() => startEdit(s)}>修正</button>
                    <button onClick={() => deleteSession(s.id)}
                      style={{ padding: '6px 14px', fontSize: '.78rem', background: 'rgba(255,61,175,.12)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 8, cursor: 'pointer' }}>
                      削除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
