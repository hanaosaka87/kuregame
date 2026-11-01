// 2026-10-21 切り分け調査結果に基づき、game_sessions.is_seed_data を実際に立てるスクリプト。
// 事前に scripts/schema_seed_flag.sql をSupabase SQL Editorで実行し、
// is_seed_data列が存在する状態にしてから実行すること。
'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const supabase = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY);

const cleanSql = fs.readFileSync(path.join(__dirname, 'seed_sessions_clean.sql'), 'utf8');
const cleanNicknames = new Set([...cleanSql.matchAll(/^\('([^']+)'/gm)].map(m => m[1]));

const ADJ = ['ラッキー', 'クレゲー', '元取り', '達人', '初心者', '見習い', 'プロ', 'ミラクル', '今日も', '週末', '深夜', '通りすがりの'];
const NOUN = ['ハンター', 'マスター', 'チャレンジャー', 'ファイター', '侍', '職人', '見物人', 'クレーン師', 'キャット', 'ドッグ', 'ライダー', '旅人'];
const CHAINS = ['GiGO', 'ラウンドワン', 'タイトーステーション', 'namco', 'アドアーズ', 'モーリーファンタジー', 'アミパラ', '回遊館'];
const CITY_SUFFIX = ['駅前店', '中央店', 'イオンモール店', '本店', 'ゆめタウン店', '南店', '北店', 'アリオ店'];

function isAdjNounNickname(nick) {
  if (!nick) return false;
  return ADJ.some(a => nick.startsWith(a) && NOUN.some(n => nick.slice(a.length).replace(/\d+$/, '') === n));
}
function isChainSuffixStore(store) {
  if (!store) return false;
  return CHAINS.some(c => store.startsWith(c) && CITY_SUFFIX.some(s => store === c + s));
}

async function fetchAll() {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('id,nickname,store_name,machine_type,created_at,is_seed_data')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { console.error('取得エラー:', error.message); process.exit(1); }
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const rows = await fetchAll();
  if (!('is_seed_data' in rows[0])) {
    console.error('❌ is_seed_data列が見つかりません。先に scripts/schema_seed_flag.sql をSupabase SQL Editorで実行してください。');
    process.exit(1);
  }

  const batch600Ids = rows.filter(r => isAdjNounNickname(r.nickname) && isChainSuffixStore(r.store_name) && r.machine_type).map(r => r.id);
  const batch600Set = new Set(batch600Ids);

  const batchCleanIds = rows.filter(r => !batch600Set.has(r.id) && cleanNicknames.has(r.nickname)).map(r => r.id);
  const batchCleanSet = new Set(batchCleanIds);

  const batch0913Ids = rows.filter(r => !batch600Set.has(r.id) && !batchCleanSet.has(r.id) && r.created_at.slice(0, 10) === '2026-09-13').map(r => r.id);

  const debugTestIds = rows.filter(r => r.store_name === 'debug_test').map(r => r.id);

  const allSeedIds = [...new Set([...batch600Ids, ...batchCleanIds, ...batch0913Ids, ...debugTestIds])];
  console.log(`フラグを立てる件数: ${allSeedIds.length}（600バッチ:${batch600Ids.length} / clean seed:${batchCleanIds.length} / 09-13バッチ:${batch0913Ids.length} / debug_test:${debugTestIds.length}）`);

  const CHUNK = 200;
  let updated = 0;
  for (let i = 0; i < allSeedIds.length; i += CHUNK) {
    const chunk = allSeedIds.slice(i, i + CHUNK);
    const { error } = await supabase.from('game_sessions').update({ is_seed_data: true }).in('id', chunk);
    if (error) { console.error('更新エラー:', error.message); process.exit(1); }
    updated += chunk.length;
    console.log(`  更新: ${updated}/${allSeedIds.length}`);
  }

  const { count: realCount } = await supabase.from('game_sessions').select('id', { count: 'exact', head: true }).eq('is_seed_data', false);
  const { count: seedCount } = await supabase.from('game_sessions').select('id', { count: 'exact', head: true }).eq('is_seed_data', true);
  console.log(`\n✅ 完了。is_seed_data=false(実データ): ${realCount}件 / is_seed_data=true(ダミー/テスト): ${seedCount}件`);
}

main();
