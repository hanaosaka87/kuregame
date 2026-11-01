-- ===================================================
-- user_profiles にSNSリンク列を追加
-- （マイページでのアイコン・SNS設定機能。表示自体は全員が設定可能だが、
--  ランキング等での実際の「宣伝」表示はプレミアム会員のみに限定する）
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sns_x text,
  ADD COLUMN IF NOT EXISTS sns_instagram text,
  ADD COLUMN IF NOT EXISTS sns_tiktok text,
  ADD COLUMN IF NOT EXISTS sns_youtube text;

-- subscriptions.plan を 'standard'（480円）/ 'premium'（1,100円）の2段階で使う
-- 既存デフォルト'premium'は単一プラン時代の名残なので'standard'に変更
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'standard';
