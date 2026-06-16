const STORAGE_KEY = "tgc_player_collection_v1";
const BATTLE_BOARD_SIZE = 6;
const FACE_FOCUS = {
  koran: "50% 34%",
  korantan: "50% 30%",
  korangarth: "50% 28%",
  light_aura: "50% 36%",
  dragon_aura: "50% 32%",
  dark_aura: "50% 34%",
  flame_aura: "50% 34%",
  moon_crystal: "50% 38%"
};

const state = {
  owned: {},
  selectedCardId: "koran",
  filter: "all",
  lastPackResult: null,
  recentlyAcquiredId: "",
  view: "menu",
  battle: createInitialBattleState()
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  loadCollection();
  ensureSelectedCard();
  bindEvents();
  render();
});

function bindElements() {
  elements.cardGrid = document.getElementById("cardGrid");
  elements.collectionRate = document.getElementById("collectionRate");
  elements.visibleCount = document.getElementById("visibleCount");
  elements.filterList = document.getElementById("filterList");
  elements.openPackButton = document.getElementById("openPackButton");
  elements.resetButton = document.getElementById("resetButton");
  elements.packModal = document.getElementById("packModal");
  elements.packStage = document.getElementById("packStage");
  elements.openAnotherButton = document.getElementById("openAnotherButton");
  elements.closeModalButton = document.getElementById("closeModalButton");
  elements.cardViewerModal = document.getElementById("cardViewerModal");
  elements.cardViewerStage = document.getElementById("cardViewerStage");
  elements.closeViewerButton = document.getElementById("closeViewerButton");
  elements.mainMenu = document.getElementById("mainMenu");
  elements.menuBattleButton = document.getElementById("menuBattleButton");
  elements.menuCollectionButton = document.getElementById("menuCollectionButton");
  elements.menuPackButton = document.getElementById("menuPackButton");
  elements.appShell = document.querySelector(".app-shell");
  elements.battleScene = document.getElementById("battleScene");
  elements.backToMenuFromCollectionButton = document.getElementById("backToMenuFromCollectionButton");
  elements.backToCollectionButton = document.getElementById("backToCollectionButton");
  elements.backToMenuFromBattleButton = document.getElementById("backToMenuFromBattleButton");
  elements.endBattleTurnButton = document.getElementById("endBattleTurnButton");
  elements.battleBoard = document.getElementById("battleBoard");
  elements.battleHand = document.getElementById("battleHand");
  elements.battleTurnLabel = document.getElementById("battleTurnLabel");
  elements.battleManaLabel = document.getElementById("battleManaLabel");
  elements.battleLifeLabel = document.getElementById("battleLifeLabel");
  elements.enemyLifeLabel = document.getElementById("enemyLifeLabel");
  elements.playerLifeLabel = document.getElementById("playerLifeLabel");
}

function bindEvents() {
  elements.filterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    syncSelectedCardToFilter();
    render();
  });

  elements.cardGrid.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-card-id]");
    if (!cardButton) return;
    state.selectedCardId = cardButton.dataset.cardId;
    render();
    openCardViewer(state.selectedCardId);
  });

  elements.openPackButton.addEventListener("click", openPack);
  elements.openAnotherButton.addEventListener("click", openPack);
  elements.closeModalButton.addEventListener("click", closePackModal);
  elements.packModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) closePackModal();
  });
  elements.closeViewerButton.addEventListener("click", closeCardViewer);
  elements.cardViewerModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-viewer]")) closeCardViewer();
  });
  elements.resetButton.addEventListener("click", resetCollection);
  elements.menuBattleButton.addEventListener("click", startBattle);
  elements.menuCollectionButton.addEventListener("click", showCollectionScene);
  elements.menuPackButton.addEventListener("click", openPack);
  elements.backToMenuFromCollectionButton.addEventListener("click", showMainMenu);
  elements.backToCollectionButton.addEventListener("click", showCollectionScene);
  elements.backToMenuFromBattleButton.addEventListener("click", showMainMenu);
  elements.endBattleTurnButton.addEventListener("click", endBattleTurn);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.packModal.classList.contains("is-open")) {
      closePackModal();
    }
    if (event.key === "Escape" && elements.cardViewerModal.classList.contains("is-open")) {
      closeCardViewer();
    }
    if (event.key === "Escape" && state.view !== "menu") {
      showMainMenu();
    }
  });
}

