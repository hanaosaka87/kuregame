// OpenStreetMapの全国アミューズメント施設データを取得し、
// osm_stores テーブルへ全件入れ替えで保存するスクリプト。
// 「全国施設」タブがリクエストのたびにライブでOverpass APIへ
// 問い合わせてタイムアウトしていた問題の対策（事前収集キャッシュ方式）。
// 実行: node scripts/fetch-osm-stores.mjs
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

// service_roleキーはRLSをバイパスする管理者権限。このスクリプトはローカル実行専用で、
// ブラウザに渡るanonキー（NEXT_PUBLIC_*）とは別物のため公開されない。
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// 日本全域を覆うバウンディングボックス（沖縄〜北海道）。
// 「国名でarea検索」は公開Overpassサーバーで非常に重くタイムアウトするため、bboxで代替する。
const BBOX = '24,122,46,146';
const QUERY = `
[out:json][timeout:120];
(
  node["leisure"="amusement_arcade"](${BBOX});
  node["amenity"="amusement_arcade"](${BBOX});
);
out body;
`;

async function fetchFromMirror(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // 公開Overpassサーバーは利用規約でUser-Agent必須。未設定だと406で拒否される。
      'User-Agent': 'kuregame-hana/1.0 (contact: hanaosaka87@gmail.com)',
    },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchOverpass() {
  let lastErr;
  for (const url of MIRRORS) {
    try {
      console.log(`Overpassへ問い合わせ中: ${url}`);
      return await fetchFromMirror(url);
    } catch (e) {
      console.error(`  失敗（次のミラーを試します）: ${e.message}`);
      lastErr = e;
    }
  }
  throw lastErr;
}

// OSMのaddr:*タグは欠落していることが多いため、緯度経度から最も近い
// 県庁所在地を都道府県として推定する（tabi-compuriのゲームセンターカテゴリと同じ方式）。
const PREF_CAPITALS = [
  ['北海道', 43.0642, 141.3469], ['青森', 40.8244, 140.7400], ['岩手', 39.7036, 141.1527],
  ['宮城', 38.2688, 140.8721], ['秋田', 39.7186, 140.1024], ['山形', 38.2404, 140.3633],
  ['福島', 37.7503, 140.4676], ['茨城', 36.3418, 140.4468], ['栃木', 36.5658, 139.8836],
  ['群馬', 36.3911, 139.0608], ['埼玉', 35.8569, 139.6489], ['千葉', 35.6073, 140.1233],
  ['東京', 35.6895, 139.6917], ['神奈川', 35.4478, 139.6425], ['新潟', 37.9026, 139.0232],
  ['富山', 36.6953, 137.2113], ['石川', 36.5947, 136.6256], ['福井', 36.0652, 136.2216],
  ['山梨', 35.6642, 138.5685], ['長野', 36.6513, 138.1810], ['岐阜', 35.3912, 136.7223],
  ['静岡', 34.9769, 138.3831], ['愛知', 35.1802, 136.9066], ['三重', 34.7303, 136.5086],
  ['滋賀', 35.0045, 135.8686], ['京都', 35.0212, 135.7556], ['大阪', 34.6863, 135.5200],
  ['兵庫', 34.6913, 135.1830], ['奈良', 34.6851, 135.8330], ['和歌山', 34.2261, 135.1675],
  ['鳥取', 35.5039, 134.2377], ['島根', 35.4723, 133.0505], ['岡山', 34.6618, 133.9344],
  ['広島', 34.3966, 132.4596], ['山口', 34.1859, 131.4714], ['徳島', 34.0658, 134.5593],
  ['香川', 34.3401, 134.0434], ['愛媛', 33.8417, 132.7661], ['高知', 33.5597, 133.5311],
  ['福岡', 33.6064, 130.4183], ['佐賀', 33.2494, 130.2989], ['長崎', 32.7448, 129.8737],
  ['熊本', 32.7898, 130.7417], ['大分', 33.2382, 131.6126], ['宮崎', 31.9111, 131.4239],
  ['鹿児島', 31.5602, 130.5581], ['沖縄', 26.2124, 127.6809],
];

