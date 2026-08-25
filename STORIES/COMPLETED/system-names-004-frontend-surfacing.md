# system-names-004-frontend-surfacing

**Spec:** STORIES/SPECS/system-names.md

**As a** sector explorer using the web UI
**I want** to see each system's proper name or catalogue designation, with a badge marking real
IAU names, and matching API documentation
**So that** browsing a generated sector reads like a star catalogue instead of a spreadsheet of
numeric IDs

## Acceptance Criteria

```gherkin
Feature: Frontend surfacing of system names

  # --- Shared type mirror ---

  Scenario: Frontend System type matches the backend exactly
    Given "frontend/src/types/index.ts"
    Then interface System declares "name: string" and "hasProperName: boolean" as required
      fields, with text identical to "backend/src/types/index.ts"

  # --- Systems grid ---

  Scenario: Systems grid shows the name with the numeric ID still visible
    Given "frontend/src/components/ResultsDisplay.vue"
    When a system card is rendered
    Then the heading shows "{{ system.name }}" instead of "System {{ system.systemId }}"
    And the "ID: {{ system.systemId }}" span remains visible beneath/alongside it

  Scenario: Proper-named systems are badged
    Given a system with hasProperName === true
    When its card is rendered
    Then a small badge (e.g. an amber "IAU" pill, reusing the existing
      "px-2 py-1 rounded text-xs" pill styling) is shown next to the heading

  Scenario: Designation systems show no badge
    Given a system with hasProperName === false
    When its card is rendered
    Then no proper-name badge is shown

  # --- System detail view ---

  Scenario: System detail page shows the name as its heading
    Given "frontend/src/views/SystemDetailView.vue"
    When a system's detail page is rendered
    Then the heading shows "{{ system.name }}" instead of "System #{{ system.systemId }}"
    And "System #{{ system.systemId }}" is demoted to a small secondary line beneath it (mirrors
      the existing "ID: {{ star.starId }}" treatment)

  # --- API reference docs ---

  Scenario: API reference lists the new System fields
    Given "frontend/src/views/ApiReferenceView.vue"
    Then the System field list includes "<li>name: string</li>" and
      "<li>hasProperName: boolean</li>"

  # --- Store fixture / build health ---

  Scenario: Store size-test fixture includes the new fields (test 45)
    Given "frontend/src/stores/sectorStore.size.test.ts"
    Then the generateSectorData fixture includes "name" and "hasProperName" on every system
    And the existing size-estimation assertions still pass (thresholds widened only if the added
      bytes genuinely cross them, noted in the commit if so)

  Scenario: Frontend build and tests stay green
    When "cd frontend && npm run build" runs
    Then vue-tsc passes with the updated System type
    When "cd frontend && npm test" runs
    Then all tests pass
```

## Technical Notes

**Frontend `System` type** (`frontend/src/types/index.ts`) — must be textually identical to the
backend's (CLAUDE.md: the two type modules are kept synchronised; Decision #13):

```ts
export interface System {
    systemId: number;
    name: string;            // NEW — proper name ("Necklace") or designation ("UG-0006")
    hasProperName: boolean;  // NEW — true when `name` came from the IAU proper-name pool
    xPos: number;
    yPos: number;
    zPos: number;
}
```

**`ResultsDisplay.vue`** — line 98: `System {{ system.systemId }}` → `{{ system.name }}`. Keep
the `ID: {{ system.systemId }}` span at line 99 so the numeric id stays visible. Add a small
badge next to the heading when `system.hasProperName` (e.g. an amber `IAU` pill), reusing the
existing pill styling vocabulary (`px-2 py-1 rounded text-xs`) seen at `ResultsDisplay.vue:127-130`.
Template-only change — `navigateToSystem(system.systemId)` and every helper still key on
`systemId`.

**`SystemDetailView.vue`** — line 20: `System #{{ system.systemId }}` → `{{ system.name }}`,
with `System #{{ system.systemId }}` demoted to a small secondary line beneath it (mirrors the
existing `ID: {{ star.starId }}` treatment at line 57). Template-only —
`getSystemById(route.params.id)` still resolves by numeric id.

**`ApiReferenceView.vue`** — in the `System` field list (lines 99-104) add
`<li>name: string</li>` and `<li>hasProperName: boolean</li>`. Static documentation markup only.

**`sectorStore.size.test.ts`** — add
`` name: `UG-${String(i + 1).padStart(4, '0')}` `` and `hasProperName: false` to the system
fixture. This test measures serialized payload size; verify the existing size-estimation
assertions still pass, widening a threshold only if the new fields genuinely push past a bound
(record it in the commit if so).

**Decision #15 — no new frontend component tests.** The repo has no component-test harness
(`frontend/package.json` has no `@vue/test-utils`; the only Vitest files are
`src/stores/*.test.ts`). The frontend changes here are template bindings, verified by `vue-tsc`
in `npm run build` plus the updated store fixture — do not introduce a component-test harness as
part of this story.

**Not touched:** `frontend/src/composables/useSectorApi.ts`, `frontend/src/stores/sectorStore.ts`
(logic, not the size test), `frontend/src/components/StarTable.vue`,
`frontend/src/components/PlanetTable.vue`, `frontend/src/components/SectorVisualization3D.vue`,
`frontend/src/views/DocumentationView.vue`. `StarTable.vue:166`'s free-text search over
`star.name` keeps working unchanged since it is a plain substring match, and the new star-name
format is still single-token (hyphen separator, Decision #6).

## Tests

`frontend/src/stores/sectorStore.size.test.ts` (modified) — spec test 45:

45. The `generateSectorData` fixture includes `name` and `hasProperName` on every system, and
    the existing size-estimation assertions still pass.

Plus manual/build verification (from spec Success Criteria, not separately numbered):

- `cd frontend && npm run build` passes `vue-tsc` with the updated `System` type used across
  `ResultsDisplay.vue`, `SystemDetailView.vue`, and the store fixture.
- `cd frontend && npm test` passes.
- Manual check: the systems grid shows the system name with the numeric ID still visible and
  marks proper-named systems with a badge; the system detail page shows the name as its heading.

**Priority:** High
**Dependencies:** system-names-003-generator-wiring-types-and-api-contract.md
