# new-design-004-parameter-rail-kpi-strip-and-states

**Spec:** STORIES/SPECS/new-design.md

**As a** user generating a sector
**I want** the new 300px parameter rail with logarithmic sliders and a live density gauge, a
permanent KPI strip, and clear empty/generating/error states
**So that** I can set up and run a generation with the numbers I care about visible at a glance,
without a slider silently overwriting another field, and with an explicit way to restore or
clear my last parameters

## Acceptance Criteria

```gherkin
Feature: Parameter rail, KPI strip, and generation states

  # --- Rail shell and layout (D-31) ---

  Scenario: The rail is shown only on the Overview tab
    Given "frontend/src/views/HomeView.vue"'s new 300px + 1fr grid
    When activeTab is 'overview'
    Then the parameter rail is visible
    When activeTab is any other tab
    Then the rail is hidden, the body goes full width, and the sub-header reads
      "SECTOR <seed> · <ZONE> ZONE · <volume> pc³"
    And on mobile the rail is reachable via the sticky "PARAMETERS ▲" sheet on every tab

  # --- Logarithmic sliders (D-18, success criterion 5) ---

  Scenario: Both sliders are logarithmic and directly editable
    Given "SectorControls.vue"'s systems slider (range 1-5000) and volume slider (range 10-100000)
    When either slider is dragged
    Then the value follows logScale.ts's fromSlider mapping
    And the KPI-style numeric value beside each label is a click-to-edit number input showing
      the exact value
    And editing the number input clamps it to the field's documented range on blur

  Scenario: Out-of-range validation matches the documented rules (§8)
    Given systemCount edited below 1 or above 5000
    Then the field border turns red, an inline mono 9px hint reads "1 - 5 000", and
      "GENERATE SECTOR" is disabled at 40% opacity
    Given sectorVolume edited below 10 or above 100000
    Then the same treatment applies with hint "10 - 100 000 pc³"
    Given systemCount > 2000
    Then the "GENERATE SECTOR" button's helper caption reads "large sectors may take several
      seconds", and generation is not blocked

  # --- Zone segmented control ---

  Scenario: Zone is a single-select segmented control
    Given the five zones "extragalactic | galactic edge | medium | central zone | core"
    When one is selected
    Then store.zone updates to exactly that value; no other selection state is reachable

  # --- Density gauge (D-17, D-27, success criterion 4) ---

  Scenario: The density gauge updates live with no side effects (D-16)
    Given the existing density formula
      "currentStarDensity = (systemCount / sectorVolume) * AVG_STARS_PER_SYSTEM"
      with AVG_STARS_PER_SYSTEM = 1.71, and DENSITY_MAP (extragalactic 0.001, galactic edge
      0.01, medium 0.14, central zone 1.0, core 10.0)
    When the systems slider or the volume slider moves
    Then the gauge marker and verdict update immediately
    And no other field (systemCount, sectorVolume, zone) changes as a side effect
    And there is no [sectorVolume, zone] -> systemCount auto-suggest watcher anywhere in the
      rewritten component

  Scenario Outline: Density verdict buckets match the existing thresholds (D-17)
    Given ratio = currentStarDensity / DENSITY_MAP[zone]
    When the gauge renders
    Then the label and colour family are:

    Examples:
      | ratio    | label       | colour |
      | < 0.05   | VERY SPARSE | slate  |
      | < 0.5    | SPARSE      | slate  |
      | <= 2.0   | REALISTIC   | green  |
      | <= 10    | DENSE       | amber  |
      | else     | VERY DENSE  | red    |

  Scenario: Gauge marker position and caption (§7.7)
    Given the 2px gauge rail "linear-gradient(90deg,#475569,#10b981 45%,#f59e0b 75%,#ef4444)"
    Then the marker position is clamp((log10(current/expected) + 2) / 4, 0, 1), so ratio 1 sits
      at 50%, where a faint expected tick is drawn
    And the caption reads "expected <DENSITY_MAP[zone]> · marker at current"

  # --- Restore / clear (D-15, success criteria 7 and 8) ---

  Scenario: The auto-restore modal is gone
    Given "SectorControls.vue"
    Then no modal appears on mount, whatever localStorage holds
    And "defineExpose" is removed from the component

  Scenario: RESTORE LAST SECTOR appears only with a complete saved parameter set
    Given "EmptyState.vue"
    When store.hasSavedParams is true
    Then a "RESTORE LAST SECTOR" button is shown
    When it is clicked
    Then generation re-runs with the saved seed, systemCount, sectorVolume and zone, reproducing
      the previous sector exactly (same counts, same seed) — because generation is deterministic
    When store.hasSavedParams is false
    Then the button is not shown

  Scenario: CLEAR MEMORY empties storage and resets parameters
    Given the rail's "CLEAR MEMORY" button
    When clicked
    Then store.clearPersistentMemory() runs: localStorage['universe-generator-sector-params'] is
      emptied and systemCount/sectorVolume/zone reset to 100/1000/'medium'

  # --- Seed ---

  Scenario: An empty seed randomises on submit
    Given the seed field left empty
    When "GENERATE SECTOR" is submitted
    Then handleSubmit randomises via Math.floor(Math.random() * 1000000), as today

  # --- Generate / Cancel (D-19, D-20, success criterion 6) ---

  Scenario: GENERATE SECTOR shows the animated progress panel
    When "GENERATE SECTOR" is clicked
    Then "GeneratingState.vue" mounts, showing the five D-19 stages and the elapsed counter
      driven by useGenerationProgress
    And on success the results replace the panel; on failure a "Generation failed" card shows
      store.error in mono 11px with a working "RETRY" button that re-issues the same request

  Scenario: CANCEL restores the previous sector
    Given a generation in flight, and a previously generated sector
    When "CANCEL" is clicked
    Then the request aborts via AbortController and the previous sector is displayed again
    Given no previous sector existed
    Then the empty state is shown instead

  # --- KPI strip (D-27, success criterion 3) ---

  Scenario: The KPI strip is visible on every tab and never shows placeholders
    Given "KpiStrip.vue"
    When rendered on any of the five tabs
    Then it is visible
    And it never shows "NaN", "undefined" or "Infinity" — numerals show "—" while data is
      loading

  Scenario: KPI progress rails use a log-of-value scale (D-27)
    Given the sample strip values 140 / 239 / 812 / 1204 / 27
    When each rail's width is computed as ln(1 + value) / ln(1 + max(all strip values))
    Then the widths are approximately 70 / 77 / 94 / 100 / 47 percent
    And each rail takes its cell's accent colour

  # --- Empty state copy (D-15, §7.7 4c) ---

  Scenario: Empty state shows the exact handoff copy
    Given "EmptyState.vue" with no sector generated
    Then it shows eyebrow "READY", headline "Generate your first sector", the body copy about
      24 star types / 22 planet types / moons and habitable zones / deterministic seeds, a 4-up
      parameter preview (SYSTEMS, VOLUME, ZONE, SEED — showing "random" in violet when no seed
      is set), both buttons, and the four micro-links ("24 star types", "22 planet types",
      "deterministic seeds", "Documentation" -> /documentation)

  # --- Loading / skeleton state ---

  Scenario: Tables render skeleton rows while loading
    Given a table awaiting data
    Then it renders 8 ".ug-skeleton" rows, never a spinner that collapses the layout

  # --- Top bar LED extension (deferred from story 001) ---

  Scenario: The top bar LED gains the GENERATING state
    Given "AppTopBar.vue" now also reading store.generationStatus
    When generationStatus is 'running'
    Then the LED shows blue "GENERATING", overriding the online/offline colour from
      useBackendHealth for that duration

  # --- Mobile action bar ---

  Scenario: MobileActionBar sticks to the bottom on small viewports
    Given a viewport under 768px
    Then "MobileActionBar.vue" sticks to the bottom with "PARAMETERS ▲" (opens the rail as a
      sheet) and "GENERATE", both with padding: 13px for a >=44px touch target
```

