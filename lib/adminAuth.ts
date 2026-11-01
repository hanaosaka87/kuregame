import crypto from 'crypto';

export const ADMIN_SESSION_COOKIE = 'kuregame_admin_session';

function adminSessionSecret(): string {
  const password = process.env.ADMIN_PASSWORD || '';
  return crypto.createHash('sha256').update(`kuregame-admin:${password}`).digest('hex');
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

export function issueAdminSessionToken(): string {
  return adminSessionSecret();
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = adminSessionSecret();
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
