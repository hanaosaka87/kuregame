-- ===================================================
-- osm_stores: OpenStreetMapの全国施設データをキャッシュするテーブル
-- （「全国施設」タブが毎回ライブでOverpass APIに問い合わせて
-- タイムアウトしていた問題の対策。週次スクリプトで事前収集し、
-- APIはこのテーブルから即座に返すだけにする）
--
-- 書き込みはservice_roleキー（RLSをバイパスする管理者権限）でのみ行う。
-- anonキー（公開キー）には読み取り専用しか許可しない。
--
-- Supabase SQL Editor で実行してください
-- ===================================================

CREATE TABLE IF NOT EXISTS osm_stores (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  addr text,
  phone text,
  hours text,
  website text,
  brand text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE osm_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "osm_stores_read_all" ON osm_stores;
CREATE POLICY "osm_stores_read_all" ON osm_stores
  FOR SELECT USING (true);

-- INSERT/UPDATE/DELETEのポリシーは作らない
-- （書き込みはservice_roleキーで行うためRLSを経由せずバイパスされる）

-- 確認：
-- SELECT count(*) FROM osm_stores;
