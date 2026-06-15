const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(html.includes('id="battleMenu"'), "collection screen exposes a battle menu instead of an inline board");
assert(html.includes('id="battleScene"'), "battle scene container exists");
assert(html.includes('id="battleBoard"'), "battle board is only inside the battle scene");
assert(html.includes('id="battleHand"'), "battle hand container exists");

assert(app.includes("renderBattleBoard"), "app renders a dedicated battle board");
assert(app.includes("createPieceElement"), "app renders board pieces from card face art");
assert(app.includes("renderBattleHand"), "app renders a Hearthstone-style fanned hand");
assert(app.includes("showBattleScene"), "app can switch from collection to battle");
assert(app.includes("showCollectionScene"), "app can return from battle to collection");

assert(css.includes(".battle-menu"), "battle menu is styled");
assert(css.includes(".battle-scene"), "battle scene is styled");
assert(css.includes(".battle-piece-portrait"), "piece portrait crop is styled");
assert(css.includes(".battle-hand-card"), "fanned hand cards are styled");

console.log("battle UI smoke assertions passed");
