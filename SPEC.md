# Spell Chess Prototype Specification

Last updated: 2026-06-14

Live prototype:
https://haku-jp.github.io/ChessGame/

Repository:
https://github.com/haku-jp/ChessGame

## 1. Overview

Spell Chess is a dark fantasy tactical chess prototype.

The current direction is not a traditional chess app. The goal is to create a compact tactical game where the player gives doctrines/orders to units, then watches the board resolve automatically. The desired core feeling is:

> Select a piece, give it a clear intent, start the turn, and enjoy the result of one decisive tactical exchange.

The prototype is built as a static HTML/CSS/JavaScript web game and is currently deployed through GitHub Pages.

## 2. Product Goal

The target product should feel closer to a premium dark fantasy tactics game than a web chess demo.

The intended experience:

- The board is the main stage.
- Units feel like characters, not abstract chess pieces.
- The player commands intent rather than manually moving every piece.
- A single turn should feel satisfying through selection feedback, movement, impact, capture rewards, and visual/audio polish.
- The game should gradually become interesting through roster growth, wounds, Soul economy, upgrades, and tactical doctrines.

The most important short-term product question:

> Can the player feel ownership over the outcome even though the board resolves automatically?

## 3. Current Playable Loop

1. A stage starts with the player's warband deployed at the bottom of the board and enemies at the top.
2. The player selects friendly pieces.
3. For each selected piece, the player chooses a doctrine:
   - Advance
   - Aggressive
   - Guard
   - Flank
4. The player presses Start Turn.
5. Friendly pieces act automatically based on their doctrine and board evaluation.
6. Enemy pieces then act automatically.
7. Captures grant Soul and XP.
8. When all enemies are defeated, the player proceeds to stage clear/reward/maintenance flow.
9. If the player's King falls, the run ends.

This prototype is currently closer to an "auto tactics command prototype" than manual chess.

## 4. Core Experience Pillars

### 4.1 One Move Satisfaction

The highest priority is making a single tactical action feel good.

Important feedback points:

- Piece selection: lift, glow, subtle ring, sound.
- Command selection: radial command UI, preview, confirmation pulse.
- Movement: slide, trail, arrival weight.
- Capture: shatter, soul motes, Soul increase, impact timing.
- Aftermath: the player understands why the action happened.

### 4.2 Commanding, Not Dragging

The player should feel like they are giving battle orders, not operating a spreadsheet.

The current design intentionally removes the old right-side information panel and moves commands onto the board:

- Select a piece.
- See a small status chip near it.
- Choose doctrine from command buttons around the piece.
- Preview likely intent directly on the board.
- Confirm the doctrine.

### 4.3 Readable Dark Fantasy Tactics UI

The UI should look like a shipped Steam tactics game screen, not a debug UI.

Current UI direction:

- Dark, low-saturation background.
- Board-centered layout.
- Subtle tile texture.
- No permanent circular aura behind pieces.
- Selection ring appears only on selected pieces.
- Move previews use small runes/markers rather than large filled squares.
- HUD, warband tray, board frame, and floating cards share one visual language.

## 5. Board and Stage Rules

### 5.1 Board Size

Stages can define different board sizes.

Current stages:

- Stage 1: 5x5
- Stage 2: 6x6
- Stage 3: 6x6

### 5.2 Win/Loss

Win condition:

- All enemies are defeated.

Loss condition:

- The player's King is defeated.

### 5.3 Commands Per Turn

The game tracks a command resource for each side.

The current UI shows:

- Round
- Phase
- Command count
- Soul

The current auto-resolution spends actions while command points remain.

## 6. Pieces

### 6.1 Shared Piece Stats

Each piece currently has:

- id
- type
- name
- role
- icon
- faction
- rarity
- level
- XP
- wounds
- max wounds
- traits
- move pattern
- ability
- tactic/doctrine
- value
- alive state
- board position

### 6.2 Rarity and Durability

Current max wounds by rarity:

- common: 3
- uncommon: 2
- rare: 2
- epic: 1
- legendary: 1

Wounds represent long-term damage/loss pressure across stages.

### 6.3 Current Piece Types

Pawn:

- Role: pawn
- Rarity: common
- Movement: custom pawn movement
- Description: can move forward, backward, or sideways; can capture diagonally forward or backward.

Knight:

- Role: knight
- Rarity: uncommon
- Movement: standard L-shaped jump.

Bishop:

- Role: bishop
- Rarity: uncommon
- Movement: diagonal sliding.

Rook:

- Role: rook
- Rarity: uncommon
- Movement: orthogonal sliding.

Queen:

- Role: queen
- Rarity: rare
- Movement: diagonal and orthogonal sliding.

King:

- Role: king
- Rarity: legendary
- Movement: one square in any direction.
- Run-critical unit. If it falls, the run ends.

Spear Pawn:

- Pawn variant.
- Can make a ranged spear strike two squares forward.
- Can also move two squares forward if the path is open.

Shield Pawn:

- Pawn variant.
- Blocks the first lethal hit, then gains one wound.

War Knight:

- Knight variant.
- On movement, damages enemies around the landing square.

## 7. Custom Movement Philosophy

The game intentionally diverges from standard chess.

The main reason:

> If the board resolves automatically, standard chess movement can cause repetitive outcomes or stalls. Pieces need movement rules that keep the board fluid and reduce deadlock.

Current custom pawn rule:

- Pawns can move forward.
- Pawns can move backward.
- Pawns can sidestep.
- Pawns can capture diagonally forward.
- Pawns can capture diagonally backward.

This makes pawns less likely to become stuck when the board evolves without direct player movement.

## 8. Doctrines

Doctrines are the player's primary command input.

### 8.1 Advance

Intent:

- Move toward contact.
- Claim stable space.
- Default behavior.

AI effect:

- Favors improving distance toward enemies.

Preview:

- Gold small rune markers on possible movement cells.

### 8.2 Aggressive

Intent:

- Prioritize captures.
- Pressure valuable targets.

AI effect:

- Adds capture value bonus.
- Favors forward pressure even with some risk.

Preview:

- Red attack rim on candidate capture targets.

### 8.3 Guard

Intent:

- Stay near and protect the King.
- Reduce reckless movement.

AI effect:

- Rewards actions closer to allied King.

Preview:

- Blue/white guard range near the King or protected core.

### 8.4 Flank

Intent:

- Spread sideways.
- Seek open lanes and mobility.

AI effect:

- Rewards mobility and safer open positions.

Preview:

- Purple flank markers/arrows on lateral movement candidates.

## 9. Auto Battle AI

The current AI is score-based, not search-based.

For each side:

1. Find alive units that have not acted this phase.
2. Prefer the best capture action.
3. If no capture exists, prefer the best approach action.
4. If no useful approach exists, choose an unblock/mobility action.
5. Repeat while command points remain.

Scoring considers:

- Target value.
- King capture priority.
- Distance improvement.
- Mobility around destination.
- Risk from enemy capture zones.
- Doctrine-specific bonuses.

Known limitation:

- Outcomes can still become repetitive.
- The player may not yet feel enough agency if doctrine choices do not visibly change results.
- The AI is deterministic, so repeated openings can lead to similar losses.

Possible improvements:

- Add small controlled randomness.
- Let doctrines define hard constraints, not only score bonuses.
- Add per-unit personality or initiative.
- Add visible predicted intent before Start Turn.
- Allow the player to set formation priorities before the turn.

## 10. Combat and Rewards

### 10.1 Capture

When a piece captures:

- The target is removed from the board if killed.
- The attacker gains XP.
- The player gains Soul if the attacker is Light faction.
- Capture effects play: shatter, motes, Soul feedback.

### 10.2 Shield

Shield ability:

- Blocks the first lethal hit.
- Adds one wound.
- The unit stays on the board for that stage.

