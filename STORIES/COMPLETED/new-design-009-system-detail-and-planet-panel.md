# new-design-009-system-detail-and-planet-panel

**Spec:** STORIES/SPECS/new-design.md

**As a** user exploring a single system
**I want** an orbital map of the primary star's planets and a slide-in planet detail panel that
deep-links by URL
**So that** I can see where a planet sits relative to the habitable zone, read its full profile
without losing my place in the table, and share or reload a link straight to one planet

## Acceptance Criteria

```gherkin
Feature: System detail with orbital map, and the planet detail panel

  # --- System detail shell (1d) ---

  Scenario: System detail shows the primary star's orbital map
    Given "SystemDetailView.vue" and "OrbitalMap.vue"
    Then the header reads "ORBITAL MAP · <primary star name>"
    And the map shows only the primary star's planets
    And a stars rail lists every star in the system with its own planet count, so secondaries
      are not hidden

  Scenario: Orbital projection matches the documented formula
    Given a system's planet distances and its primary's habitable-zone bounds
    When "orbitalScale.ts"'s orbitalProjection computes positions (built in story 002)
    Then domainMin = max(0.05, min(min(a_i), hzInner) * 0.8)
    And domainMax = max(max(a_i), hzOuter) * 1.1
    And x(a) = 4% + 92% * (ln a - ln domainMin) / (ln domainMax - ln domainMin)
    And planet size is 20 + 24 * (d / dMax) px
    And asteroid belts (diameter === 0) render at 14px
    And axis captions print domainMin/domainMax to 2 significant digits

  Scenario: A primary with no planets shows the empty state
    Given a primary star with no planets (an NS/BH primary, or an unlucky roll)
    When the orbital map renders
    Then it shows "no planetary bodies" centred in "#334155"
    And the HZ rules are omitted

  Scenario: The map carries an accessible text summary
    Given the orbital map
    Then a visually-hidden text summary lists each planet's name, type, distance in AU and zone

  Scenario: System detail shows the 5-up KPI strip and breadcrumb
    Given "SystemDetailView.vue"
    Then it shows a breadcrumb bar, a 5-up KPI strip, and a planet table for the system

  # --- Planet detail panel (4b) ---

  Scenario: The panel is 520px, right-anchored, and animates in
    Given "PlanetDetailPanel.vue"
    When it opens
    Then it is 520px wide, right-anchored, and translateX-animates in over 200ms with
      cubic-bezier(.2,.8,.2,1)
    And the table behind it keeps its scroll position

  Scenario: The panel closes on the documented triggers
    Given the panel is open
    When the user clicks "✕", presses "Esc", or clicks the backdrop
    Then the panel closes
    And focus returns to the row that opened it

  Scenario: Focus moves into the panel on open
    Given the panel opening
    Then focus moves to the panel

  Scenario: Panel content follows D-7 (no fabricated facts)
    Given a planet's detail panel
    Then it shows Mass (planet.mass / 5.972e24, "M⊕"), Gravity (planet.gravity / 9.807, "g"),
      Density (mass / ((4/3)π r³) / 1000, "g/cm³"), and a green Life-probability bar
      (planet.lifeProbability * 100, "%")
    And it never shows "Water cover", "O₂ 21%", "liquid water" or "magnetosphere" — none of
      these exist in the model
    And it shows pills: "P <lifeProbability, 2dp>", "C <lifeComplexity, 1dp> / 6",
      "<GOLDILOCKS|HOT|TEMPERATE|COLD>" (thermal zone), "<system.age> Gyr"

  Scenario: The life-probability bar renders even without life
    Given a planet with hasLife === false
    Then the life description block is omitted entirely (as today)
    And the life-probability bar still renders, since it is a real number for any eligible
      planet

  Scenario: The life description reuses the existing prose composer (D-8)
    Given a planet with hasLife === true
    Then the panel's description uses planetLongDescription() from
      "frontend/src/utils/planetDescription.ts" (unchanged)
    And the stage label above it is LIFE_STAGE_LABELS[lifeStageLevel(planet.lifeComplexity)],
      uppercased

  Scenario: Life-by-stage shows all six repo stages (D-9)
    Given the life-by-development-stage section
    Then it shows all six LIFE_STAGE_LABELS bars (Microbial life, Oxygenic photosynthesis,
      Eukaryotic life, Multicellular life, Complex animals, Intelligent life)
    And the teal ramp is #064e3b, #065f46, #0f766e, #0d9488, #10b981, #34d399 across the six
      steps
    And no repo stage is renamed to match the design's illustrative 4-stage copy

  Scenario: The panel is mounted for the Planets-tab flow, completing story 008's intent
    Given "frontend/src/components/ResultsDisplay.vue" (built in story 005; its Planets-tab
      case has, since story 008, called store.selectPlanet(key) on row click with no panel yet
      mounted to show for it)
    When this story completes
    Then ResultsDisplay.vue additively renders "<PlanetDetailPanel v-if=\"store.selectedPlanetKey\">"
      alongside its tab body, so clicking a planet row on the Planets tab (4a) now visibly opens
      the panel
    And this is the only edit made to ResultsDisplay.vue — its tab-switching logic from
      story 005/006 is otherwise untouched

  Scenario: OPEN SYSTEM and COPY JSON work
    Given the panel's action buttons
    When "OPEN SYSTEM" is clicked
    Then it routes to "/system/<systemId>"
    When "COPY JSON" is clicked
    Then it writes JSON.stringify(planet, null, 2) via navigator.clipboard, falling back to a
      hidden textarea + document.execCommand('copy'), and flashes "COPIED" for 1.2s

  # --- Deep link (D-32, success criterion 17) ---

  Scenario: The panel deep-links via a query param
    Given a route with "?planet=<starId>-<orbitalNumber>"
    When the page loads on a freshly generated sector
    Then the panel reopens showing that exact planet

  Scenario Outline: Invalid deep-link values are ignored (§8)
    Given a "?planet=" value of "<value>"
    When the page loads
    Then the param is stripped and no panel opens

    Examples:
      | value          |
      | not-a-key      |
      | 7               |
      | 999999-1       |

  # --- Deletion ---

  Scenario: PlanetDetailModal.vue is deleted
    Given "frontend/src/components/PlanetDetailModal.vue"
    Then it no longer exists
    And its sole prior importer, SystemDetailView.vue, opens PlanetDetailPanel.vue instead
    And planetLongDescription, planetTypeLabel, lifeStageLevel and LIFE_STAGE_LABELS are all
      carried over to the new panel, so no behaviour is lost

  # --- Display labels and imagery (D-21, D-36, D-37) ---

  Scenario: Panel imagery and labels stay within the frozen sets
    Given any planet or star artwork/label shown in the panel or the orbital map
    Then it uses CelestialThumb.vue and the short-label maps from story 002, falling through to
      the canonical long maps
    And no story adds, removes or renames a spectral class or planet type (D-36); no artwork is
      generated, redrawn or copied (D-37)
```

