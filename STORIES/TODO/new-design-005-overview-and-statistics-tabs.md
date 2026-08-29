# new-design-005-overview-and-statistics-tabs

**Spec:** STORIES/SPECS/new-design.md

**As a** user reviewing a generated sector
**I want** a tab bar with five tabs, an Overview tab summarising the sector at a glance, and a
Statistics tab with the full distribution breakdown
**So that** I can see the headline picture immediately and drill into the numbers behind it,
with the same figures agreeing everywhere they appear

## Acceptance Criteria

```gherkin
Feature: Overview and Statistics tabs

  # --- Tab bar (D-30) ---

  Scenario: The tab bar always has five tabs
    Given "SectorTabs.vue"
    Then it shows "OVERVIEW · STATISTICS · SYSTEMS · n · STARS · n · PLANETS · n"
    And activeTab is store state ('overview' | 'statistics' | 'systems' | 'stars' | 'planets'),
      not a route

  Scenario: ResultsDisplay becomes a thin tab host
    Given "frontend/src/components/ResultsDisplay.vue"
    Then it renders "SectorTabs" and switches on store.activeTab between "OverviewPanel" (new,
      this story), "SectorStatistics" (new, this story), the pre-existing "StarTable.vue" and
      "PlanetTable.vue" (unchanged imports — they compile as-is and are rewritten in place by
      stories 007/008), and a 'systems' case that carries over the pre-redesign inline Systems
      tab markup and its filteredSystems/paginatedSystems computeds **verbatim** as a temporary
      stopgap
    And aggregation for the Overview and Statistics tabs moves to "useSectorStats" — no
      aggregation logic for those two tabs remains in this file
    # SystemsTable.vue does not exist until story 006 (it is genuinely new, unlike
    # StarTable.vue/PlanetTable.vue which already exist on disk today) — this story must not
    # import it. Story 006 removes the carried-over inline Systems markup/computeds and swaps
    # the 'systems' case to import SystemsTable.vue, at which point no aggregation logic
    # remains in this file at all.

  Scenario: The 3D View button is gone (D-24)
    Given the old ResultsDisplay's 3D view button
    Then it is removed along with ResultsDisplay's old body
    And "SectorVisualization3D.vue" and the "three" dependency remain in the repo, unreferenced
    And the "vendor-three" manualChunks entry in vite.config.ts is left in place (inert, no
      chunk emitted since nothing imports "three")

  # --- Overview panel (1a right column) ---

  Scenario: Overview shows the spectral distribution, all present classes (D-29)
    Given "SpectralDistribution.vue" fed by useSectorStats().spectralDistribution
    Then it shows every present spectral class, count descending
    And on viewports under 768px it shows only the top 5 rows plus a "Show all N classes"
      disclosure

  Scenario: Overview shows the planet type distribution as top-8 cards (D-29)
    Given "PlanetTypeDistribution.vue" on the Overview tab
    Then it shows the top 8 present types in a grid-cols-4 layout
    And shows a trailing "+N" chip when more than 8 types are present

  Scenario: Notable systems picks the top 4 deterministically (D-28)
    Given "NotableSystems.vue" fed by useSectorStats().notableSystems
    Then it lists at most 4 systems, ranked by planets-with-life count desc, then
      habitable-zone planet count desc, then planet count desc, then systemId asc

  Scenario: Thermal zone occupancy is shown
    Given "ThermalZoneBar.vue" fed by useSectorStats().thermalOccupancy
    Then it shows the hot/goldilocks/temperate/cold split, each zone conveyed by a text badge,
      never colour alone (success criterion 15)

  # --- Statistics tab (2a) ---

  Scenario: Statistics shows six KPI cells with sub-captions
    Given "SectorStatistics.vue"
    Then it shows six KPI cells with sub-captions matching the pattern of "1.71 stars each",
      "N classes present", "3.40 per star", "1.48 per planet", "11.0% of planets",
      "across N systems"

  Scenario: Spectral bars carry the expected-share tick
    Given the Statistics tab's spectral distribution bars
    Then each carries a 1px white tick at expectedShare(zone, cls) (from expectedStarShares.ts,
      built in story 002)
    And a legend reads "— tick = share expected for a <Zone> zone"

  Scenario: Planet type distribution shows every present type (D-29)
    Given the Statistics tab's planet type section
    Then it shows all present types in a wrapping grid-cols-8 under the heading
      "PLANET TYPE DISTRIBUTION · N OF 22 TYPES PRESENT"

  Scenario: The generation run card reads from lastStats
    Given "SectorStatistics.vue"'s "GENERATION RUN" card
    Then "TIME" reads store.lastStats.generationTimeMs, alongside ZONE, VOLUME and DENSITY
    And the fixed note "Re-running with the same seed, volume and zone reproduces this sector
      exactly." is shown

  # --- Consistency across screens ---

  Scenario: The same aggregate numbers agree everywhere they appear
    Given the KPI strip, the Overview tab, and the Statistics tab
    When all three render the same sector
    Then every shared number (counts, ratios, distributions) is sourced from the same
      useSectorStats() call and is identical across all three surfaces

  # --- Display labels and imagery (D-21, D-36, D-37) ---

  Scenario: Distribution rows use the dense short labels
    Given a spectral class or planet type row on Overview or Statistics
    Then it renders via STAR_SHORT_LABEL / PLANET_SHORT_LABEL (built in story 002), falling
      through to the existing long maps in types/index.ts for any class/type with no short entry
    And no story adds, removes or renames an entry in STAR_TYPE_DESCRIPTIONS or
      PLANET_TYPE_DESCRIPTIONS (D-36)
```

