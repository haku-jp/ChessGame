# Genju TGC Board Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable 6x6 Genju TGC board prototype inside the existing static `tgc/` app while preserving the current card collection and pack-opening experience.

**Architecture:** Keep the existing static HTML/CSS/JavaScript stack. Add pure rule modules under `tgc/src/game/` that can run in both Node tests and the browser, then add a small battle demo UI to `tgc/index.html` and a browser controller in `tgc/battle-demo.js`. Sync the finished static files from `tgc/` to `docs/tgc/` for GitHub Pages.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js built-in `assert` for tests, GitHub Pages static deployment.

---

## Scope

This plan implements the first rule-validation vertical slice, not the full RPG campaign.

Included:
- 30-card starter deck definition.
- 6x6 board state.
- 20 life.
- first-player first-turn draw skip.
- max mana growth and refill.
- 5-card opening hand.
- one-time selected-card mulligan.
- summon to own back 2 rows.
- 6 genju field limit.
- summon turn movement allowed, summon turn attack blocked unless `charge`.
- move then attack, attack only, move only, or pass.
- attack/health combat with counterattack.
- persistent damage.
- headquarters damage through attack range and line of sight.
- graveyard for defeated genju and used spells/equipment.
- a small local battle demo.

Deferred:
- full AI.
- full deck builder UI.
- campaign progression.
- all three starter decks.
- advanced capture/control effects.
- installed equipment and placed equipment effects beyond data shape and display.

## File Structure

Create:
- `tgc/src/game/rules.js`: constants, labels, deck validation, board helpers, movement and line-of-sight helpers.
- `tgc/src/game/battle.js`: deterministic battle state reducer functions.
- `tgc/tests/rules.test.js`: Node tests for constants, rarity limits, board helpers, and deck validation.
- `tgc/tests/battle.test.js`: Node tests for turn flow, summon, movement, attack, headquarters damage, and graveyard.
- `tgc/battle-demo.js`: browser controller for a small two-player local demo.

Modify:
- `tgc/data/cards.js`: convert the current sample cards into the Genju TGC schema and expand to a 30-card starter deck list.
- `tgc/index.html`: add scripts for rule modules and add a battle demo section below the existing collection section.
- `tgc/app.js`: update filters, rarity labels, pack rarity weights, and card detail rendering for the new `genju` / `spell` / `equipment` categories.
- `tgc/style.css`: add board, hand, mana, life, and action-log styles.
- `docs/tgc/*`: sync from `tgc/*` after local verification.
- `.logs/2026-06-15-genju-tgc-board-prototype.md`: record implementation decisions and verification commands.

## Task 1: Add Rule Constants And Deck Validation Tests

**Files:**
- Create: `tgc/tests/rules.test.js`
- Create later in Task 2: `tgc/src/game/rules.js`

- [ ] **Step 1: Write the failing rule tests**

Create `tgc/tests/rules.test.js` with this content:

```js
const assert = require("node:assert/strict");
const rules = require("../src/game/rules.js");

function makeCard(id, type, rarity) {
  return {
    id,
    name: id,
    type,
    typeLabel: type,
    rarity,
    cost: 1
  };
}

function repeatCard(card, count) {
  return Array.from({ length: count }, () => card);
}

function testConstants() {
  assert.equal(rules.BOARD_SIZE, 6);
  assert.equal(rules.STARTING_LIFE, 20);
  assert.equal(rules.STARTING_HAND_SIZE, 5);
  assert.equal(rules.HAND_LIMIT, 7);
  assert.equal(rules.DECK_SIZE, 30);
  assert.equal(rules.MAX_FIELD_GENJU, 6);
  assert.deepEqual(rules.HEADQUARTERS.first, [
    { row: 5, col: 2 },
    { row: 5, col: 3 }
  ]);
  assert.deepEqual(rules.HEADQUARTERS.second, [
    { row: 0, col: 2 },
    { row: 0, col: 3 }
  ]);
}

function testSummonZones() {
  assert.equal(rules.isInSummonZone("first", { row: 5, col: 0 }), true);
  assert.equal(rules.isInSummonZone("first", { row: 4, col: 5 }), true);
  assert.equal(rules.isInSummonZone("first", { row: 3, col: 0 }), false);
  assert.equal(rules.isInSummonZone("second", { row: 0, col: 0 }), true);
  assert.equal(rules.isInSummonZone("second", { row: 1, col: 5 }), true);
  assert.equal(rules.isInSummonZone("second", { row: 2, col: 0 }), false);
}

function testRarityLabels() {
  assert.equal(rules.getRarityLabel("S"), "標準");
  assert.equal(rules.getRarityLabel("R"), "希少");
  assert.equal(rules.getRarityLabel("L"), "伝説");
  assert.equal(rules.getRarityLabel("I"), "幻");
}

function testDeckValidationPasses() {
  const deck = [
    ...repeatCard(makeCard("koran", "genju", "S"), 3),
    ...repeatCard(makeCard("guard_pup", "genju", "S"), 3),
    ...repeatCard(makeCard("moon_wisp", "genju", "S"), 3),
    ...repeatCard(makeCard("spark_hare", "genju", "S"), 3),
    ...repeatCard(makeCard("river_newt", "genju", "S"), 3),
    ...repeatCard(makeCard("healing_sign", "spell", "S"), 3),
    ...repeatCard(makeCard("survey_map", "equipment", "S"), 3),
    ...repeatCard(makeCard("lunar_bond", "spell", "R"), 2),
    ...repeatCard(makeCard("frontier_snare", "equipment", "R"), 2),
    makeCard("korantan", "genju", "L"),
    makeCard("first_contract", "equipment", "I"),
    makeCard("ember_call", "spell", "R"),
    makeCard("ward_bell", "equipment", "S"),
    makeCard("field_ration", "spell", "S")
  ];
  const result = rules.validateDeck(deck);
  assert.deepEqual(result.errors, []);
}

function testDeckValidationFails() {
  const shortDeck = repeatCard(makeCard("koran", "genju", "S"), 29);
  assert.match(rules.validateDeck(shortDeck).errors[0], /30枚/);

  const tooManyStandard = [
    ...repeatCard(makeCard("koran", "genju", "S"), 4),
    ...repeatCard(makeCard("filler", "spell", "S"), 26)
  ];
  assert.match(rules.validateDeck(tooManyStandard).errors.join("\n"), /標準/);

  const tooManyLegendaryTotal = [
    ...repeatCard(makeCard("s1", "genju", "S"), 3),
    ...repeatCard(makeCard("s2", "genju", "S"), 3),
    ...repeatCard(makeCard("s3", "genju", "S"), 3),
    ...repeatCard(makeCard("s4", "genju", "S"), 3),
    ...repeatCard(makeCard("s5", "genju", "S"), 3),
    ...repeatCard(makeCard("s6", "spell", "S"), 3),
    ...repeatCard(makeCard("s7", "equipment", "S"), 3),
    ...repeatCard(makeCard("r1", "spell", "R"), 2),
    ...repeatCard(makeCard("r2", "equipment", "R"), 2),
    makeCard("l1", "genju", "L"),
    makeCard("l2", "genju", "L"),
    makeCard("l3", "genju", "L"),
    makeCard("l4", "genju", "L"),
    makeCard("i1", "equipment", "I")
  ];
  assert.match(rules.validateDeck(tooManyLegendaryTotal).errors.join("\n"), /伝説/);
}

testConstants();
testSummonZones();
testRarityLabels();
testDeckValidationPasses();
testDeckValidationFails();
console.log("rules.test.js passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node tgc/tests/rules.test.js
```

