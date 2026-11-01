-- ===================================================
-- osm_stores に都道府県列を追加（「全国施設」タブの
-- 都道府県フィルター機能のため。OSMデータは住所タグが
-- 欠落していることが多いため、緯度経度から最近傍の
-- 県庁所在地ヒューリスティックで都道府県を推定する）
-- Supabase SQL Editor で実行してください
-- ===================================================

ALTER TABLE osm_stores ADD COLUMN IF NOT EXISTS prefecture text;

-- 確認：
-- SELECT prefecture, count(*) FROM osm_stores GROUP BY prefecture ORDER BY count(*) DESC;
