// クレゲー：週次/月次 利用統計レポートを自動生成し、PDF化してメール送信する。
// 実行: node scripts/report-stats.mjs weekly   （毎週月曜 想定）
//      node scripts/report-stats.mjs monthly  （毎月1日 想定）
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mode = process.argv[2] === 'monthly' ? 'monthly' : 'weekly';
const windowDays = mode === 'monthly' ? 30 : 7;

const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
for (const [k, v] of Object.entries(creds)) {
  if (v) process.env[k] = v;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('credentials.json に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function countSince(table, sinceIso, dateColumn = 'created_at') {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (sinceIso) q = q.gte(dateColumn, sinceIso);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message || JSON.stringify(error)}`);
  return count ?? 0;
}

async function distinctActiveUsers(sinceIso) {
  let q = supabase.from('game_sessions').select('user_id');
  if (sinceIso) q = q.gte('created_at', sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return new Set((data || []).map((r) => r.user_id).filter(Boolean)).size;
}

async function topPrefectures(sinceIso, limit = 5) {
  let q = supabase.from('game_sessions').select('prefecture');
  if (sinceIso) q = q.gte('created_at', sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  const counts = {};
  for (const r of data || []) {
    const p = r.prefecture || '未設定';
    counts[p] = (counts[p] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  const now = new Date();
  const sinceDate = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const sinceIso = sinceDate.toISOString();

  const [
    profilesTotal,
    profilesWindow,
    sessionsTotal,
    sessionsWindow,
    activeWindow,
    claimsTotal,
    claimsWindow,
    prefRanking,
  ] = await Promise.all([
    countSince('user_profiles', null),
    countSince('user_profiles', sinceIso),
    countSince('game_sessions', null),
    countSince('game_sessions', sinceIso),
    distinctActiveUsers(sinceIso),
    countSince('founding_member_claims', null, 'claimed_at'),
    countSince('founding_member_claims', sinceIso, 'claimed_at'),
    topPrefectures(sinceIso),
  ]);

  const label = mode === 'monthly' ? '月次' : '週次';
  const periodText = `${fmtDate(sinceDate)} 〜 ${fmtDate(now)}（過去${windowDays}日間）`;

  const prefLines = prefRanking.length
    ? prefRanking.map(([pref, c], i) => `${i + 1}. ${pref}：${c}件`).join('\n')
    : '（期間内の記録なし）';

  const md = `# クレゲー ${label}利用統計レポート

**対象期間：** ${periodText}
**作成：** CDO（自動生成）

---

## サマリー

| 指標 | 期間内 | 累計 |
|---|---|---|
| 新規登録者（プロフィール作成） | ${profilesWindow}人 | ${profilesTotal}人 |
| 戦績記録数 | ${sessionsWindow}件 | ${sessionsTotal}件 |
| アクティブ利用者（記録した人数） | ${activeWindow}人 | - |
| 創業メンバー特典クレーム | ${claimsWindow}件 | ${claimsTotal}件 |

## 期間内 都道府県別 戦績記録ランキング（上位5件）

${prefLines}

---

**注記：** 登録者数はクレゲーの\`user_profiles\`テーブル（プロフィール作成済み＝実際に使い始めた人）を基準に集計しています。SupabaseプロジェクトをGoogle Play非掲載の他アプリと同居運用しているため、Supabase側の\`auth.users\`総数とは一致しません。Google Play経由のインストール数・テスター数は別集計（Play Console）です。

管理画面（/admin）でも同じ指標をリアルタイムで確認できます。
`;

  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const outDir = 'G:\\マイドライブ\\株式会社華\\context\\CDO（最高デジタル責任者）\\output';
  fs.mkdirSync(outDir, { recursive: true });
  const baseName = `${dateStr}_クレゲー${label}利用統計レポート`;
  const mdPath = path.join(outDir, `${baseName}.md`);
  const pdfPath = path.join(outDir, `${baseName}.pdf`);

  fs.writeFileSync(mdPath, md, 'utf8');
  console.log('MD作成:', mdPath);

  execFileSync('node', ['G:\\マイドライブ\\株式会社華\\context\\md2pdf.js', mdPath], { stdio: 'inherit' });

  if (!fs.existsSync(pdfPath)) throw new Error('PDF変換に失敗しました: ' + pdfPath);
  fs.unlinkSync(mdPath);
  console.log('PDF作成完了・MD削除:', pdfPath);

  execFileSync('node', [
    'G:\\マイドライブ\\株式会社華\\context\\send_mail.js',
    '--to', 'hanaosaka87@gmail.com',
    '--subject', `【自動レポート】${dateStr}_クレゲー${label}利用統計`,
    '--body', `CDO（自動生成）：クレゲーの${label}利用統計レポートです。対象期間 ${periodText}。新規登録${profilesWindow}人・戦績記録${sessionsWindow}件・アクティブ利用者${activeWindow}人・特典クレーム${claimsWindow}件。社内用。`,
    '--file', pdfPath,
  ], { stdio: 'inherit' });

  console.log('メール送信完了');
  process.exit(0);
}

main().catch((e) => {
  console.error('❌', e && e.stack ? e.stack : e);
  process.exit(1);
});
