// 連続ログイン日数に応じた元取り率ボーナス（%）。クライアント・サーバー両方から参照する共通ロジック。
export function getStreakBonusPercent(streak: number): number {
  if (streak >= 14) return 20;
  if (streak >= 7) return 10;
  if (streak >= 3) return 5;
  return 0;
}

export function getNextStreakMilestone(streak: number): { days: number; bonus: number } | null {
  if (streak < 3) return { days: 3, bonus: 5 };
  if (streak < 7) return { days: 7, bonus: 10 };
  if (streak < 14) return { days: 14, bonus: 20 };
  return null;
}