// OSM側で leisure/amenity=amusement_arcade がパチンコ・カラオケ・ネットカフェ等に
// 誤って付与されているケースがあり、ユーザーから「全国施設に飲食店やネットカフェがある」
// と報告があったため除外する（2026-09-24）。tabi-compuriのゲームセンターカテゴリでも同型の問題を発見済み。
const EXCLUDE_PATTERNS = [
  /パチンコ|スロット|パーラー|マルハン|キコーナ|KICONA|Kikona/i,
  /カラオケ|KARAOKE/i,
  /快活|自遊空間/, // ネットカフェチェーン
  /ポーカー|麻雀|まあじゃん/,
  /ボウリング|ボウル|BOWLING/i,
  /カフェ|喫茶|レストラン|食堂|居酒屋|ラーメン|焼肉|寿司/,
  /ビリヤード|BILLIARD/i, // 2026-10-04: ユーザー報告で非ゲーセン施設の混入が発覚し追加
  /ゴルフ|GOLF/i,
  /ディスコ|DISCO/i,
  /棋院|将棋/, // 囲碁・将棋サロン
  /薬局/,
  /米軍|自衛隊/, // 基地内施設
  /CQB|サバイバルゲーム|エアソフト/i, // サバゲーフィールド
  /アクアワールド|水族館/,
  /アンパンマン/, // 子供向けテーマパーク
];

// 固有名詞として判明した非ゲーセン施設（ホストクラブ・キャバクラ・雑居ビル名義等、
// 上記パターンでは一般化できないもの）。2026-10-04 ユーザー報告・調査に基づき追加。
const EXCLUDE_EXACT_NAMES = new Set([
  'Sonic', 'Urban Square', 'SUPER FREAK', '俺のフレンチ', 'SAP', 'The Earth',
  'まあじゃん ひかり', '#C-pla', '3249ROOM', 'チャンピオン', 'S.Y.N.C', 'FANTASYPLAZA',
  'AREA52', 'ABC', "SAM'S TOWN", 'GREA', 'ゴールドキング会館', 'PIA', 'ジョイカム',
  'ウェアハウス', 'サントロペ池袋', 'Тутти фрутти', 'JFlight', 'XCUBE', 'キキトコ',
  '在日米軍針尾ゲーミングルーム', 'メトロポリス', '射的場　えびす屋　段べえ',
  'BRAVO', 'FUNFUN', 'DareDemoRacer', 'スマートボール',
]);
function isExcluded(name) {
  return EXCLUDE_EXACT_NAMES.has(name) || EXCLUDE_PATTERNS.some(re => re.test(name));
}

function guessPrefectureByLatLng(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const [pref, plat, plng] of PREF_CAPITALS) {
    const d = (lat - plat) ** 2 + (lng - plng) ** 2;
    if (d < bestDist) { bestDist = d; best = pref; }
  }
  return best;
}

async function main() {
  console.log(`=== OSM施設データ収集開始 ${new Date().toISOString()} ===`);
  const json = await fetchOverpass();
  const elements = json.elements || [];
  console.log(`Overpass取得件数: ${elements.length}件`);

  // bboxには韓国南部・中国東北部の一部が含まれてしまうため除外する。
  // 沖縄・奄美（緯度30度未満）は経度が129.5度を下回っても日本の正規領域なので除外しない。
  // 緯度30度以上（九州本土以北）で経度129.5度未満は韓国・対馬海峡の西側とみなして除外する。
  function isLikelyOutsideJapan(lat, lon) {
    return lat >= 30 && lon < 129.5;
  }

  const rows = elements
    .filter((el) => !isLikelyOutsideJapan(el.lat, el.lon))
    .map((el) => {
      const tags = el.tags || {};
      return {
        id: el.id,
        name: tags['name'] || tags['name:ja'] || null,
        lat: el.lat,
        lng: el.lon,
        prefecture: guessPrefectureByLatLng(el.lat, el.lon),
        addr: [
          tags['addr:province'],
          tags['addr:city'],
          tags['addr:quarter'],
          tags['addr:street'],
          tags['addr:housenumber'],
        ].filter(Boolean).join(''),
        phone: tags['phone'] || null,
        hours: tags['opening_hours'] || null,
        website: tags['website'] || null,
        brand: tags['brand'] || tags['operator'] || null,
      };
    })
    .filter((s) => s.name)
    .filter((s) => !isExcluded(s.name));

  console.log(`店名ありの有効件数: ${rows.length}件`);

  if (rows.length === 0) {
    console.error('取得件数が0件のため、既存データを保護して中断します');
    process.exit(1);
  }

  const { error: delErr } = await supabase.from('osm_stores').delete().neq('id', 0);
  if (delErr) {
    console.error('既存データの削除に失敗:', delErr.message);
    process.exit(1);
  }

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error: insErr } = await supabase.from('osm_stores').insert(chunk);
    if (insErr) {
      console.error('登録に失敗:', insErr.message);
      process.exit(1);
    }
    console.log(`  登録: ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  console.log(`✅ osm_stores を${rows.length}件で更新しました`);
  console.log('=== 収集完了 ===');
}

main().catch((e) => {
  console.error('❌ 致命的エラー:', e.message);
  process.exit(1);
});
