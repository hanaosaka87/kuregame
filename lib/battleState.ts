// 対戦モード・団体戦の部屋情報を端末のsessionStorageに保持する。
// 写真解析でカメラ/アルバムを開いた際にモバイルブラウザがタブを裏で再読み込みすると
// React stateのbattleRoom/teamBattleが消え、最終送信時にbattle_room_idが抜け落ちる
// 不具合があったため、リロードをまたいで復元できるようにする。
import type { BattleRoom, TeamBattle } from './supabase';

const BATTLE_KEY = 'kuregame_battle_room';
const TEAM_BATTLE_KEY = 'kuregame_team_battle';

export function saveBattleRoom(room: BattleRoom) {
  try { sessionStorage.setItem(BATTLE_KEY, JSON.stringify(room)); } catch {}
}
export function loadBattleRoom(): BattleRoom | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(BATTLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearBattleRoom() {
  try { sessionStorage.removeItem(BATTLE_KEY); } catch {}
}

export function saveTeamBattle(battle: TeamBattle, team: 'A' | 'B') {
  try { sessionStorage.setItem(TEAM_BATTLE_KEY, JSON.stringify({ battle, team })); } catch {}
}
export function loadTeamBattle(): { battle: TeamBattle; team: 'A' | 'B' } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TEAM_BATTLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearTeamBattle() {
  try { sessionStorage.removeItem(TEAM_BATTLE_KEY); } catch {}
}
