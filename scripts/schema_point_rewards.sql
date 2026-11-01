-- クレゲー ポイント交換カタログ＋店舗消費フロー（2026-10-21）
-- 社長作業：Supabase SQL Editorでこのファイルの内容を実行してください。

-- 安全装置：ポイントが万一マイナスになる処理が紛れ込んでも構造的に弾く
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_points_non_negative;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_points_non_negative CHECK (points >= 0);

-- 交換できる景品カタログ（内容・必要ポイントはここを直接編集すれば増減できる）
CREATE TABLE IF NOT EXISTS point_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE point_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active rewards" ON point_rewards FOR SELECT USING (true);
-- INSERT/UPDATE/DELETEポリシーなし＝クライアントから編集不可。カタログの追加・変更はSQL Editorで直接行う。

-- 交換の記録（1件＝1枚の引換券）。codeを店頭で見せてもらい、店舗側が使用済みにする。
CREATE TABLE IF NOT EXISTS point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  reward_id uuid NOT NULL REFERENCES point_rewards(id),
  points_spent integer NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'expired')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_note text
);

ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own redemptions" ON point_redemptions FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATEポリシーなし＝交換・使用済み処理は必ずservice_role（サーバーAPI）経由のみ。

-- ポイント残高を確認したうえで、交換・ポイント減算・引換コード発行をすべて1トランザクションで行う。
-- （チェックと減算を別々のリクエストにすると、連打等で残高以上に交換できてしまうため）
CREATE OR REPLACE FUNCTION redeem_point_reward(p_user_id uuid, p_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward point_rewards%ROWTYPE;
  v_points integer;
  v_code text;
  v_redemption_id uuid;
BEGIN
  SELECT * INTO v_reward FROM point_rewards WHERE id = p_reward_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'この景品は交換できません');
  END IF;

  SELECT points INTO v_points FROM user_profiles WHERE id = p_user_id FOR UPDATE;
  IF v_points IS NULL OR v_points < v_reward.points_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ポイントが足りません');
  END IF;

  -- 8桁の英数字コード（紛らわしい0/O/1/Iを除外）。重複したら再生成する。
  LOOP
    v_code := (
      SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', (random() * 32)::int + 1, 1), '')
      FROM generate_series(1, 8)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM point_redemptions WHERE code = v_code);
  END LOOP;

  UPDATE user_profiles SET points = points - v_reward.points_cost WHERE id = p_user_id;

  INSERT INTO point_redemptions (user_id, reward_id, points_spent, code, status, expires_at)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, v_code, 'issued', now() + interval '14 days')
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption_id,
    'code', v_code,
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost,
    'expires_at', (now() + interval '14 days')
  );
END;
$$;

-- 店頭でコードを確認し、使用済みにする（二重利用・期限切れを防ぐ）
CREATE OR REPLACE FUNCTION verify_point_redemption(p_code text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row point_redemptions%ROWTYPE;
  v_reward_name text;
BEGIN
  SELECT * INTO v_row FROM point_redemptions WHERE code = upper(p_code) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'コードが見つかりません');
  END IF;

  SELECT name INTO v_reward_name FROM point_rewards WHERE id = v_row.reward_id;

  IF v_row.status = 'used' THEN
    RETURN jsonb_build_object('ok', false, 'error', '使用済みのコードです', 'used_at', v_row.used_at, 'reward_name', v_reward_name);
  END IF;
  IF v_row.expires_at < now() THEN
    UPDATE point_redemptions SET status = 'expired' WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'error', '有効期限が切れています', 'reward_name', v_reward_name);
  END IF;

  UPDATE point_redemptions SET status = 'used', used_at = now(), used_note = p_note WHERE id = v_row.id;

  RETURN jsonb_build_object('ok', true, 'reward_name', v_reward_name, 'points_spent', v_row.points_spent);
END;
$$;

-- 初期カタログ（必要に応じて内容・ポイント数を調整してください）
INSERT INTO point_rewards (name, description, points_cost, sort_order) VALUES
  ('ワンプレイ無料券', '提携店舗で1プレイ無料（¥100相当）', 100, 1),
  ('¥500割引券', '提携店舗でのお会計から¥500引き', 450, 2),
  ('¥1,000割引券', '提携店舗でのお会計から¥1,000引き', 850, 3)
ON CONFLICT DO NOTHING;