function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.owned && typeof saved.owned === "object") {
      state.owned = saved.owned;
      return;
    }
  } catch (error) {
    console.warn("TGC collection data could not be loaded.", error);
  }

  state.owned = {
    koran: 1,
    light_aura: 1
  };
  saveCollection();
}

function saveCollection() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      owned: state.owned
    })
  );
}

function resetCollection() {
  const confirmed = window.confirm("所持カードを初期状態に戻しますか？");
  if (!confirmed) return;

  state.owned = {
    koran: 1,
    light_aura: 1
  };
  state.selectedCardId = "koran";
  state.lastPackResult = null;
  state.recentlyAcquiredId = "";
  saveCollection();
  render();
}

function ensureSelectedCard() {
  if (!getCardById(state.selectedCardId)) {
    state.selectedCardId = TGC_CARDS[0]?.id || "";
  }
}

function render() {
  syncSelectedCardToFilter();
  renderView();
  renderCollectionRate();
  renderFilters();
  renderCardGrid();
  renderBattle();
}

function renderView() {
  const isMenu = state.view === "menu";
  const isCollection = state.view === "collection";
  const isBattle = state.view === "battle";
  elements.mainMenu.hidden = !isMenu;
  elements.appShell.hidden = !isCollection;
  elements.battleScene.classList.toggle("is-open", isBattle);
  elements.battleScene.setAttribute("aria-hidden", String(!isBattle));
}

function renderCollectionRate() {
  const ownedUnique = TGC_CARDS.filter((card) => isOwned(card.id)).length;
  elements.collectionRate.innerHTML = `
    <span class="rate-label">所持率</span>
    <strong>${ownedUnique} / ${TGC_CARDS.length}</strong>
  `;
}

function renderFilters() {
  elements.filterList.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function renderCardGrid() {
  const visibleCards = getVisibleCards();
  elements.visibleCount.textContent = `${visibleCards.length}枚表示`;
  elements.cardGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  visibleCards.forEach((card) => {
    fragment.appendChild(createCardElement(card, {
      selected: card.id === state.selectedCardId,
      recent: isRecentCard(card.id),
      compact: false
    }));
  });

  elements.cardGrid.appendChild(fragment);
}

function getVisibleCards() {
  if (state.filter === "all") return TGC_CARDS;
  return TGC_CARDS.filter((card) => card.type === state.filter);
}

function syncSelectedCardToFilter() {
  const visibleCards = getVisibleCards();
  if (!visibleCards.length) return;
  const selectedIsVisible = visibleCards.some((card) => card.id === state.selectedCardId);
  if (!selectedIsVisible) {
    state.selectedCardId = visibleCards[0].id;
  }
}

function createCardElement(card, options) {
  const ownedCount = getOwnedCount(card.id);
  const isCardOwned = ownedCount > 0;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.cardId = card.id;
  button.className = [
    "tgc-card",
    `rarity-${card.rarity}`,
    `tone-${card.visual?.tone || "neutral"}`,
    isCardOwned ? "is-owned" : "is-locked",
    options.selected ? "is-selected" : "",
    options.recent ? "is-recent" : "",
    options.compact ? "is-compact" : "",
    options.large ? "is-large" : ""
  ].filter(Boolean).join(" ");
  button.setAttribute("aria-label", `${card.name}の詳細を見る`);

  const statsMarkup = !isCardOwned
    ? `<span class="card-stat muted">未解析</span>`
    : card.attack === null || card.health === null
    ? `<span class="card-stat muted">魔法</span>`
    : `<span class="card-stat attack">${escapeHtml(String(card.attack))}</span><span class="card-stat health">${escapeHtml(String(card.health))}</span>`;
  const rulesText = isCardOwned ? formatRulesText(card.description) : "未入手。召喚で解放。";
  const ownedBadge = isCardOwned ? `x${ownedCount}` : "未所持";
  const recentCount = state.lastPackResult?.results?.filter((result) => result.cardId === card.id).length || 0;
  const recentWasDuplicate = state.lastPackResult?.results?.some((result) => result.cardId === card.id && result.duplicate);
  const recentLabel = options.recentLabel || (recentWasDuplicate ? `+${recentCount}` : "NEW");
  const recentBadge = options.recent ? `<span class="recent-badge">${recentLabel}</span>` : "";

  button.innerHTML = `
    <span class="card-cost">${escapeHtml(String(card.cost))}</span>
    ${recentBadge}
    <span class="card-frame">
      <span class="card-name">${escapeHtml(card.name)}</span>
      <span class="card-art">
        <span class="fallback-art">
          <span class="art-glow"></span>
          <span class="art-icon">${escapeHtml(card.visual?.icon || "✦")}</span>
          <span class="art-title">${escapeHtml(card.visual?.title || card.typeLabel)}</span>
        </span>
      </span>
      <span class="type-ribbon">${escapeHtml(card.typeLabel)}</span>
      <span class="card-text"><span class="rules-copy">${rulesText}</span></span>
      <span class="card-footer">
        ${statsMarkup}
      </span>
      <span class="owned-badge">${ownedBadge}</span>
    </span>
  `;

  attachCardImage(button, card);
  return button;
}

function attachCardImage(cardElement, card) {
  if (!card.image) return;

  const art = cardElement.querySelector(".card-art");
  const img = document.createElement("img");
  img.className = "card-image";
  img.alt = card.name;
  img.src = card.image;
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => {
    img.remove();
  }, { once: true });
  art.prepend(img);
}

