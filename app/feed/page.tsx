'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import AppFooter from '@/components/AppFooter';

interface FeedItem {
  id: string;
  nickname: string;
  avatar_emoji: string | null;
  avatar_url: string | null;
  showcase_photo_url: string;
  showcase_updated_at: string | null;
  likeCount: number;
  likedByMe: boolean;
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3600000);
  if (h < 1) return 'たった今';
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, nickname, avatar_emoji, avatar_url, showcase_photo_url, showcase_updated_at')
        .not('showcase_photo_url', 'is', null)
        .order('showcase_updated_at', { ascending: false, nullsFirst: false })
        .limit(50);

      const ids = (profiles || []).map(p => p.id);
      let likes: { liker_id: string; target_id: string }[] = [];
      if (ids.length > 0) {
        const { data } = await supabase.from('showcase_likes').select('liker_id, target_id').in('target_id', ids);
        likes = data || [];
      }

      const list: FeedItem[] = (profiles || []).map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatar_emoji: p.avatar_emoji,
        avatar_url: p.avatar_url,
        showcase_photo_url: p.showcase_photo_url!,
        showcase_updated_at: p.showcase_updated_at,
        likeCount: likes.filter(l => l.target_id === p.id).length,
        likedByMe: !!user && likes.some(l => l.target_id === p.id && l.liker_id === user.id),
      }));
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function toggleLike(targetId: string, currentlyLiked: boolean) {
    if (!user) return;
    setBusyId(targetId);
    try {
      await fetch('/api/feed/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liker_id: user.id, target_id: targetId, action: currentlyLiked ? 'unlike' : 'like' }),
      });
      setItems(prev => prev.map(it => it.id === targetId
        ? { ...it, likedByMe: !currentlyLiked, likeCount: it.likeCount + (currentlyLiked ? -1 : 1) }
        : it));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>🔥 みんなの自慢の一枚</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 20 }}>他の挑戦者のゲット写真に「スゲー！」を送ろう</p>

      {!user && (
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>スゲー！を送るにはログインが必要です</p>
          <Link href="/auth"><button className="btn-primary">ログイン / 新規登録</button></Link>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📸</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>まだ自慢の一枚が投稿されていません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(it => (
            <div key={it.id} style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', overflow: 'hidden', flexShrink: 0 }}>
                  {it.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (it.avatar_emoji || '🎮')}
                </div>
                <span style={{ fontWeight: 700, fontSize: '.88rem', flex: 1 }}>{it.nickname}</span>
                <span style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{timeAgo(it.showcase_updated_at)}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.showcase_photo_url} alt="自慢の一枚" style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }} />
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => toggleLike(it.id, it.likedByMe)}
                  disabled={!user || user.id === it.id || busyId === it.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, cursor: user && user.id !== it.id ? 'pointer' : 'default',
                    border: `2px solid ${it.likedByMe ? 'var(--accent)' : 'var(--card2)'}`,
                    background: it.likedByMe ? 'rgba(255,61,175,.18)' : 'transparent',
                    color: it.likedByMe ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: 700, fontSize: '.82rem', opacity: !user || user.id === it.id ? .5 : 1,
                  }}>
                  🔥 スゲー！ {it.likeCount > 0 && <span>{it.likeCount}</span>}
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
