// Command 制とフェーズ進行 (GAME_SPEC §23.1)

import { state, Phase, Faction, movePiece, pieceAt, alivePieces } from "./state.js";
import { resolveCapture } from "./combat.js";
import { getMoves } from "./pieces.js";

function resetActed(faction) {
  for (const p of alivePieces(faction)) p.actedThisPhase = false;
}

// 1 Command を消費して駒を動かす / 取得する
export function performAction(piece, toRow, toCol) {
  // 同じ駒は1 Phase に1回だけ行動できる (§23.1)
  if (piece.actedThisPhase) return { ok: false, reason: "already-acted" };
  const { moves, captures } = getMoves(piece);

  const cap = captures.find((m) => m.row === toRow && m.col === toCol);
  const mov = moves.find((m) => m.row === toRow && m.col === toCol);

  if (!cap && !mov) return { ok: false, reason: "invalid-target" };

  let captureResult = null;
  let captured = null; // 撃破演出用: 消える駒の id と消える位置
  if (cap) {
    const target = state.pieces.get(cap.targetId);
    captureResult = resolveCapture(piece, target);
    if (captureResult.killed) {
      captured = { id: cap.targetId, row: cap.row, col: cap.col };
    }
    // Spear のような遠距離取得では移動しない
    if (!cap.ranged && captureResult.killed) {
      movePiece(piece, toRow, toCol);
    } else if (!cap.ranged && captureResult.shielded) {
      // 接触取得で Shield に防がれた場合、attacker は元の位置にとどまる
      // (オリジナルチェスとは違う挙動: 後で議論)
    }
  } else if (mov) {
    movePiece(piece, toRow, toCol);
  }

  // onMove: War Knight の効果
  if (mov && piece.ability?.trigger === "onMove" && piece.ability.id === "warCharge") {
    applyWarCharge(piece);
  }

  // Command 消費
  if (piece.faction === Faction.LIGHT) {
    state.playerCommandLeft -= 1;
  } else {
    state.enemyCommandLeft -= 1;
  }

  // 同一駒の再行動を禁止 (Sun Queen など onCapture で追加行動が必要なら例外処理)
  piece.actedThisPhase = true;

  return { ok: true, captureResult, captured, moved: !!mov || (cap && !cap.ranged) };
}

function applyWarCharge(piece) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const t = pieceAt(piece.row + dr, piece.col + dc);
      if (t && t.faction !== piece.faction) {
        resolveCapture(piece, t);
      }
    }
  }
}

export function endPlayerPhase() {
  state.phase = Phase.ENEMY;
  state.enemyCommandLeft = state.enemyCommandMax;
  state.selectedId = null;
  state.inspectedId = null;
  resetActed(Faction.DARK);
}

export function endEnemyPhase() {
  state.phase = Phase.PLAYER;
  state.round += 1;
  state.playerCommandLeft = state.playerCommandMax;
  resetActed(Faction.LIGHT);
}
