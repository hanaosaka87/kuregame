'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';

const PREFS = [
  '北海道','青森','岩手','宮城','秋田','山形','福島',
  '茨城','栃木','群馬','埼玉','千葉','東京','神奈川',
  '新潟','富山','石川','福井','山梨','長野','岐阜','静岡','愛知',
  '三重','滋賀','京都','大阪','兵庫','奈良','和歌山',
  '鳥取','島根','岡山','広島','山口',
  '徳島','香川','愛媛','高知',
  '福岡','佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄',
];

// 主要チェーン公式リンク
const CHAINS = [
  { name: 'GiGO（ギーゴ）', emoji: '🟣', desc: 'セガグループ運営。全国200店舗以上。新店情報は公式サイトで随時更新。', url: 'https://www.gigo.co.jp/', color: '#6600cc' },
  { name: 'ラウンドワン', emoji: '🔵', desc: 'スポーツ×アミューズメント複合施設。新店・改装情報を公式で発信。', url: 'https://www.round1.co.jp/', color: '#0055cc' },
  { name: 'タイトーステーション', emoji: '🔴', desc: 'タイトー運営。キャラクター景品が充実。全国各地に展開。', url: 'https://www.taito.co.jp/gc/', color: '#cc0000' },
  { name: 'namco（ナムコ）', emoji: '🟡', desc: 'バンダイナムコ運営。プライズ景品の種類が豊富。', url: 'https://bandainamco-am.co.jp/game_center/', color: '#cc8800' },
  { name: 'アドアーズ', emoji: '🟢', desc: '東日本・西日本に展開。クレーン台の設定が話題になりやすい。', url: 'https://www.adores.jp/', color: '#008844' },
  { name: 'モーリーファンタジー', emoji: '🟠', desc: 'イオングループ内に多数展開。ファミリー向け。', url: 'https://www.fantasy.co.jp/molly-fantasy/', color: '#cc5500' },
];

interface Report {
  id: string;
  name: string;
  prefecture: string;
  addr: string | null;
  comment: string | null;
  reported_at: string;
  is_new?: boolean;
}

interface OsmStore {
  id: number;
  name: string;
  lat: number;
  lng: number;
  addr: string;
  phone: string | null;
  hours: string | null;
  website: string | null;
  brand: string | null;
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function StoresPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'osm' | 'chains'>('new');

