# new-design-004b-interaction-test-harness-and-004-gaps

**Spec:** STORIES/SPECS/new-design.md

**As a** developer about to build the four table and panel stories
**I want** a test harness that can actually mount a component and click it, the responsive
tier story 004 skipped, and a way back into the two legacy pages
**So that** stories 005-009 verify behaviour instead of markup strings, and the gaps left
open by story 004's review are closed before more screens are built on top of them

> **Why this story exists, and why it is numbered `004b`.** It is a synthetic story, written
> after story 004 passed its gate, to carry the non-blocking findings from that review plus
> the two defects found in the first visual pass of the running app. It deliberately breaks
> the numeric sequence so it slots between 004 and 005 without renumbering approved stories;
> a story-reviewer should read `004b` as intentional, not as a numbering error. It is not
> derived from a spec section of its own — every item below traces to a named review finding
> or to spec §4d.

## Acceptance Criteria

```gherkin
Feature: Interaction test harness and the story-004 leftovers

  # --- 1. A harness that can mount and click (code-reviewer, story 004, non-blocking 3) ---

  Scenario: Vitest can mount a component in a DOM
    Given "frontend/vitest.config.ts" (or the test block of "vite.config.ts")
    Then the test environment is "jsdom" and "@vue/test-utils" is a devDependency
    And "@vue/test-utils"'s "mount" renders a single-file component with a live DOM,
      so a test can query it and dispatch events
    And the pre-existing SSR-rendered tests in "railAndStates.test.ts" keep passing
      unmodified, since they assert on markup that is still produced

  Scenario: The environment change does not slow the suite into uselessness
    Given the full frontend suite
    When it runs under the new environment
    Then it still completes in under 30 seconds on a warm cache
    And every one of the pre-existing tests passes without being edited

  # --- 2. The click paths story 004 could not cover ---

  Scenario: CANCEL aborts an in-flight generation and restores the previous sector
    Given a mounted "GeneratingState.vue" while generationStatus is 'running'
    When CANCEL is clicked
    Then the store's abort path runs and the previously displayed sector is restored

  Scenario: RESTORE LAST SECTOR regenerates from the saved parameters
    Given a mounted "EmptyState.vue" with a complete saved parameter set
    When RESTORE LAST SECTOR is clicked
    Then generateSector is called with exactly the saved systemCount, sectorVolume, zone
      and seed, and no cached sector is read

  Scenario: RETRY re-runs the last request after an error
    Given the error card is shown because generationStatus is 'error'
    When RETRY is clicked
    Then generateSector is called again with the same parameters

  Scenario: CLEAR MEMORY empties the saved parameters and resets the rail
    Given a mounted "SectorControls.vue" with saved parameters present
    When CLEAR MEMORY is clicked
    Then localStorage['universe-generator-sector-params'] is empty
    And the rail returns to 100 / 1000 / "medium"

  Scenario: The sliders map through the logarithmic scale
    Given a mounted "SectorControls.vue"
    When the systems slider is dragged to its midpoint
    Then the displayed value equals fromSlider(0.5) for SYSTEMS_RANGE, not the linear midpoint

  # --- 3. The responsive tier story 004 skipped (spec 4d) ---

  Scenario: The rail is a top drawer between 768px and 1023px
    Given a viewport at 800px
    Then the parameter rail renders as a collapsible top drawer above the results,
      not as an inline side rail and not as the under-768px sticky sheet
    And the KPI strip keeps its 3-up tier at that width, as it already does

  Scenario: The three responsive modes hand over cleanly
    Given viewports at 390px, 800px and 1100px
    Then the rail is respectively the sticky PARAMETERS sheet, the top drawer, and the
      inline side rail, with no viewport at which two of them are visible at once
    And there is no horizontal page scroll at any of the three widths

  # --- 4. A way back to the legacy pages (code-reviewer, story 001, judgement call d) ---

  Scenario: Documentation and API Reference are reachable from the console
    Given the app on any console route
    Then both "/documentation" and "/api-reference" can be reached without typing a URL
    And the link target for API Reference resolves, rather than 404ing

  # --- 5. The skeleton criterion finds an owner (code-reviewer, story 004, non-blocking 1) ---

  Scenario: The skeleton-rows criterion is carried into the table stories
    Given the orphaned scenario "Tables render skeleton rows while loading" in
      STORIES/COMPLETED/new-design-004-parameter-rail-kpi-strip-and-states.md
    Then the same scenario is present in the acceptance criteria of
      new-design-006-systems-table.md, new-design-007-stars-table.md and
      new-design-008-planets-table-and-type-cross-filter.md
    And each of those stories' Technical Notes names ".ug-skeleton" and the count of 8 rows
```

## Technical Notes

**Scope: test infrastructure, one responsive tier, one navigation affordance, and three
story-file edits. No new feature, no new screen, no change to the type sets or the artwork.**

### The harness — `@vue/test-utils` + jsdom

Vitest currently SSR-compiles single-file components, so `mount` is unavailable and every
component test in the repo asserts on rendered markup strings. Story 004's review accepted
that for one story while recording it as a real coverage gap, and warned that stories 005-008
— tables, filters, tab switching, the type-card cross-filter — would otherwise keep
accumulating markup-only tests over exactly the behaviour that needs interaction coverage.

