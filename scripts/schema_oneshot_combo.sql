-- 「一撃ゲットチャレンジ」連チャン記録の追加分
-- 社長作業：Supabase SQL Editorでこのファイルの内容を実行してください（nyanwan組織のプロジェクト）。
--
-- 「連チャン」には2つの意味があるため別々の列で管理する：
--   ①一撃連チャン＝一撃ゲットを立て続けに何回続けられたか（oneshot_combo_streak系、本ファイルで追加）
--   ②本日の合計＝連続していなくても1日に何回一撃ゲットできたか（oneshot_day_best_count、schema_oneshot.sqlで追加済み）

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS oneshot_combo_streak integer NOT NULL DEFAULT 0,       -- 現在の一撃連チャン数（立て続けに一撃ゲットできている回数）
  ADD COLUMN IF NOT EXISTS oneshot_combo_streak_best integer NOT NULL DEFAULT 0;  -- 一撃連チャンのベスト記録
