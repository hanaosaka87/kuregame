// ランキングダミーデータ（seed_dummy_rankings.mjsのADJ+NOUN+乱数で生成されたニックネーム）の
// 末尾の数字部分だけを取り除く一回限りのクリーンアップスクリプト。
// 対象は「ADJのいずれかで始まり、末尾の数字を除くとNOUNのいずれかと一致する」ニックネームのみ
// （seed_sessions_clean.sqlの手書き名「みそらーめん777」等は数字が名前の一部のため対象外）。
// 実行: node scripts/strip_dummy_nickname_numbers.mjs
'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const supabase = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY);

const ADJ = ['ラッキー', 'クレゲー', '元取り', '達人', '初心者', '見習い', 'プロ', 'ミラクル', '今日も', '週末', '深夜', '通りすがりの'];
const NOUN = ['ハンター', 'マスター', 'チャレンジャー', 'ファイター', '侍', '職人', '見物人', 'クレーン師', 'キャット', 'ドッグ', 'ライダー', '旅人'];

function isAdjNounNickname(nick) {
  if (!nick) return false;
  return ADJ.some(a => nick.startsWith(a) && NOUN.some(n => nick.slice(a.length).replace(/\d+$/, '') === n));
}

async function fetchAll() {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('id,nickname')
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
  const targets = rows
    .filter(r => isAdjNounNickname(r.nickname) && /\d+$/.test(r.nickname))
    .map(r => ({ id: r.id, newNickname: r.nickname.replace(/\d+$/, '') }));

  console.log(`対象件数: ${targets.length}件`);
  if (targets.length === 0) { console.log('対象がありません。終了します。'); return; }

  let updated = 0;
  for (const t of targets) {
    const { error } = await supabase.from('game_sessions').update({ nickname: t.newNickname }).eq('id', t.id);
    if (error) { console.error(`更新エラー(id=${t.id}):`, error.message); continue; }
    updated++;
    if (updated % 100 === 0) console.log(`  更新: ${updated}/${targets.length}`);
  }
  console.log(`✅ 完了。${updated}/${targets.length}件のニックネームから末尾の数字を除去しました。`);
}

main().catch(e => { console.error('❌ 致命的エラー:', e.message); process.exit(1); });