### 10.3 Soul

Soul is the main resource gained from defeating enemies.

Current use:

- Healing wounds costs Soul.

Current heal cost:

- 5 Soul per wound.

Future uses:

- Buy new units.
- Upgrade unit traits.
- Unlock spells.
- Reroll rewards.
- Modify doctrines.

## 11. UI Specification

### 11.1 Layout

Current desktop layout:

- Top HUD.
- Center board.
- Bottom warband tray and small status panels.
- Floating command UI appears near selected piece.

The old permanent right-side information panel has been removed.

### 11.2 Top HUD

Shows:

- Stage title/objective.
- Round.
- Phase.
- Command points.
- Soul.
- Start Turn button.

Mobile behavior:

- HUD wraps into two rows.
- Objective text is hidden on narrow screens.
- Start Turn remains visible.

### 11.3 Board

The board is the visual focus.

Rules:

- Tile texture should be low contrast.
- Pieces should be more readable than the board texture.
- Selection uses a subtle ring and glow.
- Move/capture previews use small markers and thin rims.

### 11.4 Floating Status Chip

Appears only when a piece is selected.

Shows:

- Unit name.
- HP.
- Power.
- Attribute/accent.
- Current doctrine.

Position:

- Near selected piece.
- Flips/clamps inward near screen edges.

### 11.5 Command Ring

Appears around selected friendly piece during player phase.

Buttons:

- Advance
- Aggressive
- Guard
- Flank

Behavior:

- Hover previews doctrine results on desktop.
- Tap/click confirms doctrine.
- Confirmation plays a pulse.

### 11.6 Detail Card

Appears temporarily through right-click or Info key.

Shows:

- Level.
- XP.
- Move type.
- Traits.
- Skill description.

Not a modal. It appears near the piece and closes when clicking outside.

### 11.7 Warband Tray

Bottom roster display.

Shows:

- Owned units.
- HP bars.
- Doctrine marker.

Mobile behavior:

- Horizontal scroll tray.
- Compact icon cards.

## 12. Responsive Design

The prototype is playable on mobile through GitHub Pages.

Current responsive changes:

- Board width uses viewport constraints.
- HUD compresses into mobile-friendly grid.
- Warband tray scrolls horizontally.
- Bottom explanatory controls are hidden on mobile.
- Floating command UI and detail card clamp within viewport.
- Cache-busting version query added to CSS/JS URLs.

Remaining mobile concerns:

- Hover previews do not naturally exist on touch devices.
- Command buttons may need a separate "preview then confirm" behavior.
- Long press/right-click detail access should be replaced or supplemented with an Info button on mobile.
- Board touch targets should be tested on smaller phones.

## 13. Current Technical Structure

The playable prototype lives in:

`prototype-v1/`

The GitHub Pages deployment source is:

`gh-pages` branch, root folder.

The `docs/` folder on `master` is used as the source content for the `gh-pages` subtree push.

Important files:

- `prototype-v1/index.html`: app shell.
- `prototype-v1/style.css`: full visual styling and responsive layout.
- `prototype-v1/src/main.js`: game loop, UI events, floating command UI, auto phase flow.
- `prototype-v1/src/state.js`: board and run state.
- `prototype-v1/src/pieces.js`: piece definitions and movement rules.
- `prototype-v1/src/ai.js`: auto battle action scoring.
- `prototype-v1/src/round.js`: action execution.
- `prototype-v1/src/combat.js`: capture, wounds, Soul reward, healing.
- `prototype-v1/src/stages.js`: stage definitions.
- `prototype-v1/src/effects.js`: selection, movement, capture effects.
- `prototype-v1/src/ui/boardView.js`: board rendering.
- `prototype-v1/src/ui/overlay.js`: reward/game over/stage clear overlays.

## 14. Known Design Problems

### 14.1 Player Agency Is Not Yet Strong Enough

The player chooses doctrines, but the current impact may be too subtle.

