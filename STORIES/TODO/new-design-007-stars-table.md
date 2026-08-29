# new-design-007-stars-table

**Spec:** STORIES/SPECS/new-design.md

**As a** user browsing a generated sector
**I want** a Stars index built to the same shell as the Systems index — filterable, sortable,
paginated, with class thumbnails
**So that** I can scan every star in the sector the same way I scan systems, including quick
presets for planet-bearing, habitable-zone-bearing, and exotic stars

## Acceptance Criteria

```gherkin
Feature: Stars table (D-23, built by analogy to 3a)

  # --- Columns and shell ---

  Scenario: Stars table matches 3a's shell exactly
    Given "StarTable.vue"
    Then it uses the same filter bar grammar (search field + segmented preset + sort pill +
      right-hand mini-counters) as SystemsTable.vue
    And the same row rhythm and the same footer pager ("TablePager.vue" from story 006)

  Scenario: Columns match the documented widths
    Given a star row
    Then columns are "ID 40px · STAR 190px · CLASS 112px · SYSTEM 1fr · PLANETS 52px · HZ 46px
      · MOONS 52px"
    And CLASS includes a 20px class thumbnail

  # --- Presets and counters ---

  Scenario Outline: Presets filter the star list
    Given the preset control set to "<preset>"
    Then only stars matching "<rule>" are shown

    Examples:
      | preset       | rule                                    |
      | ALL          | every star                              |
      | WITH PLANETS | star has at least one planet            |
      | HZ > 0       | star has at least one habitable-zone planet |
      | EXOTIC       | spectral class is BH or NS              |

  Scenario: Mini-counters reflect the filtered set
    Given the right-hand mini-counters
    Then "n SHOWN" reflects the current filter/search result count
    And "n CLASSES" (violet) reflects the number of distinct spectral classes shown
    And "n EXOTIC" (red) reflects the count of BH/NS stars shown

  # --- Names, IDs and search ---

  Scenario: Star names render verbatim from the payload (D-11)
    Given a star with a "Kepler-442-A" style component name or a designation
    When its row renders
    Then the name is shown exactly as received, with no reformatting

  Scenario: Search matches the same grammar as Systems
    Given store.starFilters.query, trimmed and case-insensitive
    When it matches a star's name or its containing system's name/id
    Then that star is shown

  Scenario: Filter, preset and sort changes reset pagination
    Given the table on a page other than 1
    When any filter, preset, or sort control changes
    Then store.page.stars resets to 1

  # --- Display labels and imagery (D-21, D-36, D-37) ---

  Scenario: Every one of the 24 frozen spectral classes renders correctly
    Given a star of each of the 24 classes in STAR_TYPE_DESCRIPTIONS
    When its row renders
    Then the CLASS thumbnail resolves via CelestialThumb.vue (thumbs size, 20px) with no broken
      image, and DB/DF/DG/DK all show the star-DA.png artwork
    And the class label uses STAR_SHORT_LABEL where available, falling through to
      STAR_TYPE_DESCRIPTIONS
    And no story adds, removes or renames a spectral class (D-36); no artwork is generated,
      redrawn or copied (D-37)
```

## Technical Notes

**Scope of this story: the Stars tab only**, reusing `TablePager.vue` built in story 006.

### `StarTable.vue` — full rewrite (D-23)

**The STARS tab has no design screen; it is built by analogy to 3a.** The handoff documents
Overview, Statistics, Systems, Planets, System detail, Planet panel, states and mobile — but the
tab bar in every screenshot includes `STARS · 239`, and `StarTable.vue` exists today. It ships
with 3a's exact shell: the same filter bar grammar (search field + segmented preset + sort pill
+ right-hand mini-counters), the same row rhythm, the same footer pager (`TablePager.vue`).

**Columns:** `ID 40px · STAR 190px · CLASS 112px · SYSTEM 1fr · PLANETS 52px · HZ 46px ·
MOONS 52px`, plus a 20px class thumbnail in `CLASS` (via `CelestialThumb.vue`, story 001).

**Presets:** `ALL`, `WITH PLANETS`, `HZ > 0`, `EXOTIC` (`BH`/`NS`).

**Counters:** `n SHOWN`, `n CLASSES` (violet), `n EXOTIC` (red).

**D-11 (must hold):** star names render verbatim from the payload — no reformatting of
`UG-0006` designations or `Kepler-442-A` component names.

Filter state is `store.starFilters` (`{ query, preset, sort }`, added to the store in story 003)
and `store.page.stars` for pagination, following the exact pattern established by
`SystemsTable.vue` in story 006.

### Display labels and imagery (D-21, D-36, D-37)

Class labels use `STAR_SHORT_LABEL` (story 002), falling through to `STAR_TYPE_DESCRIPTIONS`.
**D-36 (must hold):** all 24 spectral classes render correctly and none is added, dropped or
renamed. **D-37 (must hold):** thumbnails go through `CelestialThumb.vue`; `DB`/`DF`/`DG`/`DK`
continue to alias to `star-DA.png` (already handled by the untouched `getStarImage`) — no new
artwork, no copies from the handoff bundle.

### Not touched by this story

`SystemsTable.vue` (story 006, consumed via the shared `TablePager.vue` only), `PlanetTable.vue`
(story 008), `SystemDetailView.vue` (story 009), `types/index.ts`, `backend/`.

## Tests

No new pure-module test file — this story is presentation only. Per D-34, no component tests
are added. Verification is this story's own Gherkin scenarios plus:

- The Stars tab matches the same visual rhythm as 3a at a 1280px viewport (no dedicated design
  screen exists, per D-23 — verify against 3a's screenshot by analogy) — manual checklist
  item 1.
- All 24 spectral classes render without a broken `<img>` — success criterion 13 (shared with
  story 001's T-F3, exercised here against real generated data).
- `cd frontend && npm run build` succeeds (`vue-tsc` clean) — success criterion 12.

**Priority:** Medium
**Dependencies:** new-design-006-systems-table.md
