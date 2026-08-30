# new-system-view-003-per-star-orbital-maps

**Spec:** STORIES/SPECS/new-system-view.md

**As a** reader viewing a multi-star system's detail page
**I want** every star that has planets to show its own orbital map, not just the primary
**So that** a secondary's planets have a picture too, instead of appearing only in the table with
nothing on screen to show their positions

## Acceptance Criteria

**This story is deliberately separable and droppable.** It carries S-4, the one contested decision
in the spec (a departure from `new-design.md` §1d "OrbitalMap shows the primary star only"). If
S-4 is overridden on review, story 002 alone is already a coherent, shippable screen — dropping
this story does not require unpicking 001 or 002.

Uses the existing `KEPLER` fixture (G primary star 1 with 4 planets, M secondary star 2 with 1
planet) and `EXOTIC` fixture (NS primary star 9 with 0 planets, M secondary star 10 with 1
planet).

```gherkin
Feature: One orbital map per star that has planets

  Scenario: One map per non-empty group
    Given the KEPLER system is open
    Then exactly two OrbitalMap components are rendered
    And the one inside [data-star-group="1"] receives star.starId 1 and 4 planets
    And the one inside [data-star-group="2"] receives star.starId 2 and 1 planet

  Scenario: A map draws only its own star's planets
    Given the KEPLER system is open
    Then group 2's [data-map-planet] keys are exactly ["2-1"]
    And group 1's [data-map-planet] keys are exactly ["1-1", "1-2", "1-3", "1-4"]

  Scenario: Each map is headed by its own star
    Given the KEPLER system is open
    Then group 2's [data-map-header] reads "ORBITAL MAP · KEPLER-442 B"

  Scenario: A barren star renders no map and states its emptiness
    Given the EXOTIC system is open
    Then [data-star-group="9"] contains no [data-orbital-map]
    And its [data-star-empty="9"] reads "No planets orbit this star."
    And [data-star-group="10"] contains a map and the planet row "10-1"

  Scenario: No OrbitalMap is rendered outside a star block
    Given any system with at least one star is open
    Then every OrbitalMap component in the page has a [data-star-group] ancestor
    And the old top-level, primary-only map block no longer exists

  Scenario: The projection is unchanged per group
    Given the KEPLER system is open
    Then group 1's map node positions match
      orbitalProjection([0.4, 1.0, 2.5, 8.13], hzInner('G'), hzOuter('G'))
    And its sizing rule (20 + 24 × d/dMax px, belts at 14px) and axis captions
      ("0.32 AU" / "8.9 AU") still hold

  Scenario: The HZ-caption merge still works, per map
    Given the KEPLER system is open
    Then the existing narrow / wide / re-split / unmeasured HZ-caption behaviour runs
      against [data-map-box] inside [data-star-group="1"] specifically, not against a
      bare document-wide selector

  Scenario: Each map keeps its accessible text summary
    Given the KEPLER system is open
    Then group 2's [data-map-summary] p reads "Orbital map of Kepler-442 B: 1 body."

  Scenario: OrbitalMap's own empty state stays covered, mounted directly
    Given OrbitalMap is mounted directly with an NS star and an empty planets array
    Then it renders [data-map-empty] reading "no planetary bodies" in rgb(51, 65, 85)
    And it renders no [data-hz-rule], no [data-map-planet] and no [data-map-axis]
    And its [data-map-summary] p reads "Orbital map of UG-0007-A: no planetary bodies."
```

## Technical Notes

**Files touched:** `frontend/src/views/SystemDetailView.vue` (template-only change — no new
computed is needed; `groups` from story 002 already carries `group.star` and `group.planets`),
`frontend/src/components/systemDetail.dom.test.ts` (modify — rewrite the map-specific describe
blocks). Depends on story 002.

**S-4 · The change, and why it's here.** The single primary-only map at the top is removed; each
non-empty group gets its own map. Reasons (from the spec, restated so this story is
self-explanatory):
- A primary-only map above a page whose list is organised per star was two contradictory
  organising ideas on one screen.
- Each map is scaled to *its own* star's habitable-zone bounds
  (`habitableZoneBounds(spectralClass)`); a secondary's planets cannot be read against the
  primary's HZ rules, so there is no correct way to show them on one shared map.
- `OrbitalMap.vue` itself is **not modified** — it already takes `star` + `planets` props and is
  already mounted twice elsewhere (full on 1d, `compact` in the planet panel). It is given
  `variant="full"` (its default) and no `highlightKey` (S-15 — recorded as a future improvement,
  not done here).
- Accepted cost: a system whose stars all bear planets shows more than one 150px map, making the
  page taller. Bounded — `determineStarCount()` returns at most 4, and S-3 already removes the map
  for every barren star (the common secondary).

**Template change.** Remove the top-level block entirely:

```html
<!-- DELETE -->
<div class="border-b border-line-strong px-[18px] py-[16px]">
    <OrbitalMap v-if="row.primaryStar" :star="row.primaryStar" :planets="primaryPlanets" />
</div>
```

