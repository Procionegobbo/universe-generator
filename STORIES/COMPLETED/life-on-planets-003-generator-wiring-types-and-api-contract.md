# life-on-planets-003-generator-wiring-types-and-api-contract

**Spec:** STORIES/SPECS/life-on-planets.md

**As an** API consumer of `POST /api/sector/generate`
**I want** every generated system to carry an age and every planet to carry a habitability
probability, a complexity index, a life-presence flag and (when inhabited) a proper name, without
disturbing any pre-existing seeded output — including the names added by the system-names feature
**So that** the response reads as a map of where life might exist, while every existing saved seed
keeps producing byte-identical geometry, spectral classes, planets and names

## Acceptance Criteria

```gherkin
Feature: Generator wiring, System/Planet types, and API contract for life

  # --- MANDATORY FIRST STEP — capture the golden name literal before any generator edit ---

  Scenario: Golden name-stream fixture captured from the unmodified generator (test 43 setup)
    Given the current, unmodified "backend/src/lib/example_star_generator.ts" (life code not yet
      wired in)
    When `new StellarGenerator('test-seed-123').generateSector(20, 1000)` is run
    Then the resulting system.name, system.hasProperName and star.name sequences are captured as
      a golden literal
    And this capture happens strictly before any line of the generator is modified for this story

  # --- Type contract ---

  Scenario: System interface gains a required age field
    Given "backend/src/types/index.ts" and "frontend/src/types/index.ts"
    Then interface System declares "age: number" as a required (not optional) field in both files,
      with identical text

  Scenario: Planet interface gains the four life fields
    Given "backend/src/types/index.ts" and "frontend/src/types/index.ts"
    Then interface Planet declares "lifeProbability: number", "lifeComplexity: number" and
      "hasLife: boolean" as required fields, and "name?: string" as optional, in both files, with
      identical text

  # --- Generator wiring ---

  Scenario: Life uses a third, separate PRNG stream that never advances prng or namePrng
    Given a StellarGenerator constructed with a seed
    Then it derives lifePrng from seedrandom(`${seedStr}::life`), independent of both the main
      prng and namePrng
    And it builds a LifeAssigner from lifePrng and loadPlanetProperNames()

  Scenario: System age is drawn once per system, before the star loop
    Given the per-system generation loop
    When a system's xPos/yPos/zPos and starCount are drawn from the main prng, and naming is
      drawn from namePrng (unchanged order)
    Then system.age = lifeAssigner.drawSystemAge(zone) is drawn next, from lifePrng, exactly once
      per system
    And this happens before the star loop begins

  Scenario: Life is assigned per planet, immediately before it is pushed
    Given the per-star, per-planet generation loop
    When a planet's semiMajorAxis, type, diameter, moons, temperature and habitableZone are
      computed (unchanged order and unchanged values)
    Then lifeAssigner.assignLife(...) is called with the planet's spectralClass, the system's age,
      planetType, diameter, temperature, habitableZone, the host star's name and orbitalNumber
    And the four outputs (lifeProbability, lifeComplexity, hasLife, and name when present) are
      copied onto the planet before it is pushed to the planets array

  Scenario: createPlanet's default literal gains the three required numeric/boolean life fields
    Given "createPlanet"'s return literal
    Then it includes lifeProbability: 0, lifeComplexity: 0, hasLife: false as defaults, following
      the same default-then-overwrite convention as semiMajorAxis/temperature/habitableZone

  # --- Regression guard: pre-existing fields and names untouched ---

  Scenario: generation-stability.test.ts requires no change and keeps passing
    Given "backend/__tests__/unit/lib/generation-stability.test.ts" (unmodified)
    When it runs after life is wired in
    Then it still passes, proving every pre-existing field (coordinates, spectral class,
      subclass, pre-existing planet fields) is byte-identical to before this feature, because it
      strips fields explicitly

  Scenario: Name-stream stability holds (test 43)
    When `new StellarGenerator('test-seed-123').generateSector(20, 1000)` is run after life is
      wired in
    Then its system.name, system.hasProperName and star.name sequences match the golden literal
      captured before any generator edit
    Proving the "::life" stream did not disturb namePrng

  # --- Generator-level life tests (tests 35-42) ---

  Scenario: Every system has a numeric age within its zone's range (test 35)
    Then every system in a "medium"-zone sector has a numeric age within 0.5-10.0
    And every system in a "core"-zone sector has a numeric age within 6.0-13.0

  Scenario: Every planet has the three required life fields with correct types/ranges (test 36)
    Then every planet has numeric lifeProbability in [0, 1], numeric lifeComplexity in [0, 6],
      and a boolean hasLife

  Scenario: Non-Goldilocks planets are hard-zeroed (test 37)
    Given a planet with habitableZone === false
    Then lifeProbability === 0, lifeComplexity === 0 and hasLife === false

  Scenario: Name presence matches hasLife (test 38)
    Then every planet with hasLife === true has a defined, non-empty name
    And every planet with hasLife === false has name === undefined

  Scenario: Both life outcomes occur at scale (test 39)
    Given a 300-system sector
    Then at least one planet has hasLife === true
    And at least one Goldilocks planet has hasLife === false
    (both branches of the presence draw are actually exercised)

  Scenario: Planet names are unique within a sector (test 40)
    Given a 300-system sector
    Then no two planets share the same name

  Scenario: Off-main-sequence hosts never yield life (test 41)
    Given a planet whose host star's spectral class is not in "O B A F G K M"
    Then its lifeProbability === 0

  Scenario: Determinism for a fixed seed, divergence across seeds (test 42)
    Given two generators built with the same seed
    Then they produce identical system.age, planet.lifeProbability, planet.lifeComplexity,
      planet.hasLife and planet.name sequences
    Given two generators with different seeds and a 50-system sector
    Then at least one of those values differs

  # --- Integration / API contract tests (tests 44-48) ---

  Scenario: API exposes age per system (test 44)
    Given the per-system loop over a POST /api/sector/generate response
    Then typeof system.age === 'number' and system.age >= 0.5

  Scenario: API exposes the three life fields per planet (test 45)
    Given the per-planet loop over a POST /api/sector/generate response
    Then typeof planet.lifeProbability === 'number', typeof planet.lifeComplexity === 'number',
      and typeof planet.hasLife === 'boolean'

  Scenario: Same seed produces identical life data over HTTP (test 46)
    When POST /api/sector/generate is called twice with the same body, including seed
    Then both responses return identical age, lifeProbability, hasLife and name arrays

  Scenario: Different seed produces different life data over HTTP (test 47)
    When POST /api/sector/generate is called twice differing only in seed
    Then at least one hasLife or age value differs between the two responses

  Scenario: Pool exhaustion survives at HTTP scale (test 48)
    When POST /api/sector/generate is called with systemCount: 1000
    Then the response is 200 and every planet is scored
    And every defined planet.name in the response is unique
    (exercises name-pool exhaustion through the HTTP layer)

  # --- Manual deployment verification (test 50) ---

  Scenario: Local production build serves life data (test 50)
    When `cd backend && npm run build && npm start` is run, then POST /api/sector/generate is
      called
    Then the response contains planets carrying life fields and named inhabited worlds, proving
      the dist/assets copy covers the second CSV end-to-end

  # --- Frontend fixture / build health (test 49) ---

  Scenario: Store size-test fixture is updated so the frontend keeps type-checking (test 49)
    Given "frontend/src/stores/sectorStore.size.test.ts", the only frontend file that constructs
      literal System/Planet objects
    Then its generateSectorData fixture includes age: 4.5 on the system literal and
      lifeProbability: 0.25, lifeComplexity: 1.2, hasLife: false on the planet literal
    And the existing size-estimation assertions still pass (thresholds widened only if the added
      bytes genuinely cross them, noted in the commit if so)

  Scenario: The frontend build is green at the end of this story
    When `cd frontend && npm run build` runs
    Then vue-tsc succeeds — every consumer that constructs a literal System or Planet object,
      including the sectorStore.size.test.ts fixture above, already supplies the new required
      fields, so the build does not depend on story 004 having landed
```

