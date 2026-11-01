// 一撃ゲットチャレンジの本番動作確認用：使い捨てテストアカウントを作成する。
// 実行: node scripts/qa_oneshot_setup.mjs
'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const admin = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = `qa-oneshot-${Date.now()}@example.com`;
const PASSWORD = `QaTest${Date.now()}!`;

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) { console.error('ユーザー作成失敗:', error.message); process.exit(1); }

  const userId = data.user.id;

  const { error: profErr } = await admin.from('user_profiles').insert({
    id: userId,
    nickname: '動作確認テスト',
    prefecture: '東京都',
    avatar_emoji: '🧪',
    founding_member: true, // スタンダード会員ゲートを回避するため創業メンバー扱いにする
  });
  if (profErr) { console.error('プロフィール作成失敗:', profErr.message); process.exit(1); }

  console.log('=== QAテストアカウント作成完了 ===');
  console.log(JSON.stringify({ userId, email: EMAIL, password: PASSWORD }));
}

main();
