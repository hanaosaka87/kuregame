'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import AppFooter from '@/components/AppFooter';

interface Idea {
  id: string;
  nickname: string | null;
  body: string;
  created_at: string;
  like_count: number;
  status: 'open' | 'adopted';
}

const MAX_BODY_LEN = 300;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function IdeasPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'new' | 'likes'>('new');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  async function fetchIdeas(s: 'new' | 'likes') {
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas?sort=${s === 'likes' ? 'likes' : 'new'}`);
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch {
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchIdeas(sort); }, [sort]);

  async function submit() {
    if (!body.trim() || !user) return;
    setPosting(true);
    setPostError('');
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, nickname: profile?.nickname, body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '投稿に失敗しました');
      setBody('');
      fetchIdeas(sort);
    } catch (e) {
      setPostError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally {
      setPosting(false);
    }
  }

  async function like(id: string) {
    if (!user || likedIds.has(id)) return;
    setLikedIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/ideas/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (res.ok && typeof data.like_count === 'number') {
        setIdeas(prev => prev.map(i => i.id === id ? { ...i, like_count: data.like_count } : i));
      }
    } catch {
      // ネットワークエラー時は見た目のいいね済み状態のみ残す（軽量運用のため再試行UIは設けない）
    }
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>💡 アイデア広場</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 16, lineHeight: 1.6 }}>
        クレゲーをもっと良くするアイデアを、創業メンバーのみなさんから募集しています。採用されたアイデアには✅バッジが付きます。
      </p>

      {!authLoading && (
        profile?.founding_member ? (
          <div style={{ marginBottom: 20, background: 'var(--card)', borderRadius: 14, padding: '16px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>🌟 アイデアを投稿する</h3>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="こんな機能があったら嬉しい、こう変えたらもっと使いやすい、など"
              rows={3}
              maxLength={MAX_BODY_LEN}
              style={{
                width: '100%', background: 'var(--card-dark)', border: '1px solid var(--line)',
                color: 'var(--text)', padding: '10px 12px', fontSize: '.84rem',
                resize: 'none', outline: 'none', marginBottom: 8, fontFamily: 'inherit', borderRadius: 8,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{body.length}/{MAX_BODY_LEN}</span>
              <button onClick={submit} disabled={!body.trim() || posting} style={{
                padding: '9px 22px', borderRadius: 8,
                background: !body.trim() || posting ? 'var(--line)' : 'linear-gradient(135deg,var(--accent),var(--purple))',
                color: '#fff', fontWeight: 900, cursor: body.trim() && !posting ? 'pointer' : 'not-allowed',
                border: 'none', fontSize: '.84rem',
              }}>
                {posting ? '送信中...' : '投稿する'}
              </button>
            </div>
            {postError && <p style={{ color: 'var(--accent)', fontSize: '.78rem', marginTop: 8 }}>{postError}</p>}
          </div>
        ) : (
          <div style={{ marginBottom: 20, background: 'var(--card)', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              投稿は先着1,000名「創業メンバー」限定です。みんなの投稿は誰でも見ることができます。
            </p>
          </div>
        )
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([['new', '🆕 新着順'], ['likes', '❤️ 人気順']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setSort(v)} style={{
            flex: 1, padding: '8px 4px', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', borderRadius: 8,
            background: sort === v ? 'rgba(255,61,175,.2)' : 'var(--card-dark)',
            border: `1px solid ${sort === v ? 'var(--accent)' : 'var(--line)'}`,
            color: sort === v ? 'var(--accent)' : 'var(--muted)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '.84rem', textAlign: 'center', padding: '20px 0' }}>読み込み中...</p>
      ) : ideas.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '.84rem', textAlign: 'center', padding: '20px 0' }}>まだ投稿がありません。最初のアイデアを待っています！</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ideas.map(idea => (
            <div key={idea.id} style={{ background: 'var(--card)', borderRadius: 12, padding: '12px 14px' }}>
              {idea.status === 'adopted' && (
                <span style={{ display: 'inline-block', marginBottom: 6, fontSize: '.7rem', fontWeight: 900, color: 'var(--gold)', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 6, padding: '2px 8px' }}>
                  ✅ 採用されました
                </span>
              )}
              <p style={{ fontSize: '.86rem', lineHeight: 1.6, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{idea.body}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                  {idea.nickname || '匿名'} ・ {formatDate(idea.created_at)}
                </span>
                <button onClick={() => like(idea.id)} disabled={!user || likedIds.has(idea.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                  background: likedIds.has(idea.id) ? 'rgba(255,61,175,.18)' : 'var(--card-dark)',
                  border: `1px solid ${likedIds.has(idea.id) ? 'var(--accent)' : 'var(--line)'}`,
                  color: likedIds.has(idea.id) ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '.76rem', fontWeight: 700, cursor: !user || likedIds.has(idea.id) ? 'default' : 'pointer',
                }}>
                  ❤️ {idea.like_count}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppFooter />
    </main>
  );
}
