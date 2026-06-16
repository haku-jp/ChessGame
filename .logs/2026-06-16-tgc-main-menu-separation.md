# TGC main menu separation

## Context

The prior battle UI pass placed the battle entry under the collection screen, which mixed the collection and battle flows.

## Changes

- Added a top-level Hearthstone-style main menu with Battle, Collection, and Pack entries.
- Removed battle start controls from the collection screen.
- Changed app view state to `menu`, `collection`, and `battle`.
- Added menu return controls from collection and battle.
- Kept `tgc` and `docs/tgc` in sync.

## Verification

- `node tgc\tests\battle-ui-smoke.test.js`
- `node --check tgc\app.js`
- `node --check docs\tgc\app.js`
- Browser checked:
  - initial load shows only `mainMenu`
  - collection route does not include battle start controls
  - battle route shows 36 cells, 6 portrait pieces, and 5 hand cards
