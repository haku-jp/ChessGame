// エントリーポイント。各モジュールを束ねる。

import {
  state, Phase, Faction, resetForStage,
  placePiece, kingAlive, enemiesAlive, pieceAt, deployFor, alivePieces,
} from "./state.js";
import { createPiece, getMoves, pieceArtHTML } from "./pieces.js";
import { performAction, endPlayerPhase, endEnemyPhase } from "./round.js";
import { applyEndOfStageLosses, healWound, HEAL_COST } from "./combat.js";
import { planAndExecuteEnemyActions, planAndExecuteFactionActions } from "./ai.js";
import { rollRewardCandidates } from "./reward.js";
import { stageDef, hasStage } from "./stages.js";
import { initBoardView, render, releasePieceEl, getPieceEl, getCellEl } from "./ui/boardView.js";
import { playCaptureEffect, playMoveEffect, playSelectEffect } from "./effects.js";
import {
  initOverlay, showRewardScreen, showGameOver, showStageClear,
  showMaintenanceScreen, toast,
} from "./ui/overlay.js";

// --- HUD 要素 ---
const $ = (id) => document.getElementById(id);
const ui = {
  stageTitle: $("stageTitle"),
  roundText: $("roundText"),
  phaseText: $("phaseText"),
  commandText: $("commandText"),
  commandPips: $("commandPips"),
  soulText: $("soulText"),
  objectiveText: $("objectiveText"),
  endTurnBtn: $("endTurnBtn"),
  rosterUnits: $("rosterUnits"),
  rosterCount: $("rosterCount"),
  lightCount: $("lightCount"),
  darkCount: $("darkCount"),
  commandLayer: $("commandLayer"),
  detailCard: $("detailCard"),
};

let highlight = null;
let busy = false; // 演出中・敵フェーズ中の多重入力を防ぐ

const AUTO_BATTLE = true;
const TACTICS = ["advance", "aggressive", "guard", "flank"];
const TACTIC_LABEL = {
  advance: "Advance",
  aggressive: "Aggressive",
  guard: "Guard",
  flank: "Flank",
};
const TACTIC_META = {
  advance: { icon: "↑", label: "Advance", desc: "Move toward contact and claim stable space." },
  aggressive: { icon: "⚔", label: "Aggressive", desc: "Prioritize captures and pressure targets." },
  guard: { icon: "◇", label: "Guard", desc: "Hold near the King and protect the core." },
  flank: { icon: "↔", label: "Flank", desc: "Spread sideways and seek open lanes." },
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 1アクション = 状態変更(performAction) + 撃破演出。プレイヤー/敵 共通の実行経路。
// 攻撃側の移動と Soul/XP は即時反映し、撃破された駒だけ短く消し飛ばす。
async function executeAction(piece, row, col) {
  const from = { row: piece.row, col: piece.col };
  const soulBefore = state.soul;
  const res = performAction(piece, row, col);
  if (!res.ok) return res;
  const moved =
    res.moved &&
    from.row != null &&
    from.col != null &&
    (from.row !== piece.row || from.col !== piece.col);
  if (res.captured) {
    // 消える駒の DOM を管理から外し、攻撃側の移動を先に反映してから演出
    const el = releasePieceEl(res.captured.id);
    render(highlight);
    updateHud();
    if (moved) {
      await playMoveEffect(getPieceEl(piece.id), getCellEl(from.row, from.col), getCellEl(piece.row, piece.col), { capture: true });
    }
    await playCaptureEffect(el, { soulGain: state.soul - soulBefore });
  } else {
    render(highlight);
    updateHud();
    if (moved) {
      await playMoveEffect(getPieceEl(piece.id), getCellEl(from.row, from.col), getCellEl(piece.row, piece.col));
    }
    refresh();
  }
  return res;
}

// --- 初期化 ---
function init() {
  initBoardView($("board"), {
    onCellClick: handleCellClick,
    rankEl: $("rankLabels"),
    fileEl: $("fileLabels"),
  });
  initOverlay($("overlay"));
  // 装飾枠画像があれば 9-slice 枠を有効化 (無ければ CSS 枠のまま)
  const frameImg = new Image();
  frameImg.onload = () => document.querySelector(".board-frame")?.classList.add("has-frame");
  frameImg.src = "assets/ui/board-frame.png";
  ui.endTurnBtn.addEventListener("click", onEndTurn);
  // Space でターン終了
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      onEndTurn();
    }
    if (e.code === "Escape") {
      clearSelectionUi();
    }
    if (e.code === "KeyI") {
      showSelectedDetail();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".command-layer") && !e.target.closest(".unit-detail-card") && !e.target.closest(".cell")) {
      hideDetailCard();
    }
  });
  document.addEventListener("contextmenu", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) {
      clearSelectionUi();
      return;
    }
    const piece = pieceAt(Number(cell.dataset.row), Number(cell.dataset.col));
    if (!piece) {
      clearSelectionUi();
      return;
    }
    e.preventDefault();
    selectBoardPiece(piece, { detail: true });
  });

  startNewRun();
}

