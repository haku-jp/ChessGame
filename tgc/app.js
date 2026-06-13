const STORAGE_KEY = "tgc_player_collection_v1";

const state = {
  owned: {},
  selectedCardId: "koran",
  filter: "all",
  lastPackResult: null
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
    render();
  });

  elements.cardGrid.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-card-id]");
    if (!cardButton) return;
    state.selectedCardId = cardButton.dataset.cardId;
    render();
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
  saveCollection();
  render();
}

function ensureSelectedCard() {
  if (!getCardById(state.selectedCardId)) {
    state.selectedCardId = TGC_CARDS[0]?.id || "";
  }
}

function render() {
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
  const evolutionName = card.evolutionTo ? getCardById(card.evolutionTo)?.name || card.evolutionTo : "なし";
  const stats = card.attack === null || card.health === null ? "なし" : `${card.attack} / ${card.health}`;

  elements.detailPanel.innerHTML = `
    <div class="detail-inner rarity-${escapeHtml(card.rarity)}">
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
          <h3>説明</h3>
          <p>${escapeHtml(card.description)}</p>
        </div>
        <blockquote>${escapeHtml(card.flavor)}</blockquote>
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
    options.compact ? "is-compact" : ""
  ].filter(Boolean).join(" ");
  button.setAttribute("aria-label", `${card.name}の詳細を見る`);

  const statsMarkup = card.attack === null || card.health === null
    ? `<span class="card-stat muted">魔法</span>`
    : `<span class="card-stat attack">${escapeHtml(String(card.attack))}</span><span class="card-stat health">${escapeHtml(String(card.health))}</span>`;

  button.innerHTML = `
    <span class="card-cost">${escapeHtml(String(card.cost))}</span>
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
      <span class="card-text">${escapeHtml(card.description)}</span>
      <span class="card-footer">
        ${statsMarkup}
      </span>
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
    state.selectedCardId = card.id;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
