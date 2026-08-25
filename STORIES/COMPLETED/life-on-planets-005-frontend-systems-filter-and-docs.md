# life-on-planets-005-frontend-systems-filter-and-docs

**Spec:** STORIES/SPECS/life-on-planets.md

**As a** sector explorer using the web UI
**I want** to filter the Systems tab by whether a system contains life, and to see the new life
fields explained in the API reference and documentation
**So that** I can find inhabited systems from the grid, not just from the planets table, and
understand how the habitability numbers are computed

## Acceptance Criteria

```gherkin
Feature: Systems-tab life filter, API reference and documentation

  # --- Systems tab filter ---

  Scenario: Systems tab gains a Life filter bar defaulting to "All"
    Given "frontend/src/components/ResultsDisplay.vue"
    When the Systems tab renders
    Then a filter bar with a "Life" select (All / With life / Without life) is shown above the
      systems grid, defaulting to "All"
    And with "All" selected, filteredSystems === props.systems, so the grid, pagination and tab
      header behave exactly as before this story

  Scenario: System-has-life is derived on the frontend from precomputed sets, not a new API field
    Given props.stars and props.planets already present in the response
    Then a systemsWithLife computed Set<number> is built with a single O(stars + planets) pass:
      a star->system map, then a planet pass that adds the star's systemId to the set whenever
      planet.hasLife is true
    And no new server field or API request parameter is introduced for this purpose (decision #21)

  Scenario: Life filter narrows the systems grid
    Given the Life filter set to "With life"
    Then filteredSystems contains only systems whose id is in systemsWithLife
    Given the Life filter set to "Without life"
    Then filteredSystems contains only systems whose id is not in systemsWithLife

  Scenario: Pagination derives from the filtered set
    Given paginatedSystems and totalSystemPages
    Then both read from filteredSystems instead of props.systems
    And currentSystemPage resets to 1 when the Life filter changes

  Scenario: Tab header and navigation are unaffected
    Given the Systems tab header showing the unfiltered system count
    Then it continues to show systems.length regardless of the filter
    And navigateToSystem(system.systemId) is unchanged

  Scenario: Inhabited systems are badged on their card
    Given a system card whose systemId is in systemsWithLife
    Then a green life badge is shown on the card

  # --- API reference ---

  Scenario: API reference documents the new System field
    Given "frontend/src/views/ApiReferenceView.vue"
    Then the System field list includes "<li>age: number</li>"

  Scenario: API reference documents the new Planet fields
    Given "frontend/src/views/ApiReferenceView.vue"
    Then the Planet field list includes lifeProbability, lifeComplexity, hasLife and name?

  # --- Documentation ---

  Scenario: Documentation explains the life model
    Given "frontend/src/views/DocumentationView.vue"
    Then a "Life & Habitability" block appears after the existing "Temperature & Habitability"
      section
    And it explains the five factors (star type, temperature, radius, atmosphere, age), the age
      gate (main-sequence lifetime step function), and the 1-6 complexity scale
    And it is a static content block with no logic, matching the existing section markup

  # --- Build health ---

  Scenario: Frontend build and tests stay green
    When "cd frontend && npm run build" runs
    Then vue-tsc passes
    When "cd frontend && npm test" runs
    Then all tests pass

  # --- Manual verification ---

  Scenario: Full frontend life feature works end to end (test 51)
    When "cd frontend && npm run dev" is run and a sector is generated
    Then filtering the planets table by "With life" behaves as specified
    And opening an inhabited planet's detail modal shows its name, stage and probability as
      specified
    And filtering the Systems tab by life behaves as specified, both filtered and unfiltered

  Scenario: Measured inhabited-planet rate is recorded (test 52)
    Given a default 100-system "medium" sector
    Then the measured inhabited-planet rate is recorded in the implementing commit (decision #23)
```

## Technical Notes

**`ResultsDisplay.vue`** — add a filter bar above the Systems grid with a `Life` select
(All / With life / Without life), matching the `'' | '1' | '0'` encoding already used by
`goldilocksFilter` in `PlanetTable.vue:184`:

