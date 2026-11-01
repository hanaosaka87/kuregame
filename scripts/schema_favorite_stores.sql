-- ===================================================
-- user_profiles にお気に入り店舗（複数）列を追加
-- マイページのプロフィール設定でSNSアカウントと同様に複数登録できるようにする。
-- 用途：スポンサー店舗向けのDM・販促ターゲティングに活用予定
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS favorite_stores text[];
