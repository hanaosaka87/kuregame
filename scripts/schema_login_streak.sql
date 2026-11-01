-- 連続ログインボーナス機能
alter table user_profiles add column if not exists login_streak integer default 0;
alter table user_profiles add column if not exists last_login_date date;
