import crypto from 'crypto';

// 景品引換コードの確認用パスワード（提携店舗スタッフに渡す想定）。
// 管理画面のADMIN_PASSWORDとは別物：証拠写真審査等の強い権限は渡さず、
// 「コードを確認して使用済みにする」だけに権限を絞るため別のパスワードにしている。
export const STORE_SESSION_COOKIE = 'kuregame_store_session';

function storeSessionSecret(): string {
  const password = process.env.STORE_VERIFY_PASSWORD || '';
  return crypto.createHash('sha256').update(`kuregame-store:${password}`).digest('hex');
}

export function checkStorePassword(input: string): boolean {
  const expected = process.env.STORE_VERIFY_PASSWORD || '';
  if (!expected) return false;
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

export function issueStoreSessionToken(): string {
  return storeSessionSecret();
}

export function isValidStoreSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = storeSessionSecret();
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
