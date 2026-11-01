/**
 * クレゲー レベルシステム（Lv.1〜100）。
 * 経験値(XP)はチャレンジ1回ごとの元取り率をそのまま加算する方式のため、
 * 「プレイ回数を重ねる」ことと「上手くプレイする（元取り率が高い）」ことの両方がレベルに反映される。
 */

export const LEVEL_CAP = 100;

export function xpForSession(efficiencyRate: number): number {
  return Math.max(0, Math.round(efficiencyRate));
}

// ホーム画面「⚡ミッション」の達成報酬XP（app/page.tsxのMISSION_DEFSと同じ基準で判定）。
// SQLビュー v_overall_ranking（ランキング「通算」タブ）側でも同じ金額・条件で加算しており、
// 片方だけ変更すると合計経験値・レベル表示が画面間でずれるため、変更時は両方を揃えること。
export const MISSION_BONUS = { first: 50, rate100: 100, rate200: 300 } as const;

export function missionBonusXp(sessions: { efficiency_rate: number }[]): number {
  let bonus = 0;
  if (sessions.length > 0) bonus += MISSION_BONUS.first;
  if (sessions.some(s => s.efficiency_rate >= 100)) bonus += MISSION_BONUS.rate100;
  if (sessions.some(s => s.efficiency_rate >= 200)) bonus += MISSION_BONUS.rate200;
  return bonus;
}

export function totalXpFromSessions(sessions: { efficiency_rate: number }[]): number {
  return sessions.reduce((sum, s) => sum + xpForSession(s.efficiency_rate), 0) + missionBonusXp(sessions);
}

// レベルLからL+1に必要な増分XP（指数カーブ：序盤は早く上がり、後半ほど必要量が増える）
function xpIncrement(level: number): number {
  return Math.round(3 * Math.pow(level, 1.8));
}

// LEVEL_THRESHOLDS[i] = レベル(i+1)到達に必要な累積XP（0始まり、Lv.1は0XP）
const LEVEL_THRESHOLDS: number[] = (() => {
  const arr = [0];
  let total = 0;
  for (let l = 1; l < LEVEL_CAP; l++) {
    total += xpIncrement(l);
    arr.push(total);
  }
  return arr;
})();

export interface LevelInfo {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpToNext: number | null;
  progress: number; // 0〜1、カンスト（Lv.100）時は1
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, LEVEL_CAP);
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelXp = level < LEVEL_CAP ? LEVEL_THRESHOLDS[level] : null;
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpToNext = nextLevelXp !== null ? nextLevelXp - totalXp : null;
  const progress = nextLevelXp !== null
    ? Math.max(0, Math.min(1, xpIntoLevel / (nextLevelXp - currentLevelXp)))
    : 1;
  return { level, xp: totalXp, currentLevelXp, nextLevelXp, xpIntoLevel, xpToNext, progress };
}
