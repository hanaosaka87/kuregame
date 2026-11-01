// 「本日のガチャ」の抽選テーブル。不正防止のため抽選はサーバー側でのみ行う（/api/gacha/pull）。
export interface GachaResult {
  percent: number;
  label: string;
  emoji: string;
}

const GACHA_TABLE: { weight: number; result: GachaResult }[] = [
  { weight: 45, result: { percent: 0,  label: 'はずれ…',        emoji: '💨' } },
  { weight: 30, result: { percent: 3,  label: '+3%ボーナス',     emoji: '🍀' } },
  { weight: 15, result: { percent: 5,  label: '+5%ボーナス',     emoji: '✨' } },
  { weight: 8,  result: { percent: 10, label: '+10%ボーナス！',  emoji: '🔥' } },
  { weight: 2,  result: { percent: 20, label: '大当たり！+20%',  emoji: '👑' } },
];

export function drawGacha(): GachaResult {
  const total = GACHA_TABLE.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of GACHA_TABLE) {
    if (r < entry.weight) return entry.result;
    r -= entry.weight;
  }
  return GACHA_TABLE[0].result;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
