# system-names-003-generator-wiring-types-and-api-contract

**Spec:** STORIES/SPECS/system-names.md

**As an** API consumer of `POST /api/sector/generate`
**I want** every generated system and star to carry a proper name or designation, without any
change to the pre-existing seeded geometry, star classes, or planets
**So that** the response reads like a star catalogue while every existing saved seed keeps
producing byte-identical sector data for everything that isn't a name

## Acceptance Criteria

```gherkin
Feature: Generator wiring, System type, and API contract for names

  # --- MANDATORY FIRST STEP — capture the golden fixture before any generator edit ---

  Scenario: Golden fixture captured from unmodified master before touching the generator
    Given the current, unmodified "backend/src/lib/example_star_generator.ts" on master
    When `new StellarGenerator('deterministic-seed').generateSector(5, 1000)` is run
    Then the resulting systemId/xPos/yPos/zPos, per-star starId/systemId/spectralClass/subclass,
      and per-planet starId/orbitalNumber/planetType/diameter/moonCount/semiMajorAxis/
      temperature/habitableZone are pasted into
      "backend/__tests__/unit/lib/generation-stability.test.ts" as literal expectations
    And this capture happens strictly before any line of the generator is modified for this story

  # --- Type contract ---

  Scenario: System interface gains required name fields
    Given "backend/src/types/index.ts"
    Then interface System declares "name: string" and "hasProperName: boolean" as required
      (not optional) fields

  # --- Generator wiring ---

  Scenario: Naming uses a separate PRNG stream that never advances the main stream
    Given a StellarGenerator constructed with a seed
    Then it derives namePrng from seedrandom(`${seedStr}::names`), independent of the main prng
    And it builds a SectorNamer from namePrng and loadStarProperNames()

  Scenario: Naming is drawn after determineStarCount, main draw order unchanged
    Given the per-system generation loop
    When a system's xPos/yPos/zPos and starCount are drawn from the main prng stream
    Then naming = namer.nameSystem(systemId, starCount) is called next, using namePrng only
    And system.name / system.hasProperName are assigned from the naming result
    And each star's name is assigned from naming.starNames[s - 1], replacing the old
      `${system.systemId}-${s}` format

  # --- Regression guard (tests 29-30) ---

  Scenario: Pre-existing fields are byte-identical after the change (test 29)
    When `new StellarGenerator('deterministic-seed').generateSector(5, 1000)` is run after the
      naming feature is wired in
    Then every field captured in the golden fixture matches exactly
    And names are excluded from this comparison

  Scenario: Golden check holds for a second seed (test 30)
    When `new StellarGenerator('test-seed-123').generateSector(3, 1000)` is run
    Then it matches its own captured golden fixture for all pre-existing fields

  # --- Generator-level naming tests (tests 31-39) ---

  Scenario: Star names are non-empty and unique across the sector (test 31)
    Then every star.name is a non-empty string
    And star names are unique across the generated sector

  Scenario: Every system has a name and hasProperName (test 32)
    Then every system has a non-empty string "name" and a boolean "hasProperName"

  Scenario: Designation systems match formatDesignation (test 33)
    Given a system with hasProperName === false
    Then its name equals formatDesignation(system.systemId)

  Scenario: Proper-named systems draw from the real pool (test 34)
    Given a system with hasProperName === true
    Then its name appears in loadStarProperNames()

  Scenario: Star names are internally consistent with their system (test 35)
    Then every star's name either equals its system's name (single-star system), starts with
      "${system.name}-" (tied component), or is a member of the proper-name pool (independent
      component)

  Scenario: Both naming branches are exercised at scale (test 36)
    Given a 300-system sector
    Then at least one system has hasProperName === true and at least one has
      hasProperName === false

  Scenario: Names are deterministic for a fixed seed (test 37)
    Given two generators built with the same seed
    Then they produce identical system.name, system.hasProperName and star.name sequences
      (extend the existing "deterministic sector with same seed" test)

  Scenario: Names diverge across seeds (test 38)
    Given two generators with different seeds and a 50-system sector
    Then at least one system name differs

  Scenario: System names are unique within a sector (test 39)
    Then no two systems in one generated sector share the same name

  # --- API/integration tests (tests 40-44) ---

  Scenario: API star-name assertion updated (test 40)
    Given a POST /api/sector/generate response
    Then every star.name is a non-empty string
    And star names are unique sector-wide

  Scenario: API exposes name and hasProperName per system (test 41)
    Given the per-system loop over a POST /api/sector/generate response
    Then typeof system.name === 'string', system.name.length > 0, and
      typeof system.hasProperName === 'boolean'

  Scenario: Same seed produces identical names over HTTP (test 42)
    When POST /api/sector/generate is called twice with the same body, including seed
    Then both responses return identical system.name and star.name arrays

  Scenario: Different seed produces different names over HTTP (test 43)
    When POST /api/sector/generate is called twice differing only in seed
    Then at least one system name differs between the two responses

  Scenario: Pool exhaustion survives at HTTP scale (test 44)
    When POST /api/sector/generate is called with systemCount: 1000
    Then the response is 200 and every system is named (proves exhaustion fallback works through
      the HTTP layer)

  # --- Manual deployment verification (tests 46-47) ---

  Scenario: Local production build serves named systems (test 46)
    When `cd backend && npm run build && npm start` is run, then POST /api/sector/generate is
      called
    Then the response contains named systems, proving the dist/assets copy from story 001 works
      end-to-end

  Scenario: Vercel preview deployment works (test 47)
    When a Vercel preview deployment is created from this branch
    Then POST /api/sector/generate returns 200, proving the vercel.json includeFiles
      configuration from story 001 works in the serverless bundle
```

