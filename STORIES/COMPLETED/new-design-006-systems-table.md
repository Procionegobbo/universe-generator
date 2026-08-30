# new-design-006-systems-table

**Spec:** STORIES/SPECS/new-design.md

**As a** user browsing a generated sector
**I want** a dense, paginated Systems index with a per-row orbit profile, search and sort
**So that** I can scan every system, see its planetary layout at a glance, and jump to the ones
that match what I'm looking for

## Acceptance Criteria

```gherkin
Feature: Systems table (3a)

  # --- Rows and pagination ---

  Scenario: Systems index paginates at 12 rows per page
    Given "SystemsTable.vue" fed by useSectorStats().systemRows
    Then it shows 12 rows per page with a caption "SHOWING 1-12 OF 140" (or the real total)
    And "TablePager.vue" drives page navigation, storing the current page in
      store.page.systems

  Scenario: The ID column is zero-padded, minimum 3 digits (D-12)
    Given a system with systemId 1, 140, and 1204
    When the ID column renders
    Then it shows "001", "140", and "1204" respectively — never truncated

  Scenario: Names render verbatim from the payload (D-11)
    Given a system with a UG-nnnn designation or a Kepler-442-A style component name
    When the row renders
    Then the name is shown exactly as received, with no reformatting (no inserted space, no
      changed hyphenation)

  # --- Orbit profile ---

  Scenario: Orbit profile draws the system's planets in orbital order
    Given a system's planets ordered by orbitalNumber
    When the row's orbit profile renders
    Then each planet's circle size is 10 + 18 * (d / dMax_row) px, rounded
    And the gap is 7px for up to 8 planets, 14px for more
    And a planet with habitableZone: true gets a green 2px ring

  Scenario: A system with no planets shows the empty caption
    Given a system whose primary has no planets
    When its orbit profile renders
    Then it shows "no planetary bodies" in "#334155"

  Scenario: Life-bearing systems are highlighted
    Given a system containing at least one life-bearing planet
    When its row renders
    Then it carries the ".ug-row-life" class

  # --- Filter bar ---

  Scenario: Filter bar children never wrap
    Given the systems filter bar (search field + segmented preset + sort pill + right-hand
      mini-counters)
    Then every child is "flex-none whitespace-nowrap" and never wraps, at any documented
      viewport

  Scenario: Search matches name or systemId (§8)
    Given store.systemFilters.query, trimmed and case-insensitive
    When it matches a system's name or systemId
    Then that system is shown
    When nothing matches
    Then "No systems match the current filters." is shown in "#475569"

  Scenario: Filter and sort changes reset pagination
    Given the table on a page other than 1
    When any filter, preset, or sort control changes
    Then store.page.systems resets to 1

  # --- Display labels and imagery (D-21, D-36, D-37) ---

  Scenario: Primary star class renders through the short label and existing artwork
    Given a system row's primary star
    Then its class uses STAR_SHORT_LABEL where available, falling through to
      STAR_TYPE_DESCRIPTIONS otherwise, and any thumbnail goes through CelestialThumb.vue
    And no story adds, removes or renames a spectral class or planet code (D-36), and no
      artwork is generated, redrawn or copied (D-37)

  # --- Finishing ResultsDisplay.vue's Systems-tab wiring (owned by this story) ---

  Scenario: ResultsDisplay's Systems tab now renders SystemsTable.vue
    Given "frontend/src/components/ResultsDisplay.vue", whose 'systems' case story 005 left
      pointed at the pre-redesign inline Systems tab markup as a temporary stopgap
    When this story completes
    Then the 'systems' case is swapped to import and render "SystemsTable.vue"
    And the carried-over inline markup and its filteredSystems/paginatedSystems computeds are
      deleted from ResultsDisplay.vue
    And no aggregation logic of any kind remains in ResultsDisplay.vue

  # --- Loading / skeleton state (carried here from story 004 by story 004b) ---

  Scenario: Tables render skeleton rows while loading
    Given a table awaiting data
    Then it renders 8 ".ug-skeleton" rows, never a spinner that collapses the layout
```

## Technical Notes

**Scope of this story: the Systems tab only**, plus `TablePager.vue`, a new shared component
reused unchanged by the Stars tab (story 007) and the Planets tab (story 008) — build it once
here.

### Loading state — 8 `.ug-skeleton` rows

