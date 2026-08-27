# life-planet-types-002-wire-per-planet-display-surfaces

**Spec:** STORIES/SPECS/life-planet-types.md

**As a** player viewing a generated sector
**I want** each planet's label and description shown in the detail modal, the planets table and the system view to reflect whether life actually arose on it and how far it got
**So that** I stop being told a sterile Jungle-type world is "covered in dense jungles" and inhabited worlds get prose that agrees with the life-stage badge next to it

## Acceptance Criteria

```gherkin
Feature: Life-aware planet labels and descriptions in the UI

Scenario: Sterile Jungle planet shown as a Rain World in the modal
  Given a Jungle-type planet with hasLife = false
  When its detail modal is opened
  Then the title, subtitle and image alt text read "Rain World"
  And the long description paragraph ends with "...completely sterile."

Scenario: Inhabited planet's description agrees with its life-stage badge
  Given a planet with hasLife = true and a life state of 1 (Microbial life)
  When its detail modal is opened
  Then the long description's final sentence describes microbial life
  And it agrees with the "Microbial life" badge rendered beneath it

Scenario: Planet table row reflects the life-aware label
  Given a Jungle-type planet with hasLife = false
  When the planets table is rendered
  Then the row's description cell and its image alt text read "Rain World" instead of "Jungle Planet"

Scenario: System detail view card reflects the life-aware label
  Given a Jungle-type planet with hasLife = false
  When its card is rendered in the system detail view
  Then the card's title attribute, rendered text and image alt text read "Rain World"

Scenario: Type-level surfaces remain unaffected
  Given the planet type filter dropdown, the PlanetTable type-distribution list and the ResultsDisplay type-distribution chart
  When the sector view is rendered
  Then all three continue to read PLANET_TYPE_DESCRIPTIONS directly and still show "Jungle Planet" for type "J", regardless of any individual planet's life state

Scenario: Search predicate is unchanged
  Given the planets table search box
  When a query is entered
  Then it still matches only planetType, starId, orbitalNumber and name, never the rendered label

Scenario: Existing filters and pagination are unaffected
  Given the type filter, the Goldilocks filter, the life filter and pagination controls on the planets table
  When they are used
  Then their behaviour is identical to before this change

Scenario: Build succeeds with no orphaned imports or helpers
  When the frontend is built
  Then vue-tsc compiles cleanly, and the old getPlanetTypeDescription (in PlanetDetailModal.vue) / getPlanetDescription (in SystemDetailView.vue) helpers and their now-unused imports are removed
```

## Technical Notes

**Scope for this slice:** template and script edits only, in the three files below. No new data or logic is introduced here — everything is imported from `frontend/src/utils/planetDescription.ts` (life-planet-types-001). `PlanetTable.vue` keeps its local `getPlanetTypeDescription` helper and `PLANET_TYPE_DESCRIPTIONS` import because the type filter dropdown and the type-distribution list are still type-level and must not change.

### `frontend/src/components/PlanetDetailModal.vue`

Replace the local `getPlanetTypeDescription` / `getPlanetTypeLongDescription` helpers (lines 67-70) with `planetTypeLabel(planet)` and `planetLongDescription(planet)`. Drop the now-unused `PLANET_TYPE_DESCRIPTIONS` / `PLANET_TYPE_LONG_DESCRIPTIONS` imports, keeping `LIFE_STAGE_LABELS`.

```ts
import { LIFE_STAGE_LABELS } from '../types';
import { planetLongDescription, planetTypeLabel } from '../utils/planetDescription';
import { lifeStageLevel } from '../utils/lifeStage';
```

Template bindings to update (structure and classes unchanged) — title line 7, subtitle line 8, description line 16, `<img :alt>` line 6:

```html
<img :src="getPlanetImage(planet.planetType, 'medium')" :alt="planetTypeLabel(planet)" … />
<h2 …>{{ planet.name || planetTypeLabel(planet) }}</h2>
<div v-if="planet.name" …>{{ planetTypeLabel(planet) }}</div>
…
<div class="text-gray-300 italic text-center">{{ planetLongDescription(planet) }}</div>
```

