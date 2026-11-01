-- ===================================================
-- user_profiles に画像アイコン列を追加
-- （マイページで絵文字の代わりに自分の写真をアイコン設定できるようにする）
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
