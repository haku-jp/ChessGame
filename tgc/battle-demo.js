const battleDemo = {
  game: null,
  selectedHandIndex: -1,
  selectedUnitId: "",
  selectedAction: "summon"
};

const battleElements = {};

const FACE_FOCUS = {
  koran: "50% 31%",
  guard_pup: "50% 34%",
  moon_wisp: "50% 36%",
  spark_hare: "50% 33%",
  river_newt: "50% 32%",
  korantan: "50% 30%",
  korangarth: "50% 28%",
  healing_sign: "50% 35%",
  ember_call: "50% 33%",
  lunar_bond: "50% 36%",
  first_contract: "50% 31%",
  survey_map: "50% 36%",
  frontier_snare: "50% 34%",
  ward_bell: "50% 35%"
};

document.addEventListener("DOMContentLoaded", () => {
  bindBattleElements();
  bindBattleEvents();
  startBattleDemo();
});

function bindBattleElements() {
  battleElements.newGameButton = document.getElementById("battleNewGameButton");
  battleElements.endTurnButton = document.getElementById("battleEndTurnButton");
  battleElements.status = document.getElementById("battleStatus");
  battleElements.board = document.getElementById("battleBoard");
  battleElements.hand = document.getElementById("battleHand");
  battleElements.log = document.getElementById("battleLog");
}

function bindBattleEvents() {
  battleElements.newGameButton.addEventListener("click", startBattleDemo);
  battleElements.endTurnButton.addEventListener("click", () => {
    battleDemo.game = TGC_BATTLE.endTurn(battleDemo.game);
    battleDemo.game = TGC_BATTLE.startTurn(battleDemo.game, battleDemo.game.activePlayerId);
    battleDemo.selectedHandIndex = -1;
    battleDemo.selectedUnitId = "";
    renderBattleDemo();
  });

  battleElements.hand.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-hand-index]");
    if (!cardButton) return;
    battleDemo.selectedHandIndex = Number(cardButton.dataset.handIndex);
    battleDemo.selectedUnitId = "";
    battleDemo.selectedAction = "summon";
    renderBattleDemo();
  });

  battleElements.board.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-row]");
    if (!cell) return;
    const position = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
    handleBoardClick(position);
  });
}

function buildStarterDeck() {
  return TGC_STARTER_DECK.map((id) => {
    const card = TGC_CARDS.find((candidate) => candidate.id === id);
    if (!card) throw new Error(`Starter card was not found: ${id}`);
    return card;
  });
}

function startBattleDemo() {
  const starterDeck = buildStarterDeck();
  battleDemo.game = TGC_BATTLE.createGame({
    firstDeck: starterDeck,
    secondDeck: starterDeck
  });
  battleDemo.game = TGC_BATTLE.startTurn(battleDemo.game, "first");
  battleDemo.selectedHandIndex = -1;
  battleDemo.selectedUnitId = "";
  battleDemo.selectedAction = "summon";
  renderBattleDemo();
}

function getCardById(cardId) {
  return TGC_CARDS.find((card) => card.id === cardId);
}

function getUnitCard(unit) {
  return getCardById(unit.cardId) || {
    id: unit.cardId,
    name: unit.name,
    image: "",
    visual: { tone: "frost" }
  };
}

function positionKey(position) {
  return TGC_RULES.positionKey ? TGC_RULES.positionKey(position) : `${position.row}:${position.col}`;
}

function getUnitAt(position) {
  return battleDemo.game.units.find((candidate) =>
    candidate.position.row === position.row && candidate.position.col === position.col
  );
}

function canPatternReach(patternSpec, from, to) {
  const rowDiff = Math.abs(from.row - to.row);
  const colDiff = Math.abs(from.col - to.col);
  const distance = rowDiff + colDiff;
  if (patternSpec.pattern === "orthogonal") {
    return (rowDiff === 0 || colDiff === 0) && distance > 0 && distance <= patternSpec.range;
  }
  if (patternSpec.pattern === "diagonal") {
    return rowDiff === colDiff && rowDiff > 0 && rowDiff <= patternSpec.range;
  }
  if (patternSpec.pattern === "king") {
    const maxDiff = Math.max(rowDiff, colDiff);
    return maxDiff > 0 && maxDiff <= patternSpec.range;
  }
  if (patternSpec.pattern === "knight") {
    return (rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1);
  }
  return distance > 0 && distance <= (patternSpec.range || 1);
}

