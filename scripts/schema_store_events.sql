-- 各店舗のイベント情報を発信・共有できるページ（2026-09-26、テスターフィードバック対応）
-- 既存のstore_reports（新店情報）と同じ「anon投稿・即時公開」方式を踏襲する

create table if not exists store_events (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  prefecture text,
  title text not null,
  body text,
  start_date date,
  end_date date,
  nickname text,
  created_at timestamptz not null default now()
);

alter table store_events enable row level security;

create policy "store_events_select_all" on store_events
  for select using (true);

-- 新店情報（store_reports）と同じ運用方針：anonでも投稿即時公開（スパムはSupabaseダッシュボードで削除対応）
create policy "store_events_insert_anon" on store_events
  for insert with check (true);