## Technical Notes

**Scope of this story: the tab shell plus the Overview and Statistics tab bodies.** The
Systems/Stars/Planets table tabs are stubs at this point (built in stories 006-008) — this
story's `SectorTabs.vue` must switch correctly to whatever those tabs render once they exist,
but does not need their content to be finished to be independently verifiable: verify Overview
and Statistics against their screenshots (1a right column, 2a) with the tab bar showing correct
counts.

### `SectorTabs.vue` (new, D-30)

Five tabs on every screen: `1a` shows `OVERVIEW · SYSTEMS · STARS · PLANETS` conceptually but
ships as `OVERVIEW · STATISTICS · SYSTEMS · n · STARS · n · PLANETS · n` per the handoff's state
table (`ui.activeTab: overview | statistics | systems | stars | planets`). Drives
`store.activeTab` (built in story 003); does not touch the router.

### `frontend/src/components/ResultsDisplay.vue` — replaced

Thin host: renders `SectorTabs` and switches on `store.activeTab` between `OverviewPanel`,
`SectorStatistics`, the pre-existing `StarTable.vue` and `PlanetTable.vue` (unchanged imports —
safe, since both files already exist on disk today and are only rewritten *in place* by later
stories), and — **for this story only** — a `'systems'` case that keeps the pre-redesign inline
Systems tab markup and its `filteredSystems`/`paginatedSystems` computeds exactly as they are
today.

**Why the stopgap:** `SystemsTable.vue` is genuinely new (unlike `StarTable.vue`/`PlanetTable.vue`)
and is built exclusively in story 006, which depends on this story. If this story's `'systems'`
case imported `SystemsTable.vue`, the file would not exist yet and `cd frontend && npm run
build` would fail. Keeping the old inline markup verbatim for the `'systems'` case means the app
stays fully functional and buildable at the end of this story — matching the "each slice ends
with the app running" principle used throughout this story set (the same pattern story 004 used
for the rest of `ResultsDisplay.vue`).

Aggregation for the Overview and Statistics tabs moves to `useSectorStats` (story 002) — this
file must contain no new `getPlanetsInSystem`-style recomputation for those two tabs. The
carried-over Systems-tab computeds are the one exception, and only until story 006 removes them.
**Story 006 owns finishing this file**: it replaces the `'systems'` case with an import of
`SystemsTable.vue` and deletes the carried-over inline markup/computeds, at which point no
aggregation logic remains in `ResultsDisplay.vue` at all.

**D-24 (must hold):** `SectorVisualization3D.vue` is left in place, unreferenced. The `3D View`
button disappears with `ResultsDisplay.vue`'s old body. Per the project's "mention dead code,
don't delete it" convention, the file, the `three` dependency and the `vendor-three` entry in
`vite.config.ts`'s `manualChunks` all stay — the `manualChunks` branch becomes inert (no `three`
in the graph → no chunk emitted), which is harmless. This is the one piece of the redesign that
leaves an orphan; do not delete any of the three artifacts above.

