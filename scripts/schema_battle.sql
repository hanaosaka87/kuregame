-- 対戦モード（複数人で同じ店舗・同じ予算で元取り率を競う）

create table if not exists battle_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  store_name text not null,
  budget integer not null,
  host_nickname text,
  status text not null default 'open',
  created_at timestamptz default now()
);

alter table battle_rooms enable row level security;

create policy "read battle_rooms" on battle_rooms for select using (true);
create policy "insert battle_rooms" on battle_rooms for insert with check (true);
create policy "update battle_rooms" on battle_rooms for update using (true);

-- 各自の記録（game_sessions）をどの対戦部屋の記録かに紐付ける
alter table game_sessions add column if not exists battle_room_id uuid references battle_rooms(id);
