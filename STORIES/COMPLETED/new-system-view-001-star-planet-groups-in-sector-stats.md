# new-system-view-001-star-planet-groups-in-sector-stats

**Spec:** STORIES/SPECS/new-system-view.md

**As a** developer building the grouped system-detail listing
**I want** `useSectorStats` to compute a `starGroups` field on every `SystemRow` — one entry per
star carrying that star's own planets, in payload order — with the change proven additive
**So that** the rendering work in later stories can read pre-grouped data straight off `SystemRow`
(per the project rule that components aggregate nothing), and no consumer of `SystemRow` breaks

## Acceptance Criteria

```gherkin
Feature: starGroups on SystemRow

  Background:
    Given the existing FIXTURE sector in useSectorStats.test.ts (3 systems, 5 stars
      including a BH, 9 planets), where system 1 has star 1 (G, 3 planets) and
      star 2 (M, 2 planets)

  Scenario: One group per star, in payload order
    When I read systemRows[0].starGroups
    Then it holds exactly two entries
    And their starIds, in order, are [1, 2]

  Scenario: Each group carries its own star object
    When I read systemRows[0].starGroups[0]
    Then its star.starId is 1
    And its star.spectralClass is "G"

  Scenario: A group holds only its own star's planets
    When I read systemRows[0].starGroups
    Then every planet in starGroups[0].planets has starId 1
    And every planet in starGroups[1].planets has starId 2

  Scenario: Planets are ordered by orbitalNumber ascending within each group
    When I read the orbitalNumber sequence of any single group's planets
    Then it is strictly ascending
    And the flat row.planets interleaving ([1, 1, 2, 2, 3], pinned at
      useSectorStats.test.ts:297) does not appear inside any single group

  Scenario: Totality — every planet is counted in exactly one group
    When I sum starGroups[i].planets.length for a system row
    Then the sum equals that row's planetCount
    And this holds for every system row in the fixture, not only system 1

  Scenario: A star with no planets keeps its group
    Given system 3's star 4 is a BH with no planets
    When I read that system's starGroups
    Then a group for starId 4 is present
    And its planets array is empty, not omitted

  Scenario: A planet whose star is absent from the payload is in no group
    Given a sector containing a planet with starId 999 and no star with that id
    When I read every system row's starGroups
    Then no group anywhere contains that planet
    And it is also absent from row.planets, exactly as today

  Scenario: An empty or null sector does not throw
    When I call useSectorStats(ref(null)).systemRows.value
    Then it returns []
    And no error is thrown

  Scenario: The change is additive — nothing existing is edited
    Given useSectorStats.test.ts as it exists before this story
    When this story's changes are applied
    Then every pre-existing assertion in the file remains textually unedited and still
      passes, including the toMatchObject block on rows[0] and the
      `expect(empty.systemRows.value).toEqual([])` assertion
    And the new coverage above is added only as a new `describe('starGroups')` block
    And `frontend/src/components/SystemsTable.vue`, `frontend/src/components/OverviewPanel.vue`
      and `frontend/src/components/NotableSystems.vue` continue to compile and behave
      unchanged under `cd frontend && npm run build` (a structurally-typed extra property
      on `SystemRow` is transparent to all three)
```

## Technical Notes

**Files touched:** `frontend/src/composables/useSectorStats.ts` (modify),
`frontend/src/composables/useSectorStats.test.ts` (modify — additive only). No other file
changes in this story.

**New type**, exported from `useSectorStats.ts`:

```ts
/**
 * One star of a system together with the planets that orbit it — the unit the
 * system detail screen renders as a block. A star with no planets keeps its
 * group with an empty `planets` array; it is never dropped.
 */
export interface StarPlanetGroup {
    starId: number;
    star: Star;
    /** This star's own planets, orbitalNumber ascending. */
    planets: Planet[];
}
```

**One field added** to the existing `SystemRow` interface (every other field unchanged):

```ts
export interface SystemRow {
    // … every existing field, unchanged …
    /** One group per star, in payload order (primary first). */
    starGroups: StarPlanetGroup[];
}
```

**Built inside the existing `systemRows` computed**, off the index that already exists (reuses
`planetsByStar`, so no new traversal of the planet list is introduced):

```ts
const systemRows = computed<SystemRow[]>(() =>
    index.value.buckets.map(bucket => ({
        // … every existing field, unchanged …
        starGroups: bucket.stars.map(star => ({
            starId: star.starId,
            star,
            planets: [...(index.value.planetsByStar.get(star.starId) || [])]
                .sort((a, b) => a.orbitalNumber - b.orbitalNumber)
        }))
    })));
```

`starGroups` is **not** exposed as a separate top-level key from `useSectorStats`; it is reached
only through `systemRows`, matching the existing route to per-system data.

**Invariants this story must hold** (each is one of the scenarios above):

| Invariant | Why it holds |
| --- | --- |
| One group per star, in `bucket.stars` order | `bucket.stars` is built by pushing in payload order |
| `sum(group.planets.length) === row.planetCount` | The index pushes a planet into its bucket and into `planetsByStar` under the same `starsById.get(planet.starId)` guard |
| A star with no planets yields `planets: []` | `planetsByStar.get` misses and falls back to `[]`; the group is still emitted |
| A planet whose star is absent from the payload is in no group | Skipped by the index's `if (!star) continue`, exactly as it is skipped by `planetRows` and `orbitBands` today |
| Keys `${starId}-${orbitalNumber}` are unique within a group | All planets in a group share one `starId`; `orbitalNumber` is unique per star by construction (D-32) |

**No visible change.** Nothing renders `starGroups` yet — that is stories 002 and 003. This story's
own proof of correctness is that the full suite stays green with every pre-existing assertion
unedited.

**Constraints carried from the governing spec (`new-design.md`), restated here:**
- **D-36** — the 24 spectral classes and 22 planet codes are a closed set. This story adds no
  enum, no value object and no index; it reads existing `Star`/`Planet` objects verbatim.
- **D-37** — existing artwork is untouched. This story does not render anything, so no component
  that draws artwork is touched.
- Out of scope, unchanged by this story: `backend/**`, `backend/src/types/index.ts`,
  `frontend/src/types/index.ts`, `frontend/src/style.css`, `frontend/public/images/`.

## Tests

From spec §10.1 (`frontend/src/composables/useSectorStats.test.ts`, node project), new
`describe('starGroups')` block:

1. One group per star, in payload order.
2. Each group carries its own star object.
3. A group holds only its star's planets.
4. Planets ordered by orbitalNumber ascending within each group; the flat interleaving does not
   appear inside any single group.
5. Totality: `starGroups.reduce((n, g) => n + g.planets.length, 0) === row.planetCount` for every
   system row.
6. A star with no planets keeps an empty group (system 3's `BH`, star 4).
7. A planet whose star is absent from the payload appears in no group (synthetic `starId: 999`
   fixture).
8. An empty sector: `useSectorStats(ref(null)).systemRows.value` is `[]`, no throw.
9. Existing `systemRows` assertions still pass unchanged (the `toMatchObject` block and the
   empty-sector equality are not edited) — proves the field is additive.

Run `cd frontend && npm test` — total test count must be the 494-test baseline plus the 9 new
cases above, all green. Run `cd frontend && npm run build` to confirm `SystemsTable.vue`,
`OverviewPanel.vue` and `NotableSystems.vue` still type-check.

**Priority:** Critical
**Dependencies:** None
