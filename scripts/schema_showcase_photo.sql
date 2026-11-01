-- マイページ「自慢の一枚」機能

alter table user_profiles add column if not exists showcase_photo_url text;