## Technical Notes

**Scope of this story: the rail, KPI strip, empty/generating/error states, and `HomeView.vue`'s
new shell.** The tab *bodies* (Overview panel, Statistics, tables) are built in stories 005-008;
`HomeView.vue` here hosts the **old** `ResultsDisplay.vue` unchanged inside the new grid so the
app stays runnable end-to-end after this story, exactly as spec Slice 3 describes ("`HomeView.vue`'s
new shell hosting the old `ResultsDisplay` body untouched for now").

### `frontend/src/components/SectorControls.vue` — full rewrite

1a parameter rail: log sliders (D-18), 5-up zone segmented control, density gauge (D-17, D-27),
seed field + reroll, `GENERATE SECTOR` / `RESET` / `CLEAR MEMORY`. **Removed:** the restore
modal (D-15) and its "No, start fresh" branch (superseded by `CLEAR MEMORY` in the rail); the
`[sectorVolume, zone] → systemCount` auto-suggest watcher (D-16) — named caller was only this
component; `defineExpose` (the `HomeView.vue` imperative bridge `setLoading`/`setError`/
`updateStats` is dropped in favour of store state).

**D-18 slider mapping** — `frontend/src/utils/logScale.ts` (built in story 002):
`value(t) = round(exp(ln(min) + t·(ln(max) − ln(min))))`, `t ∈ [0,1]` from an
`<input type="range" min="0" max="1000" step="1">`; volume additionally snaps to the nearest 10.
Ranges: systems `1 … 5 000`, volume `10 … 100 000 pc³`. The KPI-style value beside each label
row is a click-to-edit number input so exact values stay reachable. The store's and backend's
wider bounds (volume up to 10 000 000) are unchanged; the slider simply does not reach them.
The store-level clamps that exist today (`watch(systemCount)` → 1…5 000,
`watch(sectorVolume)` → 10…1 000 000) are kept.

**D-17 density formula (preserved verbatim, presentation only changes):**
`currentStarDensity = (systemCount / sectorVolume) × AVG_STARS_PER_SYSTEM`,
`AVG_STARS_PER_SYSTEM = 1.71`. `DENSITY_MAP`: extragalactic 0.001, galactic edge 0.01,
medium 0.14, central zone 1.0, core 10.0. Thresholds on `ratio = current / expected`:

| ratio | Label (existing) | Design colour family |
| --- | --- | --- |
| `< 0.05` | `VERY SPARSE` | slate |
| `< 0.5` | `SPARSE` | slate |
| `<= 2.0` | `REALISTIC` | green |
| `<= 10` | `DENSE` | amber |
| else | `VERY DENSE` | red |

Gauge rail `linear-gradient(90deg,#475569,#10b981 45%,#f59e0b 75%,#ef4444)`; marker position
`clamp((log10(current/expected) + 2) / 4, 0, 1)`, ratio 1 at 50% with a faint expected tick.
Caption `expected <DENSITY_MAP[zone]> · marker at current`.

**D-16 (must hold):** the auto-suggest watcher is gone. This is a deliberate, user-endorsed
behaviour change — moving the volume slider or changing the zone must never overwrite
`systemCount`. The density gauge is the non-destructive replacement guidance channel.

**D-15 (must hold):** the modal is gone; `RESTORE LAST SECTOR` lives in `EmptyState.vue`, wired
to `store.hasSavedParams` (built in story 003) and re-running `generateSector` with the saved
params. `CLEAR MEMORY` calls `store.clearPersistentMemory()`.

**Validation (§8):**

| Field | Rule | On violation |
| --- | --- | --- |
| `systemCount` | integer, `1 ≤ n ≤ 5 000` | red border, mono 9px hint `1 – 5 000`, `GENERATE SECTOR` disabled at 40% opacity |
| `sectorVolume` | integer, `10 ≤ v ≤ 100 000` | same treatment, hint `10 – 100 000 pc³` |
| `zone` | one of the five values | not reachable — segmented control |
| `seed` | integer `≥ 0`, or empty | empty is legal: randomised via `Math.floor(Math.random() * 1000000)` |

Business rule: density is advisory, never blocking — a `VERY DENSE` verdict still generates.
`systemCount > 2 000` shows the helper caption `large sectors may take several seconds` but does
not block generation.

**CSS:** the scoped range-input styling currently in `SectorControls.vue` is replaced by the
shared `input[type=range]` rule added to `style.css` in story 001 — remove the scoped block here.

### `frontend/src/views/HomeView.vue` — replaced

1a shell: `grid-template-columns: 300px 1fr`, rail + KPI strip + tabs region (D-31: rail only on
Overview). Keeps `handleGenerate` / `handleReset`, dropping the `controlsRef` imperative bridge
in favour of store state (`store.generationStatus`, `store.error`, etc.). **For this story, the
tab body slot still renders the old, unmodified `ResultsDisplay.vue`** — tab switching and the
new tab bodies land in stories 005-008. The sub-header text
(`SECTOR <seed> · <ZONE> ZONE · <volume> pc³`) shown when the rail is hidden reads from the
store's existing `currentSeed`/`zone`/`sectorVolume`.

### `KpiStrip.vue` (new)

Visible on every tab of the results area (success criterion 3). Numerals `—` until data lands,
never `NaN`/`undefined`/`Infinity`. **D-27 progress rail formula:**
`width = ln(1 + value) / ln(1 + max(all values in the strip))`. Against the sample data
(140 / 239 / 812 / 1 204 / 27) this yields 70 / 77 / 94 / 100 / 47%. Each rail takes its cell's
accent colour.

### `EmptyState.vue` (new)

Exact handoff copy (§7.7 4c): eyebrow `READY`, headline *"Generate your first sector"*, body
*"24 star types, 22 planet types, moons and habitable zones from scientific probability
distributions. Same seed, same universe, every time."*, a 4-up parameter preview (`SYSTEMS`,
`VOLUME`, `ZONE`, `SEED` — showing `random` in violet when no seed is set), the two buttons
(`GENERATE SECTOR`, and `RESTORE LAST SECTOR` per D-15 gated on `store.hasSavedParams`), and the
four micro-links (`24 star types`, `22 planet types`, `deterministic seeds`,
`Documentation` → `/documentation`).

