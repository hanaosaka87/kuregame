-- 全国統一チャンピオン大会（同日同時刻に各店舗一斉スタートし、スタッフが会場で記録を確認するイベント）
-- 作成・会場の検証確定は管理画面（service_roleキー使用・パスワード認証必須）からのみ行う。
-- 一般ユーザーからの投稿は行わないため、insert/update用のanon向けRLSポリシーは追加しない。

create table if not exists championships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'ended')),
  rules_text text,
  prize_text text, -- 例：「協賛募集中（確定次第発表）」。決済・振込機能はここでは扱わない
  created_at timestamptz not null default now()
);

alter table championships enable row level security;
drop policy if exists championships_select_all on championships;
create policy championships_select_all on championships for select using (true);

create table if not exists championship_venues (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references championships(id) on delete cascade,
  store_name text not null,
  prefecture text,
  staff_name text, -- 派遣して確認を行う担当スタッフ名
  status text not null default 'scheduled' check (status in ('scheduled', 'verified')),
  verified_nickname text,
  verified_efficiency_rate numeric,
  memo text,
  created_at timestamptz not null default now()
);

alter table championship_venues enable row level security;
drop policy if exists championship_venues_select_all on championship_venues;
create policy championship_venues_select_all on championship_venues for select using (true);
