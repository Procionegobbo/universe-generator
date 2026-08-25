# life-on-planets-004-frontend-planet-life-display

**Spec:** STORIES/SPECS/life-on-planets.md

**As a** sector explorer using the web UI
**I want** to filter the planets list by presence of life, see a life column and proper name in
the table, and see the full life picture (presence, stage, probability, complexity) in a planet's
detail view
**So that** I can find and understand which generated worlds might be inhabited

## Acceptance Criteria

```gherkin
Feature: Frontend planet life display and filter

  # --- Display-stage utility ---

  Scenario: lifeStageLevel clamps the raw complexity into a 1-6 display stage (decision #6)
    Given "frontend/src/utils/lifeStage.ts"
    When lifeStageLevel(complexity) is called
    Then it returns clamp(round(complexity), 1, 6)
    And this clamp is applied only where a planet's hasLife is true — the raw API lifeComplexity
      is never itself clamped

  # --- LIFE_STAGE_LABELS constant ---

  Scenario: Frontend type module declares the life stage labels
    Given "frontend/src/types/index.ts"
    Then it exports LIFE_STAGE_LABELS mapping 1-6 to "Microbial life", "Oxygenic photosynthesis",
      "Eukaryotic life", "Multicellular life", "Complex animals", "Intelligent life"
    Alongside the existing PLANET_TYPE_DESCRIPTIONS, in the same file and style

  # --- Planets table ---

  Scenario: Planets table gains a Life filter defaulting to "All"
    Given "frontend/src/components/PlanetTable.vue"
    When the component renders
    Then a "Life" filter select is shown next to the existing Goldilocks filter, with options
      All / With life / Without life, defaulting to "All"
    And with "All" selected, the visible rows are unchanged from before this story

  Scenario: Life filter narrows the table to matching planets
    Given the Life filter set to "With life"
    Then only planets with hasLife === true are shown
    Given the Life filter set to "Without life"
    Then only planets with hasLife === false are shown

  Scenario: Life filter resets pagination
    Given the table is on a page other than 1
    When the Life filter changes
    Then pagination resets to page 1 (hasLife is added to the existing pagination-reset watch)

  Scenario: Planets table gains a Life column
    Given a planet row in the table
    Then the Life column shows a green badge with the stage label when hasLife is true
    And shows "—" when hasLife is false

  Scenario: Inhabited planets show their proper name in the Description cell
    Given a planet with hasLife === true and a defined name
    Then the Description column renders the planet's name as a bold line above the existing type
      description

  Scenario: Search matches planet names as well as existing fields
    Given the existing search box
    When the search text matches an inhabited planet's proper name
    Then that planet appears in the filtered results
    And the existing search behaviour over other fields is unchanged

  Scenario: Existing filters, pagination, sorting and row click-through still work
    Given the type filter, the Goldilocks filter, search, pagination and sorting
    Then all continue to behave exactly as before this story

  # --- Planet detail modal ---

  Scenario: Modal title becomes the planet's proper name when present
    Given "frontend/src/components/PlanetDetailModal.vue"
    And a planet with hasLife === true and a defined name
    When its detail modal opens
    Then the title shows the planet's name
    And the type description is demoted to the existing subtitle line (mirrors the
      "ID: {{ star.starId }}" treatment in SystemDetailView.vue)

  Scenario: Modal title falls back to the type description when uninhabited
    Given a planet with hasLife === false (no name)
    When its detail modal opens
    Then the title shows the type description exactly as before this story

  Scenario: Modal shows a life block below the Goldilocks block
    Given any planet's detail modal
    Then a life section is shown below the existing Goldilocks block, showing:
      | field                            |
      | presence of life (hasLife)       |
      | stage label (via lifeStageLevel) |
      | lifeProbability as a percentage  |
      | lifeComplexity to one decimal    |
    And the existing Goldilocks ring and stats list are otherwise untouched

  # --- System detail view ---

  Scenario: System detail page shows the system age
    Given "frontend/src/views/SystemDetailView.vue"
    When a system's detail page is rendered
    Then "Age: {{ system.age }} Gyr" is shown in the system info card next to the coordinates

  Scenario: Each planet card shows its name and a life marker when inhabited
    Given a planet card on the system detail page
    When the planet has hasLife === true
    Then its proper name is shown, and a small life marker is shown
    Given a planet with hasLife === false
    Then no name or life marker is shown, matching prior behaviour

  # --- Build health ---

  Scenario: Frontend build and tests stay green
    When "cd frontend && npm run build" runs
    Then vue-tsc passes with the updated System/Planet types used across all touched files
    When "cd frontend && npm test" runs
    Then all tests pass
```

## Technical Notes

**No new components, composables, store actions or routes.** One new utility module
(`frontend/src/utils/lifeStage.ts`), the shared type addition (`LIFE_STAGE_LABELS`), and
template/script edits to three existing files. Follow the existing `<script setup>` + Tailwind
conventions. No frontend component tests are added (decision #24 — unchanged from
`system-names.md` decision #15: `frontend/package.json` has no `@vue/test-utils`; frontend
changes are verified by `vue-tsc` during `npm run build` plus the updated store fixture).

