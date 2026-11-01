-- 「一撃ゲットチャレンジ」機能用スキーマ
-- 社長作業：Supabase SQL Editorでこのファイルの内容を実行してください。
--
-- 一撃ゲット＝クレーンゲームで100円（1プレイ）だけ使って景品を獲得したこと。
-- 通常の元取り率ランキング（game_sessions）には混ぜず、専用の記録テーブル・専用ランキングにする。

CREATE TABLE IF NOT EXISTS oneshot_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '名無しハンター',
  prefecture text,
  store_name text,
  machine_type text,
  prize_name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  retail_price integer NOT NULL,
  efficiency_rate numeric NOT NULL DEFAULT 0, -- 投入額は常に100円固定のため、定価(円)の数値がそのまま%になる
  photo_url text,
  is_seed_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE oneshot_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read oneshot" ON oneshot_records FOR SELECT USING (true);
CREATE POLICY "insert own oneshot" ON oneshot_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_oneshot_user_created ON oneshot_records(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_oneshot_rate ON oneshot_records(efficiency_rate DESC);

-- 写真は既存の best-photos ストレージバケットを共用する（新規バケット作成不要）。

-- 一撃ゲットの連日記録・連チャン記録（ベスト）をユーザーごとに保持する列を追加
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS oneshot_streak_days integer NOT NULL DEFAULT 0,       -- 現在の連日記録（何日連続で一撃ゲットできているか）
  ADD COLUMN IF NOT EXISTS oneshot_streak_days_best integer NOT NULL DEFAULT 0,  -- 連日記録のベスト
  ADD COLUMN IF NOT EXISTS oneshot_last_date date,                               -- 最後に一撃ゲットを記録した日（JST）
  ADD COLUMN IF NOT EXISTS oneshot_day_best_count integer NOT NULL DEFAULT 0;    -- 一撃連チャン記録のベスト（1日の最多一撃ゲット数）