Needed:

- Stronger previews.
- Doctrine-specific action priorities that create visibly different outcomes.
- Better post-turn explanation of why a unit acted.

### 14.2 Auto Battle Can Feel Samey

Because the AI is deterministic, repeated starts can produce similar outcomes.

Possible solutions:

- Controlled randomness.
- Initiative order variation.
- Unit personality.
- Enemy doctrine variation.
- Terrain or temporary board effects.

### 14.3 Touch UX Needs Native Thinking

Current command UI works on mobile, but it is still adapted from desktop.

Needed:

- Tap once to preview doctrine.
- Tap again or confirm button to lock doctrine.
- Dedicated Info button.
- Larger command button spacing on small devices if needed.

### 14.4 Product Identity Needs a Stronger Hook

The strongest hook is not "chess with fantasy pieces." The stronger hook is:

> A dark fantasy auto-tactics chess roguelite where you command intent, not movement.

This should guide future feature decisions.

## 15. Phase 1 Recommendation

Phase 1 should focus only on proving the core loop:

1. Select unit.
2. Choose doctrine.
3. Preview intent.
4. Start turn.
5. Watch satisfying resolution.
6. Understand result.
7. Make a better doctrine choice next turn.

Avoid expanding background art, stage count, or reward complexity until this loop feels good.

Priority improvements:

- Add mobile-friendly doctrine preview/confirm.
- Make doctrine outcomes more distinct.
- Add a small "intent arrow" or predicted target before Start Turn.
- Add turn recap: who moved, who attacked, Soul gained.
- Add enemy intent hints.
- Add small randomness to prevent repeated identical losses.
- Improve capture and Soul feedback.

## 16. Unity Migration Notes

Unity is worth considering if the project moves toward a richer shipped product.

Benefits:

- Better animation timeline control.
- Easier particle effects, shaders, camera movement, and hit pause.
- Better audio mixing.
- Better mobile packaging.
- Stronger asset pipeline for premium presentation.

Costs:

- Slower iteration compared to HTML/CSS/JS.
- Requires rebuilding UI and state architecture.
- Web prototype is still better for fast rule exploration.

Recommendation:

- Keep iterating the rules and UX in the web prototype for Phase 1.
- Move to Unity only after the command/doctrine loop is proven fun.
- When migrating, preserve the game as a deterministic state machine separate from visuals.

Suggested Unity architecture:

- GameState service: board, pieces, turn phase, resources.
- Rules service: legal moves, capture, wounds, rewards.
- AI service: doctrine scoring and action planning.
- Presentation layer: board view, piece view, effects, camera.
- UI layer: HUD, command ring, detail card, warband tray.
- Data assets: ScriptableObjects for pieces, abilities, stages, doctrines.

## 17. Suggested Prompt for ChatGPT

Use this prompt when sharing the spec:

```text
This is the current specification for my game prototype, Spell Chess:

https://github.com/haku-jp/ChessGame/blob/master/SPEC.md

Please review it from these angles:

1. Is the core experience strong enough for a product-level dark fantasy tactics game?
2. Does the auto-battle + player doctrine system create enough player agency?
3. What should Phase 1 focus on to prove the fun?
4. What rules should change to avoid repetitive outcomes or stalemates?
5. What should be changed before considering a Unity migration?

Please give concrete design improvements, not generic advice.
```

## 18. Current Status

Implemented:

- Static web prototype.
- GitHub Pages deployment.
- Desktop and mobile responsive layout.
- Auto battle loop.
- Custom pawn movement.
- Doctrine selection.
- Floating command UI.
- Capture, XP, Soul, wounds.
- Basic stage progression.
- Piece sprites and dark fantasy UI styling.

Not yet product-ready:

- Doctrine impact needs stronger differentiation.
- Touch-specific command UX needs refinement.
- Turn outcome explanation is minimal.
- Progression/reward depth is still early.
- AI produces repetitive lines in some situations.

