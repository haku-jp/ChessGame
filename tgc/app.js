const STORAGE_KEY = "tgc_player_collection_v1";

const state = {
  owned: {},
  selectedCardId: "koran",
  filter: "all",
  activeView: "home",
  featuredIndex: 0,
  lastPackResult: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  loadCollection();
  syncViewFromHash();
  ensureSelectedCard();
  bindEvents();
  render();
});

function bindElements() {
  elements.gameApp = document.querySelector(".game-app");
  elements.navButtons = document.querySelectorAll("[data-view-target]");
  elements.views = document.querySelectorAll(".game-view");
  elements.homeCarousel = document.getElementById("homeCarousel");
  elements.featuredMeta = document.getElementById("featuredMeta");
  elements.prevCardButton = document.getElementById("prevCardButton");
  elements.nextCardButton = document.getElementById("nextCardButton");
  elements.cardGrid = document.getElementById("cardGrid");
  elements.detailPanel = document.getElementById("detailPanel");
  elements.cardDetailModal = document.getElementById("cardDetailModal");
  elements.collectionRate = document.getElementById("collectionRate");
  elements.visibleCount = document.getElementById("visibleCount");
  elements.filterPanel = document.getElementById("filterPanel");
  elements.filterList = document.getElementById("filterList");
  elements.filterToggleButton = document.getElementById("filterToggleButton");
  elements.homeSummonButton = document.getElementById("homeSummonButton");
  elements.summonViewButton = document.getElementById("summonViewButton");
  elements.resetButton = document.getElementById("resetButton");
  elements.packModal = document.getElementById("packModal");
  elements.packStage = document.getElementById("packStage");
  elements.openAnotherButton = document.getElementById("openAnotherButton");
  elements.closeModalButton = document.getElementById("closeModalButton");
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.viewTarget));
  });

  elements.filterToggleButton.addEventListener("click", () => {
    const isOpen = elements.filterPanel.classList.toggle("is-open");
    elements.filterToggleButton.setAttribute("aria-expanded", String(isOpen));
  });

  elements.filterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    elements.filterPanel.classList.remove("is-open");
    elements.filterToggleButton.setAttribute("aria-expanded", "false");
    render();
  });

  elements.cardGrid.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-card-id]");
    if (!cardButton) return;
    state.selectedCardId = cardButton.dataset.cardId;
    render();
    openCardDetail(state.selectedCardId);
  });

  elements.homeCarousel.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-card-id]");
    if (!cardButton) return;
    state.selectedCardId = cardButton.dataset.cardId;
    openCardDetail(state.selectedCardId);
  });

  elements.prevCardButton.addEventListener("click", () => moveFeaturedCard(-1));
  elements.nextCardButton.addEventListener("click", () => moveFeaturedCard(1));
  elements.homeSummonButton.addEventListener("click", openPack);
  elements.summonViewButton.addEventListener("click", openPack);
  elements.openAnotherButton.addEventListener("click", openPack);
  elements.closeModalButton.addEventListener("click", closePackModal);
  elements.packModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) closePackModal();
  });
  elements.cardDetailModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-detail]")) closeCardDetail();
  });
  elements.resetButton.addEventListener("click", resetCollection);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (elements.cardDetailModal.classList.contains("is-open")) closeCardDetail();
    if (elements.packModal.classList.contains("is-open")) closePackModal();
  });

  window.addEventListener("hashchange", () => {
    syncViewFromHash();
    render();
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ owned: state.owned }));
}

function resetCollection() {
  const confirmed = window.confirm("所持カードを初期状態に戻しますか？");
  if (!confirmed) return;

  state.owned = {
    koran: 1,
    light_aura: 1
  };
  state.selectedCardId = "koran";
  state.featuredIndex = 0;
  state.lastPackResult = null;
  saveCollection();
  render();
}

function ensureSelectedCard() {
  if (!getCardById(state.selectedCardId)) {
    state.selectedCardId = TGC_CARDS[0]?.id || "";
  }
}

function render() {
  renderNavigation();
  renderCollectionRate();
  renderFilters();
  renderHomeCarousel();
  renderCardGrid();
}

function renderNavigation() {
  elements.views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === state.activeView);
  });
  elements.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === state.activeView);
  });
}

function setActiveView(viewName) {
  if (state.activeView === viewName) return;
  state.activeView = viewName;
  if (location.hash !== `#${viewName}`) {
    history.replaceState(null, "", `#${viewName}`);
  }
  elements.gameApp.classList.add("is-transitioning");
  window.setTimeout(() => elements.gameApp.classList.remove("is-transitioning"), 320);
  render();
}