**`frontend/src/utils/lifeStage.ts`** (new):

```ts
export function lifeStageLevel(complexity: number): number {
    return Math.min(6, Math.max(1, Math.round(complexity)));
}
```

The presence of life implies at least milestone level 1 (prokaryotes), so a realised biosphere is
never shown as "level 0" — this clamp is display-only; the API's raw `lifeComplexity` (which can
be below 1 for an inhabited planet whose `C_index` computed under 1) is never itself modified.
Call this only for planets with `hasLife === true`.

**`LIFE_STAGE_LABELS`** — added to `frontend/src/types/index.ts`, alongside the existing
`PLANET_TYPE_DESCRIPTIONS` (same file, same style):

```ts
// Evolutionary milestones from docs/exoplanet-habitability-model.md, Part 2.
export const LIFE_STAGE_LABELS: Record<number, string> = {
    1: 'Microbial life',
    2: 'Oxygenic photosynthesis',
    3: 'Eukaryotic life',
    4: 'Multicellular life',
    5: 'Complex animals',
    6: 'Intelligent life'
};
```

**Life badge styling** reuses the existing green Goldilocks vocabulary so the two read as related
but distinct — Goldilocks keeps its ring (`ring-2 ring-green-400/60`), life gets an emerald pill
in the existing pill idiom
(`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-700/80 text-emerald-100`),
matching `PlanetTable.vue:68-72` and `getZoneColor`.

**`PlanetTable.vue`**:
- Add a `Life` filter select (All / With life / Without life) next to the Goldilocks filter,
  encoded the same way as the existing `goldilocksFilter` (`'' | '1' | '0'`).
- Add a `Life` column rendering the emerald badge with `LIFE_STAGE_LABELS[lifeStageLevel(planet.lifeComplexity)]`
  when `planet.hasLife`, `—` otherwise.
- Render `planet.name` as a bold line above the type description in the `Description` column,
  only when present.
- Extend the search predicate to also match `planet.name`.
- Add `hasLife` to the existing `watch` that resets pagination (alongside whatever the Goldilocks
  filter already resets on).
- Existing filters, pagination, sorting, row click-through and the statistics block are untouched.

**`PlanetDetailModal.vue`**:
- Title becomes `planet.name` when present, with the type description demoted to the existing
  subtitle line (mirrors the `ID: {{ star.starId }}` treatment in `SystemDetailView.vue:58`).
- Add a life block below the existing Goldilocks block showing: presence (`hasLife`), the stage
  label (`LIFE_STAGE_LABELS[lifeStageLevel(planet.lifeComplexity)]`, only meaningful when
  `hasLife`), `lifeProbability` rendered as a percentage, and `lifeComplexity` to one decimal.
- The `planet` prop type is unchanged (fields come from the shared interface, already updated in
  story 003); the existing Goldilocks ring and stats list are untouched.

**`SystemDetailView.vue`**:
- Show `Age: {{ system.age }} Gyr` in the system info card next to the coordinates.
- On each planet card, show `planet.name` when present and a small life marker when
  `planet.hasLife`.
- Template-only. `getSystemById(route.params.id)` still resolves by numeric id;
  `getThermalZone`/`getZoneColor` are untouched.

**Not touched by this story:** `frontend/src/stores/sectorStore.size.test.ts` — its fixture
already carries `age`, `lifeProbability`, `lifeComplexity` and `hasLife` as of story 003 (test 49
lives there: story 003 is the one that makes those fields required, so it owns keeping this
file — the repo's only literal `System`/`Planet` constructor — compiling; deferring it here would
have left `cd frontend && npm run build` broken at the story 003 boundary). Also not touched:
`frontend/src/components/ResultsDisplay.vue` (Systems tab life filter — story 005),
`frontend/src/views/ApiReferenceView.vue` and `frontend/src/views/DocumentationView.vue`
(story 005), `frontend/src/composables/useSectorApi.ts`, `frontend/src/stores/sectorStore.ts`
(logic), `frontend/src/components/StarTable.vue`, `frontend/src/components/SectorVisualization3D.vue`,
`frontend/src/components/SectorControls.vue`, `frontend/src/views/HomeView.vue`,
`frontend/src/utils/planetImages.ts`, `frontend/src/utils/starColors.ts`.

## Tests

This story adds no new spec-numbered test (test 49 belongs to story 003 — see Technical Notes).
Verification is build health plus this story's own Gherkin scenarios above:

- `cd frontend && npm run build` passes `vue-tsc` with the updated types used across
  `PlanetTable.vue`, `PlanetDetailModal.vue` and `SystemDetailView.vue`.
- `cd frontend && npm test` passes.
- The planets-table and detail-modal behaviours here are the subject of this story's own Gherkin
  scenarios above; the spec's compound manual test 51 (which also covers the Systems-tab filter)
  is verified in full as part of life-on-planets-005, once that story's dependency on this one is
  satisfied.

**Priority:** High
**Dependencies:** life-on-planets-003-generator-wiring-types-and-api-contract.md
