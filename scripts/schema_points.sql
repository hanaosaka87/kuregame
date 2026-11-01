-- クレゲー ポイント制度（定着率アップ施策）
-- 社長作業：Supabase SQL Editorでこのファイルの内容を実行してください。
--
-- XP（レベル用、lib/level.ts）とは別の「スポンサー店舗・イベントで将来使えるポイント」。
-- 実際の価値を持つ通貨のため、付与は必ずサーバー側（service_roleキー）のみで行い、
-- クライアントから直接points列・point_transactionsへ書き込むことはできない設計にする。

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  amount integer NOT NULL,
  reason text NOT NULL,
  dedupe_key text,
  created_at timestamptz DEFAULT now()
);

-- dedupe_keyがある場合、同じユーザー×同じキーの重複付与を構造的に禁止（二重付与防止）
CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_dedupe_idx
  ON point_transactions(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS point_transactions_user_idx ON point_transactions(user_id, created_at DESC);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
-- 閲覧は本人のみ（履歴表示用）。INSERT/UPDATE/DELETEのポリシーは意図的に作らない
-- → anon/authenticatedロールからは一切書き込めず、service_roleキー経由のサーバー処理のみが書き込める。
CREATE POLICY "read own point transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);

-- ポイントを原子的に加算するための関数（読み取り→書き込みの競合状態を避ける）。
-- service_roleから呼ぶ前提のためSECURITY DEFINERは必須ではないが、将来の呼び出し経路変更に備えて付与。
CREATE OR REPLACE FUNCTION increment_user_points(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  UPDATE user_profiles SET points = points + p_amount WHERE id = p_user_id RETURNING points INTO new_total;
  RETURN new_total;
END;
$$;