Expected: FAIL with `Cannot find module '../src/game/rules.js'`.

## Task 2: Implement Rule Constants And Helpers

**Files:**
- Create: `tgc/src/game/rules.js`
- Test: `tgc/tests/rules.test.js`

- [ ] **Step 1: Create `tgc/src/game/rules.js`**

```js
(function initRules(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.TGC_RULES = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createRules() {
  const BOARD_SIZE = 6;
  const STARTING_LIFE = 20;
  const STARTING_HAND_SIZE = 5;
  const HAND_LIMIT = 7;
  const DECK_SIZE = 30;
  const MAX_MANA = 10;
  const MAX_FIELD_GENJU = 6;
  const MAX_PLACED_EQUIPMENT = 3;

  const CARD_TYPES = {
    genju: "幻獣",
    spell: "魔術",
    equipment: "装備"
  };

  const RARITY_LABELS = {
    S: "標準",
    R: "希少",
    L: "伝説",
    I: "幻"
  };

  const SAME_NAME_LIMITS = {
    S: 3,
    R: 2,
    L: 1,
    I: 1
  };

  const TOTAL_RARITY_LIMITS = {
    L: 3,
    I: 1
  };

  const HEADQUARTERS = {
    first: [
      { row: 5, col: 2 },
      { row: 5, col: 3 }
    ],
    second: [
      { row: 0, col: 2 },
      { row: 0, col: 3 }
    ]
  };

  function getCardTypeLabel(type) {
    return CARD_TYPES[type] || type;
  }

  function getRarityLabel(rarity) {
    return RARITY_LABELS[rarity] || rarity;
  }

  function isInsideBoard(position) {
    return Number.isInteger(position?.row)
      && Number.isInteger(position?.col)
      && position.row >= 0
      && position.row < BOARD_SIZE
      && position.col >= 0
      && position.col < BOARD_SIZE;
  }

  function samePosition(left, right) {
    return left?.row === right?.row && left?.col === right?.col;
  }

  function positionKey(position) {
    return `${position.row}:${position.col}`;
  }

  function isHeadquarters(playerId, position) {
    return HEADQUARTERS[playerId].some((hq) => samePosition(hq, position));
  }

  function isInSummonZone(playerId, position) {
    if (!isInsideBoard(position)) return false;
    if (playerId === "first") return position.row >= BOARD_SIZE - 2;
    if (playerId === "second") return position.row <= 1;
    return false;
  }

  function countBy(items, getKey) {
    return items.reduce((counts, item) => {
      const key = getKey(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function validateDeck(cards) {
    const errors = [];
    if (cards.length !== DECK_SIZE) {
      errors.push(`デッキは${DECK_SIZE}枚である必要があります。現在は${cards.length}枚です。`);
    }

    const byId = countBy(cards, (card) => card.id);
    Object.entries(byId).forEach(([id, count]) => {
      const card = cards.find((candidate) => candidate.id === id);
      const limit = SAME_NAME_LIMITS[card.rarity] || 1;
      if (count > limit) {
        errors.push(`${getRarityLabel(card.rarity)}カード「${card.name}」は同名${limit}枚までです。現在は${count}枚です。`);
      }
    });

    const byRarity = countBy(cards, (card) => card.rarity);
    Object.entries(TOTAL_RARITY_LIMITS).forEach(([rarity, limit]) => {
      const count = byRarity[rarity] || 0;
      if (count > limit) {
        errors.push(`${getRarityLabel(rarity)}カードはデッキ全体で${limit}枚までです。現在は${count}枚です。`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  function getLineBetween(from, to) {
    const rowDelta = to.row - from.row;
    const colDelta = to.col - from.col;
    const rowStep = Math.sign(rowDelta);
    const colStep = Math.sign(colDelta);
    const sameRow = rowDelta === 0;
    const sameCol = colDelta === 0;
    const sameDiagonal = Math.abs(rowDelta) === Math.abs(colDelta);

    if (!sameRow && !sameCol && !sameDiagonal) return [];

    const distance = Math.max(Math.abs(rowDelta), Math.abs(colDelta));
    const positions = [];
    for (let index = 1; index < distance; index += 1) {
      positions.push({
        row: from.row + rowStep * index,
        col: from.col + colStep * index
      });
    }
    return positions;
  }

  function isLineBlocked(from, to, occupiedPositions) {
    const occupied = new Set(occupiedPositions.map(positionKey));
    return getLineBetween(from, to).some((position) => occupied.has(positionKey(position)));
  }

  return {
    BOARD_SIZE,
    STARTING_LIFE,
    STARTING_HAND_SIZE,
    HAND_LIMIT,
    DECK_SIZE,
    MAX_MANA,
    MAX_FIELD_GENJU,
    MAX_PLACED_EQUIPMENT,
    CARD_TYPES,
    RARITY_LABELS,
    SAME_NAME_LIMITS,
    TOTAL_RARITY_LIMITS,
    HEADQUARTERS,
    getCardTypeLabel,
    getRarityLabel,
    isInsideBoard,
    samePosition,
    positionKey,
    isHeadquarters,
    isInSummonZone,
    validateDeck,
    getLineBetween,
    isLineBlocked
  };
});
```

- [ ] **Step 2: Run rule tests**

Run:

```powershell
node tgc/tests/rules.test.js
```

Expected: PASS and output `rules.test.js passed`.

- [ ] **Step 3: Commit**

```powershell
git add -- tgc/src/game/rules.js tgc/tests/rules.test.js
git commit -m "Add Genju TGC rule constants"
```

## Task 3: Update Card Data Schema And Collection Labels

**Files:**
- Modify: `tgc/data/cards.js`
- Modify: `tgc/index.html`
- Modify: `tgc/app.js`
- Test: `tgc/tests/rules.test.js`

- [ ] **Step 1: Update `tgc/data/cards.js` card schema**

Keep the existing card art paths. Convert the existing cards to the new categories and rarity abbreviations. Add movement and attack metadata for genju cards.

Use this schema per card:

```js
{
  id: "koran",
  name: "コラン",
  type: "genju",
  typeLabel: "幻獣",
  rarity: "S",
  cost: 1,
  attack: 1,
  health: 2,
  movement: { pattern: "orthogonal", range: 1, blocks: true },
  attackRange: { pattern: "orthogonal", range: 1, lineOfSight: true },
  traits: ["調査"],
  description: "召喚時、手札が7枚未満ならカードを1枚引く。",
  flavor: "小さなその瞳には、無限の可能性が宿っている。",
  evolutionTo: "korantan",
  image: "assets/cards/koran.jpg",
  visual: { icon: "◇", title: "白き幼体", tone: "frost" }
}
```

For non-genju cards, use:

```js
{
  id: "healing_sign",
  name: "癒しの印",
  type: "spell",
  typeLabel: "魔術",
  rarity: "S",
  cost: 1,
  attack: null,
  health: null,
  description: "味方の幻獣1体の体力を2回復する。",
  flavor: "契約の光が、傷ついた投影を結び直す。",
  image: "assets/cards/light_aura.jpg",
  visual: { icon: "☼", title: "保護術式", tone: "light" }
}
```

Add a browser global starter deck list after `TGC_CARDS`:

```js
const TGC_STARTER_DECK = [
  "koran", "koran", "koran",
  "guard_pup", "guard_pup", "guard_pup",
  "moon_wisp", "moon_wisp", "moon_wisp",
  "spark_hare", "spark_hare", "spark_hare",
  "river_newt", "river_newt", "river_newt",
  "korantan",
  "healing_sign", "healing_sign", "healing_sign",
  "ember_call", "ember_call",
  "lunar_bond", "lunar_bond",
  "survey_map", "survey_map", "survey_map",
  "frontier_snare", "frontier_snare",
  "ward_bell",
  "first_contract"
];
```

Ensure the deck is 30 IDs, contains 16 genju, 8 spell, and 6 equipment cards.

- [ ] **Step 2: Update filters in `tgc/index.html`**

Replace the filter buttons with:

```html
<button class="filter-button is-active" type="button" data-filter="all">すべて</button>
<button class="filter-button" type="button" data-filter="genju">幻獣</button>
<button class="filter-button" type="button" data-filter="spell">魔術</button>
<button class="filter-button" type="button" data-filter="equipment">装備</button>
```

- [ ] **Step 3: Update `tgc/app.js` labels and weights**

Change `getRarityLabel` to use the new labels:

```js
function getRarityLabel(rarity) {
  return TGC_RULES?.getRarityLabel?.(rarity) || {
    S: "標準",
    R: "希少",
    L: "伝説",
    I: "幻"
  }[rarity] || rarity;
}
```

Change `drawRandomCard` weights to:

```js
const rarityWeights = {
  S: 56,
  R: 30,
  L: 11,
  I: 3
};
```

Change `formatRulesText` keywords to:

```js
const keywords = ["飛行", "突撃", "跳躍", "守護", "調査", "射線無視"];
```

In `getViewerDetailsMarkup`, add movement and attack range rows for owned genju:

```js
const movementLabel = card.movement
  ? `${escapeHtml(card.movement.pattern)} / ${escapeHtml(String(card.movement.range))}`
  : "なし";
const attackRangeLabel = card.attackRange
  ? `${escapeHtml(card.attackRange.pattern)} / ${escapeHtml(String(card.attackRange.range))}`
  : "なし";
```

Then append two detail rows after the attack/health row:

```html
<div>
  <dt>移動</dt>
  <dd>${movementLabel}</dd>
</div>
<div>
  <dt>攻撃範囲</dt>
  <dd>${attackRangeLabel}</dd>
</div>
```

- [ ] **Step 4: Run tests and syntax checks**

Run:

```powershell
node tgc/tests/rules.test.js
node --check tgc/data/cards.js
node --check tgc/app.js
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add -- tgc/data/cards.js tgc/index.html tgc/app.js
git commit -m "Update TGC card schema for Genju rules"
```

## Task 4: Add Battle Engine Tests

**Files:**
- Create: `tgc/tests/battle.test.js`
- Create later in Task 5: `tgc/src/game/battle.js`

- [ ] **Step 1: Write failing battle tests**

Create `tgc/tests/battle.test.js`:

