// クレゲー：前月の都道府県別月間チャンピオンに+500ポイントを付与する（毎月1日 想定）。
// v_monthly_champions は「今月の暫定チャンピオン」も含むため、このスクリプトは必ず
// 「前月（＝すでに確定した月）」分だけを対象にする。dedupe_keyにより二重実行しても安全。
// 実行: node scripts/award-monthly-champion-points.mjs
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const MONTHLY_CHAMPION_POINTS = 500;

function prevMonthStr() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function awardPoints(userId, amount, reason, dedupeKey) {
  const { error: insertErr } = await supabase
    .from('point_transactions')
    .insert({ user_id: userId, amount, reason, dedupe_key: dedupeKey });
  if (insertErr) {
    if (insertErr.code === '23505') return { awarded: false, already: true };
    throw insertErr;
  }
  const { error: rpcErr } = await supabase.rpc('increment_user_points', { p_user_id: userId, p_amount: amount });
  if (rpcErr) throw rpcErr;
  return { awarded: true };
}

async function main() {
  const yearMonth = prevMonthStr();
  console.log(`=== ${yearMonth} の月間チャンピオンへポイント付与 ===`);

  const { data: champions, error } = await supabase
    .from('v_monthly_champions')
    .select('prefecture, user_id, nickname, efficiency_rate')
    .eq('year_month', yearMonth);
  if (error) throw error;

  if (!champions || champions.length === 0) {
    console.log('対象のチャンピオンが見つかりませんでした（データなし）。');
    return;
  }

  let awardedCount = 0;
  let skippedCount = 0;
  for (const c of champions) {
    if (!c.user_id) { skippedCount++; continue; } // ゲスト参加者はポイントを貯める口座がないためスキップ
    const dedupeKey = `monthly_champion_${yearMonth}_${c.prefecture}`;
    const result = await awardPoints(c.user_id, MONTHLY_CHAMPION_POINTS, 'monthly_champion', dedupeKey);
    if (result.awarded) {
      awardedCount++;
      console.log(`✅ ${c.prefecture} ${c.nickname}（${c.efficiency_rate}%）に+${MONTHLY_CHAMPION_POINTS}pt`);
    } else {
      console.log(`⏭  ${c.prefecture} ${c.nickname} は付与済み（スキップ）`);
    }
  }

  console.log(`=== 完了：付与${awardedCount}件・スキップ${champions.length - awardedCount}件（うちゲスト${skippedCount}件） ===`);
}

main().catch((e) => {
  console.error('❌ エラー:', e.message || e);
  process.exit(1);
});
