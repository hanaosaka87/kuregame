-- 対戦ルームの「終了する」機能用：作成者（ホスト）を端末ローカルIDで識別する
alter table battle_rooms add column if not exists host_participant_key text;
