// 一撃ゲットチャレンジの本番動作確認で作成したテストデータを削除する。
// 実行: node scripts/qa_oneshot_cleanup.mjs <userId>
'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
const admin = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY);

const [, , USER_ID] = process.argv;
if (!USER_ID) { console.error('使い方: node scripts/qa_oneshot_cleanup.mjs <userId>'); process.exit(1); }

async function main() {
  const { data: records } = await admin.from('oneshot_records').select('id, photo_url').eq('user_id', USER_ID);
  console.log(`削除対象 oneshot_records: ${records?.length || 0}件`);
  if (records && records.length > 0) {
    const { error } = await admin.from('oneshot_records').delete().eq('user_id', USER_ID);
    if (error) console.error('oneshot_records削除エラー:', error.message);
    else console.log('✅ oneshot_records削除完了');
  }

  const { error: ptErr, count } = await admin.from('point_transactions').delete({ count: 'exact' }).eq('user_id', USER_ID);
  if (ptErr) console.error('point_transactions削除エラー:', ptErr.message);
  else console.log(`✅ point_transactions削除完了（${count ?? 0}件）`);

  const { error: profErr } = await admin.from('user_profiles').delete().eq('id', USER_ID);
  if (profErr) console.error('user_profiles削除エラー:', profErr.message);
  else console.log('✅ user_profiles削除完了');

  const { error: authErr } = await admin.auth.admin.deleteUser(USER_ID);
  if (authErr) console.error('authユーザー削除エラー:', authErr.message);
  else console.log('✅ authユーザー削除完了');

  // 最終確認
  const { count: remainCount } = await admin.from('oneshot_records').select('id', { count: 'exact', head: true });
  console.log(`\n確認：oneshot_records 全体の残件数 = ${remainCount}`);
}

main();
