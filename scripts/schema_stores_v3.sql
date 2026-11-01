-- ===================================================
-- store_reports に設置機種・景品ジャンルを追加
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE store_reports
  ADD COLUMN IF NOT EXISTS machine_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prize_genres  TEXT[] DEFAULT '{}';