```js
const assert = require("node:assert/strict");
const rules = require("../src/game/rules.js");
const battle = require("../src/game/battle.js");

const koran = {
  id: "koran",
  name: "コラン",
  type: "genju",
  rarity: "S",
  cost: 1,
  attack: 1,
  health: 2,
  movement: { pattern: "orthogonal", range: 1, blocks: true },
  attackRange: { pattern: "orthogonal", range: 1, lineOfSight: true },
  traits: []
};

const charger = {
  ...koran,
  id: "spark_hare",
  name: "火花兎",
  attack: 2,
  health: 1,
  traits: ["突撃"]
};

const deck = Array.from({ length: 30 }, (_, index) => ({
  ...koran,
  id: `card_${index}`,
  name: `Card ${index}`
}));

function testCreateGame() {
  const game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  assert.equal(game.activePlayerId, "first");
  assert.equal(game.players.first.life, rules.STARTING_LIFE);
  assert.equal(game.players.second.life, rules.STARTING_LIFE);
  assert.equal(game.players.first.hand.length, 5);
  assert.equal(game.players.second.hand.length, 5);
  assert.equal(game.players.first.deck.length, 25);
  assert.equal(game.players.second.deck.length, 25);
}

function testStartTurnManaAndDraw() {
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game = battle.startTurn(game, "first");
  assert.equal(game.players.first.maxMana, 1);
  assert.equal(game.players.first.mana, 1);
  assert.equal(game.players.first.hand.length, 5, "first player skips first turn draw");

  game = battle.endTurn(game);
  game = battle.startTurn(game, "second");
  assert.equal(game.players.second.maxMana, 1);
  assert.equal(game.players.second.mana, 1);
  assert.equal(game.players.second.hand.length, 6, "second player draws on first turn");
}

function testMulliganOnce() {
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  const originalHandIds = game.players.first.hand.map((card) => card.id);
  game = battle.mulligan(game, "first", [0, 1]);
  assert.equal(game.players.first.hand.length, 5);
  assert.notDeepEqual(game.players.first.hand.map((card) => card.id), originalHandIds);
  assert.throws(() => battle.mulligan(game, "first", [0]), /入れ替え/);
}

function testSummonAndFieldLimit() {
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game.players.first.hand = Array.from({ length: 7 }, (_, index) => ({ ...koran, id: `genju_${index}` }));
  game.players.first.mana = 10;
  game.players.first.maxMana = 10;

  for (let index = 0; index < 6; index += 1) {
    game = battle.summonGenju(game, "first", 0, { row: 5 - Math.floor(index / 3), col: index % 3 });
  }
  assert.equal(game.units.filter((unit) => unit.ownerId === "first").length, 6);
  assert.throws(() => battle.summonGenju(game, "first", 0, { row: 4, col: 4 }), /6体/);
}

function testSummonTurnMoveButNoAttack() {
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game.players.first.hand = [{ ...koran }];
  game.players.first.mana = 5;
  game = battle.summonGenju(game, "first", 0, { row: 5, col: 2 });
  const unitId = game.units[0].id;
  game = battle.moveUnit(game, unitId, { row: 4, col: 2 });
  assert.deepEqual(game.units[0].position, { row: 4, col: 2 });
  assert.throws(() => battle.attackHeadquarters(game, unitId, { row: 0, col: 2 }), /召喚ターン/);
}

function testChargeCanAttackOnSummonTurn() {
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game.players.first.hand = [{ ...charger }];
  game.players.first.mana = 5;
  game = battle.summonGenju(game, "first", 0, { row: 1, col: 2 });
  game = battle.attackHeadquarters(game, game.units[0].id, { row: 0, col: 2 });
  assert.equal(game.players.second.life, 18);
}

function testCounterattackAndPersistentDamage() {
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game.units = [
    battle.makeUnit({ card: { ...koran, attack: 1, health: 3 }, ownerId: "first", position: { row: 3, col: 2 }, summonedTurn: 0 }),
    battle.makeUnit({ card: { ...koran, attack: 2, health: 2 }, ownerId: "second", position: { row: 2, col: 2 }, summonedTurn: 0 })
  ];
  game.turnNumber = 2;
  game.activePlayerId = "first";
  game = battle.attackUnit(game, game.units[0].id, game.units[1].id);
  const firstUnit = game.units.find((unit) => unit.ownerId === "first");
  const secondUnit = game.units.find((unit) => unit.ownerId === "second");
  assert.equal(firstUnit.damage, 2);
  assert.equal(secondUnit.damage, 1);
}

testCreateGame();
testStartTurnManaAndDraw();
testMulliganOnce();
testSummonAndFieldLimit();
testSummonTurnMoveButNoAttack();
testChargeCanAttackOnSummonTurn();
testCounterattackAndPersistentDamage();
console.log("battle.test.js passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node tgc/tests/battle.test.js
```

Expected: FAIL with `Cannot find module '../src/game/battle.js'`.

## Task 5: Implement Battle Engine

**Files:**
- Create: `tgc/src/game/battle.js`
- Test: `tgc/tests/battle.test.js`

- [ ] **Step 1: Create battle engine module**

Create `tgc/src/game/battle.js` with this browser/Node wrapper:

