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
  elements.detailPanel = document.getElementById("detailPanel");
  elements.collectionRate = document.getElementById("collectionRate");
  elements.visibleCount = document.getElementById("visibleCount");
  elements.filterList = document.getElementById("filterList");
  elements.openPackButton = document.getElementById("openPackButton");
  elements.resetButton = document.getElementById("resetButton");
  elements.packModal = document.getElementById("packModal");
  elements.packStage = document.getElementById("packStage");
  elements.openAnotherButton = document.getElementById("openAnotherButton");
  elements.closeModalButton = document.getElementById("closeModalButton");
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
    scrollDetailsOnMobile();
  });

  elements.openPackButton.addEventListener("click", openPack);
  elements.openAnotherButton.addEventListener("click", openPack);
  elements.closeModalButton.addEventListener("click", closePackModal);
  elements.packModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) closePackModal();
  });
  elements.resetButton.addEventListener("click", resetCollection);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.packModal.classList.contains("is-open")) {
      closePackModal();
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
  renderDetails();
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
      recent: card.id === state.recentlyAcquiredId,
      compact: false
    }));
  });

  elements.cardGrid.appendChild(fragment);
}

function renderDetails() {
  const card = getCardById(state.selectedCardId) || getVisibleCards()[0] || TGC_CARDS[0];
  if (!card) {
    elements.detailPanel.innerHTML = "<p>カードがありません。</p>";
    return;
  }

  const ownedCount = getOwnedCount(card.id);
  const isCardOwned = ownedCount > 0;
  const evolutionName = isCardOwned
    ? (card.evolutionTo ? getCardById(card.evolutionTo)?.name || card.evolutionTo : "なし")
    : "未解析";
  const stats = isCardOwned
    ? (card.attack === null || card.health === null ? "なし" : `${card.attack} / ${card.health}`)
    : "未解析";
  const description = isCardOwned
    ? formatRulesText(card.description)
    : "このカードはまだ図鑑に完全登録されていません。パックから入手すると効果と物語が解放されます。";
  const flavor = isCardOwned ? escapeHtml(card.flavor) : "未所持カードの記録は、召喚によって解き明かされる。";

  elements.detailPanel.innerHTML = `
    <div class="detail-inner rarity-${escapeHtml(card.rarity)} ${isCardOwned ? "is-owned-detail" : "is-locked-detail"}">
      <div class="detail-card-preview" id="detailCardPreview"></div>
      <div class="detail-copy">
        <div class="detail-title-row">
          <div>
            <p class="kicker">${escapeHtml(card.typeLabel)} / ${escapeHtml(getRarityLabel(card.rarity))}</p>
            <h2>${escapeHtml(card.name)}</h2>
          </div>
          <span class="cost-gem" aria-label="コスト">${escapeHtml(String(card.cost))}</span>
        </div>
        <p class="status-pill ${ownedCount > 0 ? "owned" : "locked"}">${ownedCount > 0 ? `所持 ${ownedCount}枚` : "未所持"}</p>
        <dl class="detail-list">
          <div><dt>種類</dt><dd>${escapeHtml(card.typeLabel)}</dd></div>
          <div><dt>レアリティ</dt><dd>${escapeHtml(getRarityLabel(card.rarity))}</dd></div>
          <div><dt>コスト</dt><dd>${escapeHtml(String(card.cost))}</dd></div>
          <div><dt>攻撃力 / 体力</dt><dd>${escapeHtml(stats)}</dd></div>
          <div><dt>進化先</dt><dd>${escapeHtml(evolutionName)}</dd></div>
          <div><dt>所持状態</dt><dd>${ownedCount > 0 ? "所持中" : "未所持"}</dd></div>
        </dl>
        <div class="rules-box">
          <h3>${isCardOwned ? "説明" : "未解析"}</h3>
          <p>${description}</p>
        </div>
        <blockquote>${flavor}</blockquote>
      </div>
    </div>
  `;

  elements.detailPanel.querySelector("#detailCardPreview").appendChild(createCardElement(card, {
    selected: false,
    compact: true
  }));
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
    options.compact ? "is-compact" : ""
  ].filter(Boolean).join(" ");
  button.setAttribute("aria-label", `${card.name}の詳細を見る`);

  const statsMarkup = !isCardOwned
    ? `<span class="card-stat muted">未解析</span>`
    : card.attack === null || card.health === null
    ? `<span class="card-stat muted">魔法</span>`
    : `<span class="card-stat attack">${escapeHtml(String(card.attack))}</span><span class="card-stat health">${escapeHtml(String(card.health))}</span>`;
  const rulesText = isCardOwned ? formatRulesText(card.description) : "未入手。召喚で解放。";
  const ownedBadge = isCardOwned ? `x${ownedCount}` : "未所持";
  const recentBadge = options.recent ? `<span class="recent-badge">${state.lastPackResult?.duplicate ? "+1" : "NEW"}</span>` : "";

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
      <span class="card-text">${rulesText}</span>
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
    const card = drawRandomCard();
    const duplicate = isOwned(card.id);
    state.owned[card.id] = getOwnedCount(card.id) + 1;
    state.filter = card.type;
    state.selectedCardId = card.id;
    state.recentlyAcquiredId = card.id;
    state.lastPackResult = {
      cardId: card.id,
      duplicate
    };
    saveCollection();
    render();
    renderPackResult(card, duplicate);
    elements.openAnotherButton.disabled = false;
  }, 850);
}

function renderPackResult(card, duplicate) {
  elements.packStage.innerHTML = "";
  const result = document.createElement("div");
  result.className = `pack-result ${duplicate ? "is-duplicate" : "is-new"}`;

  const cardWrap = document.createElement("div");
  cardWrap.className = "revealed-card";
  cardWrap.appendChild(createCardElement(card, {
    selected: false,
    compact: true
  }));

  const message = document.createElement("div");
  message.className = "pack-message";
  message.innerHTML = `
    <p class="result-kicker">${duplicate ? "Duplicate" : "New Card"}</p>
    <h3>${escapeHtml(card.name)}</h3>
    <p>${duplicate ? "重複カードとして所持枚数が増えました。" : "新しいカードを図鑑に登録しました。"}</p>
  `;

  result.append(cardWrap, message);
  elements.packStage.appendChild(result);
}

function closePackModal() {
  elements.packModal.classList.remove("is-open");
  elements.packModal.setAttribute("aria-hidden", "true");
  scrollSelectedCardIntoView();
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

function scrollDetailsOnMobile() {
  if (window.innerWidth > 760) return;
  window.requestAnimationFrame(() => {
    elements.detailPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
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
