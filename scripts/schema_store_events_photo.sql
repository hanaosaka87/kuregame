-- 店舗イベント情報に写真添付（1枚まで）を追加（2026-09-26）
alter table store_events add column if not exists photo_url text;
