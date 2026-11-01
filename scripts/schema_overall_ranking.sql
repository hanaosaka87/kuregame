-- 通算（全期間累計）元取り率ランキング用ビュー
-- 社長作業：Supabase SQL Editorでこのファイルの内容を実行してください。
--
-- 公平性のため、最低3回以上チャレンジしたユーザーのみを集計対象とする
-- （1回だけ運良く高い元取り率を出したユーザーがいきなり1位になるのを防ぐため）。
-- total_xp は /api/ranking?type=overall の結果をもとに、各ユーザーのレベル（lib/level.ts）を
-- フロント側で計算するために使う（各セッションのefficiency_rateの合計＝累計XP）。
CREATE OR REPLACE VIEW v_overall_ranking AS
SELECT
  gs.user_id,
  p.nickname,
  p.prefecture,
  p.avatar_emoji,
  COUNT(*) AS total_count,
  SUM(gs.total_spent) AS total_spent,
  SUM(gs.total_retail_value) AS total_retail_value,
  ROUND(SUM(gs.total_retail_value)::numeric / NULLIF(SUM(gs.total_spent), 0) * 100, 1) AS efficiency_rate,
  SUM(gs.efficiency_rate) AS total_xp
FROM game_sessions gs
JOIN user_profiles p ON p.id = gs.user_id
WHERE gs.user_id IS NOT NULL
GROUP BY gs.user_id, p.nickname, p.prefecture, p.avatar_emoji
HAVING COUNT(*) >= 3;

-- 基になるgame_sessions（read sessions: using(true)）・user_profiles（public read profiles）は
-- 既に誰でもSELECT可能なポリシーのため、ビューへの追加のRLS設定は不要。
