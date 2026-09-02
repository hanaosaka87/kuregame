-- クレゲ！ Supabase スキーマ

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '名無しハンター',
  store_name text,
  session_date date default current_date,
  challenge_type text not null default 'free',
  total_spent integer not null,
  total_retail_value integer not null,
  prize_count integer not null,
  efficiency_rate numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists prizes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references game_sessions(id) on delete cascade,
  name text not null,
  category text default 'other',
  retail_price integer not null,
  quantity integer default 1,
  created_at timestamptz default now()
);

alter table game_sessions enable row level security;
alter table prizes enable row level security;

create policy "read sessions" on game_sessions for select using (true);
create policy "insert sessions" on game_sessions for insert with check (true);
create policy "read prizes" on prizes for select using (true);
create policy "insert prizes" on prizes for insert with check (true);