Add `@vue/test-utils` and `jsdom` as devDependencies and set the Vitest environment. If the
existing pure-module tests (`starPhysical`, `logScale`, `useSectorStats`, `density`, …) run
measurably slower under jsdom, prefer a per-file environment annotation over a global switch
so the pure modules keep running in node.

**Do not rewrite the existing SSR tests.** They pass, they cover copy and markup, and
replacing them is churn. New interaction tests sit alongside them.

### The click paths (§2)

These are the paths story 004 shipped with manual-only verification. The wiring was
hand-checked by the reviewer (`EmptyState @restore → handleRestore`, `GeneratingState @cancel
→ handleCancel`, the error card's `RETRY → handleRetry`, `CLEAR MEMORY →
store.clearPersistentMemory()`) and the store logic underneath is already covered by story
003's tests — so this is closing the loop between the two, not hunting a suspected bug.

`RESTORE LAST SECTOR` deserves a real assertion rather than a smoke test: D-15 turned an
auto-popup modal into an explicit button, and the guarantee that it *regenerates from saved
parameters* rather than restoring a cached sector is the whole reason that change was
acceptable.

### The 768-1023px drawer (§3, spec §4d)

Spec §4d specifies a top drawer for this band. Story 004 built the inline side rail from
768px up and the sticky sheet below it, skipping the middle tier, and its reviewer classified
this as a spec gap rather than a story shortfall because story 004's own Gherkin only
specified the under-768px behaviour. Read §4d for the intended shape before building it.

`HomeView.vue` currently selects layout with `md:grid-cols-[260px_1fr]
xl:grid-cols-[300px_1fr]`. The KPI strip already honours a 3-up tier at this width
(`md:grid-cols-3 lg:grid-cols-5`), so the drawer should read as deliberate alongside it.

### Navigation back to the legacy pages (§4)

Story 004 replaced the old header and footer with `AppTopBar`, and the footer held the only
in-app links to `/documentation` and `/api-reference`. The empty state restores a
`Documentation` micro-link, but it is only visible before the first generation, and nothing
links to `/api-reference` at all. Both routes work by URL — the `/api/` prefix clash that
used to 404 `/api-reference` in dev, preview and production has been fixed — but neither is
discoverable.

Keep this small and in the design's idiom: the top bar or the empty-state micro-links are
both reasonable homes. Do not reintroduce the old three-link footer.

### The skeleton criterion (§5) — story-file edits, not code

The scenario "Tables render skeleton rows while loading — 8 `.ug-skeleton` rows, never a
spinner that collapses the layout" was written into story 004, which owns no table. Its
reviewer judged it genuinely unimplementable there and recorded that it belongs with the
tables. Nobody owns it today, so it will be lost.

Copy it into stories 006, 007 and 008 rather than implementing it here — this story builds no
table either. `.ug-skeleton` already exists in `style.css` from story 001 and stays unused
until the first table story uses it.

### Invariants that still hold

**D-36:** the 24 spectral classes and 22 planet codes remain a closed set. Nothing in this
story adds, removes or renames a star class or planet type.

**D-37:** the renders under `frontend/public/images/` are used as-is. Nothing here generates,
redraws, replaces, renames or deletes artwork, and nothing is copied out of the handoff
bundle.

**Presentation layer only:** no change to the API contract, to `types/index.ts` in either
package, to the generator, to the seed contract, or to localStorage semantics. The only
permitted change outside `frontend/src/` is the devDependency addition and the Vitest
environment configuration.

### Not touched by this story

`ResultsDisplay.vue` and the tab components (stories 005-008), `SystemsTable.vue`,
`PlanetDetailPanel.vue`, `SectorTabs.vue`, `OverviewPanel.vue`, the store, `types/index.ts`
in either package, and `backend/`.

## Tests

The point of this story is tests, so the acceptance criteria above largely *are* the test
list. New IDs continue the spec's sequence without colliding with T-F1-T-F49:

- **T-F50** — `EmptyState`'s `RESTORE LAST SECTOR` calls `generateSector` with exactly the
  four saved parameters, and reads no cached sector.
- **T-F51** — `GeneratingState`'s `CANCEL` triggers the store's abort path and the previous
  sector is restored.
- **T-F52** — the error card's `RETRY` re-runs the last request with unchanged parameters.
- **T-F53** — `CLEAR MEMORY` empties the storage key and resets the rail to 100 / 1000 /
  `medium`.
- **T-F54** — the systems slider at its midpoint displays `fromSlider(0.5)` over
  `SYSTEMS_RANGE`, not the linear midpoint.
- **T-F55** — at 390px, 800px and 1100px exactly one of sheet / drawer / inline rail is
  rendered, and the page does not scroll horizontally.

Plus, unchanged and non-negotiable: every pre-existing test in both packages passes without
being edited — `cd frontend && npm test`, `cd backend && npm test`, and `cd frontend && npm
run build` with `vue-tsc` clean.

**Manual checklist** (the visual pass at 390 / 800 / 1100 / 1440px has now been performed once
for the console's empty and generated states; the drawer tier is new and unverified):

1. The drawer opens, closes and does not overlap the KPI strip at 800px.
2. `/documentation` and `/api-reference` are reachable from the console in two clicks or
   fewer, and both render.

**Priority:** High — 005 through 008 are the stories this harness exists to serve, and each
one shipped without it widens the gap it is meant to close.
**Dependencies:** new-design-004-parameter-rail-kpi-strip-and-states.md