While the table is awaiting data it renders **8 `.ug-skeleton` rows**, never a spinner and never
a collapsed layout. `.ug-skeleton` is already defined in `frontend/src/style.css` from story 001
and is unused until a table story consumes it. This criterion was written into story 004, which
owns no table; story 004b carried it here.

### `SystemsTable.vue` (new) — 3a

12 rows per page (`SHOWING 1–12 OF 140`). Reads `useSectorStats().systemRows` (built in story
002: one row per system — id, name, `hasProperName`, primary star, star/planet/moon/HZ counts,
`hasLife`, `hasBH`, `hasNS`, coords, ordered planets). Filter-bar children are `flex-none
whitespace-nowrap` — they must never wrap. Rows with life get `.ug-row-life` (defined in
`style.css`, story 001).

**D-12:** the `ID` column is the zero-padded `systemId`, minimum 3 digits (`001`, `140`,
`1204`), never truncating.

**D-11 (must hold):** star and system names render verbatim from the payload — `UG-0006`
designations and `Kepler-442-A` component names (hyphen) are **not** reformatted. Renaming would
break the search-by-name affordance and contradict `backend/src/lib/naming.ts`.

**Validation (§8):** `systemFilters.query` — free text, trimmed, case-insensitive; matches
system `name` or `systemId`; no match → `No systems match the current filters.` in `#475569`.

### `OrbitProfile.vue` (new)

The system's planets in `orbitalNumber` order, `size = 10 + 18 × (d / dMax_row)` px rounded,
`gap` 7px (≤ 8 planets) or 14px, green 2px ring on `habitableZone`. Empty → `no planetary
bodies` in `#334155`.

### `TablePager.vue` (new) — shared

Footer pager component; page state is read/written to the relevant `store.page.*` field
(`systems` here, `stars` in story 007, `planets` in story 008). Built once, imported unchanged
by all three table stories.

### `frontend/src/components/ResultsDisplay.vue` — finishing the Systems-tab wiring (owned here)

Story 005 built `ResultsDisplay.vue` as a thin tab host but, since `SystemsTable.vue` did not
exist yet, deliberately left its `'systems'` case pointed at the pre-redesign inline Systems tab
markup (its own `filteredSystems`/`paginatedSystems` computeds), carried over verbatim as a
stopgap. **This story removes that stopgap:** swap the `'systems'` case to import and render
`SystemsTable.vue` (built above), and delete the carried-over inline markup and computeds. After
this edit, `ResultsDisplay.vue` contains no aggregation logic anywhere — completing the claim
story 005 could not yet make in full. This is a small, additive edit to an existing file; no
other part of `ResultsDisplay.vue` (the Overview/Statistics/Stars/Planets cases) is touched.

### Display labels and imagery (D-21, D-36, D-37)

Any spectral-class label shown for the primary star uses `STAR_SHORT_LABEL` (story 002),
falling through to `STAR_TYPE_DESCRIPTIONS`. **D-36 (must hold):** no new class or type is
introduced, none is dropped, none is renamed in the canonical maps. **D-37 (must hold):** any
thumbnail goes through `CelestialThumb.vue` (story 001) — no artwork is generated, redrawn,
re-exported, renamed or copied out of the handoff bundle.

### Not touched by this story

`StarTable.vue`, `PlanetTable.vue` (stories 007-008), `SystemDetailView.vue` (story 009),
`SectorTabs.vue`/`OverviewPanel.vue`/`SectorStatistics.vue` (story 005, consumed not modified).
`ResultsDisplay.vue` **is** touched, but only the narrow edit described above (the `'systems'`
case) — none of its Overview/Statistics/Stars/Planets wiring from story 005 is altered. Also
untouched: `types/index.ts`, `backend/`.

## Tests

No new pure-module test file — `systemRows` is already covered by `useSectorStats.test.ts`
(story 002). Per D-34 this story adds no component tests. Verification is this story's own
Gherkin scenarios plus:

- 3a matches its screenshot at a 1280px viewport; filters, sort and the pager work — manual
  checklist item 1, spec Slice 5's stated verification.
- Search, pagination reset, and the empty-filter message behave per §8.
- 768-1023px viewport: the table drops the `COORDINATES` column (§7.7 4d) — manual checklist
  item 7.
- `cd frontend && npm run build` succeeds (`vue-tsc` clean) — success criterion 12.

**Priority:** High
**Dependencies:** new-design-005-overview-and-statistics-tabs.md
