-- ===================================================
-- 「本日のガチャ」機能
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gacha_bonus_percent integer NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_gacha_date date;
