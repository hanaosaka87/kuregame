-- 2026-10-12 再検証用に作成したテストアカウントの削除
DELETE FROM founding_member_claims WHERE user_id = '0d0cadfd-0dfb-417b-b96d-64859e7af3ee';
DELETE FROM user_profiles WHERE id = '0d0cadfd-0dfb-417b-b96d-64859e7af3ee';
DELETE FROM auth.users WHERE id = '0d0cadfd-0dfb-417b-b96d-64859e7af3ee';