function lineBlocked(from, to, unitId) {
  const occupied = new Set(
    battleDemo.game.units
      .filter((unit) => unit.id !== unitId)
      .map((unit) => positionKey(unit.position))
  );
  return TGC_RULES.getLineBetween(from, to).some((position) => occupied.has(positionKey(position)));
}

function canMoveUnitTo(unit, position) {
  if (unit.hasMoved || !TGC_RULES.isInsideBoard(position) || getUnitAt(position)) return false;
  if (!canPatternReach(unit.movement, unit.position, position)) return false;
  return !(unit.movement.blocks && lineBlocked(unit.position, position, unit.id));
}

function canAttackPosition(unit, position) {
  if (unit.hasAttacked) return false;
  const targetUnit = getUnitAt(position);
  const opponentId = TGC_BATTLE.opponentOf(unit.ownerId);
  const attacksEnemyUnit = targetUnit && targetUnit.ownerId !== unit.ownerId;
  const attacksEnemyHeadquarters = TGC_RULES.isHeadquarters(opponentId, position);
  if (!attacksEnemyUnit && !attacksEnemyHeadquarters) return false;
  if (targetUnit && targetUnit.ownerId === unit.ownerId) return false;
  if (unit.summonedTurn === battleDemo.game.turnNumber && !unit.traits.includes("遯∵茶")) return false;
  if (!canPatternReach(unit.attackRange, unit.position, position)) return false;
  return !(unit.attackRange.lineOfSight && lineBlocked(unit.position, position, unit.id));
}

function getReachableCells(unit) {
  const reachable = new Map();
  if (!unit) return reachable;
  for (let row = 0; row < TGC_RULES.BOARD_SIZE; row += 1) {
    for (let col = 0; col < TGC_RULES.BOARD_SIZE; col += 1) {
      const position = { row, col };
      const key = positionKey(position);
      if (canMoveUnitTo(unit, position)) reachable.set(key, "movable");
      if (canAttackPosition(unit, position)) reachable.set(key, "attackable");
    }
  }
  return reachable;
}

function handleBoardClick(position) {
  try {
    const activePlayerId = battleDemo.game.activePlayerId;
    const unit = getUnitAt(position);
    const selectedCard = battleDemo.selectedHandIndex >= 0
      ? battleDemo.game.players[activePlayerId].hand[battleDemo.selectedHandIndex]
      : null;

    if (selectedCard?.type === "spell" && unit) {
      battleDemo.game = TGC_BATTLE.playSpell(battleDemo.game, activePlayerId, battleDemo.selectedHandIndex, { unitId: unit.id });
      battleDemo.selectedHandIndex = -1;
      renderBattleDemo();
      return;
    }

    if (selectedCard?.type === "equipment" && unit) {
      battleDemo.game = TGC_BATTLE.playEquipment(battleDemo.game, activePlayerId, battleDemo.selectedHandIndex, { unitId: unit.id });
      battleDemo.selectedHandIndex = -1;
      renderBattleDemo();
      return;
    }

    if (battleDemo.selectedHandIndex >= 0 && !unit) {
      battleDemo.game = TGC_BATTLE.summonGenju(battleDemo.game, activePlayerId, battleDemo.selectedHandIndex, position);
      battleDemo.selectedHandIndex = -1;
      renderBattleDemo();
      return;
    }

    if (unit && unit.ownerId === activePlayerId) {
      battleDemo.selectedUnitId = unit.id;
      battleDemo.selectedHandIndex = -1;
      renderBattleDemo();
      return;
    }

    if (battleDemo.selectedUnitId) {
      const selectedUnit = battleDemo.game.units.find((candidate) => candidate.id === battleDemo.selectedUnitId);
      if (!selectedUnit) return;
      if (unit && unit.ownerId !== activePlayerId) {
        battleDemo.game = TGC_BATTLE.attackUnit(battleDemo.game, selectedUnit.id, unit.id);
      } else if (TGC_RULES.isHeadquarters(TGC_BATTLE.opponentOf(activePlayerId), position)) {
        battleDemo.game = TGC_BATTLE.attackHeadquarters(battleDemo.game, selectedUnit.id, position);
      } else {
        battleDemo.game = TGC_BATTLE.moveUnit(battleDemo.game, selectedUnit.id, position);
      }
      renderBattleDemo();
    }
  } catch (error) {
    battleDemo.game.log.push(error.message);
    renderBattleDemo();
  }
}

