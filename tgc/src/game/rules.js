(function initRules(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.TGC_RULES = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createRules() {
  const BOARD_SIZE = 6;
  const STARTING_LIFE = 20;
  const STARTING_HAND_SIZE = 5;
  const HAND_LIMIT = 7;
  const DECK_SIZE = 30;
  const MAX_MANA = 10;
  const MAX_FIELD_GENJU = 6;
  const MAX_PLACED_EQUIPMENT = 3;

  const CARD_TYPES = {
    genju: "幻獣",
    spell: "魔術",
    equipment: "装備"
  };

  const RARITY_LABELS = {
    S: "標準",
    R: "希少",
    L: "伝説",
    I: "幻"
  };

  const SAME_NAME_LIMITS = {
    S: 3,
    R: 2,
    L: 1,
    I: 1
  };

  const TOTAL_RARITY_LIMITS = {
    L: 3,
    I: 1
  };

  const HEADQUARTERS = {
    first: [
      { row: 5, col: 2 },
      { row: 5, col: 3 }
    ],
    second: [
      { row: 0, col: 2 },
      { row: 0, col: 3 }
    ]
  };

  function getCardTypeLabel(type) {
    return CARD_TYPES[type] || type;
  }

  function getRarityLabel(rarity) {
    return RARITY_LABELS[rarity] || rarity;
  }

  function isInsideBoard(position) {
    return Number.isInteger(position?.row)
      && Number.isInteger(position?.col)
      && position.row >= 0
      && position.row < BOARD_SIZE
      && position.col >= 0
      && position.col < BOARD_SIZE;
  }

  function samePosition(left, right) {
    return left?.row === right?.row && left?.col === right?.col;
  }

  function positionKey(position) {
    return `${position.row}:${position.col}`;
  }

  function isHeadquarters(playerId, position) {
    return Boolean(HEADQUARTERS[playerId]?.some((hq) => samePosition(hq, position)));
  }

  function isInSummonZone(playerId, position) {
    if (!isInsideBoard(position)) return false;
    if (playerId === "first") return position.row >= BOARD_SIZE - 2;
    if (playerId === "second") return position.row <= 1;
    return false;
  }

  function countBy(items, getKey) {
    return items.reduce((counts, item) => {
      const key = getKey(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function validateDeck(cards) {
    const errors = [];
    if (cards.length !== DECK_SIZE) {
      errors.push(`デッキは${DECK_SIZE}枚である必要があります。現在は${cards.length}枚です。`);
    }

    const byName = cards.reduce((groups, card) => {
      if (!groups.has(card.name)) groups.set(card.name, []);
      groups.get(card.name).push(card);
      return groups;
    }, new Map());
    byName.forEach((group) => {
      let limitCard = group[0];
      let limit = SAME_NAME_LIMITS[limitCard.rarity] || 1;
      group.forEach((candidate) => {
        const candidateLimit = SAME_NAME_LIMITS[candidate.rarity] || 1;
        if (candidateLimit < limit) {
          limit = candidateLimit;
          limitCard = candidate;
        }
      });
      if (group.length > limit) {
        errors.push(`${getRarityLabel(limitCard.rarity)}カード「${limitCard.name}」は同名${limit}枚までです。現在は${group.length}枚です。`);
      }
    });

    const byRarity = countBy(cards, (card) => card.rarity);
    Object.entries(TOTAL_RARITY_LIMITS).forEach(([rarity, limit]) => {
      const count = byRarity[rarity] || 0;
      if (count > limit) {
        errors.push(`${getRarityLabel(rarity)}カードはデッキ全体で${limit}枚までです。現在は${count}枚です。`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  function getLineBetween(from, to) {
    const rowDelta = to.row - from.row;
    const colDelta = to.col - from.col;
    const rowStep = Math.sign(rowDelta);
    const colStep = Math.sign(colDelta);
    const sameRow = rowDelta === 0;
    const sameCol = colDelta === 0;
    const sameDiagonal = Math.abs(rowDelta) === Math.abs(colDelta);

    if (!sameRow && !sameCol && !sameDiagonal) return [];

    const distance = Math.max(Math.abs(rowDelta), Math.abs(colDelta));
    const positions = [];
    for (let index = 1; index < distance; index += 1) {
      positions.push({
        row: from.row + rowStep * index,
        col: from.col + colStep * index
      });
    }
    return positions;
  }

  function isLineBlocked(from, to, occupiedPositions) {
    const occupied = new Set(occupiedPositions.map(positionKey));
    return getLineBetween(from, to).some((position) => occupied.has(positionKey(position)));
  }

  return {
    BOARD_SIZE,
    STARTING_LIFE,
    STARTING_HAND_SIZE,
    HAND_LIMIT,
    DECK_SIZE,
    MAX_MANA,
    MAX_FIELD_GENJU,
    MAX_PLACED_EQUIPMENT,
    CARD_TYPES,
    RARITY_LABELS,
    SAME_NAME_LIMITS,
    TOTAL_RARITY_LIMITS,
    HEADQUARTERS,
    getCardTypeLabel,
    getRarityLabel,
    isInsideBoard,
    samePosition,
    positionKey,
    isHeadquarters,
    isInSummonZone,
    validateDeck,
    getLineBetween,
    isLineBlocked
  };
});
