const STORAGE_KEY = "tgc_player_collection_v1";

const state = {
  owned: {},
  selectedCardId: "koran",
  filter: "all",
  lastPackResult: null,
  recentlyAcquiredId: ""
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.packModal.classList.contains("is-open")) {
      closePackModal();
    }
    if (event.key === "Escape" && elements.cardViewerModal.classList.contains("is-open")) {
      closeCardViewer();
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
  renderCollectionRate();
  renderFilters();
  renderCardGrid();
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
