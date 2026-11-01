-- v_overall_ranking の total_xp に「⚡ミッション」達成報酬を合算する（2026-10-21）
-- 社長作業：Supabase SQL Editorでこのファイルの内容を実行してください。
--
-- lib/level.ts の missionBonusXp() と同じ条件・金額で算出する（画面間でレベル表示がずれないよう必ず両方を揃える）。
-- このビューは既にHAVING COUNT(*)>=3で絞っているため「初めてのチャレンジ」(+50)は対象者全員が常に達成済み。
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
  SUM(gs.efficiency_rate)
    + 50
    + CASE WHEN MAX(gs.efficiency_rate) >= 100 THEN 100 ELSE 0 END
    + CASE WHEN MAX(gs.efficiency_rate) >= 200 THEN 300 ELSE 0 END
    AS total_xp
FROM game_sessions gs
JOIN user_profiles p ON p.id = gs.user_id
WHERE gs.user_id IS NOT NULL
GROUP BY gs.user_id, p.nickname, p.prefecture, p.avatar_emoji
HAVING COUNT(*) >= 3;