## Technical Notes

**Sequencing constraint — read first.** The golden-fixture capture in
`generation-stability.test.ts` MUST be produced by running the generator **before any line of
`backend/src/lib/example_star_generator.ts` is edited for this story**. Story 001 and 002 do not
touch this file, so master's generator is still unmodified when this story begins — capture the
fixture as the very first action, then proceed with the wiring changes below.

**`System` type** (`backend/src/types/index.ts`) — Decision #13, both fields required:

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

Note (Decision #14): `Star` gains **no** new field — no `component` letter, no `hasProperName`.
Only the format of `Star.name`'s existing string value changes.

**Constructor wiring** (`backend/src/lib/example_star_generator.ts`):

```ts
private prng: seedrandom.PRNG;
private namePrng: seedrandom.PRNG;   // NEW
private namer: SectorNamer;          // NEW

constructor(seed?: string | number, zone: SectorZone = 'medium') {
    const seedStr = seed !== undefined ? seed.toString() : Math.random().toString();
    this.prng = seedrandom(seedStr);
    this.namePrng = seedrandom(`${seedStr}::names`);
    this.namer = new SectorNamer(this.namePrng, loadStarProperNames());
    this.zone = zone;
}
```

**Per-system loop wiring** — immediately after `const starCount = this.determineStarCount();`:

```ts
const naming = this.namer.nameSystem(system.systemId, starCount);
system.name = naming.systemName;
system.hasProperName = naming.hasProperName;
```

And in the star loop, `name: \`${system.systemId}-${s}\`` becomes
`name: naming.starNames[s - 1]`.

**Critical ordering constraint (Decision #1 / spec Impact table):** the `System` object literal
must be constructed with the new fields — either build it with `name`/`hasProperName` after
computing `starCount`, or reorder so `determineStarCount()` and `nameSystem()` run before the
literal. Either way, **`determineStarCount()` must remain the second main-stream draw for the
system, after the three position draws** — this order must not change, or the stability
guarantee is void. `namePrng` never advances `prng`, so this is purely additive: `systemId`,
`xPos`/`yPos`/`zPos`, `spectralClass`, `subclass` and every planet field stay bit-identical for
any given seed.

**Fixture/assertion updates required in this story:**

| File | Change |
|---|---|
| `backend/__tests__/unit/lib/stellar-generator.test.ts` | Replace `expect(star.name).toMatch(/^\d+-\d+$/)` (~line 231) with the new non-empty/uniqueness assertions; add tests 31-39. |
| `backend/__tests__/integration/api/sector-api.test.ts` | Replace the `/^\d+-\d+$/` assertion (~line 79); add `system.name`/`system.hasProperName` assertions in the per-system loop (~line 73); add tests 40-44. |
| `backend/__tests__/unit/services/stellar-service.test.ts`, `backend/__tests__/unit/controllers/sector-controller.test.ts` | Update any `System`-typed fixture literal to include `name` and `hasProperName` (additive — `getSectorStats` never inspects `name`, but keep fixtures honest). |

**Not touched by this story:** `frontend/src/types/index.ts` and all Vue components — those are
story 004. `backend/src/services/stellar.service.ts`, `backend/src/controllers/sector.controller.ts`,
`backend/src/routes/sector.routes.ts` remain unchanged — the response shape only gains fields.

## Tests

`backend/__tests__/unit/lib/generation-stability.test.ts` (new) — spec tests 29-30:

29. After the change, `new StellarGenerator('deterministic-seed').generateSector(5, 1000)`
    reproduces the golden fixture exactly for every pre-existing field. Names excluded.
30. Same golden check for seed `'test-seed-123'` with `generateSector(3, 1000)`.

`backend/__tests__/unit/lib/stellar-generator.test.ts` (modified) — spec tests 31-39:

31. Every `star.name` is a non-empty string; star names are unique across the sector.
32. Every `system` has a non-empty string `name` and a boolean `hasProperName`.
33. `hasProperName === false` systems have `name === formatDesignation(system.systemId)`.
34. `hasProperName === true` systems have a `name` that appears in `loadStarProperNames()`.
35. Every star's name equals its system's name, starts with `${system.name}-`, or is a pool
    member.
36. Over a 300-system sector, both `hasProperName` branches occur.
37. Determinism: same-seed generators produce identical name sequences.
38. Different seeds produce at least one differing system name over 50 systems.
39. System names are unique within a sector.

`backend/__tests__/integration/api/sector-api.test.ts` (modified) — spec tests 40-44:

40. Non-empty, sector-unique star names via the HTTP response.
41. `system.name`/`system.hasProperName` typed and present per system.
42. Same seed → identical names over two HTTP calls.
43. Different seed → at least one differing name.
44. `systemCount: 1000` still returns 200 with every system named.

Manual verification (spec tests 46-47, not automatable):

46. `cd backend && npm run build && npm start`, then `POST /api/sector/generate` returns named
    systems.
47. A Vercel preview deployment returns 200 from `POST /api/sector/generate`.

**Priority:** Critical
**Dependencies:** system-names-001-star-name-asset-and-loader.md, system-names-002-naming-algorithm.md
