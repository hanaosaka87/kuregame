'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { TeamBattle, TeamBattleRound, GameSession } from '@/lib/supabase';
import AppFooter from '@/components/AppFooter';

export default function TeamBattleResultPage() {
  const params = useParams();
  const code = String(params.code || '').toUpperCase();

  const [battle, setBattle] = useState<TeamBattle | null>(null);
  const [rounds, setRounds] = useState<TeamBattleRound[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState<'A' | 'B' | null>(null);

  // サドンデス方式：ラウンド記録フォーム
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [winner, setWinner] = useState<'A' | 'B' | 'draw' | ''>('');
  const [memo, setMemo] = useState('');
  const [submittingRound, setSubmittingRound] = useState(false);
  const [roundError, setRoundError] = useState('');

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/team-battle/${code}/results`);
      const data = await res.json();
      if (!data.battle) { setNotFound(true); return; }
      setBattle(data.battle);
      setRounds(data.rounds || []);
      setSessions(data.sessions || []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchResults();
    const id = setInterval(fetchResults, 8000);
    return () => clearInterval(id);
  }, [fetchResults]);

  async function copyInviteLink(team: 'A' | 'B') {
    try {
      const url = `https://cranegame.hana.trickster.biz/challenge?teamBattle=${code}&team=${team}`;
      await navigator.clipboard.writeText(url);
      setCopied(team);
      setTimeout(() => setCopied(null), 2500);
    } catch {}
  }

  async function submitRound() {
    if (!winner) { setRoundError('勝敗を選択してください'); return; }
    setRoundError('');
    setSubmittingRound(true);
    try {
      const res = await fetch(`/api/team-battle/${code}/round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_a_player: playerA || null, team_b_player: playerB || null, winner_team: winner, memo: memo || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '記録に失敗しました');
      setPlayerA(''); setPlayerB(''); setWinner(''); setMemo('');
      await fetchResults();
    } catch (e) {
      setRoundError(e instanceof Error ? e.message : '記録に失敗しました');
    } finally {
      setSubmittingRound(false);
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </main>
    );
  }

  if (notFound || !battle) {
    return (
      <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '24px 20px 100px', textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', color: 'var(--muted)', marginTop: 40 }}>この団体戦コードは見つかりませんでした。</p>
        <AppFooter />
      </main>
    );
  }

  const aWins = rounds.filter(r => r.winner_team === 'A').length;
  const bWins = rounds.filter(r => r.winner_team === 'B').length;
  const draws = rounds.filter(r => r.winner_team === 'draw').length;

  const teamASessions = sessions.filter(s => s.team_side === 'A');
  const teamBSessions = sessions.filter(s => s.team_side === 'B');
  function teamAgg(list: GameSession[]) {
    const spent = list.reduce((s, x) => s + x.total_spent, 0);
    const retail = list.reduce((s, x) => s + x.total_retail_value, 0);
    const rate = spent > 0 ? Math.round((retail / spent) * 1000) / 10 : 0;
    return { spent, retail, rate, count: list.length };
  }
  const aggA = teamAgg(teamASessions);
  const aggB = teamAgg(teamBSessions);

  return (
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🤝 団体戦（3対3）</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 20 }}>
        🏪 {battle.store_name}
        {battle.mode === 'fixed_budget' && battle.budget ? `　💰 ${battle.budget.toLocaleString()}円チャレンジ` : '　⚡ 短期決戦（何勝何敗）'}
      </p>

      <div className="rate-display" style={{ borderRadius: 16, padding: '14px 18px', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>招待コード</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: 4, color: 'var(--accent)' }}>{battle.code}</div>
      </div>

      {battle.mode === 'sudden_death' ? (
        <>
          {/* スコアボード */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div className="prize-card" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{battle.team_a_name}</div>
              <div style={{ fontWeight: 900, fontSize: '2.2rem', color: aWins >= bWins ? 'var(--gold)' : 'var(--text)' }}>{aWins}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>勝ち</div>
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--muted)' }}>VS</div>
            <div className="prize-card" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{battle.team_b_name}</div>
              <div style={{ fontWeight: 900, fontSize: '2.2rem', color: bWins >= aWins ? 'var(--gold)' : 'var(--text)' }}>{bWins}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>勝ち</div>
            </div>
          </div>
          {draws > 0 && <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 16 }}>引き分け {draws}回</p>}

          {/* ラウンド記録フォーム */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10, color: 'var(--accent)' }}>
              ラウンド{rounds.length + 1} を記録
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
              1人ずつ交互にチャレンジし、先に景品を獲得したチームの勝ちです。担当した選手名（任意）と勝敗を記録してください。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <input type="text" placeholder={`${battle.team_a_name}の選手（任意）`} value={playerA} onChange={e => setPlayerA(e.target.value)} maxLength={12} />
              <input type="text" placeholder={`${battle.team_b_name}の選手（任意）`} value={playerB} onChange={e => setPlayerB(e.target.value)} maxLength={12} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
              {([
                { key: 'A', label: `${battle.team_a_name}の勝ち` },
                { key: 'draw', label: '引き分け' },
                { key: 'B', label: `${battle.team_b_name}の勝ち` },
              ] as const).map(w => (
                <button
                  key={w.key}
                  onClick={() => setWinner(w.key)}
                  style={{
                    padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.76rem',
                    background: winner === w.key ? 'linear-gradient(135deg,var(--accent),#aa00ff)' : 'var(--card2)',
                    color: winner === w.key ? 'white' : 'var(--text)',
                  }}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <input type="text" placeholder="メモ（任意・獲得景品など）" value={memo} onChange={e => setMemo(e.target.value)} style={{ marginBottom: 10 }} />
            {roundError && <p style={{ color: 'var(--accent)', fontSize: '0.82rem', marginBottom: 10 }}>{roundError}</p>}
            <button className="btn-primary" onClick={submitRound} disabled={submittingRound}>
              {submittingRound ? '記録中...' : 'このラウンドを記録する'}
            </button>
          </div>

          {/* ラウンド履歴 */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>📋 ラウンド履歴</h3>
          {rounds.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>まだ記録がありません</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[...rounds].reverse().map(r => (
                <div key={r.id} className="prize-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: '0.85rem', width: 44, textAlign: 'center', color: 'var(--muted)' }}>#{r.round_no}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: r.winner_team === 'A' ? 900 : 400, color: r.winner_team === 'A' ? 'var(--gold)' : 'var(--text)' }}>
                      {r.team_a_player || battle.team_a_name}
                    </span>
                    <span style={{ color: 'var(--muted)', margin: '0 6px' }}>vs</span>
                    <span style={{ fontWeight: r.winner_team === 'B' ? 900 : 400, color: r.winner_team === 'B' ? 'var(--gold)' : 'var(--text)' }}>
                      {r.team_b_player || battle.team_b_name}
                    </span>
                    {r.memo && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{r.memo}</div>}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                    {r.winner_team === 'draw' ? '引き分け' : r.winner_team === 'A' ? `${battle.team_a_name}◯` : `${battle.team_b_name}◯`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 金額チャレンジ団体戦：チーム集計 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[{ name: battle.team_a_name, agg: aggA, team: 'A' as const }, { name: battle.team_b_name, agg: aggB, team: 'B' as const }].map(t => (
              <div key={t.team} className="prize-card" style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontWeight: 900, fontSize: '1.7rem', color: t.agg.rate >= (t.team === 'A' ? aggB.rate : aggA.rate) && t.agg.count > 0 ? 'var(--gold)' : 'var(--cyan)' }}>
                  {t.agg.count > 0 ? `${t.agg.rate}%` : '--%'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>{t.agg.count}/3人 提出済み</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => copyInviteLink('A')}>
              {copied === 'A' ? '✅ コピー済み' : `🔗 ${battle.team_a_name}用リンク`}
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => copyInviteLink('B')}>
              {copied === 'B' ? '✅ コピー済み' : `🔗 ${battle.team_b_name}用リンク`}
            </button>
          </div>

          {[{ name: battle.team_a_name, list: teamASessions }, { name: battle.team_b_name, list: teamBSessions }].map(t => (
            <div key={t.name} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8 }}>{t.name}のメンバー</h3>
              {t.list.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>まだ誰も記録していません</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {t.list.map((s, i) => (
                    <div key={s.id || i} className="prize-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.nickname}</span>
                      <span style={{ fontWeight: 900, fontSize: '1rem', color: s.efficiency_rate >= 100 ? 'var(--gold)' : 'var(--cyan)' }}>{s.efficiency_rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center' }}>8秒ごとに自動更新されます</p>
      <AppFooter />
    </main>
  );
}