### `OverviewPanel.vue` (new) — 1a right column

Assembles `SpectralDistribution.vue`, `PlanetTypeDistribution.vue`, `ThermalZoneBar.vue`,
`NotableSystems.vue` against `useSectorStats(sector)`.

### `SpectralDistribution.vue` (new)

**D-29:** shows every present spectral class, count descending — the sample sector's 8 classes
are not a cap. Mobile (`<768px`) shows the top 5 rows plus a `Show all N classes` disclosure,
collapsing to `22px 1fr 34px` per §7.7 4d.

### `PlanetTypeDistribution.vue` (new)

**D-29:** on Overview (1a), top 8 present types in `grid-cols-4` with a trailing `+N` chip when
more are present. On Statistics (2a), all present types in a wrapping `grid-cols-8` under the
heading `PLANET TYPE DISTRIBUTION · N OF 22 TYPES PRESENT`.

### `ThermalZoneBar.vue` (new)

Reads `useSectorStats().thermalOccupancy` (`{ hot, goldilocks, temperate, cold }`). Per success
criterion 15, every zone must be conveyed by a text badge, never colour alone.

### `NotableSystems.vue` (new, D-28)

Top 4 by: planets-with-life count desc → habitable-zone planet count desc → planet count desc →
`systemId` asc. Deterministic, seed-stable, and reproduces the design's mix (life-bearing
systems first, then large/interesting ones).

### `SectorStatistics.vue` (new) — 2a

Six KPI cells with sub-captions (`1.71 stars each`, `N classes present`, `3.40 per star`,
`1.48 per planet`, `11.0% of planets`, `across N systems`). Spectral bars carry the 1px white
expected tick at `expectedShare(zone, cls)` (built in story 002); legend `— tick = share
expected for a <Zone> zone`. Planet type distribution per D-29 (see above). `GENERATION RUN`
card reads `TIME` from `store.lastStats.generationTimeMs` (populated by the store extension in
story 003), `ZONE`, `VOLUME`, `DENSITY`, plus the fixed note *"Re-running with the same seed,
volume and zone reproduces this sector exactly."*

When the rail is hidden on this tab (D-31), the sub-header reads
`SECTOR <seed> · <ZONE> ZONE · <volume> pc³`.

### Display labels and imagery (D-21, D-36, D-37)

Distribution rows/cards use `STAR_SHORT_LABEL` / `PLANET_SHORT_LABEL` (built in story 002),
falling through to the existing `STAR_TYPE_DESCRIPTIONS` / `PLANET_TYPE_DESCRIPTIONS` long maps
for anything with no short entry. **D-36 (must hold):** no component in this story may add,
remove or rename an entry in either canonical map — both stay exactly the closed 24-class /
22-code sets. Any thumbnail rendered here goes through `CelestialThumb.vue` (story 001), so
**D-37 (must hold)** is inherited: no artwork is generated, redrawn or copied here.

### Not touched by this story

`SystemsTable.vue` — this story does **not** create it, stub it, or import it; the `'systems'`
tab case keeps the pre-existing inline markup instead (see above). The content of
`StarTable.vue` and `PlanetTable.vue` (stories 007-008 rewrite them in place; this story only
imports them unchanged). Also untouched: `SystemDetailView.vue`,
`PlanetDetailPanel.vue`/`PlanetDetailModal.vue`, `types/index.ts`, `backend/`.

## Tests

No new pure-module test file is introduced by this story — the aggregates it renders
(`spectralDistribution`, `planetTypeDistribution`, `thermalOccupancy`, `notableSystems`) are
already covered by `useSectorStats.test.ts` (T-F32-41) in story 002; `expectedStarShares.test.ts`
(T-F24-27) already covers the expected-share tick math. Per D-34 this story adds no component
tests. Verification is this story's own Gherkin scenarios plus:

- 1a's right column and all of 2a match their screenshots at a 1280px viewport — manual
  checklist item 1.
- The same numbers agree across the KPI strip, Overview and Statistics — success criterion 3
  (no `NaN`/`undefined`/`Infinity`) and the "one aggregate source" design decision in spec §3.
- `cd frontend && npm run build` succeeds (`vue-tsc` clean) — success criterion 12.

**Priority:** High
**Dependencies:** new-design-004-parameter-rail-kpi-strip-and-states.md
