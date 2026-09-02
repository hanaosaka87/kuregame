-- ===================================================
-- store_reports テーブル（新店・店舗投稿）
-- Supabase SQL Editor で実行してください
-- ===================================================

CREATE TABLE IF NOT EXISTS store_reports (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  prefecture  TEXT        NOT NULL,
  addr        TEXT,
  comment     TEXT,
  status      TEXT        DEFAULT 'pending',   -- pending | approved | rejected
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_store_reports_status   ON store_reports(status);
CREATE INDEX IF NOT EXISTS idx_store_reports_pref     ON store_reports(prefecture);
CREATE INDEX IF NOT EXISTS idx_store_reports_reported ON store_reports(reported_at DESC);

-- RLS 有効化
ALTER TABLE store_reports ENABLE ROW LEVEL SECURITY;

-- 承認済みは誰でも読める
CREATE POLICY "approved_readable" ON store_reports
  FOR SELECT USING (status = 'approved');

-- 誰でも投稿可能（pending で登録）
CREATE POLICY "anyone_can_insert" ON store_reports
  FOR INSERT WITH CHECK (status = 'pending');

-- サービスロールは全操作可（管理者承認用）
CREATE POLICY "service_role_all" ON store_reports
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