function startNewRun() {
  // Roster を初期化: King + Pawn x3 + Knight x1
  state.roster = [];
  state.pieces.clear();
  state.soul = 0;
  state.stage = 1;

  // 開幕からの手応えのため Pawn 1体を Spear Pawn (前方2マス射程) にする
  const seeds = [
    createPiece("king"),
    createPiece("pawn"),
    createPiece("pawn"),
    createPiece("spearPawn"),
    createPiece("knight"),
  ];
  seeds.forEach((p) => state.roster.push(p.id));
  // Roster は state.pieces には未登録 (placePiece 時に登録される)
  seeds.forEach((p) => state.pieces.set(p.id, p));

  startStage(1);
}

function startStage(stage) {
  state.stage = stage;
  const def = stageDef(stage);
  const size = def.size;
  resetForStage(size);

  // Roster を盤面下段に並べる
  deployPlayerArmy(size);

  // 敵を配置
  spawnEnemies(def);

  // HUD
  ui.stageTitle.textContent = `Stage ${stage}  (${size}×${size})`;
  updateHud();
  refresh();
}

function deployPlayerArmy(size) {
  // King は中央後列、その左右に Pawn と Knight を並べる
  const backRow = size - 1;
  const king = state.roster.map((id) => state.pieces.get(id)).find((p) => p.role === "king");
  if (king) placePiece(king, backRow, Math.floor(size / 2));

  const others = state.roster
    .map((id) => state.pieces.get(id))
    .filter((p) => p && p.role !== "king");

  // King を中央に置いた後、左右に交互に展開
  const centerCol = Math.floor(size / 2);
  const positions = [];
  for (let offset = 1; offset <= size; offset++) {
    if (centerCol - offset >= 0) positions.push({ row: backRow, col: centerCol - offset });
    if (centerCol + offset < size) positions.push({ row: backRow, col: centerCol + offset });
  }
  // 前列にもこぼれる場合
  for (let c = 0; c < size; c++) positions.push({ row: backRow - 1, col: c });

  const limit = deployFor(size); // 出撃する非King駒の上限 = 盤面サイズ
  let placed = 0;
  for (const p of others) {
    if (placed >= positions.length) break;
    if (placed >= limit) break;
    const pos = positions[placed++];
    placePiece(p, pos.row, pos.col);
  }
}

function spawnEnemies(def) {
  for (const e of def.enemies) {
    const p = createPiece(e.type, Faction.DARK);
    placePiece(p, e.row, e.col);
  }
}