```js
(function initBattle(root, factory) {
  const rules = typeof require === "function" ? require("./rules.js") : root.TGC_RULES;
  const api = factory(rules);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.TGC_BATTLE = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createBattle(rules) {
  let nextUnitNumber = 1;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makePlayer(deck) {
    return {
      deck: clone(deck),
      hand: [],
      graveyard: [],
      life: rules.STARTING_LIFE,
      mana: 0,
      maxMana: 0,
      hasMulliganed: false,
      turnCount: 0,
      placedEquipment: []
    };
  }

  function drawCards(player, count) {
    const nextPlayer = clone(player);
    for (let index = 0; index < count; index += 1) {
      if (nextPlayer.hand.length >= rules.HAND_LIMIT) break;
      const card = nextPlayer.deck.shift();
      if (!card) break;
      nextPlayer.hand.push(card);
    }
    return nextPlayer;
  }

  function createGame({ firstDeck, secondDeck }) {
    let first = makePlayer(firstDeck);
    let second = makePlayer(secondDeck);
    first = drawCards(first, rules.STARTING_HAND_SIZE);
    second = drawCards(second, rules.STARTING_HAND_SIZE);
    return {
      activePlayerId: "first",
      turnNumber: 0,
      winnerId: "",
      players: { first, second },
      units: [],
      log: ["対局開始"]
    };
  }

  function opponentOf(playerId) {
    return playerId === "first" ? "second" : "first";
  }

  function updatePlayer(game, playerId, updater) {
    const next = clone(game);
    next.players[playerId] = updater(next.players[playerId]);
    return next;
  }

  function startTurn(game, playerId) {
    const next = clone(game);
    next.activePlayerId = playerId;
    next.turnNumber += 1;
    const player = next.players[playerId];
    player.turnCount += 1;
    player.maxMana = Math.min(rules.MAX_MANA, player.maxMana + 1);
    player.mana = player.maxMana;
    next.units.forEach((unit) => {
      if (unit.ownerId === playerId) {
        unit.hasMoved = false;
        unit.hasAttacked = false;
      }
    });
    const skipDraw = playerId === "first" && player.turnCount === 1;
    if (!skipDraw) {
      next.players[playerId] = drawCards(player, 1);
    }
    next.log.push(`${playerId} ターン開始`);
    return next;
  }

  function endTurn(game) {
    const next = clone(game);
    next.activePlayerId = opponentOf(next.activePlayerId);
    next.log.push("ターン終了");
    return next;
  }

  function mulligan(game, playerId, handIndexes) {
    const next = clone(game);
    const player = next.players[playerId];
    if (player.hasMulliganed) throw new Error("入れ替えは1回だけです。");
    const selected = new Set(handIndexes);
    const returned = player.hand.filter((_, index) => selected.has(index));
    player.hand = player.hand.filter((_, index) => !selected.has(index));
    player.deck.push(...returned);
    player.hasMulliganed = true;
    next.players[playerId] = drawCards(player, returned.length);
    next.log.push(`${playerId} が${returned.length}枚入れ替え`);
    return next;
  }

  function makeUnit({ card, ownerId, position, summonedTurn }) {
    return {
      id: `unit_${nextUnitNumber++}`,
      cardId: card.id,
      name: card.name,
      ownerId,
      position: clone(position),
      attack: card.attack,
      health: card.health,
      damage: 0,
      movement: clone(card.movement),
      attackRange: clone(card.attackRange),
      traits: clone(card.traits || []),
      equipment: null,
      summonedTurn,
      hasMoved: false,
      hasAttacked: false
    };
  }

  function findUnit(game, unitId) {
    const unit = game.units.find((candidate) => candidate.id === unitId);
    if (!unit) throw new Error("幻獣が見つかりません。");
    return unit;
  }

  function unitAt(game, position) {
    return game.units.find((unit) => rules.samePosition(unit.position, position));
  }

  function summonGenju(game, playerId, handIndex, position) {
    const next = clone(game);
    const player = next.players[playerId];
    const card = player.hand[handIndex];
    if (!card) throw new Error("手札のカードが見つかりません。");
    if (card.type !== "genju") throw new Error("幻獣カードだけ召喚できます。");
    if (player.mana < card.cost) throw new Error("マナが足りません。");
    if (!rules.isInSummonZone(playerId, position)) throw new Error("召喚できるのは自陣2列です。");
    if (unitAt(next, position)) throw new Error("そのマスは埋まっています。");
    if (next.units.filter((unit) => unit.ownerId === playerId).length >= rules.MAX_FIELD_GENJU) {
      throw new Error(`場に出せる幻獣は${rules.MAX_FIELD_GENJU}体までです。`);
    }
    player.mana -= card.cost;
    player.hand.splice(handIndex, 1);
    next.units.push(makeUnit({ card, ownerId: playerId, position, summonedTurn: next.turnNumber }));
    next.log.push(`${card.name}を召喚`);
    return next;
  }

  function isAdjacentOrthogonal(from, to, range) {
    const distance = Math.abs(from.row - to.row) + Math.abs(from.col - to.col);
    return distance > 0 && distance <= range;
  }

  function canPatternReach(patternSpec, from, to) {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    if (patternSpec.pattern === "orthogonal") return (rowDiff === 0 || colDiff === 0) && rowDiff + colDiff <= patternSpec.range && rowDiff + colDiff > 0;
    if (patternSpec.pattern === "diagonal") return rowDiff === colDiff && rowDiff <= patternSpec.range && rowDiff > 0;
    if (patternSpec.pattern === "king") return Math.max(rowDiff, colDiff) <= patternSpec.range && Math.max(rowDiff, colDiff) > 0;
    if (patternSpec.pattern === "knight") return (rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1);
    return isAdjacentOrthogonal(from, to, patternSpec.range || 1);
  }

  function occupiedPositionsExcept(game, unitId) {
    return game.units.filter((unit) => unit.id !== unitId).map((unit) => unit.position);
  }

  function moveUnit(game, unitId, to) {
    const next = clone(game);
    const unit = findUnit(next, unitId);
    if (unit.hasMoved) throw new Error("この幻獣は既に移動済みです。");
    if (!rules.isInsideBoard(to)) throw new Error("盤外には移動できません。");
    if (unitAt(next, to)) throw new Error("占有マスには移動できません。");
    if (!canPatternReach(unit.movement, unit.position, to)) throw new Error("その移動はできません。");
    if (unit.movement.blocks && rules.isLineBlocked(unit.position, to, occupiedPositionsExcept(next, unitId))) {
      throw new Error("移動経路が遮られています。");
    }
    unit.position = clone(to);
    unit.hasMoved = true;
    next.log.push(`${unit.name}が移動`);
    return next;
  }

  function canAttack(game, attacker, targetPosition) {
    if (attacker.hasAttacked) throw new Error("この幻獣は既に攻撃済みです。");
    if (attacker.summonedTurn === game.turnNumber && !attacker.traits.includes("突撃")) {
      throw new Error("召喚ターンは攻撃できません。");
    }
    if (!canPatternReach(attacker.attackRange, attacker.position, targetPosition)) {
      throw new Error("攻撃範囲外です。");
    }
    if (attacker.attackRange.lineOfSight && rules.isLineBlocked(attacker.position, targetPosition, occupiedPositionsExcept(game, attacker.id))) {
      throw new Error("射線が遮られています。");
    }
  }

  function removeDefeated(next) {
    const defeated = next.units.filter((unit) => unit.damage >= unit.health);
    if (!defeated.length) return next;
    next.units = next.units.filter((unit) => unit.damage < unit.health);
    defeated.forEach((unit) => {
      next.players[unit.ownerId].graveyard.push({ id: unit.cardId, name: unit.name, type: "genju" });
      next.log.push(`${unit.name}が退場`);
    });
    return next;
  }

  function attackUnit(game, attackerId, defenderId) {
    let next = clone(game);
    const attacker = findUnit(next, attackerId);
    const defender = findUnit(next, defenderId);
    if (attacker.ownerId === defender.ownerId) throw new Error("味方は攻撃できません。");
    canAttack(next, attacker, defender.position);
    attacker.damage += defender.attack;
    defender.damage += attacker.attack;
    attacker.hasAttacked = true;
    next.log.push(`${attacker.name}が${defender.name}を攻撃`);
    return removeDefeated(next);
  }

  function attackHeadquarters(game, attackerId, headquartersPosition) {
    const next = clone(game);
    const attacker = findUnit(next, attackerId);
    const defenderId = opponentOf(attacker.ownerId);
    if (!rules.isHeadquarters(defenderId, headquartersPosition)) {
      throw new Error("相手本陣ではありません。");
    }
    const guard = unitAt(next, headquartersPosition);
    if (guard && guard.ownerId !== attacker.ownerId) {
      throw new Error("本陣上の幻獣を先に攻撃してください。");
    }
    canAttack(next, attacker, headquartersPosition);
    next.players[defenderId].life -= attacker.attack;
    attacker.hasAttacked = true;
    next.log.push(`${attacker.name}が本陣へ${attacker.attack}点`);
    if (next.players[defenderId].life <= 0) {
      next.winnerId = attacker.ownerId;
    }
    return next;
  }

  return {
    createGame,
    startTurn,
    endTurn,
    mulligan,
    makeUnit,
    summonGenju,
    moveUnit,
    attackUnit,
    attackHeadquarters,
    opponentOf
  };
});
```

