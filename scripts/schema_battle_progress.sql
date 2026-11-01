-- 対戦モードの「確定前」リアルタイム進行状況を共有するテーブル
-- battle_rooms / game_sessions は登録（確定）後の記録のみを持つため、
-- プレイ中に「今いくら使って何個獲ったか」を対戦相手と共有するには別テーブルが必要

create table if not exists battle_progress (
  id uuid primary key default gen_random_uuid(),
  battle_room_id uuid not null references battle_rooms(id) on delete cascade,
  participant_key text not null,
  nickname text not null default '名無しハンター',
  total_spent integer not null default 0,
  total_retail_value integer not null default 0,
  prize_count integer not null default 0,
  efficiency_rate numeric not null default 0,
  updated_at timestamptz default now(),
  unique (battle_room_id, participant_key)
);

alter table battle_progress enable row level security;

create policy "read battle_progress" on battle_progress for select using (true);
create policy "insert battle_progress" on battle_progress for insert with check (true);
create policy "update battle_progress" on battle_progress for update using (true);
create policy "delete battle_progress" on battle_progress for delete using (true);