function createInitialBattleState() {
  return {
    turn: 1,
    activePlayer: "後手",
    playerLife: 20,
    enemyLife: 20,
    mana: 2,
    maxMana: 2,
    hand: ["koran", "light_aura", "korantan", "moon_crystal", "flame_aura"],
    pieces: [
      { id: "enemy-korangarth", cardId: "korangarth", owner: "enemy", row: 0, col: 2, attack: 6, health: 6 },
      { id: "enemy-dark-aura", cardId: "dark_aura", owner: "enemy", row: 0, col: 3, attack: 3, health: 2 },
      { id: "enemy-dragon-aura", cardId: "dragon_aura", owner: "enemy", row: 1, col: 4, attack: 2, health: 4 },
      { id: "player-koran", cardId: "koran", owner: "player", row: 5, col: 2, attack: 1, health: 2 },
      { id: "player-korantan", cardId: "korantan", owner: "player", row: 5, col: 3, attack: 3, health: 3 },
      { id: "player-light-aura", cardId: "light_aura", owner: "player", row: 4, col: 1, attack: 2, health: 2 }
    ]
  };
}

function startBattle() {
  state.battle = createInitialBattleState();
  showBattleScene();
}

function showMainMenu() {
  state.view = "menu";
  render();
}

function showBattleScene() {
  state.view = "battle";
  render();
}

function showCollectionScene() {
  state.view = "collection";
  render();
}

function endBattleTurn() {
  const battle = state.battle;
  battle.turn += 1;
  battle.activePlayer = battle.activePlayer === "後手" ? "先手" : "後手";
  battle.maxMana = Math.min(10, battle.maxMana + 1);
  battle.mana = battle.maxMana;
  renderBattle();
}

function renderBattle() {
  if (!elements.battleBoard || !elements.battleHand) return;
  renderBattleHud();
  renderBattleBoard();
  renderBattleHand();
}

function renderBattleHud() {
  const battle = state.battle;
  elements.battleTurnLabel.textContent = `${battle.activePlayer} Turn ${battle.turn}`;
  elements.battleManaLabel.textContent = `Mana ${battle.mana}/${battle.maxMana}`;
  elements.battleLifeLabel.textContent = `Life ${battle.playerLife} - ${battle.enemyLife}`;
  elements.playerLifeLabel.textContent = String(battle.playerLife);
  elements.enemyLifeLabel.textContent = String(battle.enemyLife);
}

function renderBattleBoard() {
  elements.battleBoard.innerHTML = "";
  elements.battleBoard.style.setProperty("--board-size", String(BATTLE_BOARD_SIZE));

  const pieceMap = new Map(state.battle.pieces.map((piece) => [`${piece.row}-${piece.col}`, piece]));
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < BATTLE_BOARD_SIZE; row += 1) {
    for (let col = 0; col < BATTLE_BOARD_SIZE; col += 1) {
      const cell = document.createElement("div");
      cell.className = `battle-cell ${(row + col) % 2 === 0 ? "is-light" : "is-dark"}`;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      const piece = pieceMap.get(`${row}-${col}`);
      if (piece) {
        cell.appendChild(createPieceElement(piece));
      }
      fragment.appendChild(cell);
    }
  }
  elements.battleBoard.appendChild(fragment);
}

