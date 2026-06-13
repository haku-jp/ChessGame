// 単一の真実の状態。ここを通さずに駒や盤面を書き換えない。

export const Phase = Object.freeze({
  PLAYER: "player",
  ENEMY: "enemy",
  REWARD: "reward",
  GAMEOVER: "gameover",
});

export const Faction = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
});

// 盤面サイズ → Command 表（GAME_SPEC §23.1）
const COMMAND_TABLE = {
  4: { player: 2, enemy: 1 },
  5: { player: 3, enemy: 2 },
  6: { player: 4, enemy: 3 },
  7: { player: 4, enemy: 3 },
  8: { player: 5, enemy: 4 },
};

// 出撃枠（GAME_SPEC §23.4）: 出撃する非King駒の数 = 盤面の一辺サイズ。
// Command (COMMAND_TABLE) は出撃枠ほど増やさない → 「誰を動かすか」の選択を作る。
const DEPLOY_TABLE = {
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  10: 10,
  12: 12,
};

export function commandsFor(size) {
  return COMMAND_TABLE[size] ?? { player: 3, enemy: 2 };
}

export function deployFor(size) {
  return DEPLOY_TABLE[size] ?? size;
}

// game-wide state
export const state = {
  stage: 1,
  boardSize: 5,
  round: 1,
  phase: Phase.PLAYER,
  // 盤面: row-major 配列。null か駒オブジェクトの id を入れる
  board: [],
  // 駒は id → piece の辞書 (盤面上の駒も Bench も含む)
  pieces: new Map(),
  // 自軍の所持駒 (Roster): piece.id の配列
  roster: [],
  // 通貨
  soul: 0,
  // Command
  playerCommandMax: 3,
  playerCommandLeft: 3,
  enemyCommandMax: 2,
  enemyCommandLeft: 2,
  selectedId: null,
  inspectedId: null,
  // 選択中の駒
  selectedId: null,
};

export function resetForStage(size) {
  const cmd = commandsFor(size);
  state.boardSize = size;
  state.round = 1;
  state.phase = Phase.PLAYER;
  state.board = new Array(size * size).fill(null);
  // 敵 (DARK) 駒は持ち越さないので削除。roster (LIGHT) は維持。
  for (const [id, p] of Array.from(state.pieces)) {
    if (p.faction === Faction.DARK) state.pieces.delete(id);
  }
  // LIGHT 駒の盤面位置をクリア (再配置するため)
  for (const p of state.pieces.values()) {
    p.row = null;
    p.col = null;
    p.alive = false;
    p.abilityUsed = false;
  }
  state.playerCommandMax = cmd.player;
  state.playerCommandLeft = cmd.player;
  state.enemyCommandMax = cmd.enemy;
  state.enemyCommandLeft = cmd.enemy;
  state.selectedId = null;
  state.inspectedId = null;
}

export function idx(row, col, size = state.boardSize) {
  return row * size + col;
}

export function rc(index, size = state.boardSize) {
  return [Math.floor(index / size), index % size];
}

export function inBounds(row, col, size = state.boardSize) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function pieceAt(row, col) {
  if (!inBounds(row, col)) return null;
  const id = state.board[idx(row, col)];
  return id ? state.pieces.get(id) : null;
}

export function placePiece(piece, row, col) {
  piece.row = row;
  piece.col = col;
  piece.alive = true;
  state.pieces.set(piece.id, piece);
  state.board[idx(row, col)] = piece.id;
}

export function movePiece(piece, toRow, toCol) {
  state.board[idx(piece.row, piece.col)] = null;
  piece.row = toRow;
  piece.col = toCol;
  state.board[idx(toRow, toCol)] = piece.id;
}

export function removeFromBoard(piece) {
  if (piece.row != null && piece.col != null) {
    state.board[idx(piece.row, piece.col)] = null;
  }
  piece.alive = false;
  piece.row = null;
  piece.col = null;
}

// 盤面上で生存している指定陣営の駒。acted視覚状態/撃破演出のイテレートはこれを使う。
export function alivePieces(faction) {
  const result = [];
  for (const p of state.pieces.values()) {
    if (p.faction === faction && p.alive) result.push(p);
  }
  return result;
}

export function enemiesAlive() {
  return alivePieces(Faction.DARK).length;
}

export function kingAlive(faction) {
  for (const p of state.pieces.values()) {
    if (p.faction === faction && p.role === "king" && p.alive) return true;
  }
  return false;
}
