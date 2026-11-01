'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { BattleProgress } from '@/lib/supabase';

const POLL_MS = 6000;

export default function BattleProgressList({ battleRoomId, budget, myParticipantKey }: {
  battleRoomId: string;
  budget: number;
  myParticipantKey?: string;
}) {
  const [rows, setRows] = useState<BattleProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      const { data } = await getSupabase()
        .from('battle_progress')
        .select('*')
        .eq('battle_room_id', battleRoomId)
        .order('efficiency_rate', { ascending: false });
      setRows(data || []);
    } catch {
      // 取得失敗時は前回の表示を維持する
    } finally {
      setLoading(false);
    }
  }, [battleRoomId]);

  useEffect(() => {
    fetchRows();
    const id = setInterval(fetchRows, POLL_MS);
    return () => clearInterval(id);
  }, [fetchRows]);

  if (loading && rows.length === 0) {
    return <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>読み込み中...</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>まだ誰も記録を始めていません</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(r => {
        const remaining = budget > 0 ? budget - r.total_spent : null;
        const isMe = !!myParticipantKey && r.participant_key === myParticipantKey;
        return (
          <div key={r.id || r.participant_key} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
            background: isMe ? 'rgba(255,61,175,0.1)' : 'var(--card)',
            border: `1px solid ${isMe ? 'var(--accent)' : 'var(--card2)'}`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.nickname}{isMe ? '（あなた）' : ''}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                投入¥{r.total_spent.toLocaleString()}
                {remaining !== null && (
                  remaining >= 0
                    ? `・残り¥${remaining.toLocaleString()}`
                    : `・¥${Math.abs(remaining).toLocaleString()}オーバー`
                )}
                　{r.prize_count}個
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: r.efficiency_rate >= 100 ? 'var(--gold)' : 'var(--cyan)', flexShrink: 0 }}>
              {r.efficiency_rate}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
