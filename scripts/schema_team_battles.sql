-- 3対3団体戦（チームバトル）機能
-- モード1: sudden_death（短期決戦）＝1人ずつ交互にチャレンジし、先に景品を獲得したチームがそのラウンドの勝者。何勝何敗かを記録する。
-- モード2: fixed_budget（金額チャレンジ団体戦）＝既存の金額チャレンジを3対3に拡張し、両チームの元取り率を集計して競う。

create table if not exists team_battles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  mode text not null check (mode in ('sudden_death', 'fixed_budget')),
  store_name text not null,
  prefecture text,
  budget integer, -- fixed_budgetモードのみ使用（1人あたりの投入金額目安）
  team_a_name text not null default 'チームA',
  team_b_name text not null default 'チームB',
  host_nickname text,
  created_at timestamptz not null default now()
);

alter table team_battles enable row level security;
drop policy if exists team_battles_select_all on team_battles;
create policy team_battles_select_all on team_battles for select using (true);
drop policy if exists team_battles_insert_open on team_battles;
create policy team_battles_insert_open on team_battles for insert with check (true);

-- sudden_death方式のラウンドごとの勝敗記録
create table if not exists team_battle_rounds (
  id uuid primary key default gen_random_uuid(),
  team_battle_id uuid not null references team_battles(id) on delete cascade,
  round_no integer not null,
  team_a_player text,
  team_b_player text,
  winner_team text not null check (winner_team in ('A', 'B', 'draw')),
  memo text,
  created_at timestamptz not null default now()
);

alter table team_battle_rounds enable row level security;
drop policy if exists team_battle_rounds_select_all on team_battle_rounds;
create policy team_battle_rounds_select_all on team_battle_rounds for select using (true);
drop policy if exists team_battle_rounds_insert_open on team_battle_rounds;
create policy team_battle_rounds_insert_open on team_battle_rounds for insert with check (true);

-- fixed_budget方式：既存game_sessionsをチーム戦に紐付けるための列を追加
alter table game_sessions add column if not exists team_battle_id uuid references team_battles(id);
alter table game_sessions add column if not exists team_side text check (team_side in ('A', 'B'));
