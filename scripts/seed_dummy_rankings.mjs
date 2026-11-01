// 全国・都道府県別・月間ランキングを充実させるためのダミー挑戦者データ投入スクリプト。
// 2026年8月・9月分を各300件、フック設定/アーム（クレーン）を半々で投入し、
// 47都道府県すべてにランキングが表示されるようにする。
// 実行: node scripts/seed_dummy_rankings.mjs
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const supabase = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY);

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

const CHAINS = ['GiGO', 'ラウンドワン', 'タイトーステーション', 'namco', 'アドアーズ', 'モーリーファンタジー', 'アミパラ', '回遊館'];
const CITY_SUFFIX = ['駅前店', '中央店', 'イオンモール店', '本店', 'ゆめタウン店', '南店', '北店', 'アリオ店'];

const MACHINE_TYPES = ['フック設定', 'アーム（クレーン）'];
const CHALLENGE_TYPES = ['1000', '3000', '5000', '10000', 'free'];
const CHALLENGE_SPENT = { '1000': 1000, '3000': 3000, '5000': 5000, '10000': 10000 };

const ADJ = ['ラッキー', 'クレゲー', '元取り', '達人', '初心者', '見習い', 'プロ', 'ミラクル', '今日も', '週末', '深夜', '通りすがりの'];
const NOUN = ['ハンター', 'マスター', 'チャレンジャー', 'ファイター', '侍', '職人', '見物人', 'クレーン師', 'キャット', 'ドッグ', 'ライダー', '旅人'];

const CEILING = 500; // 既存トップ記録(1546.7%)を崩さないための上限
const FLOOR = 15;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomNickname() {
  // 2026-10-31: 末尾の連番がダミーデータらしく見えるため廃止（社長指示）
  return `${pick(ADJ)}${pick(NOUN)}`;
}
function randomStoreName() {
  return `${pick(CHAINS)}${pick(CITY_SUFFIX)}`;
}

const PRIZE_NAMES = [
  { name: 'ぬいぐるみ', category: 'toy' }, { name: 'カップ麺', category: 'food' },
  { name: 'PETボトル飲料', category: 'food' }, { name: 'フィギュア', category: 'figure' },
  { name: 'お菓子', category: 'food' }, { name: 'タオル', category: 'daily' },
  { name: 'キャラクターグッズ', category: 'toy' },
];

// 指定の月（'2026-08' 等）内のランダムな日時（ISO文字列）を生成
function randomDateInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const day = randInt(1, daysInMonth);
  const hour = randInt(9, 23);
  const minute = randInt(0, 59);
  const d = new Date(y, m - 1, day, hour, minute, randInt(0, 59));
  return d.toISOString();
}

function generateSession(yearMonth, prefecture, machineType) {
  const challenge_type = pick(CHALLENGE_TYPES);
  const efficiency_rate = Math.round((FLOOR + Math.random() * (CEILING - FLOOR)) * 10) / 10;
  const total_spent = challenge_type === 'free' ? randInt(1, 20) * 500 : CHALLENGE_SPENT[challenge_type];
  const total_retail_value = Math.round(total_spent * efficiency_rate / 100);

  const prizeCount = randInt(1, 3);
  const prizes = [];
  let remaining = total_retail_value;
  for (let i = 0; i < prizeCount; i++) {
    const isLast = i === prizeCount - 1;
    const price = isLast ? Math.max(remaining, 0) : Math.round(remaining * (0.3 + Math.random() * 0.4));
    remaining -= price;
    const p = pick(PRIZE_NAMES);
    prizes.push({ name: p.name, category: p.category, retail_price: Math.max(price, 0), quantity: 1 });
  }

  return {
    session: {
      nickname: randomNickname(),
      store_name: randomStoreName(),
      challenge_type,
      total_spent,
      total_retail_value,
      prize_count: prizeCount,
      efficiency_rate,
      prefecture,
      machine_type: machineType,
      user_id: null,
      battle_room_id: null,
      created_at: randomDateInMonth(yearMonth),
    },
    prizes,
  };
}

async function seedMonth(yearMonth, countTotal) {
  console.log(`=== ${yearMonth} 分の生成開始（目標${countTotal}件） ===`);
  // 47都道府県 × 2機種にできるだけ均等に配分
  const combos = [];
  for (const pref of PREFECTURES) {
    for (const mt of MACHINE_TYPES) combos.push({ pref, mt });
  }
  const perCombo = Math.floor(countTotal / combos.length);
  const remainder = countTotal - perCombo * combos.length;

  const records = [];
  combos.forEach((c, i) => {
    const n = perCombo + (i < remainder ? 1 : 0);
    for (let k = 0; k < n; k++) {
      records.push(generateSession(yearMonth, c.pref, c.mt));
    }
  });

  console.log(`生成件数: ${records.length}件`);

  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const { data: sessionRows, error: sessErr } = await supabase
      .from('game_sessions')
      .insert(chunk.map(r => r.session))
      .select('id');
    if (sessErr) { console.error('セッション登録失敗:', sessErr.message); process.exit(1); }

    const prizeRows = [];
    chunk.forEach((r, idx) => {
      const sessionId = sessionRows[idx].id;
      r.prizes.forEach(p => prizeRows.push({ session_id: sessionId, ...p }));
    });
    const { error: prizeErr } = await supabase.from('prizes').insert(prizeRows);
    if (prizeErr) { console.error('景品登録失敗:', prizeErr.message); process.exit(1); }

    inserted += chunk.length;
    console.log(`  登録: ${inserted}/${records.length}`);
  }
  console.log(`✅ ${yearMonth}: ${inserted}件登録完了`);
}

async function main() {
  await seedMonth('2026-08', 300);
  await seedMonth('2026-09', 300);
  console.log('=== 全件完了 ===');
}

main().catch(e => { console.error('❌ 致命的エラー:', e.message); process.exit(1); });