function createPieceElement(piece) {
  const card = getCardById(piece.cardId);
  const el = document.createElement("button");
  el.type = "button";
  el.className = `battle-piece is-${piece.owner}`;
  el.setAttribute("aria-label", card ? `${card.name} ${piece.attack}/${piece.health}` : "battle piece");

  const portrait = document.createElement("span");
  portrait.className = "battle-piece-portrait";
  if (card?.image) {
    const img = document.createElement("img");
    img.src = card.image;
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.style.objectPosition = FACE_FOCUS[card.id] || "50% 34%";
    portrait.appendChild(img);
  } else {
    portrait.textContent = card?.visual?.icon || "T";
  }

  const stats = document.createElement("span");
  stats.className = "battle-piece-stats";
  stats.textContent = `${piece.attack}/${piece.health}`;

  el.append(portrait, stats);
  return el;
}

function renderBattleHand() {
  elements.battleHand.innerHTML = "";
  const handCards = state.battle.hand.map(getCardById).filter(Boolean);
  elements.battleHand.style.setProperty("--hand-count", String(handCards.length));
  const fragment = document.createDocumentFragment();
  handCards.forEach((card, index) => {
    const cardEl = createBattleHandCard(card, index, handCards.length);
    fragment.appendChild(cardEl);
  });
  elements.battleHand.appendChild(fragment);
}

function createBattleHandCard(card, index, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `battle-hand-card rarity-${card.rarity}`;
  button.dataset.cardId = card.id;
  button.style.setProperty("--hand-index", String(index));
  button.style.setProperty("--hand-offset", String(index - (count - 1) / 2));
  button.style.setProperty("--hand-tilt", `${(index - (count - 1) / 2) * 7}deg`);
  button.setAttribute("aria-label", `${card.name}を選択`);

  button.innerHTML = `
    <span class="hand-card-cost">${escapeHtml(String(card.cost))}</span>
    <span class="hand-card-art"></span>
    <span class="hand-card-name">${escapeHtml(card.name)}</span>
    <span class="hand-card-type">${escapeHtml(card.typeLabel)}</span>
    <span class="hand-card-stats">${card.attack === null || card.health === null ? "Spell" : `${escapeHtml(String(card.attack))}/${escapeHtml(String(card.health))}`}</span>
  `;

  const art = button.querySelector(".hand-card-art");
  if (card.image) {
    const img = document.createElement("img");
    img.src = card.image;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.objectPosition = FACE_FOCUS[card.id] || "50% 35%";
    art.appendChild(img);
  }

  return button;
}

function openPack() {
  elements.packModal.classList.add("is-open");
  elements.packModal.setAttribute("aria-hidden", "false");
  elements.openAnotherButton.disabled = true;
  elements.packStage.innerHTML = `
    <div class="sealed-pack is-opening">
      <div class="pack-sigil">TGC</div>
      <p>魔力を込めています...</p>
    </div>
  `;

  window.setTimeout(() => {
    const results = drawPack(5);
    results.forEach((result) => {
      state.owned[result.card.id] = getOwnedCount(result.card.id) + 1;
    });
    const focusResult = results.find((result) => !result.duplicate) || results[0];
    state.filter = "all";
    state.selectedCardId = focusResult.card.id;
    state.recentlyAcquiredId = focusResult.card.id;
    state.lastPackResult = {
      cardId: focusResult.card.id,
      duplicate: focusResult.duplicate,
      results: results.map((result) => ({
        cardId: result.card.id,
        duplicate: result.duplicate
      }))
    };
    saveCollection();
    render();
    renderPackResult(results);
    elements.openAnotherButton.disabled = false;
  }, 850);
}

function renderPackResult(results) {
  elements.packStage.innerHTML = "";
  const newCount = results.filter((result) => !result.duplicate).length;
  const result = document.createElement("div");
  result.className = `pack-result pack-result-five ${newCount > 0 ? "is-new" : "is-duplicate"}`;

  const cardWrap = document.createElement("div");
  cardWrap.className = "pack-card-row";
  results.forEach((packResult, index) => {
    const item = document.createElement("div");
    item.className = "revealed-card pack-card-item";
    item.style.setProperty("--reveal-index", String(index));
    item.appendChild(createCardElement(packResult.card, {
      selected: packResult.card.id === state.selectedCardId,
      recent: true,
      recentLabel: packResult.duplicate ? "+1" : "NEW",
      compact: true
    }));
    cardWrap.appendChild(item);
  });

  const message = document.createElement("div");
  message.className = "pack-message";
  message.innerHTML = `
    <p class="result-kicker">${newCount > 0 ? "New Summons" : "Duplicates"}</p>
    <h3>5枚召喚</h3>
    <p>${newCount > 0 ? `新規カード ${newCount} 枚を図鑑に登録しました。` : "すべて重複カードとして所持枚数が増えました。"}</p>
  `;

  result.append(cardWrap, message);
  elements.packStage.appendChild(result);
}