- [ ] **Step 2: Run battle tests**

Run:

```powershell
node tgc/tests/battle.test.js
```

Expected: PASS and output `battle.test.js passed`.

- [ ] **Step 3: Run all tests**

Run:

```powershell
node tgc/tests/rules.test.js
node tgc/tests/battle.test.js
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```powershell
git add -- tgc/src/game/battle.js tgc/tests/battle.test.js
git commit -m "Add Genju TGC battle engine"
```

## Task 6: Add Battle Demo Markup And Scripts

**Files:**
- Modify: `tgc/index.html`
- Create: `tgc/battle-demo.js`
- Test: `tgc/tests/battle.test.js`

- [ ] **Step 1: Include game scripts in `tgc/index.html`**

Add these scripts after `data/cards.js` and before `app.js`:

```html
<script src="src/game/rules.js?v=genju-board-20260615" defer></script>
<script src="src/game/battle.js?v=genju-board-20260615" defer></script>
```

Add this after `app.js`:

```html
<script src="battle-demo.js?v=genju-board-20260615" defer></script>
```

- [ ] **Step 2: Add battle section to `tgc/index.html`**

Place this section below the current `library-layout` main content:

```html
<section class="battle-demo" aria-label="召喚盤デモ">
  <div class="battle-header">
    <div>
      <p class="kicker">Guild Trial Board</p>
      <h2>6x6召喚盤</h2>
    </div>
    <div class="battle-actions">
      <button class="primary-button" id="battleNewGameButton" type="button">標準デッキで開始</button>
      <button class="ghost-button" id="battleEndTurnButton" type="button">ターン終了</button>
    </div>
  </div>

  <div class="battle-status" id="battleStatus" aria-live="polite"></div>

  <div class="battle-layout">
    <div class="battle-board" id="battleBoard" aria-label="6x6召喚盤"></div>
    <aside class="battle-side">
      <h3>手札</h3>
      <div class="battle-hand" id="battleHand"></div>
      <h3>ログ</h3>
      <ol class="battle-log" id="battleLog"></ol>
    </aside>
  </div>
</section>
```

- [ ] **Step 3: Create `tgc/battle-demo.js`**

```js
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
    button.disabled = card.type !== "genju";
    button.innerHTML = `<strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.typeLabel)} / ${escapeHtml(String(card.cost))}</span>`;
    battleElements.hand.appendChild(button);
  });
}

function renderBattleLog() {
  battleElements.log.innerHTML = battleDemo.game.log.slice(-8).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
}
```

- [ ] **Step 4: Run tests and syntax checks**

Run:

```powershell
node tgc/tests/rules.test.js
node tgc/tests/battle.test.js
node --check tgc/battle-demo.js
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add -- tgc/index.html tgc/battle-demo.js
git commit -m "Add Genju TGC board demo shell"
```

## Task 7: Style The Battle Demo

**Files:**
- Modify: `tgc/style.css`
- Test visually in browser.

- [ ] **Step 1: Add battle layout CSS**

Append this CSS near the final TGC skin section:

```css
.battle-demo {
  margin-top: 22px;
  border: 1px solid rgba(201, 168, 76, 0.22);
  border-radius: 8px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(26, 26, 46, 0.86), rgba(7, 7, 15, 0.94));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.battle-header,
.battle-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.battle-header h2 {
  margin: 0;
  color: #fff8dc;
  font-size: 1.45rem;
}

.battle-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.battle-status {
  margin: 14px 0;
  justify-content: flex-start;
}

.battle-status span {
  border: 1px solid rgba(201, 168, 76, 0.24);
  border-radius: 8px;
  padding: 7px 10px;
  color: #fff2d8;
  background: rgba(7, 7, 15, 0.46);
  font-weight: 800;
}

.battle-layout {
  display: grid;
  grid-template-columns: minmax(340px, 620px) minmax(260px, 1fr);
  gap: 18px;
  align-items: start;
}

.battle-board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  width: min(620px, 100%);
  aspect-ratio: 1;
  border: 2px solid rgba(201, 168, 76, 0.42);
  border-radius: 8px;
  overflow: hidden;
  background: #07070f;
}

.battle-cell {
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 5px;
  color: #fff2d8;
  cursor: pointer;
}

.battle-cell.is-light {
  background: rgba(222, 195, 120, 0.16);
}

.battle-cell.is-dark {
  background: rgba(44, 54, 78, 0.52);
}

.battle-cell.is-first-hq::before,
.battle-cell.is-second-hq::before {
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(232, 200, 112, 0.5);
  border-radius: 6px;
  content: "";
  pointer-events: none;
}

.battle-cell.is-selected {
  box-shadow: inset 0 0 0 3px #e8c870, 0 0 18px rgba(232, 200, 112, 0.44);
}

.unit-name,
.unit-stats {
  position: relative;
  z-index: 1;
  display: block;
  text-align: center;
}

.unit-name {
  font-size: clamp(0.68rem, 1.6vw, 0.9rem);
  font-weight: 900;
}

.unit-stats {
  margin-top: 3px;
  border-radius: 999px;
  padding: 2px 7px;
  color: #07070f;
  background: #e8c870;
  font-size: 0.72rem;
  font-weight: 900;
}

.battle-side {
  display: grid;
  gap: 10px;
}

.battle-side h3 {
  margin: 0;
  color: #e8c870;
}

.battle-hand {
  display: grid;
  gap: 8px;
}

.battle-hand-card {
  border: 1px solid rgba(201, 168, 76, 0.24);
  border-radius: 8px;
  padding: 9px;
  color: #fff2d8;
  background: rgba(7, 7, 15, 0.55);
  text-align: left;
  cursor: pointer;
}

.battle-hand-card strong,
.battle-hand-card span {
  display: block;
}

.battle-hand-card span {
  margin-top: 3px;
  color: #cbb98f;
  font-size: 0.78rem;
}

.battle-hand-card.is-selected {
  border-color: #e8c870;
  box-shadow: 0 0 16px rgba(232, 200, 112, 0.35);
}