### `GeneratingState.vue` (new)

Renders `useGenerationProgress()` (built in story 003): five stages advancing on the 250 ms
timer, progress bar capped at 95% until the response lands then snapping to 100%, elapsed
counter ticking every 100 ms. `CANCEL` button drives `AbortController.abort()` through the
store's `generateSector(request, signal)` (D-20); on abort the store restores the pre-request
snapshot or falls back to the empty state.

### Loading / error (§7.7)

Tables render 8 `.ug-skeleton` rows (the class is defined in `style.css` from story 001); KPI
numerals show `—` until data lands; the layout never collapses to a spinner. On error the tab
body shows a compact card: `Generation failed`, `store.error` in mono 11px, and a `RETRY`
button that re-issues the same request.

### `useGenerationProgress.ts` — already built in story 003

This story is the first consumer; no changes to the composable itself expected here unless the
rail's integration surfaces a gap.

### `MobileActionBar.vue` (new)

Sticks to the bottom under 768px with `PARAMETERS ▲` (opens the rail as a sheet) and
`GENERATE`, both `padding: 13px` for a ≥44px touch target.

### `AppTopBar.vue` — small extension (deferred from story 001)

Story 001 shipped the LED with only the green/red `online`/`offline` states from
`useBackendHealth`, because `store.generationStatus` did not exist yet. This story adds the
third branch: blue `GENERATING` while `store.generationStatus === 'running'`, overriding the
online/offline colour for that duration — completing the mapping described in spec §7.4.