function closePackModal() {
  elements.packModal.classList.remove("is-open");
  elements.packModal.setAttribute("aria-hidden", "true");
  scrollSelectedCardIntoView();
}

function openCardViewer(cardId) {
  const card = getCardById(cardId);
  if (!card) return;

  elements.cardViewerStage.innerHTML = "";
  const viewerCard = createCardElement(card, {
    selected: false,
    recent: isRecentCard(card.id),
    compact: true,
    large: true
  });
  const viewerDetails = document.createElement("div");
  viewerDetails.innerHTML = getViewerDetailsMarkup(card, isOwned(card.id));
  elements.cardViewerStage.append(viewerCard, viewerDetails.firstElementChild);
  elements.cardViewerModal.classList.add("is-open");
  elements.cardViewerModal.setAttribute("aria-hidden", "false");
}

function closeCardViewer() {
  elements.cardViewerModal.classList.remove("is-open");
  elements.cardViewerModal.setAttribute("aria-hidden", "true");
}

function drawRandomCard() {
  const rarityWeights = {
    common: 48,
    uncommon: 34,
    rare: 14,
    epic: 3,
    legendary: 1
  };

  const weightedPool = TGC_CARDS.flatMap((card) => {
    const weight = rarityWeights[card.rarity] || 10;
    return Array.from({ length: weight }, () => card);
  });

  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

function drawPack(count) {
  const temporaryOwned = { ...state.owned };
  return Array.from({ length: count }, () => {
    const card = drawRandomCard();
    const duplicate = Number(temporaryOwned[card.id] || 0) > 0;
    temporaryOwned[card.id] = Number(temporaryOwned[card.id] || 0) + 1;
    return {
      card,
      duplicate
    };
  });
}

function getCardById(id) {
  return TGC_CARDS.find((card) => card.id === id);
}

function isOwned(id) {
  return getOwnedCount(id) > 0;
}

function getOwnedCount(id) {
  return Number(state.owned[id] || 0);
}

function getRarityLabel(rarity) {
  const labels = {
    common: "コモン",
    uncommon: "アンコモン",
    rare: "レア",
    epic: "エピック",
    legendary: "レジェンダリー"
  };
  return labels[rarity] || rarity;
}

function scrollSelectedCardIntoView() {
  window.requestAnimationFrame(() => {
    const selectedCard = elements.cardGrid.querySelector(".tgc-card.is-selected");
    if (!selectedCard) return;
    selectedCard.scrollIntoView({
      behavior: "smooth",
      block: window.innerWidth <= 760 ? "center" : "nearest",
      inline: "nearest"
    });
  });
}

function isRecentCard(cardId) {
  return state.lastPackResult?.results?.some((result) => result.cardId === cardId) || state.recentlyAcquiredId === cardId;
}

function getViewerDetailsMarkup(card, isCardOwned) {
  const rulesText = isCardOwned ? formatRulesText(card.description) : "未入手。召喚で解放。";
  const flavorText = isCardOwned ? escapeHtml(card.flavor || "記録なし。") : "まだ観察記録はありません。";
  const statLabel = card.attack === null || card.health === null
    ? "魔法"
    : `${escapeHtml(String(card.attack))} / ${escapeHtml(String(card.health))}`;

  return `
    <section class="viewer-details" aria-label="${escapeHtml(card.name)}の説明">
      <div class="viewer-detail-meta">
        <span>${escapeHtml(card.typeLabel)}</span>
        <span>${escapeHtml(getRarityLabel(card.rarity))}</span>
        <span>コスト ${escapeHtml(String(card.cost))}</span>
      </div>
      <dl class="viewer-detail-list">
        <div>
          <dt>${card.attack === null || card.health === null ? "分類" : "攻撃 / 体力"}</dt>
          <dd>${statLabel}</dd>
        </div>
      </dl>
      <div class="viewer-rules">
        <h3>能力</h3>
        <p>${rulesText}</p>
      </div>
      <blockquote>
        <strong>フレーバー</strong>
        <span>${flavorText}</span>
      </blockquote>
    </section>
  `;
}

function formatRulesText(value) {
  const keywords = ["飛行", "トランプル", "二段攻撃"];
  let text = escapeHtml(value);
  keywords.forEach((keyword) => {
    text = text.replaceAll(keyword, `<span class="keyword">${keyword}</span>`);
  });
  return text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