  // 新店投稿一覧（Supabase → フォールバックはダミー）
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // OSM施設一覧
  const [osmStores, setOsmStores] = useState<OsmStore[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState(false);

  // フィルター
  const [prefFilter, setPrefFilter] = useState('すべて');
  const [search, setSearch] = useState('');

  // 報告フォーム
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({ name: '', prefecture: '', addr: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState('');

  // 新店情報を取得（Supabase設定済みならDB、未設定ならダミー）
  useEffect(() => {
    fetch('/api/stores/list')
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setReportsLoading(false); })
      .catch(() => {
        // Supabase未設定時のダミーデータ
        setReports([
          { id: 'r1', name: 'GiGO 渋谷', prefecture: '東京', addr: '東京都渋谷区', comment: '5フロア超大型！クレーン機多数', reported_at: '2026-08-28', is_new: true },
          { id: 'r2', name: 'ラウンドワン 横浜', prefecture: '神奈川', addr: '神奈川県横浜市', comment: 'リニューアルオープン', reported_at: '2026-08-25', is_new: true },
          { id: 'r3', name: 'タイトーステーション 梅田', prefecture: '大阪', addr: '大阪府大阪市北区', comment: '最新フック台が30台以上', reported_at: '2026-08-20', is_new: true },
          { id: 'r4', name: 'namco なんば', prefecture: '大阪', addr: '大阪府大阪市中央区', comment: '週替わりの景品が充実', reported_at: '2026-08-15' },
        ]);
        setReportsLoading(false);
      });
  }, []);

  // OSMは「全国施設」タブを開いたときだけ読み込む
  useEffect(() => {
    if (activeTab !== 'osm' || osmStores.length > 0) return;
    setOsmLoading(true);
    fetch('/api/stores')
      .then(r => r.json())
      .then(d => { setOsmStores(d.stores || []); setOsmLoading(false); })
      .catch(() => { setOsmError(true); setOsmLoading(false); });
  }, [activeTab, osmStores.length]);

  const filteredReports = useMemo(() => {
    let list = reports;
    if (prefFilter !== 'すべて') list = list.filter(r => r.prefecture === prefFilter);
    if (search) list = list.filter(r => r.name.includes(search) || (r.addr || '').includes(search));
    return list;
  }, [reports, prefFilter, search]);

  const filteredOsm = useMemo(() => {
    let list = osmStores;
    if (search) list = list.filter(s => s.name.includes(search) || s.addr.includes(search) || (s.brand || '').includes(search));
    return list;
  }, [osmStores, search]);

  const filteredChains = useMemo(() => {
    if (!search) return CHAINS;
    return CHAINS.filter(c => c.name.includes(search) || c.desc.includes(search));
  }, [search]);

  const newCount = reports.filter(r => daysSince(r.reported_at) <= 14).length;

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setReportError('');
    try {
      const res = await fetch('/api/stores/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      if (!res.ok) throw new Error();
      setReportDone(true);
    } catch {
      setReportError('送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  const tabs = [
    { key: 'new' as const,    label: `🆕 新店情報`, sub: reportsLoading ? '' : `${reports.length}件` },
    { key: 'chains' as const, label: `🏢 チェーン公式`, sub: `${CHAINS.length}社` },
    { key: 'osm' as const,    label: `🗺️ 全国施設`, sub: osmLoading ? '取得中' : osmStores.length > 0 ? `${filteredOsm.length}件` : '' },
  ];

  return (
    <main className="app">
      {/* ヘッダー */}
      <div style={{ padding: '20px 16px 0' }}>
        <Link href="/" style={{ fontSize: '.82rem', color: 'var(--muted)', display: 'block', marginBottom: 12 }}>← ホームに戻る</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900 }}>🏪 店舗・新店情報</h1>
          {newCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,100,0,.15)', border: '1px solid rgba(255,100,0,.45)', fontSize: '.65rem', fontWeight: 700, color: '#ff8c00' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6400', display: 'inline-block' }} />
              {newCount}件の新店
            </div>
          )}
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>全国のクレーンゲーム店舗・新規オープン情報を掲載。知ってたら報告してください！</p>
      </div>

