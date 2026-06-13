import { state, Faction, alivePieces } from "./state.js";
import { getMoves } from "./pieces.js";

export async function planAndExecuteFactionActions(faction, executeAction) {
  const commandKey = faction === Faction.LIGHT ? "playerCommandLeft" : "enemyCommandLeft";
  let attempts = 0;

  while (state[commandKey] > 0 && attempts++ < 24) {
    const action = pickBestAction(faction);
    if (!action) break;

    const res = await executeAction(action.piece, action.row, action.col);
    if (!res?.ok) break;
  }
}

export async function planAndExecuteEnemyActions(executeAction) {
  await planAndExecuteFactionActions(Faction.DARK, executeAction);
}

function pickBestAction(faction) {
  const units = alivePieces(faction).filter((p) => !p.actedThisPhase);

  const capture = bestCaptureAction(units);
  if (capture) return capture;

  const approach = bestApproachAction(units);
  if (approach) return approach;

  return bestUnblockAction(units);
}

function bestCaptureAction(units) {
  let best = null;
  for (const p of units) {
    const { captures } = getMoves(p);
    for (const cap of captures) {
      const target = state.pieces.get(cap.targetId);
      if (!target) continue;
      const score =
        (target.role === "king" ? 1000 : 0) +
        target.value * 10 +
        tacticCaptureBonus(p, target, cap.row, cap.col) -
        riskScore(cap.row, cap.col, p.faction);
      if (!best || score > best.score) best = { piece: p, row: cap.row, col: cap.col, score };
    }
  }
  return best;
}

function bestApproachAction(units) {
  let best = null;
  for (const p of units) {
    const { moves } = getMoves(p);
    if (!moves.length) continue;

    const currentDist = nearestFoeDist(p.row, p.col, p.faction);
    if (currentDist === Infinity) continue;

    for (const m of moves) {
      const newDist = nearestFoeDist(m.row, m.col, p.faction);
      const improvement = currentDist - newDist;
      if (improvement <= 0) continue;

      const score =
        improvement * 20 +
        mobilityScore(m.row, m.col) -
        riskScore(m.row, m.col, p.faction) +
        tacticMoveBonus(p, m.row, m.col, improvement);
      if (!best || score > best.score) best = { piece: p, row: m.row, col: m.col, score };
    }
  }
  return best;
}

function bestUnblockAction(units) {
  let best = null;
  for (const p of units) {
    const { moves } = getMoves(p);
    for (const m of moves) {
      const score =
        mobilityScore(m.row, m.col) -
        riskScore(m.row, m.col, p.faction) -
        Math.min(nearestFoeDist(m.row, m.col, p.faction), 12) +
        tacticMoveBonus(p, m.row, m.col, 0);
      if (!best || score > best.score) best = { piece: p, row: m.row, col: m.col, score };
    }
  }
  return best;
}

function nearestFoeDist(row, col, faction) {
  let best = Infinity;
  for (const p of state.pieces.values()) {
    if (!p.alive || p.faction === faction) continue;
    const d = chebyshev(row, col, p.row, p.col);
    if (d < best) best = d;
  }
  return best;
}

function riskScore(row, col, faction) {
  let risk = 0;
  for (const p of state.pieces.values()) {
    if (!p.alive || p.faction === faction) continue;
    const { captures } = getMoves(p);
    if (captures.some((m) => m.row === row && m.col === col)) risk += p.value * 3;
  }
  return risk;
}

function tacticCaptureBonus(piece, target, row, col) {
  switch (piece.tactic ?? "advance") {
    case "aggressive":
      return target.value * 8;
    case "guard":
      return Math.max(0, 18 - allyKingDist(row, col, piece.faction) * 4);
    case "flank":
      return mobilityScore(row, col) * 2 - riskScore(row, col, piece.faction);
    default:
      return 0;
  }
}

function tacticMoveBonus(piece, row, col, improvement) {
  switch (piece.tactic ?? "advance") {
    case "aggressive":
      return improvement * 10 - riskScore(row, col, piece.faction) * 0.4;
    case "guard":
      return Math.max(0, 24 - allyKingDist(row, col, piece.faction) * 6);
    case "flank":
      return mobilityScore(row, col) * 5 - riskScore(row, col, piece.faction) * 1.5;
    default:
      return improvement * 2;
  }
}

function allyKingDist(row, col, faction) {
  for (const p of state.pieces.values()) {
    if (p.alive && p.faction === faction && p.role === "king") {
      return chebyshev(row, col, p.row, p.col);
    }
  }
  return 4;
}

function mobilityScore(row, col) {
  let emptyNeighbors = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || r >= state.boardSize || c >= state.boardSize) continue;
      if (!state.board[r * state.boardSize + c]) emptyNeighbors += 1;
    }
  }
  return emptyNeighbors;
}

function chebyshev(r1, c1, r2, c2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}
