-- game_sessions にダミー/テストデータ判定フラグを追加
-- 2026-10-21: マーケティング用シードデータ(999件)と実ユーザーデータ(23件)の切り分け調査の結果、
-- 恒久的に区別できるようフラグ列を追加する。
-- 実行方法: Supabase SQL Editorでこのファイルの内容をそのまま実行してください。

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS is_seed_data boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN game_sessions.is_seed_data IS
  '見栄え用マーケティングシードデータ、または社内デバッグ用テストレコード。true の場合、週次/月次レポートや「実ユーザー数」系の集計から除外する。トップページのランキング・統計表示には影響しない（従来通り全件表示）。';
