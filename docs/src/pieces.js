import { Faction, inBounds, pieceAt } from "./state.js";

let nextId = 1;

function genId(type) {
  return `${type}-${nextId++}`;
}

const RARITY_MAX_WOUNDS = {
  common: 3,
  uncommon: 2,
  rare: 2,
  epic: 1,
  legendary: 1,
};

export const PIECE_TYPES = {
  pawn: {
    name: "Pawn",
    role: "pawn",
    icon: "P",
    rarity: "common",
    movePattern: "pawn",
    ability: null,
    desc: "Move forward/backward or sidestep. Capture diagonally forward/backward.",
  },
  knight: {
    name: "Knight",
    role: "knight",
    icon: "N",
    rarity: "uncommon",
    movePattern: "knight",
    ability: null,
    desc: "Jump in an L shape.",
  },
  bishop: {
    name: "Bishop",
    role: "bishop",
    icon: "B",
    rarity: "uncommon",
    movePattern: "bishop",
    ability: null,
    desc: "Slide diagonally.",
  },
  rook: {
    name: "Rook",
    role: "rook",
    icon: "R",
    rarity: "uncommon",
    movePattern: "rook",
    ability: null,
    desc: "Slide horizontally or vertically.",
  },
  queen: {
    name: "Queen",
    role: "queen",
    icon: "Q",
    rarity: "rare",
    movePattern: "queen",
    ability: null,
    desc: "Slide in any direction.",
  },
  king: {
    name: "King",
    role: "king",
    icon: "K",
    rarity: "legendary",
    movePattern: "king",
    ability: null,
    desc: "If the King falls, the run ends.",
  },
  spearPawn: {
    name: "Spear Pawn",
    role: "pawn",
    icon: "P",
    accent: "spear",
    rarity: "uncommon",
    movePattern: "pawn",
    ability: {
      id: "spear",
      name: "Spear",
      trigger: "passive",
      desc: "Can strike an enemy two squares forward.",
    },
    desc: "Pawn variant with a forward ranged strike.",
  },
  shieldPawn: {
    name: "Shield Pawn",
    role: "pawn",
    icon: "P",
    accent: "shield",
    rarity: "uncommon",
    movePattern: "pawn",
    ability: {
      id: "shield",
      name: "Shield",
      trigger: "passive",
      desc: "Blocks the first lethal hit, then gains 1 wound.",
    },
    desc: "Defensive pawn that can absorb one defeat.",
  },
  warKnight: {
    name: "War Knight",
    role: "knight",
    icon: "N",
    accent: "war",
    rarity: "rare",
    movePattern: "knight",
    ability: {
      id: "warCharge",
      name: "War Charge",
      trigger: "onMove",
      desc: "On move, damages enemies around the landing square.",
    },
    desc: "Aggressive knight that punishes clustered enemies.",
  },
};

export function createPiece(typeKey, faction = Faction.LIGHT) {
  const def = PIECE_TYPES[typeKey];
  if (!def) throw new Error(`Unknown piece type: ${typeKey}`);

  return {
    id: genId(typeKey),
    type: typeKey,
    name: def.name,
    role: def.role,
    icon: def.icon,
    accent: def.accent ?? null,
    faction,
    rarity: def.rarity,
    level: 1,
    xp: 0,
    wounds: 0,
    maxWounds: RARITY_MAX_WOUNDS[def.rarity] ?? 3,
    traits: [],
    movePattern: def.movePattern,
    ability: def.ability,
    abilityUsed: false,
    tactic: "advance",
    value: valueOf(def.rarity),
    desc: def.desc,
    alive: false,
    row: null,
    col: null,
  };
}

function valueOf(rarity) {
  return { common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8 }[rarity] ?? 1;
}

const SPRITE_BASE = { spearPawn: "pawn", shieldPawn: "pawn", warKnight: "knight" };

export function pieceSpriteUrl(piece) {
  const key = SPRITE_BASE[piece.type] ?? piece.type;
  return `assets/pieces/${piece.faction}-${key}.png`;
}

export function pieceArtHTML(piece) {
  return (
    `<img class="piece-art-img" alt="" src="${pieceSpriteUrl(piece)}"` +
    ` onload="this.parentElement.classList.add('has-art')" onerror="this.remove()">` +
    `<span class="piece-art-glyph">${piece.icon}</span>`
  );
}

export function getMoves(piece) {
  const moves = [];
  const captures = [];
  const ctx = { piece, moves, captures };

  switch (piece.movePattern) {
    case "pawn": expandPawn(ctx); break;
    case "knight": expandKnight(ctx); break;
    case "bishop": expandSlide(ctx, DIAGS); break;
    case "rook": expandSlide(ctx, ORTHOS); break;
    case "queen": expandSlide(ctx, [...DIAGS, ...ORTHOS]); break;
    case "king": expandKing(ctx); break;
  }

  return { moves, captures };
}

const ORTHOS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function forward(piece) {
  return piece.faction === Faction.LIGHT ? -1 : 1;
}

function expandPawn({ piece, moves, captures }) {
  const dy = forward(piece);
  const { row, col } = piece;

  for (const [dr, dc] of [[dy, 0], [-dy, 0], [0, -1], [0, 1]]) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && !pieceAt(r, c)) moves.push({ row: r, col: c });
  }

  for (const dr of [dy, -dy]) {
    for (const dc of [-1, 1]) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = pieceAt(r, c);
      if (target && target.faction !== piece.faction) {
        captures.push({ row: r, col: c, targetId: target.id });
      }
    }
  }

  if (piece.ability?.id === "spear") {
    const r = row + dy * 2;
    const c = col;
    if (!inBounds(r, c)) return;

    const between = pieceAt(row + dy, col);
    const target = pieceAt(r, c);
    if (target && target.faction !== piece.faction) {
      captures.push({ row: r, col: c, targetId: target.id, ranged: true });
    } else if (!between && !target) {
      moves.push({ row: r, col: c });
    }
  }
}

function expandKnight({ piece, moves, captures }) {
  const jumps = [
    [-2, -1], [-2, 1], [2, -1], [2, 1],
    [-1, -2], [-1, 2], [1, -2], [1, 2],
  ];

  for (const [dr, dc] of jumps) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    if (!inBounds(r, c)) continue;

    const t = pieceAt(r, c);
    if (!t) moves.push({ row: r, col: c });
    else if (t.faction !== piece.faction) captures.push({ row: r, col: c, targetId: t.id });
  }
}

function expandSlide({ piece, moves, captures }, dirs) {
  for (const [dr, dc] of dirs) {
    let r = piece.row + dr;
    let c = piece.col + dc;

    while (inBounds(r, c)) {
      const t = pieceAt(r, c);
      if (!t) {
        moves.push({ row: r, col: c });
      } else {
        if (t.faction !== piece.faction) captures.push({ row: r, col: c, targetId: t.id });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function expandKing({ piece, moves, captures }) {
  for (const [dr, dc] of [...ORTHOS, ...DIAGS]) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    if (!inBounds(r, c)) continue;

    const t = pieceAt(r, c);
    if (!t) moves.push({ row: r, col: c });
    else if (t.faction !== piece.faction) captures.push({ row: r, col: c, targetId: t.id });
  }
}
