-- ===================================================
-- 「フィード」機能：自慢の一枚への「スゲー！」ボタン
-- Supabase SQL Editor で実行してください
-- ===================================================

-- 自慢の一枚の更新日時（フィードの並び順に使う）
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS showcase_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS showcase_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (liker_id, target_id)
);

ALTER TABLE showcase_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "showcase_likes_read_all" ON showcase_likes;
CREATE POLICY "showcase_likes_read_all" ON showcase_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "showcase_likes_insert_own" ON showcase_likes;
CREATE POLICY "showcase_likes_insert_own" ON showcase_likes
  FOR INSERT WITH CHECK (auth.uid() = liker_id);

DROP POLICY IF EXISTS "showcase_likes_delete_own" ON showcase_likes;
CREATE POLICY "showcase_likes_delete_own" ON showcase_likes
  FOR DELETE USING (auth.uid() = liker_id);

-- 確認：
-- SELECT target_id, count(*) FROM showcase_likes GROUP BY target_id ORDER BY count(*) DESC;
