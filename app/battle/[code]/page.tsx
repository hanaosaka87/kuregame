'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { BattleRoom, GameSession } from '@/lib/supabase';
import AppFooter from '@/components/AppFooter';
import BattleProgressList from '@/components/BattleProgressList';
import { getParticipantKey } from '@/lib/participant';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function BattleResultPage() {
  const params = useParams();
  const code = String(params.code || '').toUpperCase();

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [closing, setClosing] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      const participantKey = getParticipantKey();
      const res = await fetch(`/api/battle/${code}/results?participant_key=${encodeURIComponent(participantKey)}`);
      const data = await res.json();
      if (!data.room) { setNotFound(true); return; }
      setRoom(data.room);
      setSessions(data.sessions || []);
      setIsHost(!!data.is_host);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  async function closeRoom() {
    if (!confirm('この対戦を終了しますか？終了すると新しい参加者はこのルームに記録できなくなります。')) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/battle/${code}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_key: getParticipantKey() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '終了に失敗しました');
      await fetchResults();
    } catch (e) {
      alert(e instanceof Error ? e.message : '終了に失敗しました');
    } finally {
      setClosing(false);
    }
  }

  useEffect(() => {
    fetchResults();
    const id = setInterval(fetchResults, 8000);
    return () => clearInterval(id);
  }, [fetchResults]);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(`https://cranegame.hana.trickster.biz/battle/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  if (loading) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </main>
    );
  }

  if (notFound || !room) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px', textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', color: 'var(--muted)', marginTop: 40 }}>この対戦コードは見つかりませんでした。</p>
        <AppFooter />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>⚔️ 対戦結果</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>
        🏪 {room.store_name}　💰 {room.budget.toLocaleString()}円チャレンジ
      </p>

      {room.status === 'closed' && (
        <div style={{ background: 'rgba(255,61,154,0.12)', border: '1px solid var(--accent)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
          🏁 この対戦は終了しました（新しい記録は追加できません）
        </div>
      )}

      <div className="rate-display" style={{ borderRadius: 16, padding: '14px 18px', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>招待コード</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: 4, color: 'var(--accent)' }}>{room.code}</div>
      </div>

      {room.status !== 'closed' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={copyInviteLink}>
            {copied ? '✅ コピーしました' : '🔗 招待リンクをコピー'}
          </button>
          <a href={`/challenge?battle=${room.code}`} className="btn-primary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            自分も参加する
          </a>
        </div>
      )}

      {isHost && room.status !== 'closed' && (
        <button
          className="btn-secondary"
          style={{ width: '100%', marginBottom: 28, color: 'var(--accent)', borderColor: 'var(--accent)' }}
          onClick={closeRoom}
          disabled={closing}
        >
          {closing ? '終了処理中…' : '🏁 この対戦を終了する（ホストのみ）'}
        </button>
      )}
      {room.status === 'closed' && <div style={{ marginBottom: 28 }} />}

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>⏳ 進行中（登録前のリアルタイム状況）</h3>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 10 }}>
          まだランキングに登録していない参加者も、今いくら使って何個獲ったかがここで見られます。
        </p>
        <BattleProgressList battleRoomId={room.id} budget={room.budget} />
      </div>

      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>
        🏆 元取り率ランキング（{sessions.length}人参加・確定済み）
      </h3>

      {sessions.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>
          まだ誰も記録していません。招待リンクを送って一緒に挑戦しましょう！
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {sessions.map((s, i) => (
            <div key={s.id || i} className="prize-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '1.3rem', width: 32, textAlign: 'center', flexShrink: 0 }}>
                {MEDALS[i] || `${i + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.nickname}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                  投入¥{s.total_spent.toLocaleString()} → 定価¥{s.total_retail_value.toLocaleString()}（{s.prize_count}個）
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: s.efficiency_rate >= 100 ? 'var(--gold)' : 'var(--cyan)', flexShrink: 0 }}>
                {s.efficiency_rate}%
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center' }}>
        8秒ごとに自動更新されます
      </p>

      <AppFooter />
    </main>
  );
}