## Technical Notes

**Sequencing constraint — read first.** The golden name-literal capture for test 43 MUST be
produced by running the generator **before any line of
`backend/src/lib/example_star_generator.ts` is edited for this story**. Stories 001 and 002 do
not touch this file, so master's generator is still unmodified when this story begins — capture
the literal as the very first action, then proceed with the wiring changes below. This is
separate from (and does not replace) the unmodified `generation-stability.test.ts`, which already
guards the main `prng` stream.

**`System` type** (`backend/src/types/index.ts` and `frontend/src/types/index.ts`, identical
text — CLAUDE.md: the two type modules are kept synchronised):

```ts
export interface System {
    systemId: number;
    name: string;
    hasProperName: boolean;
    age: number;             // NEW — system age in Gyr, rounded to 2 decimals
    xPos: number;
    yPos: number;
    zPos: number;
}
```

**`Planet` type** (both files, identical text):

```ts
export interface Planet {
    starId: number;
    orbitalNumber: number;
    planetType: string;
    diameter: number;
    moonCount: number;
    mass: number;               // kg
    gravity: number;            // m/s^2
    semiMajorAxis: number;      // AU
    temperature: number;        // surface temperature in Kelvin
    habitableZone: boolean;
    lifeProbability: number;    // NEW — model P in [0, 1], 4 decimals; 0 when ineligible
    lifeComplexity: number;     // NEW — model C_index = P * C(t_bio) in [0, 6], 3 decimals
    hasLife: boolean;           // NEW — realised presence of life
    name?: string;              // NEW — proper name, present only when hasLife is true
}
```

