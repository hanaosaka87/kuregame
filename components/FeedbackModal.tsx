'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'bug', label: '🐛 バグ報告' },
  { value: 'request', label: '💡 改善要望' },
  { value: 'other', label: '💬 その他' },
];

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState('request');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feedback', category, body: body.trim() }),
    }).catch(() => {});
    setLoading(false);
    setDone(true);
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: '0 16px',
  };
  const modal: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--line)',
    padding: 24, width: '100%', maxWidth: 360,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: '2.4rem', marginBottom: 10 }}>📬</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>送信しました！</p>
            <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: 16 }}>
              フィードバックありがとうございます。開発チームが確認します。
            </p>
            <button onClick={onClose} style={{
              padding: '10px 28px', background: 'var(--green)', color: '#04222b',
              fontWeight: 900, cursor: 'pointer', border: 'none', fontSize: '.9rem',
            }}>閉じる</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <strong style={{ fontSize: '1rem' }}>💬 フィードバック</strong>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '.78rem', marginBottom: 14 }}>
              バグ・改善要望・ご意見をお聞かせください。
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)} style={{
                  flex: 1, padding: '7px 4px', fontSize: '.68rem', fontWeight: 700, cursor: 'pointer',
                  background: category === c.value ? 'rgba(255,61,175,.2)' : 'var(--card-dark)',
                  border: `1px solid ${category === c.value ? 'var(--accent)' : 'var(--line)'}`,
                  color: category === c.value ? 'var(--accent)' : 'var(--muted)',
                }}>
                  {c.label}
                </button>
              ))}
            </div>

            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="内容を入力してください"
              rows={4}
              style={{
                width: '100%', background: 'var(--card-dark)', border: '1px solid var(--line)',
                color: 'var(--text)', padding: '10px 12px', fontSize: '.84rem',
                resize: 'none', outline: 'none', marginBottom: 14, fontFamily: 'inherit',
              }}
            />

            <button onClick={submit} disabled={!body.trim() || loading} style={{
              width: '100%', padding: '12px',
              background: !body.trim() || loading ? 'var(--line)' : 'linear-gradient(135deg,var(--accent),var(--purple))',
              color: '#fff', fontWeight: 900, cursor: body.trim() && !loading ? 'pointer' : 'not-allowed',
              border: 'none', fontSize: '.9rem',
            }}>
              {loading ? '送信中...' : '送信する'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
