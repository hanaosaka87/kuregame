// 対戦モードの進行状況を「自分の記録」として識別するための、端末ローカルの匿名ID
const STORAGE_KEY = 'kuregame_participant_key';

export function getParticipantKey(): string {
  if (typeof window === 'undefined') return '';
  let key = '';
  try {
    key = localStorage.getItem(STORAGE_KEY) || '';
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, key);
    }
  } catch {
    return '';
  }
  return key;
}
