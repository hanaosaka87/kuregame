-- ===================================================
-- 先着1,000名「創業メンバー」特典
-- 2026-10-06 CFO提案：1,000人到達後にプレミアム課金を解禁しても、
-- 先着1,000名は無料のままSNS宣伝特典（プレミアム特典）を永久に受けられるようにする。
-- 既存ユーザーを一切制限せず、1,001人目以降にのみ将来の課金ラインを適用する設計。
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS founding_member boolean NOT NULL DEFAULT false;

-- 新規プロフィール作成時点で、登録者数が1,000人未満ならfounding_member=trueを自動付与
CREATE OR REPLACE FUNCTION set_founding_member()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM user_profiles) < 1000 THEN
    NEW.founding_member := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_founding_member ON user_profiles;
CREATE TRIGGER trg_set_founding_member
  BEFORE INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_founding_member();

-- 既存ユーザー（スキーマ実行時点ですでに登録済みの人）にも、登録順で先着1,000名分を遡及付与
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM user_profiles
)
UPDATE user_profiles
SET founding_member = true
FROM ranked
WHERE user_profiles.id = ranked.id AND ranked.rn <= 1000;
