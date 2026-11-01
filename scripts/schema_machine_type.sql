-- チャレンジ登録時に「設置機種（フック設定/アーム等）」を任意で記録し、
-- ランキングを機種別に絞り込めるようにする（2026-09-24、テスターフィードバック対応）
alter table game_sessions add column if not exists machine_type text;