.battle-hand-card:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.battle-log {
  min-height: 148px;
  margin: 0;
  padding: 10px 10px 10px 28px;
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 8px;
  color: #dac89f;
  background: rgba(7, 7, 15, 0.46);
}

@media (max-width: 900px) {
  .battle-layout {
    grid-template-columns: 1fr;
  }

  .battle-board {
    width: 100%;
  }
}
```

- [ ] **Step 2: Run syntax checks**

Run:

```powershell
node --check tgc/app.js
node --check tgc/battle-demo.js
```

Expected: both commands exit 0.

- [ ] **Step 3: Start local server**

Run:

```powershell
Start-Process -FilePath 'C:\Users\tobac\AppData\Local\Programs\Python\Python312\python.exe' -ArgumentList '-m','http.server','4175','--bind','127.0.0.1' -WorkingDirectory 'C:\Users\tobac\OneDrive\Desktop\Work\ChessGame' -WindowStyle Hidden
```

Open:

```text
http://127.0.0.1:4175/tgc/index.html?v=genju-board
```

Expected: existing collection remains visible, and the new 6x6 board section appears below it.

- [ ] **Step 4: Commit**

```powershell
git add -- tgc/style.css
git commit -m "Style Genju TGC board demo"
```

## Task 8: Add Minimal Spell And Equipment Resolution

**Files:**
- Modify: `tgc/src/game/battle.js`
- Modify: `tgc/tests/battle.test.js`
- Modify: `tgc/battle-demo.js`

- [ ] **Step 1: Extend tests for non-genju cards**

Add this to `tgc/tests/battle.test.js` before the final `console.log`:

```js
function testSpellGoesToGraveyard() {
  const spell = { id: "ember_call", name: "火呼び", type: "spell", rarity: "R", cost: 1, effect: { type: "damageEnemyUnit", value: 1 } };
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game.players.first.hand = [spell];
  game.players.first.mana = 2;
  game.units = [
    battle.makeUnit({ card: { ...koran, health: 2 }, ownerId: "second", position: { row: 1, col: 2 }, summonedTurn: 0 })
  ];
  game = battle.playSpell(game, "first", 0, { unitId: game.units[0].id });
  assert.equal(game.players.first.graveyard[0].id, "ember_call");
  assert.equal(game.units[0].damage, 1);
}

function testEquipmentAttachLimit() {
  const firstEquipment = { id: "survey_map", name: "調査地図", type: "equipment", rarity: "S", cost: 1, equipmentKind: "attach", effect: { type: "buff", attack: 1, health: 0 } };
  const secondEquipment = { id: "ward_bell", name: "護り鈴", type: "equipment", rarity: "S", cost: 1, equipmentKind: "attach", effect: { type: "buff", attack: 0, health: 1 } };
  let game = battle.createGame({ firstDeck: deck, secondDeck: deck });
  game.players.first.hand = [firstEquipment, secondEquipment];
  game.players.first.mana = 5;
  game.units = [
    battle.makeUnit({ card: { ...koran }, ownerId: "first", position: { row: 5, col: 2 }, summonedTurn: 0 })
  ];
  game = battle.playEquipment(game, "first", 0, { unitId: game.units[0].id });
  assert.equal(game.units[0].equipment.id, "survey_map");
  game = battle.playEquipment(game, "first", 0, { unitId: game.units[0].id });
  assert.equal(game.units[0].equipment.id, "ward_bell");
  assert.equal(game.players.first.graveyard[0].id, "survey_map");
}

testSpellGoesToGraveyard();
testEquipmentAttachLimit();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node tgc/tests/battle.test.js
```

Expected: FAIL with `battle.playSpell is not a function`.

- [ ] **Step 3: Implement `playSpell` and `playEquipment`**

Add these functions to `tgc/src/game/battle.js` before the `return` block:

```js
function spendCardFromHand(next, playerId, handIndex) {
  const player = next.players[playerId];
  const card = player.hand[handIndex];
  if (!card) throw new Error("手札のカードが見つかりません。");
  if (player.mana < card.cost) throw new Error("マナが足りません。");
  player.mana -= card.cost;
  player.hand.splice(handIndex, 1);
  return card;
}

function playSpell(game, playerId, handIndex, target) {
  let next = clone(game);
  const card = spendCardFromHand(next, playerId, handIndex);
  if (card.type !== "spell") throw new Error("魔術カードではありません。");
  if (card.effect?.type === "damageEnemyUnit") {
    const unit = findUnit(next, target.unitId);
    if (unit.ownerId === playerId) throw new Error("敵の幻獣を選んでください。");
    unit.damage += card.effect.value;
    next = removeDefeated(next);
  }
  next.players[playerId].graveyard.push(card);
  next.log.push(`${card.name}を使用`);
  return next;
}

function playEquipment(game, playerId, handIndex, target) {
  const next = clone(game);
  const card = spendCardFromHand(next, playerId, handIndex);
  if (card.type !== "equipment") throw new Error("装備カードではありません。");

  if (card.equipmentKind === "attach") {
    const unit = findUnit(next, target.unitId);
    if (unit.ownerId !== playerId) throw new Error("味方の幻獣を選んでください。");
    if (unit.equipment) {
      next.players[playerId].graveyard.push(unit.equipment);
    }
    unit.equipment = card;
    unit.attack += card.effect?.attack || 0;
    unit.health += card.effect?.health || 0;
  } else {
    if (next.players[playerId].placedEquipment.length >= rules.MAX_PLACED_EQUIPMENT) {
      throw new Error(`設置装備は${rules.MAX_PLACED_EQUIPMENT}つまでです。`);
    }
    next.players[playerId].placedEquipment.push({ card, position: clone(target.position) });
  }

  next.log.push(`${card.name}を装備`);
  return next;
}
```

Export them by adding to the returned object:

```js
playSpell,
playEquipment,
```

- [ ] **Step 4: Update `battle-demo.js` hand click behavior**

In `handleBoardClick`, before the genju summon branch, add:

```js
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
```

In `renderBattleHand`, remove this line:

```js
button.disabled = card.type !== "genju";
```

- [ ] **Step 5: Run tests and syntax checks**

Run:

```powershell
node tgc/tests/battle.test.js
node --check tgc/battle-demo.js
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add -- tgc/src/game/battle.js tgc/tests/battle.test.js tgc/battle-demo.js
git commit -m "Add spell and equipment resolution"
```

## Task 9: Sync To GitHub Pages Source

**Files:**
- Modify: `docs/tgc/index.html`
- Modify: `docs/tgc/app.js`
- Modify: `docs/tgc/style.css`
- Modify: `docs/tgc/data/cards.js`
- Create: `docs/tgc/battle-demo.js`
- Create: `docs/tgc/src/game/rules.js`
- Create: `docs/tgc/src/game/battle.js`

- [ ] **Step 1: Copy implementation files**

Run:

```powershell
Copy-Item -Force -LiteralPath 'tgc\index.html' -Destination 'docs\tgc\index.html'
Copy-Item -Force -LiteralPath 'tgc\app.js' -Destination 'docs\tgc\app.js'
Copy-Item -Force -LiteralPath 'tgc\style.css' -Destination 'docs\tgc\style.css'
Copy-Item -Force -LiteralPath 'tgc\battle-demo.js' -Destination 'docs\tgc\battle-demo.js'
Copy-Item -Force -LiteralPath 'tgc\data\cards.js' -Destination 'docs\tgc\data\cards.js'
New-Item -ItemType Directory -Force -Path 'docs\tgc\src\game'
Copy-Item -Force -LiteralPath 'tgc\src\game\rules.js' -Destination 'docs\tgc\src\game\rules.js'
Copy-Item -Force -LiteralPath 'tgc\src\game\battle.js' -Destination 'docs\tgc\src\game\battle.js'
```

- [ ] **Step 2: Run syntax checks against published source**

Run:

```powershell
node --check docs/tgc/app.js
node --check docs/tgc/battle-demo.js
node --check docs/tgc/data/cards.js
node --check docs/tgc/src/game/rules.js
node --check docs/tgc/src/game/battle.js
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify source parity**

