import { getMoves, pieceArtHTML } from "../pieces.js";

let el = null;
let mapEl = null;
let tacticChangeHandler = null;

const MOVE_LABEL = {
  pawn: "Forward/back step",
  knight: "L-jump",
  bishop: "Diagonal line",
  rook: "Straight line",
  queen: "Omni line",
  king: "Command aura",
};

const ROLE_TRAITS = {
  pawn: ["Infantry"],
  knight: ["Mobile"],
  bishop: ["Arcane"],
  rook: ["Line"],
  queen: ["Elite"],
  king: ["Core"],
};

const ACCENT_TRAITS = { spear: "Spear", shield: "Shield", war: "Charge" };

const TACTICS = {
  advance: { label: "Advance", desc: "Close distance and take stable space." },
  aggressive: { label: "Aggressive", desc: "Prioritize captures and pressure." },
  guard: { label: "Guard", desc: "Stay near the King and protect the core." },
  flank: { label: "Flank", desc: "Seek open lanes and avoid congestion." },
};

export function initInspector(rootEl, moveMapEl, options = {}) {
  el = rootEl;
  mapEl = moveMapEl ?? null;
  tacticChangeHandler = options.onTacticChange ?? null;

  el.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tactic]");
    if (!button) return;
    tacticChangeHandler?.(button.dataset.pieceId, button.dataset.tactic);
  });
}

function nextXp(level) {
  return [3, 6, 10][level - 1] ?? 10 + (level - 3) * 5;
}

function displayTraits(piece) {
  if (piece.traits?.length) return piece.traits;
  const traits = [...(ROLE_TRAITS[piece.role] ?? [])];
  if (piece.accent && ACCENT_TRAITS[piece.accent]) traits.push(ACCENT_TRAITS[piece.accent]);
  return traits;
}

export function renderInspector(piece) {
  if (!piece) {
    el.innerHTML = `<p class="inspector-empty">Select a unit to inspect orders, wounds, and movement.</p>`;
    renderMoveMap(null);
    return;
  }

  const hp = Math.max(0, piece.maxWounds - piece.wounds);
  const hearts = Array.from({ length: piece.maxWounds }, (_, i) =>
    `<span class="heart ${i < hp ? "full" : ""}"></span>`).join("");
  const need = nextXp(piece.level);
  const xpPct = Math.min(100, Math.round((piece.xp / need) * 100));
  const traits = displayTraits(piece);
  const tactic = TACTICS[piece.tactic ?? "advance"] ?? TACTICS.advance;

  const tacticBlock = piece.faction === "light"
    ? `<section class="tactic-panel">
        <span class="panel-title">Battle Doctrine</span>
        <div class="tactic-current">${tactic.label}</div>
        <div class="tactic-grid">
          ${Object.entries(TACTICS).map(([id, info]) => `
            <button class="tactic-btn ${piece.tactic === id || (!piece.tactic && id === "advance") ? "active" : ""}"
              type="button"
              data-piece-id="${piece.id}"
              data-tactic="${id}">
              <strong>${info.label}</strong>
              <span>${info.desc}</span>
            </button>
          `).join("")}
        </div>
      </section>`
    : "";

  const ability = piece.ability
    ? `<section class="ability">
        <span class="ability-name">${piece.ability.name}</span>
        ${piece.ability.desc ?? ""}
      </section>`
    : "";

  el.innerHTML = `
    <div class="insp-head">
      <div class="insp-portrait piece-art ${piece.faction}">${pieceArtHTML(piece)}</div>
      <div class="insp-name">
        <span class="role">${piece.role} / ${piece.rarity}</span>
        <h2>${piece.name}</h2>
      </div>
      <span class="faction-badge ${piece.faction}">${piece.faction === "light" ? "Light" : "Dark"}</span>
    </div>

    <div class="insp-bars">
      <div class="hp-row">
        <span class="hearts">${hearts}</span>
        <span class="hp-text">${hp} / ${piece.maxWounds}</span>
      </div>
      <div class="xp-row">
        <div class="xp-track"><div class="xp-fill" style="width:${xpPct}%"></div></div>
        <span class="xp-text">XP ${piece.xp} / ${need}</span>
      </div>
    </div>

    <div class="insp-stats">
      <span class="insp-stat"><i>Power</i>${piece.value}</span>
      <span class="insp-stat"><i>Move</i>${MOVE_LABEL[piece.role] ?? "Special"}</span>
      <span class="insp-stat"><i>Lv</i>${piece.level}</span>
    </div>

    ${tacticBlock}
    ${ability}

    <section class="insp-traits">
      <span class="panel-title">Traits</span>
      <div class="trait-tags">${traits.map((t) => `<span class="trait-tag">${t}</span>`).join("")}</div>
    </section>
  `;

  renderMoveMap(piece);
}

function renderMoveMap(piece) {
  if (!mapEl) return;
  if (!piece) {
    mapEl.innerHTML = `<p class="movemap-empty">No unit selected</p>`;
    return;
  }

  const { moves, captures } = getMoves(piece);
  const offsets = [
    ...moves.map((m) => ({ dr: m.row - piece.row, dc: m.col - piece.col, k: "mm-move" })),
    ...captures.map((m) => ({ dr: m.row - piece.row, dc: m.col - piece.col, k: "mm-capture" })),
  ];

  let radius = 1;
  for (const offset of offsets) radius = Math.max(radius, Math.abs(offset.dr), Math.abs(offset.dc));
  radius = Math.min(radius, 4);

  const size = radius * 2 + 1;
  mapEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  mapEl.innerHTML = "";

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const cell = document.createElement("div");
      cell.className = "mm-cell";
      if (dr === 0 && dc === 0) {
        cell.classList.add("mm-self");
      } else {
        const hit = offsets.find((o) => o.dr === dr && o.dc === dc);
        if (hit) cell.classList.add(hit.k);
      }
      mapEl.appendChild(cell);
    }
  }
}
