// 全国のクレーンゲーム設置店を Google Places API (New) で毎週収集し、
// 未知の施設だけを places_stores に登録するスクリプト（「全国施設」タブ用カタログ）。
// これは「新店オープン報告」ではなく既存施設の一覧なので、store_reports（新店情報・
// 人の投稿）とは別テーブルに入れ、人の承認は挟まず自動反映する。
// 実行: node scripts/collect-new-stores.mjs
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// credentials.json を環境変数に展開
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
for (const [k, v] of Object.entries(creds)) {
  if (v) process.env[k] = v;
}

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PLACES_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('credentials.json に GOOGLE_PLACES_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です');
  process.exit(1);
}

// service_roleキーはRLSをバイパスする管理者権限。このスクリプトはローカル実行専用で、
// ブラウザに渡るanonキー（NEXT_PUBLIC_*）とは別物のため公開されない。
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// stores/page.tsx の PREFS と完全一致させる（都道府県判定の一致に必要）
const PREFS = [
  '北海道','青森','岩手','宮城','秋田','山形','福島',
  '茨城','栃木','群馬','埼玉','千葉','東京','神奈川',
  '新潟','富山','石川','福井','山梨','長野','岐阜','静岡','愛知',
  '三重','滋賀','京都','大阪','兵庫','奈良','和歌山',
  '鳥取','島根','岡山','広島','山口',
  '徳島','香川','愛媛','高知',
  '福岡','佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄',
];

const KEYWORDS = ['クレーンゲーム', 'ゲームセンター', 'フック設定 クレーン'];

const STATE_DIR = path.join(__dirname, 'state');
const STATE_FILE = path.join(STATE_DIR, 'known-places.json');
const LOG_DIR = path.join(__dirname, 'log');

function loadKnownPlaceIds() {
  try {
    return new Set(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
  } catch {
    return new Set();
  }
}

function saveKnownPlaceIds(set) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify([...set], null, 0), 'utf8');
}

// Places API (New) Text Search。基本フィールドのみ要求してPro SKU（無料枠5,000件/月）に収める。
// 営業時間・評価・写真等は絶対に追加しない（Enterprise課金・無料枠1,000件/月に切り替わるため）。
async function searchText(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'ja', regionCode: 'JP' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.places || [];
}

function guessPrefecture(addr) {
  return PREFS.find(p => addr.includes(p)) || null;
}

// Google Places Text Search は「クレーンゲーム」「ゲームセンター」等のキーワードに対して
// カラオケ・パチンコ・ネットカフェ・飲食店なども緩くヒットするため除外する（2026-09-24）。
const EXCLUDE_PATTERNS = [
  /パチンコ|スロット|パーラー/i,
  /カラオケ|KARAOKE/i,
  /快活|自遊空間/,
  /ポーカー|麻雀/,
  /ボウリング|BOWLING/i,
  /カフェ|喫茶|レストラン|食堂|居酒屋|ラーメン|焼肉|寿司/,
];
function isExcluded(name) {
  return EXCLUDE_PATTERNS.some(re => re.test(name));
}

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const startedAt = new Date();
  const known = loadKnownPlaceIds();

  console.log(`=== 収集開始 ${startedAt.toISOString()} ===`);
  console.log(`既知の施設数: ${known.size}件`);

  const seenThisRun = new Map(); // place_id -> place（今回の収集内での重複除去）
  let calls = 0;
  for (const pref of PREFS) {
    for (const kw of KEYWORDS) {
      const query = `${kw} ${pref}`;
      try {
        const places = await searchText(query);
        calls++;
        for (const p of places) {
          if (!p.id || seenThisRun.has(p.id)) continue;
          seenThisRun.set(p.id, p);
        }
      } catch (e) {
        console.error(`  ⚠️ "${query}" 取得失敗: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 120));
    }
    console.log(`  ${pref} 完了（累計API呼び出し ${calls}件・累計ユニーク施設 ${seenThisRun.size}件）`);
  }

  console.log(`API呼び出し合計: ${calls}件 / ユニーク施設: ${seenThisRun.size}件`);

  // 新規候補の抽出：過去の収集で見たことがない place_id のみ
  const candidates = [];
  for (const [id, p] of seenThisRun) {
    if (known.has(id)) continue;
    const name = p.displayName?.text || '';
    const addr = p.formattedAddress || '';
    if (!name) continue;
    if (isExcluded(name)) continue;
    const prefecture = guessPrefecture(addr);
    if (!prefecture) continue; // 都道府県が特定できない結果は除外（海外・不明住所等のノイズ対策）
    candidates.push({
      id,
      name,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      addr,
      prefecture,
    });
  }

  console.log(`新規候補: ${candidates.length}件`);

  if (candidates.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < candidates.length; i += CHUNK) {
      const chunk = candidates.slice(i, i + CHUNK);
      const { error: upsertErr } = await supabase.from('places_stores').upsert(chunk, { onConflict: 'id' });
      if (upsertErr) {
        console.error('登録失敗:', upsertErr.message);
        process.exit(1);
      }
    }
    console.log(`✅ ${candidates.length}件を places_stores に登録しました（全国施設タブに即反映）`);
  }

  // 今回見つけた全place_idを既知リストに追加（次回以降は差分のみ検出）
  for (const id of seenThisRun.keys()) known.add(id);
  saveKnownPlaceIds(known);

  const logEntry = {
    ranAt: startedAt.toISOString(),
    apiCalls: calls,
    uniquePlaces: seenThisRun.size,
    newCandidates: candidates.length,
  };
  const logFile = path.join(LOG_DIR, `${startedAt.toISOString().slice(0, 7)}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');

  console.log('=== 収集完了 ===');
}

main().catch(e => {
  console.error('❌ 致命的エラー:', e.message);
  process.exit(1);
});
