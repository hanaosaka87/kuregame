-- ===================================================
-- 創業メンバー「アイデア広場」
-- 2026-10-08 社長提案：先着1,000名特典に、みんなで協力してアプリを良くする体制を追加
-- 投稿は創業メンバー限定（APIのfounding_memberチェックで制御）、閲覧・いいねは誰でも可
-- Supabase SQL Editor で実行してください
-- ===================================================

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nickname text,
  body text not null,
  created_at timestamptz default now(),
  like_count int not null default 0,
  status text not null default 'open' -- 'open' / 'adopted'
);

create table if not exists idea_likes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  unique (idea_id, user_id)
);

alter table ideas enable row level security;
alter table idea_likes enable row level security;

-- 閲覧は誰でも可（founding_memberチェックはAPI側のPOSTロジックで実施）
create policy "read ideas" on ideas for select using (true);
create policy "insert idea" on ideas for insert with check (true);

create policy "read idea likes" on idea_likes for select using (true);
create policy "insert idea like" on idea_likes for insert with check (true);

-- いいね登録時に ideas.like_count を自動加算
create or replace function increment_idea_like_count()
returns trigger as $$
begin
  update ideas set like_count = like_count + 1 where id = new.idea_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_increment_idea_like_count on idea_likes;
create trigger trg_increment_idea_like_count
  after insert on idea_likes
  for each row execute function increment_idea_like_count();

-- ===================================================
-- 採用判定は管理画面を作らず、Supabase SQL Editorから手動で行う運用：
-- update ideas set status = 'adopted' where id = '対象のid';
-- ===================================================
