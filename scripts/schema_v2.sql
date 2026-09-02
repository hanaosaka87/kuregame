-- Phase 1: 都道府県・ユーザー認証・月間チャンピオン

-- game_sessions に都道府県・ユーザーID追加
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS prefecture text,
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- ユーザープロフィール
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY,
  nickname text NOT NULL,
  prefecture text,
  avatar_emoji text DEFAULT '🎮',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "insert own profile"   ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile"   ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- game_sessions の anon INSERT ポリシーを更新（prefecture 追加後も通るように）
-- ※元のポリシーが「insert sessions」なら変更不要

-- 月間チャンピオンビュー（都道府県×月ごとに最高元取り率の1件を自動抽出）
CREATE OR REPLACE VIEW v_monthly_champions AS
SELECT DISTINCT ON (year_month, prefecture)
  to_char(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') AS year_month,
  prefecture,
  nickname,
  user_id,
  efficiency_rate,
  total_spent,
  total_retail_value,
  prize_count,
  id AS session_id,
  created_at
FROM game_sessions
WHERE prefecture IS NOT NULL AND prefecture != ''
ORDER BY year_month DESC, prefecture, efficiency_rate DESC;