### Not touched by this story

`frontend/src/components/ResultsDisplay.vue` and every tab component (still the pre-redesign
versions — rewritten in stories 005-008), `frontend/src/views/SystemDetailView.vue`,
`frontend/src/components/PlanetDetailModal.vue`, `frontend/src/types/index.ts`, `backend/`.

## Tests

No new pure-module tests are introduced by this story (the store-level tests T-F42-48 were
already added in story 003, which this story now has UI consumers for). Verification is this
story's own Gherkin scenarios above plus the manual checklist:

- Reloading with saved parameters shows `RESTORE LAST SECTOR`; using it reproduces the previous
  sector exactly (identical systems/stars/planets counts and seed) — success criterion 7.
- `CLEAR MEMORY` empties `localStorage['universe-generator-sector-params']` and resets the
  parameters to 100 / 1000 / `medium` — success criterion 8.
- Generate → cancel mid-flight → previous sector still displayed — manual checklist item 3.
- Offline backend → red LED, `BACKEND OFFLINE`, error card with a working `RETRY` — manual
  checklist item 6.
- 390px, 800px, 1100px and 1440px viewports for the rail, KPI strip and states — manual
  checklist item 7.
- `cd frontend && npm run build` succeeds (`vue-tsc` clean) — success criterion 12.

**Priority:** Critical
**Dependencies:** new-design-001-design-foundation-and-app-shell.md, new-design-002-derived-data-layer.md, new-design-003-store-generation-and-ui-state.md
