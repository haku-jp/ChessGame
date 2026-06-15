const battleDemo = {
  game: null,
  selectedHandIndex: -1,
  selectedUnitId: "",
  selectedAction: "summon"
};

const battleElements = {};

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
    if (!card) throw new Error(`スターターカードが見つかりません: ${id}`);
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

function handleBoardClick(position) {
  try {
    const activePlayerId = battleDemo.game.activePlayerId;
    const unit = battleDemo.game.units.find((candidate) =>
      candidate.position.row === position.row && candidate.position.col === position.col
    );
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
  battleElements.status.innerHTML = `
    <span>手番: ${game.activePlayerId === "first" ? "先手" : "後手"}</span>
    <span>先手 Life ${game.players.first.life}</span>
    <span>後手 Life ${game.players.second.life}</span>
    <span>Mana ${game.players[game.activePlayerId].mana}/${game.players[game.activePlayerId].maxMana}</span>
  `;
}

function renderBattleBoard() {
  battleElements.board.innerHTML = "";
  for (let row = 0; row < TGC_RULES.BOARD_SIZE; row += 1) {
    for (let col = 0; col < TGC_RULES.BOARD_SIZE; col += 1) {
      const position = { row, col };
      const unit = battleDemo.game.units.find((candidate) => candidate.position.row === row && candidate.position.col === col);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = [
        "battle-cell",
        (row + col) % 2 === 0 ? "is-light" : "is-dark",
        TGC_RULES.isHeadquarters("first", position) ? "is-first-hq" : "",
        TGC_RULES.isHeadquarters("second", position) ? "is-second-hq" : "",
        unit ? "has-unit" : "",
        unit?.id === battleDemo.selectedUnitId ? "is-selected" : ""
      ].filter(Boolean).join(" ");
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.innerHTML = unit
        ? `<span class="unit-name">${escapeHtml(unit.name)}</span><span class="unit-stats">${unit.attack}/${unit.health - unit.damage}</span>`
        : "";
      battleElements.board.appendChild(cell);
    }
  }
}

function renderBattleHand() {
  const player = battleDemo.game.players[battleDemo.game.activePlayerId];
  battleElements.hand.innerHTML = "";
  player.hand.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `battle-hand-card ${index === battleDemo.selectedHandIndex ? "is-selected" : ""}`;
    button.dataset.handIndex = String(index);
    button.innerHTML = `<strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.typeLabel)} / ${escapeHtml(String(card.cost))}</span>`;
    battleElements.hand.appendChild(button);
  });
}

function renderBattleLog() {
  battleElements.log.innerHTML = battleDemo.game.log.slice(-8).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
}