function syncViewFromHash() {
  const viewName = location.hash.replace("#", "");
  const validViews = ["home", "summon", "squad", "codex", "shop"];
  if (validViews.includes(viewName)) {
    state.activeView = viewName;
  }
}

function renderCollectionRate() {
  const ownedUnique = TGC_CARDS.filter((card) => isOwned(card.id)).length;
  elements.collectionRate.textContent = `${ownedUnique} / ${TGC_CARDS.length}`;
}

function renderFilters() {
  elements.filterList.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function renderHomeCarousel() {
  const cards = getOwnedCards();
  if (!cards.length) {
    elements.homeCarousel.innerHTML = "";
    elements.featuredMeta.textContent = "0 / 0";
    return;
  }

  state.featuredIndex = wrapIndex(state.featuredIndex, cards.length);
  const slots = [
    { className: "prev", index: wrapIndex(state.featuredIndex - 1, cards.length) },
    { className: "active", index: state.featuredIndex },
    { className: "next", index: wrapIndex(state.featuredIndex + 1, cards.length) }
  ];

  elements.homeCarousel.innerHTML = "";
  const fragment = document.createDocumentFragment();
  slots.forEach((slot) => {
    const card = cards[slot.index];
    const holder = document.createElement("div");
    holder.className = `carousel-card ${slot.className}`;
    holder.appendChild(createCardElement(card, {
      selected: card.id === state.selectedCardId,
      compact: false,
      showcase: slot.className === "active"
    }));
    fragment.appendChild(holder);
  });
  elements.homeCarousel.appendChild(fragment);
  elements.featuredMeta.textContent = `${state.featuredIndex + 1} / ${cards.length}`;
  state.selectedCardId = cards[state.featuredIndex]?.id || state.selectedCardId;
}

function renderCardGrid() {
  const visibleCards = getVisibleCards();
  elements.visibleCount.textContent = `${visibleCards.length}枚表示`;
  elements.cardGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  visibleCards.forEach((card) => {
    fragment.appendChild(createCardElement(card, {
      selected: card.id === state.selectedCardId,
      compact: false,
      showcase: false
    }));
  });
  elements.cardGrid.appendChild(fragment);
}

function openCardDetail(cardId) {
  const card = getCardById(cardId);
  if (!card) return;

  const ownedCount = getOwnedCount(card.id);
  const evolutionName = card.evolutionTo ? getCardById(card.evolutionTo)?.name || card.evolutionTo : "なし";
  const stats = card.attack === null || card.health === null ? "魔法" : `${card.attack} / ${card.health}`;

  elements.detailPanel.innerHTML = `
    <button class="modal-close" type="button" data-close-detail aria-label="閉じる">×</button>
    <div class="detail-hero rarity-${escapeHtml(card.rarity)}" id="detailCardPreview"></div>
    <div class="detail-copy">
      <p class="kicker">${escapeHtml(card.typeLabel)} / ${escapeHtml(getRarityLabel(card.rarity))}</p>
      <h2 id="cardDetailTitle">${escapeHtml(card.name)}</h2>
      <p class="rarity-stars" aria-label="レアリティ">${getRarityStars(card.rarity)}</p>
      <p class="status-pill ${ownedCount > 0 ? "owned" : "locked"}">${ownedCount > 0 ? `所持 ${ownedCount}枚` : "未所持"}</p>
      <dl class="detail-list">
        <div><dt>コスト</dt><dd>${escapeHtml(String(card.cost))}</dd></div>
        <div><dt>攻撃 / 体力</dt><dd>${escapeHtml(stats)}</dd></div>
        <div><dt>進化先</dt><dd>${escapeHtml(evolutionName)}</dd></div>
      </dl>
      <div class="rules-box">
        <h3>能力</h3>
        <p>${escapeHtml(card.description)}</p>
      </div>
      <blockquote>${escapeHtml(card.flavor)}</blockquote>
    </div>
  `;

  elements.detailPanel.querySelector("#detailCardPreview").appendChild(createCardElement(card, {
    selected: false,
    compact: false,
    showcase: true
  }));
  elements.cardDetailModal.classList.add("is-open");
  elements.cardDetailModal.setAttribute("aria-hidden", "false");
}

function closeCardDetail() {
  elements.cardDetailModal.classList.remove("is-open");
  elements.cardDetailModal.setAttribute("aria-hidden", "true");
}

function moveFeaturedCard(direction) {
  const cards = getOwnedCards();
  if (!cards.length) return;
  state.featuredIndex = wrapIndex(state.featuredIndex + direction, cards.length);
  state.selectedCardId = cards[state.featuredIndex].id;
  renderHomeCarousel();
}

function getVisibleCards() {
  if (state.filter === "all") return TGC_CARDS;
  return TGC_CARDS.filter((card) => card.type === state.filter);
}

function getOwnedCards() {
  const ownedCards = TGC_CARDS.filter((card) => isOwned(card.id));
  return ownedCards.length ? ownedCards : TGC_CARDS.slice(0, 1);
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
    options.compact ? "is-compact" : "",
    options.showcase ? "is-showcase" : ""
  ].filter(Boolean).join(" ");
  button.setAttribute("aria-label", `${card.name}の詳細を見る`);

  const statsMarkup = card.attack === null || card.health === null
    ? `<span class="card-stat muted">${getTypeIcon(card.type)}</span>`
    : `<span class="card-stat attack">${escapeHtml(String(card.attack))}</span><span class="card-stat health">${escapeHtml(String(card.health))}</span>`;

  button.innerHTML = `
    <span class="card-cost">${escapeHtml(String(card.cost))}</span>
    <span class="card-frame">
      <span class="rarity-gems" aria-hidden="true">${getRarityStars(card.rarity)}</span>
      <span class="card-name">${escapeHtml(card.name)}</span>
      <span class="card-art">
        <span class="fallback-art">
          <span class="art-glow"></span>
          <span class="art-icon">${escapeHtml(card.visual?.icon || "✦")}</span>
          <span class="art-title">${escapeHtml(card.visual?.title || card.typeLabel)}</span>
        </span>
      </span>
      <span class="type-ribbon"><span aria-hidden="true">${getTypeIcon(card.type)}</span>${escapeHtml(card.typeLabel)}</span>
      <span class="card-text">${escapeHtml(card.description)}</span>
      <span class="card-footer">
        ${statsMarkup}
      </span>
      <span class="evolution-mark">EV ${card.evolutionTo ? "I" : "-"}</span>
      <span class="owned-badge">${isCardOwned ? `x${ownedCount}` : "未所持"}</span>
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
  img.addEventListener("error", () => {
    img.remove();
  }, { once: true });
  art.prepend(img);
}

function openPack() {
  elements.gameApp.classList.add("is-summoning");
  elements.packModal.classList.add("is-open");
  elements.packModal.setAttribute("aria-hidden", "false");
  elements.openAnotherButton.disabled = true;
  elements.packStage.innerHTML = `
    <div class="sealed-pack is-opening">
      <div class="pack-sigil">TGC</div>
      <p>召喚門を開いています...</p>
    </div>
  `;

  window.setTimeout(() => {
    const card = drawRandomCard();
    const duplicate = isOwned(card.id);
    state.owned[card.id] = getOwnedCount(card.id) + 1;
    state.selectedCardId = card.id;
    state.lastPackResult = { cardId: card.id, duplicate };
    state.featuredIndex = getOwnedCards().findIndex((ownedCard) => ownedCard.id === card.id);
    saveCollection();
    render();
    renderPackResult(card, duplicate);
    elements.openAnotherButton.disabled = false;
    window.setTimeout(() => elements.gameApp.classList.remove("is-summoning"), 360);
  }, 920);
}

function renderPackResult(card, duplicate) {
  elements.packStage.innerHTML = "";
  const result = document.createElement("div");
  result.className = `pack-result ${duplicate ? "is-duplicate" : "is-new"}`;

  const cardWrap = document.createElement("div");
  cardWrap.className = "revealed-card";
  cardWrap.appendChild(createCardElement(card, {
    selected: false,
    compact: false,
    showcase: true
  }));

  const message = document.createElement("div");
  message.className = "pack-message";
  message.innerHTML = `
    <p class="result-kicker">${duplicate ? "Duplicate" : "New Card"}</p>
    <h3>${escapeHtml(card.name)}</h3>
    <p>${duplicate ? "重複カードとして魔導書へ刻まれました。" : "新たな幻獣が召喚されました。"}</p>
  `;

  result.append(cardWrap, message);
  elements.packStage.appendChild(result);
}

function closePackModal() {
  elements.packModal.classList.remove("is-open");
  elements.packModal.setAttribute("aria-hidden", "true");
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

function getCardById(id) {
  return TGC_CARDS.find((card) => card.id === id);
}

function isOwned(id) {
  return getOwnedCount(id) > 0;
}

function getOwnedCount(id) {
  return Number(state.owned[id] || 0);
}

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
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

function getRarityStars(rarity) {
  const counts = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5
  };
  return "★".repeat(counts[rarity] || 1);
}

function getTypeIcon(type) {
  const icons = {
    monster: "◆",
    aura: "◉",
    sorcery: "✦",
    item: "◇"
  };
  return icons[type] || "✦";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
