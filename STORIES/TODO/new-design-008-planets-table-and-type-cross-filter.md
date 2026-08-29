# new-design-008-planets-table-and-type-cross-filter

**Spec:** STORIES/SPECS/new-design.md

**As a** user browsing a generated sector
**I want** a dense Planets table with relative-size bars and type filtering, reachable directly
by clicking a type card on Overview or Statistics
**So that** I can scan every planet, gauge its relative size and habitability at a glance, and
jump straight from "how many gas giants are there" to the filtered list of them

## Acceptance Criteria

```gherkin
Feature: Planets table (4a) and the type-card cross-filter

  # --- Rows and pagination ---

  Scenario: Planets table paginates at 10 rows per page
    Given "PlanetTable.vue"
    Then it shows 10 rows per page, driven by "TablePager.vue" and store.page.planets

  Scenario: The relative-size bar reflects diameter against the sector maximum
    Given useSectorStats().maxPlanetDiameter
    When a planet's row renders
    Then the bar width is d / maxPlanetDiameter
    And its fill colour precedence is: habitableZone -> green; else type in {G, Q, U} ->
      "linear-gradient(90deg,#8b5cf6,#3b82f6)"; else thermal zone -> red / amber / blue

  # --- Type pills ---

  Scenario: Type pills show the top 8 present types with overflow
    Given the planet type pill strip
    Then it shows the top 8 present types with a trailing "+N" chip when more are present
    When a pill is clicked
    Then it toggles that type in store.planetFilters.types

  # --- Cross-filter from Overview/Statistics (spec §11 Slice 5) ---

  Scenario: Clicking a type card on Overview or Statistics opens a filtered Planets tab
    Given "PlanetTypeDistribution.vue" (built in story 005) rendering type cards on the
      Overview or Statistics tab
    When a type card is clicked
    Then store.planetFilters.types is set to that single type
    And store.activeTab becomes 'planets'
    And the Planets tab renders showing only planets of that type, with its own type-pill strip
      reflecting the active filter

  # --- Names and display (D-10) ---

  Scenario: Planet display names follow D-10
    Given a planet with a defined "name"
    When its row renders
    Then it shows planet.name
    Given a planet with no name
    Then it shows "<star.name> <orbitLetter(orbitalNumber)>" (e.g. "Kepler-442 b" .. "h")

  # --- Panel integration ---

  Scenario: Opening a planet calls store.selectPlanet instead of navigating
    Given a planet row
    When it is clicked
    Then store.selectPlanet(`${starId}-${orbitalNumber}`) is called
    And the click performs no route navigation and does not scroll or re-render the table away
      from its current position
    # PlanetDetailPanel.vue itself does not exist until story 009 (this story does not depend
    # on it), so this story cannot render or verify the panel opening — only that the correct
    # intent is emitted. The end-to-end "clicking a row opens the visible panel" behaviour is
    # built and verified in story 009, which adds the panel's mount point.

  # --- Zone and sort ---

  Scenario: Zone filter and sort bar work per the documented grammar
    Given the zone+sort bar
    When a thermal zone or sort order is selected
    Then the visible rows and their order update accordingly, and pagination resets to page 1

  # --- Display labels and imagery (D-21, D-36, D-37) ---

  Scenario: Every one of the 22 frozen planet codes renders correctly
    Given a planet of each of the 22 codes in PLANET_TYPE_DESCRIPTIONS
    When its row renders
    Then its thumbnail resolves via CelestialThumb.vue with no broken image
    And the type label uses PLANET_SHORT_LABEL where available, falling through to
      PLANET_TYPE_DESCRIPTIONS
    And no story adds, removes or renames a planet type (D-36); no artwork is generated,
      redrawn or copied (D-37)
```

## Technical Notes

**Scope of this story: the Planets tab, plus wiring the type-card cross-filter into the
`PlanetTypeDistribution.vue` cards built in story 005.** Reuses `TablePager.vue` from story 006.

### `PlanetTable.vue` — full rewrite (4a)

10 rows per page. Relative-size bar width `d / maxPlanetDiameter` (from `useSectorStats`, story
002); fill colour precedence: `habitableZone` → green; else type in `{G, Q, U}` →
`linear-gradient(90deg,#8b5cf6,#3b82f6)`; else thermal zone → red / amber / blue (via
`thermalZone()`, story 002). Type pills show the top 8 present types with a trailing `+N` chip;
clicking one toggles `planetFilters.types` (added to the store in story 003).

A row click calls `store.selectPlanet(key)` instead of navigating. **This story does not import
or reference `PlanetDetailPanel.vue` anywhere** — that component does not exist until story 009
(which this story does not depend on), and importing it here would break `cd frontend && npm
run build` the same way an early import of `SystemsTable.vue` would have in story 005. The
click handler's entire responsibility here is calling `store.selectPlanet(key)` (already
available from story 003) and leaving the table's scroll position undisturbed; the panel
component and its mount point are added in story 009.

**D-10 (must hold):** planet display name = `planet.name` when present, otherwise
`` `${star.name} ${orbitLetter(orbitalNumber)}` `` via `planetDisplayName()` (story 002).

### Type-card cross-filter (spec §11 Slice 5: "clicking a type card on Overview lands on a
filtered Planets tab")

Extend the type cards in `PlanetTypeDistribution.vue` (built in story 005, on both the Overview
and Statistics tabs) with a click handler: set `store.planetFilters.types = [type]` and
`store.activeTab = 'planets'`. This is the one piece of story 005's component this story edits;
everything else in `PlanetTypeDistribution.vue` is unchanged. The Planets tab's own type-pill
strip must reflect the resulting filter state so the two controls never disagree.

### Display labels and imagery (D-21, D-36, D-37)

Type labels use `PLANET_SHORT_LABEL` (story 002), falling through to
`PLANET_TYPE_DESCRIPTIONS`. **D-36 (must hold):** all 22 codes render correctly and none is
added, dropped or renamed in the canonical map. **D-37 (must hold):** thumbnails go through
`CelestialThumb.vue` — no new artwork, no copies from the handoff bundle.

### Not touched by this story

`SystemsTable.vue` (story 006), `StarTable.vue` (story 007), `SystemDetailView.vue`,
`PlanetDetailPanel.vue`/`PlanetDetailModal.vue` — this story does not create, stub, or import
either; it only calls `store.selectPlanet(key)`, which is sufficient for its own scope and
leaves the panel's construction and mounting entirely to story 009. Also untouched:
`types/index.ts`, `backend/`.

## Tests

No new pure-module test file — `maxPlanetDiameter` and the thermal/zone helpers are already
covered in story 002. Per D-34, no component tests are added. Verification is this story's own
Gherkin scenarios plus:

- 4a matches its screenshot at a 1280px viewport; filters, sorts and the pager work — manual
  checklist item 1.
- Clicking a type card on Overview lands on a filtered Planets tab — spec Slice 5's stated
  verification.
- Every one of the 22 planet codes renders without a broken `<img>` — success criterion 13
  (shared with story 001's T-F2, exercised here against real generated data).
- `cd frontend && npm run build` succeeds (`vue-tsc` clean) — success criterion 12.

**Priority:** High
**Dependencies:** new-design-005-overview-and-statistics-tabs.md, new-design-006-systems-table.md