// --- 入力 ---
async function handleCellClick(row, col) {
  if (busy || state.phase !== Phase.PLAYER) return;
  const target = pieceAt(row, col);
  const selected = state.selectedId ? state.pieces.get(state.selectedId) : null;

  if (AUTO_BATTLE) {
    if (target) {
      selectBoardPiece(target);
      playSelectEffect(getPieceEl(target.id), getCellEl(row, col));
    } else {
      clearSelectionUi();
    }
    return;
  }

  // 1. 自軍駒を選択 / 切替
  if (target && target.faction === Faction.LIGHT) {
    state.selectedId = target.id;
    state.inspectedId = null;
    // 行動済みの駒は選べるが、行動先ハイライトは出さない (混乱防止)
    highlight = target.actedThisPhase ? null : getMoves(target);
    hideFloatingUi();
    refresh();
    playSelectEffect(getPieceEl(target.id), getCellEl(row, col));
    return;
  }

  // 2. 選択中の駒の移動 / 取得先
  if (target && target.faction === Faction.DARK && !selected) {
    state.selectedId = null;
    state.inspectedId = target.id;
    highlight = getMoves(target);
    hideFloatingUi();
    refresh();
    playSelectEffect(getPieceEl(target.id), getCellEl(row, col));
    return;
  }

  if (selected) {
    const valid =
      highlight?.moves.some((m) => m.row === row && m.col === col) ||
      highlight?.captures.some((m) => m.row === row && m.col === col);
    if (valid && state.playerCommandLeft > 0) {
      busy = true;
      const soulBefore = state.soul;
      const res = await executeAction(selected, row, col);
      if (res.captureResult?.shielded) toast("Shield に防がれた！ (wounds +1)");
      if (state.soul > soulBefore) toast(`Soul +${state.soul - soulBefore}`);

      state.selectedId = null;
      state.inspectedId = null;
      highlight = null;
      hideFloatingUi();
      refresh();

      // 勝利判定は演出後に行う
      if (checkVictoryOrDefeat()) { busy = false; return; }
      if (state.playerCommandLeft <= 0) {
        await runEnemyPhase(); // busy のまま敵フェーズへ
      } else {
        busy = false;
      }
      return;
    }

    if (target && target.faction === Faction.DARK) {
      state.selectedId = null;
      state.inspectedId = target.id;
      highlight = getMoves(target);
      hideFloatingUi();
      refresh();
      playSelectEffect(getPieceEl(target.id), getCellEl(row, col));
      return;
    }
  }

  // 3. それ以外はクリア
  state.selectedId = null;
  state.inspectedId = null;
  highlight = null;
  hideFloatingUi();
  refresh();
}

function onEndTurn() {
  if (busy || state.phase !== Phase.PLAYER) return;
  state.selectedId = null;
  state.inspectedId = null;
  highlight = null;
  hideFloatingUi();
  refresh();
  if (AUTO_BATTLE) runAutoPlayerPhase();
  else runEnemyPhase();
}

function selectBoardPiece(piece, { detail = false } = {}) {
  state.selectedId = null;
  state.inspectedId = piece.id;
  highlight = null;
  clearPreview();
  refresh();
  renderFloatingCommand(piece);
  if (detail) showDetailCard(piece);
  else hideDetailCard();
}

function clearSelectionUi() {
  state.selectedId = null;
  state.inspectedId = null;
  highlight = null;
  clearPreview();
  hideFloatingUi();
  refresh();
}

function hideFloatingUi() {
  ui.commandLayer?.classList.add("hidden");
  clearPreview();
  hideDetailCard();
}

function renderFloatingCommand(piece) {
  if (!ui.commandLayer) return;
  const cell = getCellEl(piece.row, piece.col);
  if (!cell) return;

  const hp = Math.max(0, piece.maxWounds - piece.wounds);
  const tactic = piece.tactic ?? "advance";
  const canCommand = piece.faction === Faction.LIGHT && state.phase === Phase.PLAYER && !busy;
  ui.commandLayer.innerHTML = `
    <div class="float-chip">
      <strong>${piece.name}</strong>
      <span>HP ${hp}/${piece.maxWounds}</span>
      <span>Power ${piece.value}</span>
      <span>${piece.accent ?? piece.role}</span>
      <em>${TACTIC_LABEL[tactic]}</em>
    </div>
    ${canCommand ? `
      <div class="command-ring" aria-label="Doctrine commands">
        ${TACTICS.map((id, index) => `
          <button class="ring-btn ring-${index} ${tactic === id ? "active" : ""}"
            type="button"
            data-tactic="${id}"
            title="${TACTIC_META[id].desc}">
            <span>${TACTIC_META[id].icon}</span>
            <b>${TACTIC_META[id].label}</b>
          </button>
        `).join("")}
      </div>
    ` : ""}
  `;

  ui.commandLayer.querySelectorAll("[data-tactic]").forEach((button) => {
    button.addEventListener("mouseenter", () => showTacticPreview(piece, button.dataset.tactic));
    button.addEventListener("mouseleave", clearPreview);
    button.addEventListener("click", () => {
      setPieceTactic(piece.id, button.dataset.tactic);
      pulseCell(piece);
    });
  });

  positionFloatingEl(ui.commandLayer, cell, 194, 178);
  ui.commandLayer.classList.remove("hidden");
}

