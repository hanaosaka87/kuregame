-- ===================================================
-- store_reports: pending状態でのINSERTを追加許可
-- （Google Places API自動収集スクリプト用。既存の
-- 「報告フォーム→approved直接」の挙動は変更しません）
-- Supabase SQL Editor で実行してください
-- ===================================================

DROP POLICY IF EXISTS "anyone_can_insert_pending" ON store_reports;

CREATE POLICY "anyone_can_insert_pending" ON store_reports
  FOR INSERT WITH CHECK (status = 'pending');

-- 確認：ポリシー一覧
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'store_reports';
