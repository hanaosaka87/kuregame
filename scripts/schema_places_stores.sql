-- ===================================================
-- places_stores: Google Places APIで収集した施設データ専用テーブル
-- （「全国施設」タブに OSM データと合算して表示する。
--  「新店情報」タブとは別物 — こちらは新規オープン報告ではなく
--  既存施設のカタログなので、人の承認は挟まず自動反映する）
--
-- あわせて、誤って store_reports（新店情報）に入っていた
-- Google Places自動検出の1,271件をここで削除する。
--
-- Supabase SQL Editor で実行してください
-- ===================================================

CREATE TABLE IF NOT EXISTS places_stores (
  id text PRIMARY KEY,
  name text NOT NULL,
  lat double precision,
  lng double precision,
  addr text,
  prefecture text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE places_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places_stores_read_all" ON places_stores;
CREATE POLICY "places_stores_read_all" ON places_stores
  FOR SELECT USING (true);

-- INSERT/UPDATE/DELETEのポリシーは作らない
-- （書き込みはservice_roleキー経由のスクリプトのみ・RLSをバイパス）

-- 誤って「新店情報」に登録されたGoogle Places自動検出分を削除
DELETE FROM store_reports
WHERE comment = 'Google Places APIで自動検出（要確認）';

-- 確認：
-- SELECT count(*) FROM places_stores;
-- SELECT count(*) FROM store_reports WHERE comment = 'Google Places APIで自動検出（要確認）'; -- 0件になっているはず
