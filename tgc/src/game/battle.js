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

  function canPatternReach(patternSpec, from, to) {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    const distance = rowDiff + colDiff;
    if (patternSpec.pattern === "orthogonal") {
      return (rowDiff === 0 || colDiff === 0) && distance > 0 && distance <= patternSpec.range;
    }
    if (patternSpec.pattern === "diagonal") {
      return rowDiff === colDiff && rowDiff > 0 && rowDiff <= patternSpec.range;
    }
    if (patternSpec.pattern === "king") {
      const maxDiff = Math.max(rowDiff, colDiff);
      return maxDiff > 0 && maxDiff <= patternSpec.range;
    }
    if (patternSpec.pattern === "knight") {
      return (rowDiff === 1 && colDiff === 2) || (rowDiff === 2 && colDiff === 1);
    }
    return distance > 0 && distance <= (patternSpec.range || 1);
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
    const player = next.players[playerId];
    const card = player.hand[handIndex];
    if (!card) throw new Error("手札のカードが見つかりません。");
    if (card.type !== "spell") throw new Error("魔術カードではありません。");
    const spell = spendCardFromHand(next, playerId, handIndex);

    if (spell.effect?.type === "damageEnemyUnit") {
      const unit = findUnit(next, target.unitId);
      if (unit.ownerId === playerId) throw new Error("敵の幻獣を選んでください。");
      unit.damage += spell.effect.value;
      next = removeDefeated(next);
    }

    if (spell.effect?.type === "healUnit") {
      const unit = findUnit(next, target.unitId);
      unit.damage = Math.max(0, unit.damage - spell.effect.value);
    }

    if (spell.effect?.type === "buffUnit") {
      const unit = findUnit(next, target.unitId);
      unit.attack += spell.effect.attack || 0;
      unit.health += spell.effect.health || 0;
      if (spell.effect.trait && !unit.traits.includes(spell.effect.trait)) {
        unit.traits.push(spell.effect.trait);
      }
    }

    next.players[playerId].graveyard.push(spell);
    next.log.push(`${spell.name}を使用`);
    return next;
  }

  function applyEquipmentEffect(unit, equipment, direction) {
    const multiplier = direction === "remove" ? -1 : 1;
    unit.attack += (equipment.effect?.attack || 0) * multiplier;
    unit.health += (equipment.effect?.health || 0) * multiplier;
  }

  function playEquipment(game, playerId, handIndex, target) {
    const next = clone(game);
    const player = next.players[playerId];
    const card = player.hand[handIndex];
    if (!card) throw new Error("手札のカードが見つかりません。");
    if (card.type !== "equipment") throw new Error("装備カードではありません。");
    const equipment = spendCardFromHand(next, playerId, handIndex);

    if (equipment.equipmentKind === "attach") {
      const unit = findUnit(next, target.unitId);
      if (unit.ownerId !== playerId) throw new Error("味方の幻獣を選んでください。");
      if (unit.equipment) {
        applyEquipmentEffect(unit, unit.equipment, "remove");
        next.players[playerId].graveyard.push(unit.equipment);
      }
      unit.equipment = equipment;
      applyEquipmentEffect(unit, equipment, "add");
    } else {
      if (next.players[playerId].placedEquipment.length >= rules.MAX_PLACED_EQUIPMENT) {
        throw new Error(`設置装備は${rules.MAX_PLACED_EQUIPMENT}つまでです。`);
      }
      next.players[playerId].placedEquipment.push({ card: equipment, position: clone(target.position) });
    }

    next.log.push(`${equipment.name}を装備`);
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
    playSpell,
    playEquipment,
    opponentOf
  };
});