Add the map inside each non-empty group, directly after the header, before the planet grid (same
padding the top map had):

```html
<template v-else>
  <div class="px-[18px] py-[16px]">
    <OrbitalMap :star="group.star" :planets="group.planets" />
  </div>

  <div class="overflow-x-auto">
    <!-- … the planet grid from story 002, unchanged … -->
  </div>
</template>
```

The `v-if="group.planets.length === 0"` empty-message branch (story 002) is unchanged; it is the
`v-else` branch above that now also carries the map.

**Script cleanup.** `primaryPlanets` becomes unused once the top-level block is deleted — remove
it. `groups` (story 002) is unchanged; its `star: group.star` field, unread until now, is what the
new `<OrbitalMap :star="group.star" ...>` binding reads.

**S-17 · Open risk, restated.** Each `OrbitalMap` registers a `window.resize` listener and a
`ResizeObserver` on mount and tears both down on unmount. Mounting up to 4 instead of 1 means up to
four listeners on this screen — bounded by `determineStarCount()` ≤ 4, and teardown is already
exercised by the planet panel's `compact` map. Judged safe, but verify: the DOM tests must
`unmount()` every wrapper in `afterEach` (already the pattern in `systemDetail.dom.test.ts`), and
the narrow-width HZ-caption tests must target a **specific** group's map (see the HZ-caption
scenario above), not "the" map.

**Constraints carried from the governing spec, restated here:**
- **D-36** — no spectral class or planet code is added, removed or renamed. `OrbitalMap.vue`
  itself is not modified.
- **D-37** — `frontend/public/images/` untouched; `CelestialThumb` used as-is (unchanged inside
  `OrbitalMap`).
- No new class needed in `frontend/src/style.css`.
- `backend/**`, `backend/src/types/index.ts`, `frontend/src/types/index.ts` untouched — confirm
  with `git diff` after this story that none of these paths, nor `frontend/src/style.css` nor
  `frontend/public/images/`, show any change across the whole feature (spec §12 success criterion
  15).
- No `v-html` is introduced (spec §12 success criterion 16).

## Tests

From spec §10.2 (`frontend/src/components/systemDetail.dom.test.ts`, jsdom project):

- Items 16–18: one map per non-empty group; a map draws only its own star's planets; each map is
  headed by its own star.
- Item 19: a barren star renders no map and states its emptiness; its non-barren sibling still
  gets a map. **Supersedes, rather than duplicates, story 002's "A star with no planets shows its
  own empty message" scenario** (same `[data-star-empty="9"]` text, on the same `EXOTIC` fixture):
  extend that existing `it()` in `systemDetail.dom.test.ts` to add the `[data-orbital-map]`
  absence/presence assertions for groups 9 and 10, rather than adding a second `it()` that
  re-asserts the same message text.
- Item 20: the projection, sizing rule and axis captions are unchanged, re-pointed at group 1's
  map.
- Item 21: the HZ-caption merge (narrow/wide/re-split/unmeasured) is re-pointed at
  `[data-map-box]` inside `[data-star-group="1"]`.
- Item 28: each map's accessible summary still names its own star.

Rewrite the existing describe blocks that pinned the single top-level map (`OrbitalMap — the
primary star only`, `OrbitalMap — the documented projection`, `OrbitalMap — the HZ captions at
narrow widths`, and the "renders one OrbitalMap, for the system primary" case) per the items
above — these are the ones story 002 deliberately left untouched.

From spec §10.3 — relocated coverage:

- Item 34: `OrbitalMap`'s own empty-state coverage (`no planetary bodies` in `rgb(51, 65, 85)`, no
  HZ rules, no map planets, no axis, and the summary text) is **re-expressed, not deleted**, as a
  direct `mount(OrbitalMap, { props: { star: <an NS star>, planets: [] } })` in the same test
  file — because the view no longer has a route to this state once the barren star's own map is
  never mounted.

From spec §10.4 — manual verification (run `npm run dev`, generate a sector, open a multi-star
system from the Systems tab):

- Each star heads its own block, primary first, every planet under the right star.
- A star with no planets shows its header and the one-line message, with no empty map box.
- Clicking a planet in a secondary's block opens the panel for that planet, the URL gains
  `?planet=<starId>-<orbitalNumber>`, and reloading that URL reopens the same panel (this is the
  end-to-end proof of success criterion 8, exercising unchanged `usePlanetDeepLink` behaviour).
- At a 375px-wide viewport the star names and maps are fully visible and only the planet grid
  scrolls sideways.

Run `cd frontend && npm test` (must stay at or above baseline + all new cases from stories
001–003, all green) and `cd frontend && npm run build` (`vue-tsc && vite build`, no type error) as
the final gate for the whole feature. Run `cd backend && npm test` to confirm it is unaffected.

**Priority:** Medium — the largest genuine judgment call in the spec (S-4); independently
shippable and independently revertable without touching stories 001 or 002.
**Dependencies:** new-system-view-002-grouped-star-planet-listing.md
