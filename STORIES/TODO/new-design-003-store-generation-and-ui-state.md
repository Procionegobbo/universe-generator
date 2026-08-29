# new-design-003-store-generation-and-ui-state

**Spec:** STORIES/SPECS/new-design.md

**As a** frontend developer building the mission-console screens
**I want** the Pinia store extended, purely additively, with generation progress state,
cancellation support, and the UI state (active tab, filters, pagination, selected planet) the
new screens need
**So that** later stories can build the rail, KPI strip, tabs and panels against a stable store
contract, while every existing store consumer and test keeps passing unchanged

## Acceptance Criteria

```gherkin
Feature: Store extension for generation and UI state

  # --- Preserved surface (D-13) ---

  Scenario: generateSector(request) with one argument behaves exactly as before (T-F45)
    Given "frontend/src/stores/sectorStore.ts"
    When generateSector is called with only a request object, no signal
    Then it behaves exactly as it did before this story
    And "sectorStore.test.ts"'s pre-existing assertions (storage key, write-after-generate,
      restore-on-create, clearPersistentMemory defaults) all still pass verbatim

  # --- Generation status and progress (D-19) ---

  Scenario: generateSector transitions generationStatus through running to done (T-F42)
    When generateSector(request) is called and the request succeeds
    Then generationStatus becomes 'running' immediately, then 'done' on success
    And lastStats is populated from the response
    And activeTab is set to 'overview'
    And progress is set to 1

  Scenario: A failed request sets an error status and preserves sectorData (T-F43)
    When generateSector(request) is called and the request fails
    Then generationStatus becomes 'error'
    And sectorData is left untouched
    And "error" holds the failure message

  # --- Cancellation (D-20) ---

  Scenario: generateSector accepts an optional AbortSignal
    Given "store.generateSector(request, signal?)"
    Then the signal parameter is additive — every existing call site keeps compiling

  Scenario: An aborted request restores the pre-request snapshot (T-F44)
    Given a previously generated sector
    When generateSector(request, signal) is called and the signal aborts mid-request
      (axios.isCancel is true)
    Then sectorData is restored to the snapshot captured before the request
    And generationStatus returns to 'done'
    Given no previous sector existed
    Then generationStatus returns to 'idle' instead

  Scenario: isLoading stays in sync with generationStatus
    Given any transition of generationStatus
    Then isLoading reflects (generationStatus === 'running'), so existing consumers reading
      isLoading keep working unchanged

  # --- hasSavedParams / restore (D-15) ---

  Scenario: hasSavedParams reflects a complete saved parameter set (T-F46)
    Given a clean store with no localStorage entry
    Then hasSavedParams is false
    When a sector is generated (which writes localStorage per D-14)
    Then hasSavedParams becomes true
    When clearPersistentMemory() is called
    Then hasSavedParams becomes false again

  # --- clearPersistentMemory extension ---

  Scenario: clearPersistentMemory also resets UI state (T-F47)
    Given non-default activeTab, filters and pagination
    When clearPersistentMemory() is called
    Then activeTab, systemFilters, starFilters, planetFilters and page are reset to their
      defaults
    And lastStats is reset to null
    And localStorage is still cleared and the parameters still restored to 100 / 1000 / 'medium',
      exactly as today

  # --- selectPlanet / deep link key (D-32) ---

  Scenario: selectPlanet sets and clears the selected planet key (T-F48)
    When selectPlanet('7-3') is called
    Then selectedPlanetKey becomes '7-3'
    When selectPlanet(null) is called
    Then selectedPlanetKey becomes null

  # --- Generation progress timers (D-19) ---

  Scenario: useGenerationProgress advances five stages on a timer
    Given "frontend/src/composables/useGenerationProgress.ts"
    When generation starts
    Then five stages — 'system coordinates', 'stellar classes', 'planetary bodies', 'moons',
      'habitability & life' — advance on a 250 ms timer
    And each stage's status is 'done' | 'current' | 'pending'
    And progress is capped at 95% until the response lands, then snaps to 100%
    And the 'system coordinates' row shows the requested systemCount (a known value); rows 2-5
      show 'pending' before they start and nothing while running — no fabricated counts, and
      stage counts are never back-filled
    And the elapsed counter ticks every 100 ms from the request

  Scenario: useGenerationProgress cleans up its timers
    When the component unmounts, or generationStatus leaves 'running'
    Then both intervals (stage timer and elapsed timer) are cleared
```

## Technical Notes

**Scope of this story: `sectorStore.ts` and `useGenerationProgress.ts` only — no Vue
components consume these yet (that starts in story 004).** This is the store-level half of the
spec's "Slice 3"; the rail/KPI/state components that consume it are split into story 004
because they additionally depend on stories 001 (tokens/app shell) and 002 (`useSectorStats`
etc.), while this store extension does not.

### `frontend/src/stores/sectorStore.ts` — additive only (D-13)

**Preserved exactly, unchanged:** `STORAGE_KEY`, `sectorData`, `isLoading`, `error`,
`currentSeed`, `systemCount`, `sectorVolume`, `zone`, the localStorage read/validate block,
`loadSavedParams`, `checkHealth`, `generateSector`'s existing behaviour, `getSystemById`,
`clearPersistentMemory`, and the defaults 100 / 1000 / `medium`.