`Star` is unchanged. `LIFE_STAGE_LABELS` is **not** part of this story — it belongs to the
frontend display story (004), since nothing here reads it.

**Constructor wiring** (`backend/src/lib/example_star_generator.ts`, mirroring the existing
`namePrng` block):

```ts
private prng: seedrandom.PRNG;
private namePrng: seedrandom.PRNG;
private lifePrng: seedrandom.PRNG;      // NEW
private lifeAssigner: LifeAssigner;     // NEW

constructor(seed?: string | number, zone: SectorZone = 'medium') {
    const seedStr = seed !== undefined ? seed.toString() : Math.random().toString();
    this.prng = seedrandom(seedStr);
    this.namePrng = seedrandom(`${seedStr}::names`);
    this.namer = new SectorNamer(this.namePrng, loadStarProperNames());
    this.lifePrng = seedrandom(`${seedStr}::life`);
    this.lifeAssigner = new LifeAssigner(this.lifePrng, loadPlanetProperNames());
    this.zone = zone;
}
```

**Per-system loop wiring** — immediately after `const naming = this.namer.nameSystem(...)` and
before the `System` literal:

```ts
const systemAge = this.lifeAssigner.drawSystemAge(this.zone);

const system: System = {
    systemId,
    name: naming.systemName,
    hasProperName: naming.hasProperName,
    age: systemAge,
    xPos,
    yPos,
    zPos
};
```

**Per-planet loop wiring** — replacing `planets.push(planet)`:

```ts
planet.semiMajorAxis = semiMajorAxis;
planet.temperature = temperature;
planet.habitableZone = zone === ZONE_B;

const life = this.lifeAssigner.assignLife({
    spectralClass,
    systemAgeGyr: systemAge,
    planetType: planet.planetType,
    diameterKm: planet.diameter,
    temperatureK: planet.temperature,
    habitableZone: planet.habitableZone,
    starName: star.name,
    orbitalNumber: planet.orbitalNumber
});
planet.lifeProbability = life.lifeProbability;
planet.lifeComplexity = life.lifeComplexity;
planet.hasLife = life.hasLife;
if (life.name !== undefined) {
    planet.name = life.name;
}

planets.push(planet);
```

**`createPlanet` default literal** gains three keys, following the existing default-then-overwrite
convention already used for `semiMajorAxis`, `temperature` and `habitableZone`:

```ts
semiMajorAxis: 0,       // Default value, will be updated in the system generation
temperature: 0,         // Default value, will be updated in the system generation
habitableZone: false,   // Default value, will be updated in the system generation
lifeProbability: 0,     // Default value, will be updated in the system generation
lifeComplexity: 0,      // Default value, will be updated in the system generation
hasLife: false          // Default value, will be updated in the system generation
```

**Critical ordering constraint:** the order of main-stream (`prng`) draws must not change.
`drawSystemAge` and `assignLife` touch only `lifePrng`; naming continues to touch only
`namePrng`. This is what makes the change purely additive — every pre-existing field *and* every
system/star name stays bit-identical for any given seed.

**Fixture/assertion updates required in this story:**

| File | Change |
|---|---|
| `backend/__tests__/unit/lib/stellar-generator.test.ts` | Add tests 35-42 (no existing assertion removed or weakened). |
| `backend/__tests__/integration/api/sector-api.test.ts` | Extend the per-system loop (~line 68) with `age` assertions and the per-planet loop (~line 91) with life-field assertions; add tests 44-48. |
| `backend/__tests__/unit/services/stellar-service.test.ts` | Add `age` to the four `System` literals (lines 21, 91-92, 119, 139, 151) and the three life fields to the six `Planet` literals (lines 100-102, 125-127). Fixtures only — `getSectorStats` never reads the new fields. |
| `backend/__tests__/unit/controllers/sector-controller.test.ts` | Add `age` to the `System` literal (line 133). Fixture only. |
| `frontend/src/stores/sectorStore.size.test.ts` | Add `age: 4.5` to the system fixture and `lifeProbability: 0.25`, `lifeComplexity: 1.2`, `hasLife: false` to the planet fixture; test 49. This story is the one that makes these fields required on `System`/`Planet`, and this file is the *only* frontend file that constructs literal `System`/`Planet` objects (`vue-tsc` runs over `src/**/*.ts`, including `*.test.ts`, during `npm run build`) — deferring this update to a later story would leave `cd frontend && npm run build` broken at this story's boundary. It measures serialized payload size; the existing thresholds have ~10x headroom, so they should still hold — verify and widen only if a bound is genuinely crossed, and say so in the commit. |

