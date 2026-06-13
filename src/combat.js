// 撃破処理と Wound 制 (GAME_SPEC §23.2)

import { state, removeFromBoard, Faction } from "./state.js";

// 撃破イベント。Shield 系で死亡を防ぐ場合でも wounds は +1 される。
// returns: { killed: boolean, shielded: boolean }
// 死亡(killPiece)と経済処理(grantCaptureReward)を分離してあるので、
// 撃破演出を入れるときは killPiece を演出タイムラインに乗せ替えできる。
export function resolveCapture(attacker, target) {
  // Shield ability: 最初の撃破を防ぐ。ただし wounds +1。
  if (target.ability?.id === "shield" && !target.abilityUsed) {
    target.abilityUsed = true;
    target.wounds += 1;
    // wounds が maxWounds を超えても、shield で防いだ場合はステージ中は残す。
    // ただし maxWounds 到達ならステージ終了時にロスト判定。
    return { killed: false, shielded: true };
  }

  killPiece(target);
  grantCaptureReward(attacker, target);
  return { killed: true, shielded: false };
}

// 死亡・盤面除外のみ。撃破演出はこのステップをフックする。
export function killPiece(target) {
  target.wounds += 1;
  removeFromBoard(target);
}

// 撃破報酬(XP / Soul)のみ。演出とは独立に確定させたいので分離。
export function grantCaptureReward(attacker, target) {
  if (attacker && attacker.faction === Faction.LIGHT) {
    attacker.xp += target.value;
    state.soul += target.value;
  }
}

// ステージ終了時に呼ぶ。wounds が maxWounds を超えた駒を永久ロストする。
export function applyEndOfStageLosses() {
  const lost = [];
  // Roster をスキャン
  state.roster = state.roster.filter((id) => {
    const p = state.pieces.get(id);
    if (!p) return true;
    if (p.wounds >= p.maxWounds && p.role !== "king") {
      lost.push(p);
      return false;
    }
    return true;
  });
  // ステージ中に死亡していて生存している駒は、Roster に残るが alive=true に戻す (次ステージ用)
  for (const id of state.roster) {
    const p = state.pieces.get(id);
    if (p) {
      p.alive = true;
      p.abilityUsed = false;
    }
  }
  return lost;
}

// wounds 回復コスト (GAME_SPEC §23.2)。1 回復 = Soul 5。
export const HEAL_COST = 5;

// Soul を消費して駒の wounds を1回復する。成功すれば true。
export function healWound(piece) {
  if (!piece || piece.wounds <= 0 || state.soul < HEAL_COST) return false;
  piece.wounds -= 1;
  state.soul -= HEAL_COST;
  return true;
}