**Added:**

```ts
export type GenerationStatus = 'idle' | 'running' | 'done' | 'error';
export type GenerationStage = 'coordinates' | 'stars' | 'planets' | 'moons' | 'habitability';
export type SectorTab = 'overview' | 'statistics' | 'systems' | 'stars' | 'planets';

const generationStatus = ref<GenerationStatus>('idle');
const generationStage  = ref<GenerationStage>('coordinates');
const generationProgress = ref(0);          // 0..1
const generationElapsedMs = ref(0);
const lastStats = ref<GenerationResponse['stats'] | null>(null);

const activeTab = ref<SectorTab>('overview');
const systemFilters = ref({ query: '', preset: 'all', primaryClass: 'any', sort: 'planets-desc' });
const starFilters   = ref({ query: '', preset: 'all', sort: 'id-asc' });
const planetFilters = ref({ types: [] as string[], zone: 'any', hasLife: false,
                            hasMoons: false, sort: 'diameter-desc' });
const selectedPlanetKey = ref<string | null>(null);   // "<starId>-<orbitalNumber>"
const page = ref({ systems: 1, stars: 1, planets: 1 });

const hasSavedParams = computed(() => { /* loadSavedParams() has all four fields */ });
function resetFilters(): void;
function selectPlanet(key: string | null): void;      // also syncs the query param (wiring to
                                                        // the router query param lands with the
                                                        // component that reads it, story 009)
```

`generateSector(request, signal?)` additionally: sets `generationStatus`/`progress`, stores
`lastStats` on success, sets `activeTab = 'overview'` on success, and — on `axios.isCancel` —
restores the pre-request `sectorData` snapshot (or falls back to the empty state if none
existed). `isLoading` keeps its current meaning and is kept in sync with
`generationStatus === 'running'`, so any consumer reading it still works. The `signal` parameter
is optional and additive, so every existing call site (`sectorStore.test.ts`, `HomeView.vue`)
keeps compiling and behaving identically with one argument.

`clearPersistentMemory()` additionally resets `lastStats`, filters, pagination and `activeTab`;
its existing assertions (localStorage cleared, params back to defaults, `sectorData = null`)
are unchanged.

**D-19 (no fabricated progress):** the API returns a single response with no progress channel
— per the handoff ("if it reports none, animate the stages on a timer and show the elapsed
counter"), progress is animated, never measured.

**D-20:** `CANCEL` aborts via `AbortController`, driven by the component in story 004 that owns
the `GENERATE SECTOR` / `CANCEL` buttons — this story only implements the store's side of
accepting and reacting to the signal.

### `frontend/src/composables/useGenerationProgress.ts` (new)

D-19's stage/elapsed timers. Returns `stages` (each `'done' | 'current' | 'pending'`),
`progress`, `elapsedMs`. Five stages: `system coordinates`, `stellar classes`,
`planetary bodies`, `moons`, `habitability & life`, advancing on a 250 ms timer; the bar is
capped at 95% until the response lands, then snaps to 100%. The `system coordinates` row shows
the requested `systemCount` (a known value); rows 2–5 show `pending` before they start and
nothing while running. The elapsed counter ticks every 100 ms from the request. Stage counts
are never back-filled, because the panel that will render this (`GeneratingState.vue`, story
004) is replaced by the results the moment the response arrives. Cleans up both intervals in
`onUnmounted` **and** when `generationStatus` leaves `'running'`.

### Not touched by this story

Any Vue component (`SectorControls.vue`, `HomeView.vue`, etc. — all still read the store's
*old* surface only, unaffected by these additions), `frontend/src/types/index.ts`,
`frontend/src/utils/`, `backend/`.

## Tests

`frontend/src/stores/sectorStore.test.ts` (**existing, extended — all current cases must keep
passing verbatim**):
- **T-F42** — `generateSector` sets `generationStatus` to `running` then `done`, and populates
  `lastStats` from the response.
- **T-F43** — a failed response sets `generationStatus = 'error'` and leaves `sectorData`
  untouched.
- **T-F44** — an aborted request restores the previous `sectorData` snapshot and sets
  `generationStatus` back to `done`; with no previous sector it returns to `idle`.
- **T-F45** — `generateSector(request)` called with one argument behaves exactly as before
  (regression guard for the new optional parameter).
- **T-F46** — `hasSavedParams` is false on a clean store, true after a generate, false again
  after `clearPersistentMemory`.
- **T-F47** — `clearPersistentMemory` also resets `activeTab`, filters and pagination, while
  still clearing localStorage and restoring 100 / 1000 / `medium`.
- **T-F48** — `selectPlanet('7-3')` sets `selectedPlanetKey`; `selectPlanet(null)` clears it.

No dedicated test file is specified for `useGenerationProgress.ts` in the spec's test list (D-34
targets pure modules and the store; this composable wraps `setInterval` timers rather than pure
functions) — verify its stage/elapsed sequencing and cleanup manually once `GeneratingState.vue`
renders it in story 004, per the spec's manual checklist item 1 (screenshot comparison) and the
D-19 behaviour above.

**Priority:** Critical
**Dependencies:** None
