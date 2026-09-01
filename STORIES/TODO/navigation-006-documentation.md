# navigation-006-documentation

**Spec:** STORIES/SPECS/navigation.md

**As a** user reading the in-app documentation
**I want** the *Sharing a View* section to describe the actual `sid`-based link format
**So that** the docs match what the app does, with no mention of the removed query-string
format

## Acceptance Criteria

```gherkin
Feature: documentation reflects the new link format

  Scenario: The Link section shows the new format
    Given the Sharing a View section of DocumentationView.vue
    Then it shows the "/<sid>/system/<id>?planet=" link form

  Scenario: The zone-code table is present
    Then the documentation lists all five zone codes (x, g, m, z, c) with their zone names

  Scenario: The old format is gone, not shown alongside
    Then the "?seed=&zone=&systems=&volume=" form appears nowhere in the documentation

  Scenario: The shell test suite stays green
    Then frontend/src/components/shell.dom.test.ts continues to pass, including its
     documentation-link href assertions (unchanged, per A11)
```

## Technical Notes

**Modified file:** `frontend/src/views/DocumentationView.vue` (~:288-315). Replace the
*Sharing a View* → *The Link* block with the new format **only**; add the zone-code table.
The old form is removed, not shown alongside. This is a content-only change — no
behavioural code.

**Zone codes** (from the spec's Data Model section, reproduced here for the doc content):

| `SectorZone` | code |
|---|---|
| `extragalactic` | `x` |
| `galactic edge` | `g` |
| `medium` | `m` |
| `central zone` | `z` |
| `core` | `c` |

**Link shape to document:** `/<sid>/system/<id>?planet=<starId>-<orbitalNumber>`, where
`<sid>` is `<seed>-<zoneCode>-<systemCount>-<sectorVolume>` (e.g. `766207-m-100-1000`).

This slice depends on `navigation-003` because the link format being documented is not
real (every internal link still had bugs dropping the sector) until that slice ships.

## Tests

No new automated test file. Per the spec's *Suggested Story Breakdown*: "No code, no tests
beyond keeping `shell.dom.test.ts` green."

- `frontend/src/components/shell.dom.test.ts` — continues to pass unmodified; its
  documentation-link href assertions at :121 are unaffected by this content-only change
  (A11).

Success criteria pinned by this slice:

- SC16: `DocumentationView`'s *Sharing a View* section shows the
  `/<sid>/system/<id>?planet=` form and the five zone codes, and the
  `?seed=&zone=&systems=&volume=` form appears nowhere in it.

As the last story in the dependency chain to land (stories 5 and 6 both depend only on
earlier stories and may complete in either order, but 6 has no downstream dependents),
this is also a reasonable point to confirm the feature-wide gates: SC1 (`npm test` in
`/frontend` passes with no skipped or `.only` cases) and SC2 (`npm run build`, which runs
`vue-tsc`, passes with no type errors). These are whole-suite checks, not specific to this
slice's own changes — every story's Tests section keeps its own scope green, and this is
the final confirmation once all six have landed.

**Priority:** Low
**Dependencies:** navigation-003-internal-links-carry-sector