## Technical Notes

**Scope of this story: `SystemDetailView.vue`'s rewrite, the new `OrbitalMap.vue`, the new
`PlanetDetailPanel.vue` (replacing `PlanetDetailModal.vue`), and mounting that panel wherever it
needs to overlay.** This is the last story in the sequence — it completes the panel-open flow
that `PlanetTable.vue` (story 008) already emits via `store.selectPlanet(key)`, by building the
panel itself and mounting it in both places it overlays: `SystemDetailView.vue` (rewritten here)
and `ResultsDisplay.vue` (built in story 005, given one additive edit here — see below).

### `frontend/src/views/SystemDetailView.vue` — replaced

1d: breadcrumb bar, 5-up KPI strip, `OrbitalMap.vue`, stars rail, planet table. Was: per-star
cards with a flat 3-column grid of planet cards.

### `OrbitalMap.vue` (new)

Shows the **primary star only** (header `ORBITAL MAP · <primary star name>`), matching the
design; the stars rail lists every star with its own planet count, so secondaries are not
hidden. Projection from `orbitalScale.ts` (built in story 002):

```
domainMin = max(0.05, min(min(a_i), hzInner) * 0.8)
domainMax = max(max(a_i), hzOuter) * 1.1
x(a)      = 4% + 92% * (ln a − ln domainMin) / (ln domainMax − ln domainMin)
```

Planet size `20 + 24 × (d / dMax)` px; asteroid belts (`diameter === 0`) render at 14px. Axis
captions print `domainMin`/`domainMax` to 2 significant digits. If the primary has no planets
(an `NS`/`BH` primary, or an unlucky roll), the box shows `no planetary bodies` centred in
`#334155` and the HZ rules are omitted. The map carries a visually-hidden text summary listing
each planet's name, type, distance in AU and zone (handoff §Accessibility, success criterion
15).

### `PlanetDetailPanel.vue` (new) — 4b, replaces `PlanetDetailModal.vue`

520px, right-anchored, `translateX` in over 200 ms `cubic-bezier(.2,.8,.2,1)`; the table behind
keeps its scroll position. Closes on `✕`, `Esc` and backdrop click. `OPEN SYSTEM` routes to
`/system/<systemId>`; `COPY JSON` writes `JSON.stringify(planet, null, 2)` via
`navigator.clipboard`, falling back to a hidden `<textarea>` + `document.execCommand('copy')`,
and flashes `COPIED` for 1.2 s. Focus moves to the panel on open and returns to the originating
row on close.

**D-7 content mapping (no fabricated facts):** the 4b "Physical profile" drops `Water cover`
and the life pills drop `O₂ 21%`, `liquid water`, `magnetosphere` — none of these exist in the
model. Replacements, all real:

| Design row | Ships as | Source |
| --- | --- | --- |
| Mass `1.18 M⊕` | Mass, `M⊕` | `planet.mass / 5.972e24` |
| Gravity `1.07 g` | Gravity, `g` | `planet.gravity / 9.807` |
| Density `5.4 g/cm³` | Density, `g/cm³` | `mass / ((4/3)π r³) / 1000` |
| Water cover `66 %` | **Life probability**, `%`, green bar | `planet.lifeProbability * 100` |
| `O₂ 21%` pill | `P 0.42` | `lifeProbability`, 2 dp |
| `liquid water` pill | `C 3.2 / 6` | `lifeComplexity`, 1 dp |
| `magnetosphere` pill | `GOLDILOCKS` / `HOT` / `TEMPERATE` / `COLD` | thermal zone (`thermalZone()`, story 002) |
| `1.1 Gyr` pill | `<system.age> Gyr` | `system.age` |

For a planet with `hasLife === false` the life block is omitted entirely (as today) and the
Life-probability bar still renders (it is a real number for any eligible planet). Use
`massEarths`/`gravityG`/`densityGCm3` from `planetDisplay.ts` (story 002), which return `null`
(→ `—`) for a degenerate planet.

**D-8:** the life description reuses `planetLongDescription()` from
`frontend/src/utils/planetDescription.ts` (already exists, unchanged) — `PlanetDetailModal.vue`
already renders it today, so this is a straight carry-over. The stage label above it is
`LIFE_STAGE_LABELS[lifeStageLevel(planet.lifeComplexity)]`, uppercased.

**D-9:** life-by-development-stage shows all six repo stages, not the design's illustrative
four (Microbial / Simple multicellular / Complex / Intelligent). The repo's canonical ladder —
`LIFE_STAGE_LABELS` 1–6 (Microbial life, Oxygenic photosynthesis, Eukaryotic life, Multicellular
life, Complex animals, Intelligent life) — is scientifically grounded per
`docs/exoplanet-habitability-model.md` and must not be renamed to match the design's sample
copy. Six bars, teal ramp `#064e3b → #065f46 → #0f766e → #0d9488 → #10b981 → #34d399`.

### `frontend/src/components/ResultsDisplay.vue` — one additive edit (mount point)

Story 008 gave `PlanetTable.vue`'s row click a `store.selectPlanet(key)` call with nothing yet
mounted to render the panel it points at, because `PlanetDetailPanel.vue` did not exist until
this story. This story adds `<PlanetDetailPanel v-if="store.selectedPlanetKey" @close="..." />`
to `ResultsDisplay.vue` (alongside its existing tab body), so the Planets-tab flow becomes
visibly complete end-to-end. This is the only change made to `ResultsDisplay.vue` here — its
tab-switching logic (from stories 005/006) is not otherwise touched.

### `PlanetDetailModal.vue` — deleted

Safe per the spec's regression review: it has exactly **one** importer, `SystemDetailView.vue`,
rewritten in this same story. `planetLongDescription`, `planetTypeLabel`, `lifeStageLevel` and
`LIFE_STAGE_LABELS` are all carried over to `PlanetDetailPanel.vue`, so no behaviour is lost.

### Deep link (D-32)

Query param `?planet=<starId>-<orbitalNumber>` on whatever route is current (planets carry no
id, but `(starId, orbitalNumber)` is unique by construction). Wire `store.selectPlanet(key)`
(built in story 003) to also read/write this query param on the router. Invalid or
unresolvable values are ignored and the param is stripped (§8: matches
`/^\d+-\d+$/` **and** resolves to a planet in the current sector; otherwise ignored, param
stripped, no panel).

### Not touched by this story

`SystemsTable.vue` (story 006), `StarTable.vue` (story 007), `PlanetTable.vue` (story 008,
consumed via `store.selectPlanet` only — its own file is not edited). `ResultsDisplay.vue`
**is** touched, but only the single additive mount-point edit described above; its
tab-switching logic is not otherwise touched. Also untouched: `types/index.ts`,
`frontend/src/router/index.ts` (routes stay `/`, `/system/:id`, `/api-reference`,
`/documentation` — the panel is a query param on the existing route, not a new route),
`backend/`.

## Tests

No new pure-module test file — `orbitalProjection` is already covered by `orbitalScale.test.ts`
(T-F28-31) in story 002. Per D-34, no component tests are added. Verification is this story's
own Gherkin scenarios plus the manual checklist:

- 1d and 4b match their screenshots at a 1280px viewport — manual checklist item 1.
- The panel opens from both 4a (Planets table) and 1d (System detail), deep-links, closes on
  `Esc`, and preserves the table's scroll position — spec Slice 6's stated verification.
- Keyboard: `Tab` reaches every control; `Esc` closes the planet panel; focus returns to the
  originating row — manual checklist item 5, success criterion 15.
- The planet panel deep-links: reloading a URL with `?planet=<starId>-<orbitalNumber>` on a
  freshly generated sector reopens the same planet; an invalid value is ignored silently —
  success criterion 17.
- `cd frontend && npm run build` succeeds (`vue-tsc` clean) — success criterion 12.

**Priority:** High
**Dependencies:** new-design-002-derived-data-layer.md, new-design-008-planets-table-and-type-cross-filter.md
