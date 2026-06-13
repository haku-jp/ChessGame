import { pieceArtHTML } from "../pieces.js";

let el = null;

export function initOverlay(rootEl) {
  el = rootEl;
}

// rare 以上は登場時にフラッシュさせる ("ヤバい駒を拾った" 瞬間)
const FLASHY_RARITIES = new Set(["rare", "epic", "legendary"]);

export function showRewardScreen(candidates, onPick) {
  const cards = candidates.map((p, i) => {
    const flashy = FLASHY_RARITIES.has(p.rarity) ? " flashy" : "";
    return `
    <div class="reward-card${flashy}" data-idx="${i}" data-rarity="${p.rarity}" style="--reveal-delay:${40 + i * 90}ms">
      <span class="reward-rarity rarity-${p.rarity}">${p.rarity}</span>
      <div class="reward-icon piece-art">${pieceArtHTML(p)}</div>
      <span class="reward-role">${p.role}</span>
      <span class="reward-name">${p.name}</span>
      <span class="reward-desc">${p.desc ?? ""}</span>
      ${p.ability ? `<span class="reward-desc"><b>${p.ability.name}:</b> ${p.ability.desc}</span>` : ""}
    </div>`;
  }).join("");

  el.innerHTML = `
    <div class="overlay-panel reward-panel">
      <h2>勝利</h2>
      <p class="sub">部隊に加える駒を選ぶ</p>
      <div class="reward-grid">${cards}</div>
    </div>
  `;
  el.classList.remove("hidden");

  el.querySelectorAll(".reward-card").forEach((card) => {
    card.addEventListener("click", () => {
      const idx = Number(card.dataset.idx);
      hideOverlay();
      onPick(candidates[idx]);
    });
  });
}

// 単一ボタンのパネル共通形。タイトル + サブ + 任意の本文 + ボタン1つ。
// 報酬画面 (カードグリッド) は別物なので showRewardScreen のまま据え置く。
export function showPanel({ title, sub = "", body = "", buttonLabel, onClick }) {
  el.innerHTML = `
    <div class="overlay-panel">
      <h2>${title}</h2>
      ${sub ? `<p class="sub">${sub}</p>` : ""}
      ${body}
      <div style="text-align:center;">
        <button class="primary-btn" id="panelBtn">${buttonLabel}</button>
      </div>
    </div>
  `;
  el.classList.remove("hidden");
  el.querySelector("#panelBtn").addEventListener("click", () => {
    hideOverlay();
    onClick();
  });
}

export function showGameOver(reason, onRestart) {
  showPanel({
    title: "ラン終了",
    sub: reason,
    body: `<div class="big-msg defeat">DEFEAT</div>`,
    buttonLabel: "最初から",
    onClick: onRestart,
  });
}

export function showStageClear(stage, soulGain, onNext) {
  showPanel({
    title: `Stage ${stage} クリア`,
    sub: `魂 +${soulGain}`,
    buttonLabel: "報酬へ",
    onClick: onNext,
  });
}

// 部隊整備: ステージ間に Soul で wounds を回復する。
// getters (pieces / soul) を渡し、回復のたびに自分で再描画する。
export function showMaintenanceScreen({ pieces, soul, cost, onHeal, onContinue }) {
  function draw() {
    const wounded = pieces();
    const rows = wounded.map((p) => `
      <div class="maint-row">
        <span class="maint-icon piece-art">${pieceArtHTML(p)}</span>
        <span class="maint-name">${p.name}</span>
        <span class="maint-wounds">負傷 ${p.wounds}/${p.maxWounds}</span>
        <button class="maint-heal primary-btn" data-id="${p.id}" ${soul() < cost ? "disabled" : ""}>
          回復 🔥${cost}
        </button>
      </div>`).join("");

    el.innerHTML = `
      <div class="overlay-panel">
        <h2>部隊整備</h2>
        <p class="sub">Soul を消費して負傷を回復　(所持 🔥${soul()})</p>
        <div class="maint-list">${rows || '<p class="sub">負傷した駒はいません</p>'}</div>
        <div style="text-align:center; margin-top:8px;">
          <button class="primary-btn" id="maintContinue">次のステージへ</button>
        </div>
      </div>`;
    el.classList.remove("hidden");

    el.querySelectorAll(".maint-heal").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (onHeal(btn.dataset.id)) draw(); // 回復後に再描画
      });
    });
    el.querySelector("#maintContinue").addEventListener("click", () => {
      hideOverlay();
      onContinue();
    });
  }
  draw();
}

export function hideOverlay() {
  el.classList.add("hidden");
  el.innerHTML = "";
}

export function toast(msg, ms = 1400) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