function positionFloatingEl(el, anchor, width, height) {
  const rect = anchor.getBoundingClientRect();
  const margin = 12;
  let left = rect.right - 8;
  let top = rect.top - 20;
  if (left + width > window.innerWidth - margin) left = rect.left - width + 8;
  if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin;
  if (top < margin) top = margin;
  if (left < margin) left = margin;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function clearPreview() {
  document.querySelectorAll(".preview-move, .preview-attack, .preview-guard, .preview-flank, .confirm-pulse")
    .forEach((el) => el.classList.remove("preview-move", "preview-attack", "preview-guard", "preview-flank", "confirm-pulse"));
}

function showTacticPreview(piece, tactic) {
  clearPreview();
  const { moves, captures } = getMoves(piece);
  if (tactic === "advance") {
    moves.forEach((m) => getCellEl(m.row, m.col)?.classList.add("preview-move"));
  } else if (tactic === "aggressive") {
    captures.forEach((m) => getCellEl(m.row, m.col)?.classList.add("preview-attack"));
  } else if (tactic === "guard") {
    const king = alivePieces(piece.faction).find((p) => p.role === "king");
    const center = king ?? piece;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        getCellEl(center.row + dr, center.col + dc)?.classList.add("preview-guard");
      }
    }
  } else if (tactic === "flank") {
    moves
      .filter((m) => Math.abs(m.col - piece.col) >= Math.abs(m.row - piece.row))
      .forEach((m) => getCellEl(m.row, m.col)?.classList.add("preview-flank"));
  }
}

function pulseCell(piece) {
  const cell = getCellEl(piece.row, piece.col);
  if (!cell) return;
  cell.classList.remove("confirm-pulse");
  void cell.offsetWidth;
  cell.classList.add("confirm-pulse");
  setTimeout(() => cell.classList.remove("confirm-pulse"), 260);
}

function showSelectedDetail() {
  const id = state.inspectedId || state.selectedId;
  const piece = id ? state.pieces.get(id) : null;
  if (piece) showDetailCard(piece);
}

function showDetailCard(piece) {
  if (!ui.detailCard) return;
  const cell = getCellEl(piece.row, piece.col);
  if (!cell) return;
  const traits = piece.traits?.length ? piece.traits.join(", ") : [piece.role, piece.accent].filter(Boolean).join(", ");
  ui.detailCard.innerHTML = `
    <strong>${piece.name}</strong>
    <span>Lv ${piece.level} / XP ${piece.xp}</span>
    <span>Move: ${piece.movePattern}</span>
    <span>Traits: ${traits || "None"}</span>
    <p>${piece.ability?.desc ?? piece.desc ?? "No special skill."}</p>
  `;
  positionFloatingEl(ui.detailCard, cell, 220, 150);
  ui.detailCard.classList.remove("hidden");
}

function hideDetailCard() {
  ui.detailCard?.classList.add("hidden");
}

function setPieceTactic(pieceId, tactic) {
  const piece = state.pieces.get(pieceId);
  if (!piece || piece.faction !== Faction.LIGHT || !TACTICS.includes(tactic)) return;
  piece.tactic = tactic;
  refresh();
  renderFloatingCommand(piece);
  toast(`${piece.name}: ${TACTIC_LABEL[tactic]}`);
}

async function runAutoPlayerPhase() {
  if (busy || state.phase !== Phase.PLAYER) return;
  busy = true;
  state.selectedId = null;
  state.inspectedId = null;
  highlight = null;
  hideFloatingUi();
  ui.phaseText.textContent = "AUTO";
  refresh();
  await delay(250);

  await planAndExecuteFactionActions(Faction.LIGHT, executeAction);
  refresh();

  if (checkVictoryOrDefeat()) { busy = false; return; }
  busy = false;
  await runEnemyPhase();
}

async function runEnemyPhase() {
  if (state.phase !== Phase.PLAYER) return;
  busy = true;
  endPlayerPhase();
  ui.phaseText.textContent = "Enemy";
  refresh();
  await delay(250);

  await planAndExecuteEnemyActions(executeAction);
  refresh();

  if (checkVictoryOrDefeat()) { busy = false; return; }
  endEnemyPhase();
  ui.phaseText.textContent = "Player";
  updateHud();
  refresh();
  busy = false;
}