```ts
const systemsWithLife = computed(() => {
    const starToSystem = new Map(props.stars.map(s => [s.starId, s.systemId]));
    const withLife = new Set<number>();
    props.planets.forEach(planet => {
        if (!planet.hasLife) return;
        const systemId = starToSystem.get(planet.starId);
        if (systemId !== undefined) withLife.add(systemId);
    });
    return withLife;
});

const lifeFilter = ref<'' | '1' | '0'>('');   // '' = All, '1' = with life, '0' = without

const filteredSystems = computed(() => {
    if (lifeFilter.value === '') return props.systems;
    const wanted = lifeFilter.value === '1';
    return props.systems.filter(s => systemsWithLife.value.has(s.systemId) === wanted);
});

watch(lifeFilter, () => { currentSystemPage.value = 1; });
```

`totalSystemPages` and `paginatedSystems` then read `filteredSystems.value` instead of
`props.systems`. This is why the decision to compute `systemsWithLife` on the frontend
(decision #21) matters: one `O(stars + planets)` pass builds star→system and system→hasLife maps,
then filtering is `O(systems)`. Filtering naively (`getPlanetsInSystem` per system) would be
`O(systems × planets)` — ~125M operations on a 5000-system sector. No new API field is needed.

Show a green life badge on system cards whose id is in `systemsWithLife` — reuse the existing
pill/badge idiom already established in story 004 for planet life badges. The tab header still
shows the unfiltered `systems.length`, and `navigateToSystem(system.systemId)` is unchanged. With
the filter at its default "All", `filteredSystems === props.systems`, so current behaviour is
preserved exactly.

**`ApiReferenceView.vue`** — add `<li>age: number</li>` to the `System` field list (lines
99-107); add `lifeProbability`, `lifeComplexity`, `hasLife` and `name?` to the `Planet` list
(lines 89-96). Static documentation markup only.

**`DocumentationView.vue`** — add a "Life & Habitability" block after the existing "Temperature &
Habitability" section (~line 206), matching the existing section markup, explaining:
- The five factors that multiply into `lifeProbability`: star type (`S`), temperature (`T`),
  radius (`R`), atmosphere (`A`), and age (`A_age`).
- The age gate: the age factor is a sigmoid gated by a step function on the host star's
  main-sequence lifetime — a star that has exceeded its usable lifetime (or was never on the main
  sequence) yields zero.
- The 1-6 complexity scale and its labels (from `LIFE_STAGE_LABELS`, added in story 004):
  Microbial life, Oxygenic photosynthesis, Eukaryotic life, Multicellular life, Complex animals,
  Intelligent life.

This is a static content block, no logic (decision #25).

**Not touched by this story:** `PlanetTable.vue`, `PlanetDetailModal.vue`,
`SystemDetailView.vue`, `frontend/src/utils/lifeStage.ts`, `LIFE_STAGE_LABELS` declaration itself
(all story 004). `frontend/src/composables/useSectorApi.ts`, `frontend/src/stores/sectorStore.ts`,
`frontend/src/components/StarTable.vue`, `frontend/src/components/SectorVisualization3D.vue`,
`frontend/src/components/SectorControls.vue`, `frontend/src/views/HomeView.vue`.

## Tests

No new automated backend or frontend unit tests are introduced by this story (decision #24 — no
frontend component-test harness exists). Verification is build health plus manual checks:

- `cd frontend && npm run build` passes `vue-tsc` with `ResultsDisplay.vue`'s new
  `filteredSystems`/`systemsWithLife` computed properties and the documentation/reference markup.
- `cd frontend && npm test` passes (no fixture in this story's scope needs updating beyond what
  story 004 already did).

Manual verification (spec tests 51-52, not automatable):

51. `cd frontend && npm run dev`: generating a sector, filtering planets by "With life" (story
    004), opening an inhabited planet's detail modal — name, stage, probability (story 004), and
    filtering the Systems tab by life — both "With life" and "Without life" narrow the grid
    correctly, pagination follows the filtered set, and clearing the filter restores the full
    unfiltered grid exactly as before this feature (this story).
52. Record the measured inhabited-planet rate for a default 100-system `medium` sector in the
    implementing commit (decision #23).

**Priority:** Medium
**Dependencies:** life-on-planets-004-frontend-planet-life-display.md
