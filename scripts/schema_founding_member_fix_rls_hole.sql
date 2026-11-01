-- ===================================================
-- 【緊急修正】founding_member列の直接書き換えブロックが効いていなかった問題の修正
-- 2026-10-12 実アカウントでの検証テストにより判明：
-- REVOKE UPDATE (founding_member) ON TABLE user_profiles FROM authenticated;
-- だけでは不十分だった。Supabaseはテーブル作成時にauthenticatedロールへ
-- テーブル全体のUPDATE権限（全列）を標準で付与しているため、列単位のREVOKEだけでは
-- テーブル全体の権限の方が優先され、founding_memberも含め全列が書き換え可能なままだった。
-- 実際にテストアカウントで「自分でfounding_member=trueに書き換え→成功してしまう」ことを確認済み。
--
-- 正しい対処：テーブル全体のUPDATE権限を一度取り消し、クライアントが本来編集してよい列だけを
-- 個別に許可し直す（ホワイトリスト方式）。
-- Supabase SQL Editor で実行してください
-- ===================================================

-- テーブル全体のUPDATE権限を取り消す
REVOKE UPDATE ON TABLE user_profiles FROM authenticated;
REVOKE UPDATE ON TABLE user_profiles FROM anon;

-- クライアント（本人）が編集してよい列だけを個別に許可し直す
-- （マイページのプロフィール設定・アイコン変更・自慢の一枚・ログインボーナス判定で実際に使われている列のみ）
GRANT UPDATE (
  avatar_emoji,
  avatar_url,
  sns_x,
  sns_instagram,
  sns_tiktok,
  sns_youtube,
  favorite_stores,
  showcase_photo_url,
  showcase_updated_at,
  login_streak,
  last_login_date
) ON TABLE user_profiles TO authenticated;

-- founding_member・nickname・prefecture・gacha_bonus_percent・last_gacha_date等、
-- クライアントから直接更新する正規のコードが存在しない列は、意図的に許可リストから除外。
-- これらはservice_role（サーバーAPI）経由でのみ更新可能（gacha/pull、founding-member/claim等）。

-- ===================================================
-- 【検証用テストデータの削除】
-- 動作確認のため作成したテストアカウント・テスト行を削除する
-- ===================================================
DELETE FROM founding_member_claims WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM founding_member_claims WHERE user_id = '72a8ea20-66bf-4fd6-9a20-efded228f314';
DELETE FROM user_profiles WHERE id = '72a8ea20-66bf-4fd6-9a20-efded228f314';
DELETE FROM auth.users WHERE id = '72a8ea20-66bf-4fd6-9a20-efded228f314';
