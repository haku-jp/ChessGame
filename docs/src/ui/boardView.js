// 盤面描画。state を読んで DOM に反映する。state は書き換えない。
//
// グリッド(セル)は盤面サイズが変わったときだけ作り直す。
// 駒の DOM は piece.id でキャッシュし、再renderでは「動かす/更新する」だけ。
// これにより撃破・acted・報酬などの CSS アニメーションが render で消えない。

import { state, pieceAt, Phase, Faction } from "../state.js";
import { pieceSpriteUrl } from "../pieces.js";

// その駒が「今のフェーズの行動側」かどうか。acted の暗転は現フェーズ側だけに見せる。
function isActiveFaction(piece) {
  if (state.phase === Phase.PLAYER) return piece.faction === Faction.LIGHT;
  if (state.phase === Phase.ENEMY) return piece.faction === Faction.DARK;
  return false;
}

let boardEl = null;
let rankEl = null;
let fileEl = null;
let cellClickHandler = null;

let gridSize = 0;            // 現在グリッドを組んでいる盤面サイズ
let cellEls = [];           // index = r*size + c のセル要素
const pieceEls = new Map(); // piece.id -> 駒要素

export function initBoardView(rootEl, { onCellClick, rankEl: rEl, fileEl: fEl }) {
  boardEl = rootEl;
  cellClickHandler = onCellClick;
  rankEl = rEl ?? null;
  fileEl = fEl ?? null;
}

const FILES = "ABCDEFGHIJKL";

function buildCoordLabels(size) {
  if (rankEl) {
    rankEl.innerHTML = "";
    for (let r = 0; r < size; r++) {
      const s = document.createElement("span");
      s.textContent = size - r; // 上が最大ランク
      rankEl.appendChild(s);
    }
  }
  if (fileEl) {
    fileEl.innerHTML = "";
    for (let c = 0; c < size; c++) {
      const s = document.createElement("span");
      s.textContent = FILES[c];
      fileEl.appendChild(s);
    }
  }
}

// 駒要素を render の管理下から外す。以後 render は触らない (DOM には残る)。
// 撃破演出はこの要素を受け取り、演出後に自分で remove する。
export function releasePieceEl(id) {
  const el = pieceEls.get(id);
  if (el) pieceEls.delete(id);
  return el;
}

export function getPieceEl(id) {
  return pieceEls.get(id) ?? null;
}

export function getCellEl(row, col) {
  if (!gridSize) return null;
  return cellEls[row * gridSize + col] ?? null;
}

function buildGrid(size) {
  gridSize = size;
  cellEls = [];
  pieceEls.clear();
  buildCoordLabels(size);
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  boardEl.innerHTML = "";

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.className = "cell " + ((r + c) % 2 === 0 ? "light" : "dark");
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener("click", () => cellClickHandler?.(r, c));
      cellEls.push(cell);
      boardEl.appendChild(cell);
    }
  }
}

function getOrCreatePieceEl(piece) {
  let el = pieceEls.get(piece.id);
  if (!el) {
    el = document.createElement("div");
    el.dataset.pieceId = piece.id;
    const glyph = document.createElement("span");
    glyph.className = "piece-glyph";
    el.appendChild(glyph);
    // スプライト: 画像があれば駒画像、無ければ glyph にフォールバック
    const img = document.createElement("img");
    img.className = "piece-sprite";
    img.alt = "";
    img.src = pieceSpriteUrl(piece);
    img.onload = () => el.classList.add("has-sprite");
    img.onerror = () => img.remove();
    el.appendChild(img);
    pieceEls.set(piece.id, el);
  }
  return el;
}

function updatePieceEl(el, piece) {
  const hadSprite = el.classList.contains("has-sprite"); // className 再設定で消さない
  el.className = "piece " + piece.faction + (piece.accent ? ` accent-${piece.accent}` : "");
  if (hadSprite) el.classList.add("has-sprite");
  // 行動済み (Command 使用済み)。死亡ではなく「命令を使い切った」表現。
  // 暗転は現フェーズの行動側だけに見せる (敵の acted を自分のターンに引きずらない)。
  el.classList.toggle("acted", isActiveFaction(piece) && !!piece.actedThisPhase);
  el.title = piece.name;
  el.querySelector(".piece-glyph").textContent = piece.icon;

  let pip = el.querySelector(".wound-pip");
  if (piece.wounds > 0) {
    if (!pip) {
      pip = document.createElement("span");
      pip.className = "wound-pip";
      el.appendChild(pip);
    }
    pip.textContent = `${piece.wounds}/${piece.maxWounds}`;
  } else if (pip) {
    pip.remove();
  }

  let tacticPip = el.querySelector(".tactic-pip");
  if (piece.faction === Faction.LIGHT) {
    if (!tacticPip) {
      tacticPip = document.createElement("span");
      tacticPip.className = "tactic-pip";
      el.appendChild(tacticPip);
    }
    tacticPip.textContent = ({ advance: "A", aggressive: "!", guard: "G", flank: "F" })[piece.tactic ?? "advance"] ?? "A";
    tacticPip.title = piece.tactic ?? "advance";
  } else if (tacticPip) {
    tacticPip.remove();
  }
}

export function render(highlight = null) {
  const size = state.boardSize;
  if (size !== gridSize) buildGrid(size);

  const seen = new Set();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cellEls[r * size + c];
      cell.classList.remove("selected", "move-target", "capture-target");

      const piece = pieceAt(r, c);
      if (piece) {
        const el = getOrCreatePieceEl(piece);
        updatePieceEl(el, piece);
        if (el.parentElement !== cell) cell.appendChild(el);
        seen.add(piece.id);
        if (piece.id === state.selectedId || piece.id === state.inspectedId) cell.classList.add("selected");
      }

      if (highlight) {
        if (highlight.moves?.some((m) => m.row === r && m.col === c)) cell.classList.add("move-target");
        if (highlight.captures?.some((m) => m.row === r && m.col === c)) cell.classList.add("capture-target");
      }
    }
  }

  // 盤面から消えた駒の DOM を破棄 (撃破演出はここをフックする)
  for (const [id, el] of pieceEls) {
    if (!seen.has(id)) {
      el.remove();
      pieceEls.delete(id);
    }
  }
}
