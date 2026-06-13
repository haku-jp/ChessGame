// 報酬3択生成 (GAME_SPEC §23.7)

import { PIECE_TYPES, createPiece } from "./pieces.js";

// Stage ごとの希少度分布
const RARITY_TABLE = {
  1: { common: 0.75, uncommon: 0.25 },
  2: { common: 0.75, uncommon: 0.25 },
  3: { common: 0.55, uncommon: 0.35, rare: 0.10 },
  4: { common: 0.55, uncommon: 0.35, rare: 0.10 },
};

function rollRarity(stage) {
  const dist = RARITY_TABLE[stage] ?? RARITY_TABLE[1];
  const r = Math.random();
  let acc = 0;
  for (const [rarity, p] of Object.entries(dist)) {
    acc += p;
    if (r < acc) return rarity;
  }
  return "common";
}

const REWARDABLE_TYPES = Object.keys(PIECE_TYPES).filter(
  (key) => PIECE_TYPES[key].role !== "king"
);

function typesByRarity(rarity) {
  return REWARDABLE_TYPES.filter((key) => PIECE_TYPES[key].rarity === rarity);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollRewardCandidates(stage) {
  const out = [];
  const used = new Set();
  while (out.length < 3) {
    // ロールした希少度の未使用タイプ → 全未使用タイプ → pawn の順でフォールバック
    const byRarity = typesByRarity(rollRarity(stage)).filter((k) => !used.has(k));
    const anyUnused = REWARDABLE_TYPES.filter((k) => !used.has(k));
    const typeKey = byRarity.length ? pickRandom(byRarity)
                  : anyUnused.length ? pickRandom(anyUnused)
                  : "pawn";
    used.add(typeKey);
    out.push(createPiece(typeKey));
  }
  return out;
}
