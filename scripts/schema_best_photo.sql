-- 自己ベスト達成時の「カート内写真」機能

alter table game_sessions add column if not exists photo_url text;

-- 写真保存用ストレージバケット（公開読み取り可）
insert into storage.buckets (id, name, public)
values ('best-photos', 'best-photos', true)
on conflict (id) do nothing;

create policy "public read best-photos" on storage.objects
  for select using (bucket_id = 'best-photos');

create policy "anon upload best-photos" on storage.objects
  for insert with check (bucket_id = 'best-photos');