The `planet` prop type, the Goldilocks ring, the life block, the stats list and the close handler are untouched.

### `frontend/src/components/PlanetTable.vue`

Add `import { planetTypeLabel } from '../utils/planetDescription';`. Keep the existing `getPlanetTypeDescription` helper and `PLANET_TYPE_DESCRIPTIONS` import — the filter dropdown (line 26) and the type-distribution list (line 146) still use it, correctly, at type level. Change only the row `Description` cell (line 86) and the row `<img :alt>` (line 76):

```html
<img :src="getPlanetImage(planet.planetType, 'thumbs')" :alt="planetTypeLabel(planet)" … />
…
<td class="text-gray-400 text-sm">
    <div v-if="planet.name" class="font-bold text-gray-100">{{ planet.name }}</div>
    {{ planetTypeLabel(planet) }}
</td>
```

Do not touch the search predicate (`PlanetTable.vue:234-239`, matches `planetType`, `starId`, `orbitalNumber`, `name` only — decision #11 explicitly rejects widening it), the type/Goldilocks/life filters, pagination, sorting, the row click-through, the statistics block or the distribution chart.

### `frontend/src/views/SystemDetailView.vue`

Add `import { planetTypeLabel } from '../utils/planetDescription';`. Replace `getPlanetDescription(planet.planetType)` with `planetTypeLabel(planet)` in all three places on the planet card: the `<img :alt>` (line 79), the `:title` attribute (line 92) and the rendered text (line 93). Remove the now-unused local `getPlanetDescription` helper (line 190) and the `PLANET_TYPE_DESCRIPTIONS` import (line 132), keeping `STAR_TYPE_DESCRIPTIONS`.

Caveat: `selectedPlanet` is `ref(null)` and `openPlanetDetail(planet: any)` (lines 192-195), so inside that handler `planet` is `any`. `planetTypeLabel` accepts the structurally-typed `PlanetDescriptionInput` (`Pick<Planet, 'planetType' | 'hasLife' | 'lifeComplexity'>`) from life-planet-types-001, and the card-loop variable is the fully-typed `Planet` from `store.sectorData.planets`, so `vue-tsc` is satisfied without widening the existing `any`. Do **not** change that `any` — it is pre-existing and out of scope for this story.

### Compiler constraint

`"noUnusedLocals": true` and `"noUnusedParameters": true` in `frontend/tsconfig.json` make removing each orphaned helper and import **mandatory**: leaving `getPlanetTypeDescription` in `PlanetDetailModal.vue`, `getPlanetDescription` in `SystemDetailView.vue`, or an orphaned `PLANET_TYPE_LONG_DESCRIPTIONS` import behind fails `vue-tsc` and therefore fails `npm run build`.

## Tests

- Manual check: generate a sector, open the planets table, filter to a Jungle planet without life — the description cell reads "Rain World"; open its modal and the paragraph ends "…completely sterile."
- Manual check: filter to "With life", open an inhabited planet at stage 1 — the modal paragraph's final sentence describes microbial life and agrees with the "Microbial life" badge directly beneath it.
- Regression: `cd frontend && npm run build` passes `vue-tsc` with no unused-import/unused-local errors.
- Regression: `cd frontend && npm test` passes, including `sectorStore.test.ts` and `sectorStore.size.test.ts`, with no fixture edits (no interface changed).
- Regression: the type filter dropdown, the PlanetTable type-distribution list and the ResultsDisplay type-distribution chart still read `PLANET_TYPE_DESCRIPTIONS` directly and are visually unchanged.
- Regression: the search box, the Goldilocks filter, the life filter and pagination behave exactly as before.

**Priority:** High
**Dependencies:** life-planet-types-001-description-data-model-and-resolution-module.md