function checkVictoryOrDefeat() {
  if (!kingAlive(Faction.LIGHT)) {
    state.phase = Phase.GAMEOVER;
    showGameOver("King が撃破されました", startNewRun);
    return true;
  }
  if (enemiesAlive() === 0) {
    state.phase = Phase.REWARD;
    const soulGain = state.soul; // 累計表示
    showStageClear(state.stage, soulGain, openReward);
    return true;
  }
  return false;
}

function openReward() {
  const lost = applyEndOfStageLosses();
  if (lost.length) toast(`${lost.length}体が永久ロスト`);

  const candidates = rollRewardCandidates(state.stage);
  showRewardScreen(candidates, (chosen) => {
    state.roster.push(chosen.id);
    state.pieces.set(chosen.id, chosen);
    openMaintenance();
  });
}

// 報酬選択後の部隊整備 → 次ステージ
function openMaintenance() {
  const proceed = () => {
    const nextStage = state.stage + 1;
    if (hasStage(nextStage)) startStage(nextStage);
    else showGameOver("最終ステージ突破！", startNewRun);
  };

  const woundedRoster = () =>
    state.roster.map((id) => state.pieces.get(id)).filter((p) => p && p.wounds > 0);

  // 負傷した駒がなければ整備画面を飛ばす
  if (woundedRoster().length === 0) {
    proceed();
    return;
  }

  showMaintenanceScreen({
    pieces: woundedRoster,
    soul: () => state.soul,
    cost: HEAL_COST,
    onHeal: (id) => healWound(state.pieces.get(id)),
    onContinue: proceed,
  });
}

// --- HUD更新 ---
function updateHud() {
  ui.roundText.textContent = state.round;
  ui.phaseText.textContent = state.phase === Phase.ENEMY ? "ENEMY" : "PLAYER";
  ui.commandText.textContent = `${state.playerCommandLeft} / ${state.playerCommandMax}`;
  ui.soulText.textContent = state.soul;
  ui.objectiveText.textContent = "敵を全滅させる";
  ui.endTurnBtn.disabled = state.phase !== Phase.PLAYER;
  if (AUTO_BATTLE) ui.endTurnBtn.innerHTML = `Start Turn <kbd>Space</kbd>`;

  // Command を◆ピップで表示 (残数ぶん点灯)
  ui.commandPips.innerHTML = "";
  for (let i = 0; i < state.playerCommandMax; i++) {
    const pip = document.createElement("div");
    pip.className = "pip" + (i < state.playerCommandLeft ? " on" : "");
    ui.commandPips.appendChild(pip);
  }

  // 盤上の生存数
  ui.lightCount.textContent = alivePieces(Faction.LIGHT).length;
  ui.darkCount.textContent = alivePieces(Faction.DARK).length;
}

// 自軍ユニットbar (Roster) を描画
function renderRoster() {
  const owned = state.roster.map((id) => state.pieces.get(id)).filter(Boolean);
  ui.rosterCount.textContent = `(${owned.length})`;
  ui.rosterUnits.innerHTML = "";
  for (const p of owned) {
    const hp = p.maxWounds - p.wounds;
    const pct = Math.max(0, Math.round((hp / p.maxWounds) * 100));
    const cls = hp <= 1 ? "critical" : p.wounds > 0 ? "hurt" : "";
    const accent = p.accent ? `<span class="unit-accent" style="--accent-ring:${accentColor(p.accent)}"></span>` : "";
    const tacticMark = p.faction === Faction.LIGHT
      ? `<span class="unit-tactic">${({ advance: "A", aggressive: "!", guard: "G", flank: "F" })[p.tactic ?? "advance"] ?? "A"}</span>`
      : "";
    const unit = document.createElement("div");
    unit.className = "unit" + (p.role === "king" ? " king-unit" : "") + (p.alive ? "" : " dead");
    unit.title = p.name;
    unit.innerHTML = `
      <div class="unit-disc light piece-art">${pieceArtHTML(p)}${accent}${tacticMark}</div>
      <div class="unit-hp"><div class="unit-hp-fill ${cls}" style="width:${pct}%"></div></div>
    `;
    ui.rosterUnits.appendChild(unit);
  }
}

function accentColor(accent) {
  return { spear: "#d96666", shield: "#7cd9d9", war: "#f1cf85" }[accent] ?? "#d9b066";
}

function refresh() {
  render(highlight);
  renderRoster();
  updateHud();
}

init();