**Not touched by this story:** `frontend/src/types/index.ts`'s `LIFE_STAGE_LABELS` const,
`frontend/src/utils/lifeStage.ts`, and all Vue components/views (`PlanetTable.vue`,
`PlanetDetailModal.vue`, `SystemDetailView.vue`, `ResultsDisplay.vue`, `ApiReferenceView.vue`,
`DocumentationView.vue`) — those are stories 004 and 005. `backend/src/services/stellar.service.ts`,
`backend/src/controllers/sector.controller.ts`, `backend/src/routes/sector.routes.ts` remain
unchanged — the response shape only gains fields.

## Tests

`backend/__tests__/unit/lib/stellar-generator.test.ts` (modified — additive) — spec tests 35-42
and 43:

35. Every system has a numeric `age` within the `medium` zone range (0.5-10.0), and a `core`-zone
    sector's ages fall within 6.0-13.0.
36. Every planet has numeric `lifeProbability` in `[0, 1]`, numeric `lifeComplexity` in `[0, 6]`,
    and a boolean `hasLife`.
37. Every planet with `habitableZone === false` has `lifeProbability === 0`,
    `lifeComplexity === 0` and `hasLife === false`.
38. Every planet with `hasLife === true` has a defined non-empty `name`; every planet with
    `hasLife === false` has `name === undefined`.
39. Over a 300-system sector, at least one planet has `hasLife === true` and at least one
    Goldilocks planet has `hasLife === false`.
40. Planet names are unique across a 300-system sector.
41. Every planet whose host star is off the main sequence (spectral class not in
    `O B A F G K M`) has `lifeProbability === 0`.
42. Determinism: two generators with the same seed produce identical `system.age`,
    `planet.lifeProbability`, `planet.lifeComplexity`, `planet.hasLife` and `planet.name`
    sequences; two generators with different seeds differ in at least one of them over a
    50-system sector.
43. Name-stream stability: `new StellarGenerator('test-seed-123').generateSector(20, 1000)`
    produces the same `system.name`, `system.hasProperName` and `star.name` sequences as the
    golden literal captured before life was wired in.

`backend/__tests__/unit/lib/generation-stability.test.ts` needs **no change** and must keep
passing unmodified.

`backend/__tests__/integration/api/sector-api.test.ts` (modified — additive) — spec tests 44-48:

44. `typeof system.age === 'number'` and `system.age >= 0.5` in the per-system loop.
45. `typeof planet.lifeProbability === 'number'`, `typeof planet.lifeComplexity === 'number'`,
    `typeof planet.hasLife === 'boolean'` in the per-planet loop.
46. Two `POST /api/sector/generate` calls with the same body (including `seed`) return identical
    `age`, `lifeProbability`, `hasLife` and `name` arrays.
47. Two calls differing only in `seed` return at least one different `hasLife` or `age` value.
48. A `systemCount: 1000` request still returns 200 with every planet scored, and every defined
    `planet.name` in the response is unique.

Manual verification (spec test 50, not automatable):

50. `cd backend && npm run build && npm start`, then `POST /api/sector/generate` returns planets
    carrying life fields and named inhabited worlds.

`frontend/src/stores/sectorStore.size.test.ts` (modified) — spec test 49:

49. The `generateSectorData` fixture includes `age` on every system and `lifeProbability` /
    `lifeComplexity` / `hasLife` on every planet, and the existing size-estimation assertions
    still pass (adjust a threshold only if the added bytes genuinely cross it, and say so in the
    commit). Owned by this story, not story 004, because this story is what makes the fields
    required — see Technical Notes.

Plus build verification: `cd frontend && npm run build` passes `vue-tsc` at the end of this
story, with no dependency on story 004 having landed first.

**Priority:** Critical
**Dependencies:** life-on-planets-001-planet-name-asset-and-loader.md, life-on-planets-002-life-model-library.md