Run:

```powershell
git diff --no-index -- tgc/index.html docs/tgc/index.html
git diff --no-index -- tgc/app.js docs/tgc/app.js
git diff --no-index -- tgc/style.css docs/tgc/style.css
git diff --no-index -- tgc/battle-demo.js docs/tgc/battle-demo.js
git diff --no-index -- tgc/data/cards.js docs/tgc/data/cards.js
git diff --no-index -- tgc/src/game/rules.js docs/tgc/src/game/rules.js
git diff --no-index -- tgc/src/game/battle.js docs/tgc/src/game/battle.js
```

Expected: no diff output for each command.

- [ ] **Step 4: Commit**

```powershell
git add -- docs/tgc/index.html docs/tgc/app.js docs/tgc/style.css docs/tgc/battle-demo.js docs/tgc/data/cards.js docs/tgc/src/game/rules.js docs/tgc/src/game/battle.js
git commit -m "Sync Genju TGC board demo to docs"
```

## Task 10: Final Verification

**Files:**
- Read: `tgc/index.html`
- Read: `docs/tgc/index.html`

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
node tgc/tests/rules.test.js
node tgc/tests/battle.test.js
node --check tgc/app.js
node --check tgc/battle-demo.js
node --check tgc/data/cards.js
node --check tgc/src/game/rules.js
node --check tgc/src/game/battle.js
```

Expected: all commands exit 0.

- [ ] **Step 2: Start local server**

Run:

```powershell
Start-Process -FilePath 'C:\Users\tobac\AppData\Local\Programs\Python\Python312\python.exe' -ArgumentList '-m','http.server','4175','--bind','127.0.0.1' -WorkingDirectory 'C:\Users\tobac\OneDrive\Desktop\Work\ChessGame' -WindowStyle Hidden
```

- [ ] **Step 3: Verify with browser**

Open:

```text
http://127.0.0.1:4175/tgc/index.html?v=genju-board-final
```

Manual checks:
- Existing card collection renders.
- Filters show `すべて`, `幻獣`, `魔術`, `装備`.
- Opening a pack still works.
- Card viewer shows type, rarity, cost, attack/health, movement, attack range, ability, and flavor.
- Battle demo renders a 6x6 board.
- Starting a battle shows 5 cards.
- Selecting a genju card and clicking own back 2 rows summons it.
- Summoned genju can move on the summon turn.
- Summoned genju cannot attack on the summon turn unless it has `突撃`.
- Ending turn updates active player, mana, and hand.
- Attacking a unit applies counterattack and persistent damage.
- Attacking headquarters reduces life.
- Mobile viewport keeps board and hand usable without text overlap.

- [ ] **Step 4: Record verification log**

Create `.logs/2026-06-15-genju-tgc-board-prototype.md` with:

```markdown
# Genju TGC board prototype

Date: 2026-06-15

Implemented:
- 6x6 board prototype.
- rule modules and Node tests.
- starter deck schema.
- summon, movement, attack, counterattack, persistent damage, headquarters damage.
- minimal spell and equipment resolution.
- docs/tgc sync.

Verification:
- `node tgc/tests/rules.test.js`
- `node tgc/tests/battle.test.js`
- `node --check tgc/app.js`
- `node --check tgc/battle-demo.js`
- `node --check tgc/data/cards.js`
- `node --check tgc/src/game/rules.js`
- `node --check tgc/src/game/battle.js`
- browser check at `http://127.0.0.1:4175/tgc/index.html?v=genju-board-final`
```

- [ ] **Step 5: Commit verification log**

```powershell
git add -- .logs/2026-06-15-genju-tgc-board-prototype.md
git commit -m "Log Genju TGC board prototype verification"
```

## Plan Self-Review

Spec coverage:
- World premise is documented in the spec and does not require runtime changes in this first vertical slice.
- Card classifications are implemented through `genju`, `spell`, and `equipment`.
- Rarity labels and deck limits are implemented in `rules.js` and covered by `rules.test.js`.
- Deck size, hand size, hand limit, mana, first-player draw skip, board size, headquarters, summon zone, field limit, movement, attack, counterattack, persistent damage, headquarters damage, graveyard, equipment limit, and starter deck ratio are covered.
- Full campaign and advanced national conflict systems are intentionally outside this first vertical slice.

Placeholder scan:
- The plan avoids placeholder markers and vague future-work instructions.
- Deferred items are explicitly scoped out in the Scope section.

Type consistency:
- Card type strings are `genju`, `spell`, `equipment`.
- Rarity strings are `S`, `R`, `L`, `I`.
- Browser globals are `TGC_RULES`, `TGC_BATTLE`, `TGC_CARDS`, and `TGC_STARTER_DECK`.
- Test commands use Node built-in `assert` and do not require package installation.
