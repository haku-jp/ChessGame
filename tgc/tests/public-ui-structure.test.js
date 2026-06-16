const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const battleDemo = fs.readFileSync(path.join(root, "battle-demo.js"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="mainMenu"'), "main menu exists");
assert(html.includes('id="menuBattleButton"'), "main menu has battle entry");
assert(html.includes('id="menuCollectionButton"'), "main menu has collection entry");
assert(html.includes('id="collectionScene"'), "collection scene exists");
assert(html.includes('id="battleScene"'), "battle scene exists");
assert(app.includes('view: "menu"'), "app starts from menu view");
assert(app.includes("showCollectionScene"), "app can show collection");
assert(app.includes("showBattleScene"), "app can show battle");

assert(battleDemo.includes("createBattlePieceMarkup"), "battle units render with portrait pieces");
assert(battleDemo.includes("getReachableCells"), "battle view computes movement and attack hints");
assert(battleDemo.includes("card.image"), "battle pieces use card art");
assert(css.includes(".battle-piece-portrait"), "piece portrait styling exists");
assert(css.includes(".battle-cell.is-movable"), "movable cell styling exists");
assert(css.includes(".battle-cell.is-attackable"), "attackable target styling exists");
assert(css.includes("rotate(var(--hand-tilt))"), "hand cards are fanned");

console.log("public UI structure assertions passed");
