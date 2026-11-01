-- ===================================================
-- 創業メンバー特典の付与方式変更：自動付与→LINE登録+合言葉クレームに置き換え
-- 2026-10-12 社長指示：既に付与済みのユーザーはそのまま維持（遡及取消はしない）。
-- 新規サインアップは今後このトリガーでは自動付与されなくなり、
-- /api/founding-member/claim 経由（合言葉コード入力）でのみ付与される。
-- Supabase SQL Editor で実行してください
-- ===================================================

-- 自動付与トリガーを無効化（関数・トリガー自体は将来の参考用に残し、BEFORE INSERTの発火だけ止める）
DROP TRIGGER IF EXISTS trg_set_founding_member ON user_profiles;

-- 合言葉クレーム履歴（1アカウント1回のみ・二重付与防止）
CREATE TABLE IF NOT EXISTS founding_member_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  claimed_at timestamptz DEFAULT now()
);

ALTER TABLE founding_member_claims ENABLE ROW LEVEL SECURITY;

-- 自分のクレーム履歴は自分で読める（マイページでの表示用）
CREATE POLICY "read own claim" ON founding_member_claims FOR SELECT USING (auth.uid() = user_id);
-- 挿入はservice_role経由のAPI（/api/founding-member/claim）でのみ行う。anonからのinsertは許可しない

-- 【重要・既存の穴の修正】
-- user_profilesには "update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id) という
-- 行レベルのポリシーしかなく、列の制限がない。つまりログイン済みユーザーなら誰でもブラウザから
-- supabase.from('user_profiles').update({founding_member:true}) を直接呼ぶだけで自分に特典を
-- 付与できてしまう（LINEクレームを一切経由せず）。founding_memberを「合言葉クレーム制」に変更する
-- 以上、この列だけはクライアントから直接書き換えられないようにする（service_role経由のAPIのみ可）。
REVOKE UPDATE (founding_member) ON TABLE user_profiles FROM authenticated;
REVOKE UPDATE (founding_member) ON TABLE user_profiles FROM anon;