      {/* 検索 */}
      <div style={{ padding: '14px 16px 0' }}>
        <input type="text" placeholder="🔍 店舗名・住所・チェーン名で検索..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', margin: '14px 16px 0', border: '1px solid var(--line)', overflow: 'hidden' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 700, fontSize: '.72rem', lineHeight: 1.4,
              background: activeTab === t.key ? 'rgba(255,61,175,.18)' : 'var(--card)',
              color: activeTab === t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            {t.label}{t.sub ? <><br /><span style={{ fontSize: '.62rem', fontWeight: 400 }}>{t.sub}</span></> : null}
          </button>
        ))}
      </div>

      {/* ===== 新店情報タブ ===== */}
      {activeTab === 'new' && (
        <div style={{ padding: '14px 16px 0' }}>
          {/* 都道府県フィルター */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            {['すべて', ...PREFS].map(p => (
              <button key={p} onClick={() => setPrefFilter(p)}
                style={{
                  flexShrink: 0, padding: '4px 10px', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '.68rem', fontWeight: 700, whiteSpace: 'nowrap',
                  background: prefFilter === p ? 'rgba(255,61,175,.18)' : 'var(--card)',
                  borderColor: prefFilter === p ? 'var(--accent)' : 'var(--line)',
                  color: prefFilter === p ? 'var(--accent)' : 'var(--muted)',
                }}>
                {p}
              </button>
            ))}
          </div>

          {/* 報告ボタン */}
          <button onClick={() => setShowReport(true)}
            style={{ width: '100%', marginBottom: 14, padding: '13px', background: 'linear-gradient(135deg, var(--accent), #aa00ff)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '.88rem', letterSpacing: '.04em' }}>
            ＋ 新店・オープン情報を報告する
          </button>

          {reportsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>読み込み中...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '.88rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏪</div>
              該当する店舗がありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredReports.map(r => {
                const days = daysSince(r.reported_at);
                const isNew = r.is_new || days <= 14;
                return (
                  <div key={r.id} style={{ background: 'var(--card)', border: `1px solid ${isNew ? 'rgba(255,100,0,.5)' : 'var(--line)'}`, padding: '14px', borderLeft: isNew ? '4px solid #ff6400' : '4px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 900, fontSize: '1rem' }}>{r.name}</div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {isNew && <span style={{ padding: '2px 7px', background: '#ff6400', color: '#fff', fontSize: '.6rem', fontWeight: 700 }}>NEW</span>}
                        {days <= 7 && <span style={{ padding: '2px 7px', background: 'rgba(255,61,175,.2)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '.6rem', fontWeight: 700 }}>{days === 0 ? '本日' : `${days}日前`}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: r.comment ? 6 : 0 }}>📍 {r.prefecture}{r.addr ? ` · ${r.addr}` : ''}</div>
                    {r.comment && <div style={{ fontSize: '.78rem', color: 'var(--lav)', background: 'rgba(255,255,255,.04)', padding: '7px 10px', borderLeft: '2px solid var(--purple)' }}>💬 {r.comment}</div>}
                    <div style={{ marginTop: 8, fontSize: '.65rem', color: 'var(--muted2)' }}>報告日：{r.reported_at.slice(0, 10)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== チェーン公式リンク集タブ ===== */}
      {activeTab === 'chains' && (
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
            主要チェーンの公式サイトから最新の新店・改装情報を確認できます。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredChains.map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: 'var(--card)', border: '1px solid var(--line)', padding: '16px', borderLeft: `4px solid ${c.color}`, textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.3rem' }}>{c.emoji}</span>
                    <span style={{ fontWeight: 900, fontSize: '.95rem', color: 'var(--text)' }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: '.72rem', color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>公式サイト →</span>
                </div>
                <p style={{ fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: '.64rem', padding: '3px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--line)', color: 'var(--lav)' }}>🏪 店舗一覧</span>
                  <span style={{ fontSize: '.64rem', padding: '3px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--line)', color: 'var(--lav)' }}>🆕 新店情報</span>
                </div>
              </a>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '.68rem', color: 'var(--muted2)', margin: '20px 0 8px', lineHeight: 1.7 }}>
            掲載していないチェーンの情報は<br />「新店を報告」からお知らせください。
          </p>
          <button onClick={() => { setActiveTab('new'); setShowReport(true); }}
            style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '.84rem' }}>
            ＋ 新店情報を報告する
          </button>
        </div>
      )}

      {/* ===== 全国施設一覧タブ（OSM） ===== */}
      {activeTab === 'osm' && (
        <div style={{ padding: '14px 16px 0' }}>
          {osmLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔍</div>
              <div style={{ color: 'var(--accent)', fontWeight: 700 }}>全国の施設データを取得中...</div>
              <div style={{ color: 'var(--muted)', fontSize: '.76rem', marginTop: 6 }}>OpenStreetMapから読み込んでいます</div>
            </div>
          ) : osmError ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
              <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>データの取得に失敗しました。<br />しばらく後に再読み込みしてください。</p>
            </div>
          ) : filteredOsm.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '.88rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏪</div>
              検索結果が見つかりません
            </div>
          ) : (
            <>
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 12 }}>OpenStreetMapに登録された全国のアミューズメント施設 {filteredOsm.length} 件</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredOsm.map(s => (
                  <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', padding: '13px', borderLeft: '4px solid var(--cyan)' }}>
                    <div style={{ fontWeight: 900, fontSize: '.94rem', marginBottom: 4 }}>{s.name}</div>
                    {s.brand && s.brand !== s.name && <div style={{ fontSize: '.68rem', color: 'var(--cyan)', marginBottom: 4 }}>{s.brand}</div>}
                    {s.addr && <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginBottom: 4 }}>📍 {s.addr}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                      {s.hours && <span style={{ fontSize: '.65rem', color: 'var(--lav)', background: 'rgba(255,255,255,.05)', padding: '3px 7px', border: '1px solid var(--line)' }}>🕐 {s.hours}</span>}
                      {s.phone && <a href={`tel:${s.phone}`} style={{ fontSize: '.65rem', color: 'var(--cyan)', background: 'rgba(0,229,255,.06)', padding: '3px 7px', border: '1px solid rgba(0,229,255,.25)' }}>📞 {s.phone}</a>}
                      {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.65rem', color: 'var(--accent)', background: 'rgba(255,61,175,.06)', padding: '3px 7px', border: '1px solid rgba(255,61,175,.25)' }}>🌐 公式サイト</a>}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '.65rem', color: 'var(--green)', background: 'rgba(57,255,136,.06)', padding: '3px 7px', border: '1px solid rgba(57,255,136,.25)' }}>🗺️ マップで見る</a>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: '.65rem', color: 'var(--muted2)', margin: '16px 0 8px', lineHeight: 1.7 }}>
                データ出典：OpenStreetMap contributors (ODbL)<br />未掲載の施設は「新店を報告」からご連絡ください。
              </p>
            </>
          )}
        </div>
      )}

      {/* ===== 報告モーダル ===== */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,0,15,.88)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => { if (!submitting) setShowReport(false); }}>
          <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--card)', borderTop: '2px solid var(--accent)', padding: '24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            {reportDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 900, fontSize: '1rem', marginBottom: 8, color: 'var(--green)' }}>報告ありがとうございます！</div>
                <p style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.7 }}>運営が確認後に掲載します。<br />ご協力ありがとうございます🎮</p>
                <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => { setShowReport(false); setReportDone(false); setReportForm({ name: '', prefecture: '', addr: '', comment: '' }); }}>閉じる</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 4 }}>🆕 新店・オープン情報を報告</h2>
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>クレーンゲーム店の新規オープン・リニューアル情報を教えてください！</p>
                <form onSubmit={submitReport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>店舗名 *</label>
                    <input type="text" placeholder="例：GiGO 渋谷ZERO" required value={reportForm.name} onChange={e => setReportForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>都道府県 *</label>
                    <select required value={reportForm.prefecture} onChange={e => setReportForm(f => ({ ...f, prefecture: e.target.value }))}>
                      <option value="">選択してください</option>
                      {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>住所・場所</label>
                    <input type="text" placeholder="例：渋谷区道玄坂1-2-3" value={reportForm.addr} onChange={e => setReportForm(f => ({ ...f, addr: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>コメント（台数・特徴など）</label>
                    <textarea placeholder="例：最新フック台が多数！景品も充実してる" value={reportForm.comment} onChange={e => setReportForm(f => ({ ...f, comment: e.target.value }))} rows={3}
                      style={{ width: '100%', background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'inherit', fontSize: '.88rem', resize: 'none' }} />
                  </div>
                  {reportError && <p style={{ color: 'var(--accent)', fontSize: '.82rem' }}>⚠️ {reportError}</p>}
                  <button type="submit" className="btn-primary" style={{ marginTop: 4 }} disabled={submitting}>
                    <b>{submitting ? '送信中...' : '📨 送信する'}</b>
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowReport(false)} disabled={submitting}>キャンセル</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <AppFooter />
    </main>
  );
}