function renderBattleDemo() {
  renderBattleStatus();
  renderBattleBoard();
  renderBattleHand();
  renderBattleLog();
}

function renderBattleStatus() {
  const game = battleDemo.game;
  const activeLabel = game.activePlayerId === "first" ? "先手" : "後手";
  battleElements.status.innerHTML = `
    <span>手番: ${activeLabel}</span>
    <span>先手 Life ${game.players.first.life}</span>
    <span>後手 Life ${game.players.second.life}</span>
    <span>Mana ${game.players[game.activePlayerId].mana}/${game.players[game.activePlayerId].maxMana}</span>
  `;
}

function renderBattleBoard() {
  battleElements.board.innerHTML = "";
  const selectedUnit = battleDemo.game.units.find((candidate) => candidate.id === battleDemo.selectedUnitId);
  const reachableCells = getReachableCells(selectedUnit);
  for (let row = 0; row < TGC_RULES.BOARD_SIZE; row += 1) {
    for (let col = 0; col < TGC_RULES.BOARD_SIZE; col += 1) {
      const position = { row, col };
      const unit = getUnitAt(position);
      const reachableKind = reachableCells.get(positionKey(position));
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = [
        "battle-cell",
        (row + col) % 2 === 0 ? "is-light" : "is-dark",
        TGC_RULES.isHeadquarters("first", position) ? "is-first-hq" : "",
        TGC_RULES.isHeadquarters("second", position) ? "is-second-hq" : "",
        unit ? "has-unit" : "",
        unit?.ownerId === "first" ? "has-first-unit" : "",
        unit?.ownerId === "second" ? "has-second-unit" : "",
        unit?.id === battleDemo.selectedUnitId ? "is-selected" : "",
        reachableKind ? `is-${reachableKind}` : ""
      ].filter(Boolean).join(" ");
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.innerHTML = unit ? createBattlePieceMarkup(unit) : "";
      battleElements.board.appendChild(cell);
    }
  }
}

function createBattlePieceMarkup(unit) {
  const card = getUnitCard(unit);
  const focus = FACE_FOCUS[card.id] || "50% 34%";
  const health = Math.max(0, unit.health - unit.damage);
  const ownerClass = unit.ownerId === "first" ? "is-first" : "is-second";
  const image = card.image
    ? `<img src="${escapeHtml(card.image)}" alt="" style="object-position: ${escapeHtml(focus)};">`
    : `<span class="battle-piece-fallback">${escapeHtml(card.visual?.icon || "◆")}</span>`;
  return `
    <span class="battle-piece ${ownerClass}">
      <span class="battle-piece-portrait">${image}</span>
      <span class="battle-piece-name">${escapeHtml(unit.name)}</span>
      <span class="battle-piece-stats">${unit.attack}/${health}</span>
    </span>
  `;
}

function renderBattleHand() {
  const player = battleDemo.game.players[battleDemo.game.activePlayerId];
  battleElements.hand.innerHTML = "";
  const center = (player.hand.length - 1) / 2;
  player.hand.forEach((card, index) => {
    const offset = index - center;
    const distance = Math.abs(offset);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `battle-hand-card ${index === battleDemo.selectedHandIndex ? "is-selected" : ""}`;
    button.dataset.handIndex = String(index);
    button.style.setProperty("--hand-index", String(index));
    button.style.setProperty("--hand-offset", String(offset));
    button.style.setProperty("--hand-tilt", `${offset * 7}deg`);
    button.style.setProperty("--hand-y", `${distance * 9}px`);
    button.style.setProperty("--hand-scale", String(Math.max(0.9, 1.06 - distance * 0.045)));
    button.style.zIndex = String(20 - Math.round(distance * 2));
    button.innerHTML = `
      <span class="battle-hand-cost">${escapeHtml(String(card.cost))}</span>
      <span class="battle-hand-art">
        ${card.image ? `<img src="${escapeHtml(card.image)}" alt="">` : `<span>${escapeHtml(card.visual?.icon || "◆")}</span>`}
      </span>
      <strong>${escapeHtml(card.name)}</strong>
      <span class="battle-hand-type">${escapeHtml(card.typeLabel)}</span>
    `;
    battleElements.hand.appendChild(button);
  });
}

function renderBattleLog() {
  battleElements.log.innerHTML = battleDemo.game.log.slice(-6).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
}
