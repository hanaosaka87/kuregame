// クレゲー：Supabase auth.users（nyanwanプロジェクトに同居中）の15件のうち、
// クレゲーのuser_profiles/founding_member_claimsに紐づくアカウントだけを突き合わせて数える。
// 実行: node scripts/count-web-users.mjs
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

console.log('接続先プロジェクトURL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1) auth.users 全件
  let page = 1;
  const perPage = 200;
  let authUsers = [];
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    authUsers = authUsers.concat(data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  // 2) クレゲーのuser_profiles（id = auth.users.id）
  const { data: profiles, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, nickname, created_at');
  if (profErr) throw profErr;
  const profileIds = new Set((profiles || []).map((p) => p.id));

  // 3) 創業メンバー特典クレーム済み（LINE経由）
  const { data: claims, error: claimErr } = await supabase
    .from('founding_member_claims')
    .select('user_id, claimed_at');
  if (claimErr) throw claimErr;
  const claimIds = new Set((claims || []).map((c) => c.user_id));

  console.log('\n=== auth.users 総数 ===');
  console.log(`total: ${authUsers.length}`);

  console.log('\n=== クレゲー user_profiles 総数（Web/アプリ問わずクレゲーを一度でも使った人） ===');
  console.log(`total: ${profileIds.size}`);

  console.log('\n=== 内訳 ===');
  let kuregameCount = 0;
  let otherAppCount = 0;
  for (const u of authUsers) {
    const inKuregame = profileIds.has(u.id);
    if (inKuregame) kuregameCount++; else otherAppCount++;
    const email = u.email || '(メールなし)';
    const claimed = claimIds.has(u.id) ? ' [LINE特典クレーム済み]' : '';
    console.log(`${inKuregame ? 'クレゲー ' : 'その他/未使用'}  ${email}  作成:${u.created_at.slice(0, 10)}  最終ログイン:${(u.last_sign_in_at || 'なし').toString().slice(0, 10)}${claimed}`);
  }

  console.log('\n=== サマリー ===');
  console.log(`auth.users 総数: ${authUsers.length}`);
  console.log(`うちクレゲーuser_profilesに紐づくアカウント: ${kuregameCount}`);
  console.log(`うち他アプリ or 未プロフィール作成: ${otherAppCount}`);
  console.log(`LINE創業メンバー特典クレーム件数: ${claimIds.size}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
