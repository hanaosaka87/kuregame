-- ===================================================
-- store_reports RLS ポリシー更新（自動承認対応）
-- Supabase SQL Editor で実行してください
-- ===================================================

-- 既存の INSERT ポリシーを削除して再作成
DROP POLICY IF EXISTS "anyone_can_insert" ON store_reports;

-- 誰でも投稿可能（approved で登録 = 即公開）
CREATE POLICY "anyone_can_insert" ON store_reports
  FOR INSERT WITH CHECK (status = 'approved');
