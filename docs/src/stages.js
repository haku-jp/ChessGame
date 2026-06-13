// ステージ定義データ。新ステージの追加は原則ここへの追記だけで済む。
// 盤面サイズ別の Command / 出撃枠 / 報酬希少度は size / stage から導出される
// (state.js commandsFor, reward.js RARITY_TABLE)。

export const STAGE_DEFS = {
  // Stage 1: 学べて勝てる導入戦。強駒(Rook/Bishop)は出さない。
  1: {
    size: 5,
    enemies: [
      { type: "pawn",   row: 0, col: 1 },
      { type: "pawn",   row: 0, col: 3 },
      { type: "pawn",   row: 1, col: 2 },
      { type: "knight", row: 0, col: 2 },
    ],
  },
  // Stage 2: ここで初めて Rook/Bishop を導入。崖にならないよう数は控えめ。
  2: {
    size: 6,
    enemies: [
      { type: "pawn",   row: 0, col: 0 },
      { type: "pawn",   row: 0, col: 5 },
      { type: "pawn",   row: 1, col: 2 },
      { type: "rook",   row: 0, col: 2 },
      { type: "bishop", row: 0, col: 3 },
      { type: "knight", row: 1, col: 3 },
    ],
  },
  3: {
    size: 6,
    enemies: [
      { type: "pawn",   row: 0, col: 0 },
      { type: "pawn",   row: 0, col: 1 },
      { type: "pawn",   row: 0, col: 4 },
      { type: "pawn",   row: 0, col: 5 },
      { type: "rook",   row: 0, col: 2 },
      { type: "rook",   row: 0, col: 3 },
      { type: "bishop", row: 1, col: 1 },
      { type: "bishop", row: 1, col: 4 },
      { type: "knight", row: 1, col: 2 },
      { type: "queen",  row: 1, col: 3 },
    ],
  },
};

export const LAST_STAGE = Math.max(...Object.keys(STAGE_DEFS).map(Number));

// 定義のないステージ番号は最終ステージにクランプする。
export function stageDef(stage) {
  return STAGE_DEFS[stage] ?? STAGE_DEFS[LAST_STAGE];
}

// 次のステージが存在するか (ラン継続判定用)
export function hasStage(stage) {
  return Boolean(STAGE_DEFS[stage]);
}
