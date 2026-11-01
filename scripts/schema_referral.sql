-- ===================================================
-- 営業パートナー紹介コード（お弟子さんネットワーク／アンバサダー発信）管理
-- 2026-10-06 CSO/CFO報酬体系再設計に基づく実装
-- Supabase SQL Editor で実行してください
-- ===================================================

-- コード本体：1パートナー関係につき複数発行できる
--   issuer_type = 'disciple'   … お弟子さん個別の招待コード（成果報酬：登録→30日定着→プレミアム転換の3段階）
--   issuer_type = 'ambassador' … パートナー様ご本人の発信専用コード（技術監修料の登録者数連動に使用。弟子コードとは別経路として二重計上を防ぐ）
create table if not exists partner_referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  issuer_type text not null default 'disciple',
  issuer_label text not null,          -- 表示用（例：お弟子さんのお名前・ニックネーム、または「〇〇様本人」）
  master_group text not null,          -- パートナー単位の集計キー（例：partner_001）。同一パートナーの全コードに共通の値を入れる
  is_active boolean not null default true,
  note text,
  created_at timestamptz default now()
);

-- 紹介コード経由の新規登録。1ユーザー1コードのみ（unique制約で二重計上を防止）
create table if not exists referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references partner_referral_codes(id) on delete cascade,
  user_id uuid not null unique,
  registered_at timestamptz default now()
);

alter table partner_referral_codes enable row level security;
alter table referral_redemptions enable row level security;

-- コードの実在確認のみ匿名で許可（コード入力時の検証用）
create policy "read active codes for validation" on partner_referral_codes for select using (is_active = true);
-- 一覧・集計・新規作成・編集はservice_role経由のみ（APIで実施、anonからのinsert/update/deleteは許可しない）

-- 自分の紹介コード登録状況は自分で読める（マイページでの表示用）
create policy "read own redemption" on referral_redemptions for select using (auth.uid() = user_id);
-- 登録は本人のみ（user_idはサーバー側APIでauth確認済みの値を使う）
create policy "insert own redemption" on referral_redemptions for insert with check (auth.uid() = user_id);

-- 成果集計ビュー：登録・30日定着・プレミアム転換を一括算出
-- 「定着」＝登録から23日以上経過した時点でもgame_sessionsに活動履歴がある（≒1ヶ月後も遊び続けている）
-- このビューはservice_role経由（管理画面API）でのみ参照する想定（anonからは直接クエリしない）
create or replace view v_referral_performance as
select
  c.id as code_id,
  c.code,
  c.issuer_type,
  c.issuer_label,
  c.master_group,
  r.user_id,
  r.registered_at,
  exists (
    select 1 from game_sessions gs
    where gs.user_id = r.user_id
      and gs.created_at >= r.registered_at + interval '23 days'
  ) as retained_30d,
  exists (
    select 1 from subscriptions s
    where s.user_id = r.user_id
      and s.status = 'active'
  ) as converted_premium
from referral_redemptions r
join partner_referral_codes c on c.id = r.code_id;

-- ===================================================
-- 実際にコードを発行する際は、このテーブルに直接INSERTする（v1は自己発行UIなし・Supabase SQL Editorでの手動発行）
-- 例：
-- insert into partner_referral_codes (code, issuer_type, issuer_label, master_group, note)
-- values ('ABCD12', 'disciple', 'お弟子さんA', 'partner_001', '2026-10商談後に発行');
-- insert into partner_referral_codes (code, issuer_type, issuer_label, master_group, note)
-- values ('XYZ999', 'ambassador', '〇〇様本人', 'partner_001', 'SNS・攻略ガイド発信用');
-- ===================================================
