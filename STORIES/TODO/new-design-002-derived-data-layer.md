# new-design-002-derived-data-layer

**Spec:** STORIES/SPECS/new-design.md

**As a** frontend developer building the mission-console screens
**I want** every scale, classification, mapping and aggregate the redesign needs (star physics,
short display labels, thermal zones, log sliders, orbital projection, and the single sector-wide
statistics composable) implemented as pure, independently tested modules
**So that** the presentational components built in later stories can consume trustworthy,
consistent numbers instead of recomputing them ad hoc, and so that the two frozen taxonomies
(star classes, planet types) are locked down by CI before any screen is built on top of them

## Acceptance Criteria

```gherkin
Feature: Derived data layer — pure modules and aggregates

  # --- starPhysical.ts ---

  Scenario: STAR_PHYSICAL mirrors the backend's luminosity and radius (T-B1 / T-F1)
    Given "backend/src/lib/example_star_generator.ts"'s starTypes table
    And "frontend/src/utils/starPhysical.ts"'s STAR_PHYSICAL table
    Then for each of the 24 spectral classes, STAR_PHYSICAL[class].luminosity and .radius equal
      the backend's starTypes[class].luminosity and .radius exactly
    And each test file's header comment names the other file, so an unsynchronised edit to
      either fails CI

  Scenario: The star and planet type sets are frozen (D-36, T-F49)
    When Object.keys(STAR_TYPE_DESCRIPTIONS).sort() is compared against the literal 24-class list
      "O B A F G K M DA DB DF DG DK gF gG gK gM NS cB cA cF cG cK cM BH"
    Then they are equal
    When Object.keys(PLANET_TYPE_DESCRIPTIONS).sort() is compared against the literal 22-code list
    Then they are equal
    And Object.keys(STAR_PHYSICAL) covers every one of the 24 spectral classes with no extra key
    # This test fails on an addition to either map and on a removal from either map.

  Scenario: habitableZoneBounds matches the generator's Solar reference (T-F4)
    When habitableZoneBounds('G') is called
    Then it returns approximately { inner: 0.7495, outer: 1.7678 }

  Scenario: Non-luminous classes have no habitable zone (T-F5)
    When habitableZoneBounds('NS') or habitableZoneBounds('BH') is called
    Then both return { inner: 0, outer: 0 }

  Scenario: orbitBand agrees with the generator at and around both bounds (T-F6)
    Given a spectral class's habitable-zone bounds
    When orbitBand(a, class) is evaluated below inner, at inner, between the bounds, at outer,
      and above outer
    Then it returns 'inner', 'medium', 'medium', 'medium', 'outer' respectively

  Scenario: An unknown spectral class falls back to the M-class row (T-F7)
    When STAR_PHYSICAL or habitableZoneBounds is queried with a class outside the 24
    Then it returns the M-class values rather than throwing

  Scenario: systemMass sums nominal class masses (T-F8)
    When systemMass([]) is called
    Then it returns 0
    When systemMass is called with a G star and a DA star
    Then it returns 1.6

  # --- thermalZone.ts (D-22, unchanged thresholds) ---

  Scenario: habitableZone always wins regardless of temperature (T-F10)
    Given a planet with habitableZone: true and temperature 400 or 100
    When thermalZone(planet) is called
    Then it returns 'Goldilocks' in both cases

  Scenario Outline: Thermal zone boundaries match the existing thresholds (T-F11)
    Given a planet with habitableZone: false and temperature <temp>
    When thermalZone(planet) is called
    Then it returns '<zone>'

    Examples:
      | temp   | zone      |
      | 285    | Hot       |
      | 284.99 | Temperate |
      | 237    | Temperate |
      | 236.99 | Cold      |

  Scenario: Each thermal zone has a distinct, non-empty badge class (T-F12)
    When zoneBadgeClass is called for each of the four zones
    Then all four results are non-empty and mutually distinct

  # --- logScale.ts (D-18) ---

  Scenario: fromSlider bounds the systems and volume ranges (T-F13)
    When fromSlider(0, ...) and fromSlider(1, ...) are called for the systems range (1-5000)
    Then they return 1 and 5000
    When called for the volume range (10-100000)
    Then they return 10 and 100000

  Scenario Outline: toSlider/fromSlider round-trip (T-F14)
    When toSlider(fromSlider(<t>, min, max)) is computed
    Then it is approximately <t>

    Examples:
      | t    |
      | 0    |
      | 0.25 |
      | 0.5  |
      | 0.75 |
      | 1    |

  Scenario: The volume scale snaps to multiples of 10 (T-F15)
    When fromSlider is called anywhere across the volume range
    Then every returned value is a multiple of 10 and never below 10

  Scenario: fromSlider is monotonic (T-F16)
    When t increases across [0, 1]
    Then fromSlider(t, ...) never decreases

  # --- planetDisplay.ts (D-10, D-21) ---

  Scenario Outline: orbitLetter maps orbit number to a letter, guarded past 25 (T-F20)
    When orbitLetter(<n>) is called
    Then it returns "<letter>"

    Examples:
      | n  | letter |
      | 1  | b      |
      | 3  | d      |
      | 26 | #26    |

  Scenario: planetDisplayName prefers the payload name (T-F21)
    Given a planet with a defined "name"
    When planetDisplayName(planet, star) is called
    Then it returns planet.name
    Given a planet with no name
    Then it returns "<star.name> <orbitLetter(orbitalNumber)>"

  Scenario: Physical display helpers round known values and guard degenerate planets (T-F22)
    Given a known Earth-like planet
    When massEarths, gravityG and densityGCm3 are called
    Then each rounds to its expected value
    Given an asteroid belt (mass: 0, diameter: 0)
    When the same three helpers are called
    Then all three return null, never NaN or Infinity

  Scenario: relativeSize guards against a zero maximum (T-F23)
    When relativeSize(d, 0) is called
    Then it returns 0

  # --- expectedStarShares.ts ---

  Scenario: Every zone's expected shares sum to 1 (T-F24)
    When expectedShare(zone, cls) is summed over all 24 classes, for each of the 5 zones
    Then each sum equals 1 within 1e-9

  Scenario: Spot-check values match the generator's ladder comments (T-F25)
    When expectedShare('medium', 'M') and expectedShare('medium', 'G') are computed
    Then they are approximately 0.677 and 0.076 respectively

  Scenario: The BH cascade contribution is folded in (T-F26)
    When expectedShare('core', 'BH') is computed
    Then it is strictly greater than 0.05 (the primary ladder's 5% plus the cascade share)

  Scenario: An unknown class returns 0 (T-F27)
    When expectedShare(zone, 'not-a-class') is computed
    Then it returns 0, not undefined

  # --- orbitalScale.ts ---

  Scenario: Projected positions are increasing and in-range (T-F28)
    Given a set of planet distances
    When orbitalProjection computes their x positions
    Then positions strictly increase with distance and all fall inside [4%, 96%]

  Scenario: HZ rules land inside the planet span for a straddling system (T-F29)
    Given a G-class star whose planets straddle the habitable zone
    When orbitalProjection is computed
    Then the HZ rule positions land between the innermost and outermost planet

  Scenario: A single-planet system has no divide-by-zero (T-F30)
    Given exactly one planet
    When orbitalProjection is computed
    Then it returns a finite, in-range position

  Scenario: An empty planet list returns nothing (T-F31)
    Given no planets
    When orbitalProjection is computed
    Then it returns empty positions and no HZ rules

  # --- useSectorStats.ts ---

  Scenario: Headline counts and moon totals are correct (T-F32)
    Given the fixture sector (3 systems, 5 stars incl. one BH, 9 planets incl. 2 habitable,
      1 with life, 1 asteroid belt)
    When useSectorStats computes systemCount, starCount, planetCount, moonCount
    Then each matches the fixture's true values

  Scenario: Per-entity ratios are zero, not NaN, on an empty sector (T-F33)
    When starsPerSystem, planetsPerStar, moonsPerPlanet are computed on the fixture
    Then each rounds to 2 dp
    Given an empty sector
    Then each of the three is 0

  Scenario: spectralDistribution is count-descending and shares sum to 1 (T-F34)
  Scenario: thermalOccupancy and orbitBands totals equal planetCount (T-F35)
  Scenario: multiplicity buckets sum to systemCount, a 5-star system lands in 4+ (T-F36)
  Scenario: moonHistogram has 10 buckets, folding moonCount >= 9 into the last (T-F37)
  Scenario: lifeByStage has 6 buckets summing to lifeCount (T-F38)

  Scenario: notableSystems applies D-28's tie-break order, at most 4 (T-F39)
    When notableSystems is computed
    Then it ranks by planets-with-life count desc, then habitable-zone planet count desc, then
      planet count desc, then systemId asc
    And returns at most 4 systems

  Scenario: lifeSystemCount counts distinct systems, not planets (T-F40)
  Scenario: An empty sector yields zeros throughout with no NaN and no throw (T-F41)
```

## Technical Notes

**Scope of this story: pure `.ts` modules and one composable only — no Vue components, no
store changes, no visible UI change (D-34).** Consumed by stories 003 onward.

### `backend/__tests__/unit/lib/star-physical-contract.test.ts` (new)

For each of the 24 spectral classes, asserts `new StellarGenerator()`'s `starTypes` entry has
exactly the documented `luminosity` and `radius` (table below). Header comment: *"mirrored in
frontend/src/utils/starPhysical.ts — change both together."* This is the only backend file this
story touches; all 11 existing backend test files must keep passing untouched.

### `frontend/src/utils/starPhysical.ts` (new)

```ts
export interface StarPhysical {
    luminosity: number;   // L☉ — MUST match backend starTypes[].luminosity
    radius: number;       // R☉ — MUST match backend starTypes[].radius
    mass: number;         // M☉ — display only, no backend counterpart
    effectiveTemp: number; // K  — display only; 0 means "not applicable" (NS, BH)
}
export const STAR_PHYSICAL: Record<string, StarPhysical>;
```

| Class | L☉ | R☉ | M☉ | Teff (K) |
| --- | --- | --- | --- | --- |
| `O` | 50000 | 10 | 20.0 | 35000 |
| `B` | 20000 | 5 | 7.0 | 18000 |
| `A` | 80 | 1.8 | 2.1 | 8500 |
| `F` | 6 | 1.3 | 1.3 | 6500 |
| `G` | 1 | 1 | 1.0 | 5772 |
| `K` | 0.4 | 0.8 | 0.8 | 4500 |
| `M` | 0.04 | 0.3 | 0.3 | 3200 |
| `DA` `DB` `DF` `DG` `DK` | 0.001 | 0.013 | 0.6 | 9800 |
| `gF` | 45 | 5 | 1.5 | 6700 |
| `gG` | 65 | 10 | 2.0 | 5200 |
| `gK` | 150 | 20 | 2.5 | 4500 |
| `gM` | 380 | 50 | 3.0 | 3600 |
| `cB` | 90000 | 25 | 25.0 | 20000 |
| `cA` | 21000 | 60 | 16.0 | 9000 |
| `cF` | 21000 | 100 | 14.0 | 7000 |
| `cG` | 21000 | 180 | 13.0 | 5200 |
| `cK` | 22000 | 280 | 13.0 | 4200 |
| `cM` | 66000 | 700 | 15.0 | 3500 |
| `NS` | 0 | 0.00002 | 1.4 | 0 |
| `BH` | 0 | 0 | 10.0 | 0 |

L☉ and R☉ are a verbatim transcription of `starTypes` in `example_star_generator.ts`, pinned by
T-B1/T-F1. Unknown class → `{ luminosity: 0.04, radius: 0.3, mass: 0.3, effectiveTemp: 3200 }`
(the **M-class row**), matching the backend's `this.starTypes[spectralClass] || this.starTypes['M']`
fallback at `example_star_generator.ts:537`. Unreachable in practice since D-36 freezes the
class set and all 24 classes have a row. Where `effectiveTemp === 0` the UI prints `—` (a later
story's concern, not this one).

Helper exports:

```ts
export function habitableZoneBounds(spectralClass: string): { inner: number; outer: number };
// L === 0 → { inner: 0, outer: 0 }; else sqrt(L/1.78), sqrt(L/0.32)
export function orbitBand(a: number, spectralClass: string): 'inner' | 'medium' | 'outer';
export function systemMass(stars: Star[]): number;  // Σ STAR_PHYSICAL[class].mass
export type OrbitBand = 'inner' | 'medium' | 'outer';
```

`orbitBand` reproduces the backend's `determineHabitableZone`: `a < inner → 'inner'`,
`a > outer → 'outer'`, else `'medium'` (boundary values land in `'medium'`).

**D-36 (must hold, enforced here by T-F49):** the 24 spectral classes in
`STAR_TYPE_DESCRIPTIONS` and the 22 planet codes in `PLANET_TYPE_DESCRIPTIONS` are the closed
sets for this whole redesign. This story adds `STAR_PHYSICAL` as a *per-class constant table
for the existing 24 classes* — it must contain a row for each and no row for anything else.
Nothing in this story modifies `types/index.ts` in either package.

### `frontend/src/utils/expectedStarShares.ts` (new)

The expected spectral-class share per galactic zone, mirroring the three threshold ladders in
`generateStarType` / `generateStarType2` / `generateStarType3` as data:

```ts
const PRIMARY: Record<SectorZone, Array<[string, number]>> = {
  'extragalactic': [['@2',0.01],['G',0.09],['K',4.9],['M',87.0],['DA',6.0],['DF',2.0]],
  'galactic edge': [['@2',0.1],['F',0.4],['G',3.5],['K',11.0],['M',75.0],['DA',7.0],['DF',3.0]],
  'medium':        [['@2',1.0],['B',0.1],['A',0.6],['F',3.0],['G',7.6],['K',12.0],
                    ['M',67.7],['DA',3.0],['DB',2.0],['DF',1.0],['DG',1.0],['DK',1.0]],
  'central zone':  [['@2',2.0],['B',0.5],['A',1.5],['F',6.0],['G',10.0],['K',15.0],
                    ['M',55.0],['DA',10.0]],
  'core':          [['@2',15.0],['B',1.0],['A',2.0],['F',7.0],['G',10.0],['K',15.0],
                    ['M',35.0],['DA',10.0],['BH',5.0]]
};
const SECONDARY: Array<[string, number]> =            // generateStarType2
  [['@3a',1.0],['gF',4.0],['gG',5.0],['gK',45.0],['gM',40.0],['NS',4.0],['@3b',1.0]];
const TERTIARY_A: Array<[string, number]> =           // generateStarType3(1)
  [['cB',10],['cA',10],['cF',20],['cG',20],['cK',20],['cM',20]];
const TERTIARY_B: Array<[string, number]> =           // generateStarType3(100)
  [['BH',5],['O',95]];

export function expectedShare(zone: SectorZone, spectralClass: string): number; // fraction [0,1]
```

Every ladder sums to exactly 100. `@2` / `@3a` / `@3b` expand by multiplication and sum with
duplicate classes (`BH` appears in both the `core` primary ladder and `TERTIARY_B`).

### `frontend/src/utils/thermalZone.ts` (new, D-22)

Moves the logic currently duplicated character-for-character in `PlanetTable.vue` and
`SystemDetailView.vue` (both being replaced) into one shared module, comment intact, **no
threshold changes**:

```ts
export type ThermalZone = 'Hot' | 'Temperate' | 'Goldilocks' | 'Cold';
export function thermalZone(planet: Planet): ThermalZone;
// habitableZone → 'Goldilocks'; else >= 285 K → 'Hot'; >= 237 K → 'Temperate'; else 'Cold'
export function zoneBadgeClass(zone: ThermalZone): string;
export function tempTextClass(zone: ThermalZone): string;
```

### `frontend/src/utils/planetDisplay.ts` (new, D-10, D-21)

```ts
export const PLANET_SHORT_LABEL: Record<string, string>; // D-21 dense-surface copy, see below
export function orbitLetter(n: number): string;  // String.fromCharCode(97+n); n>25 → `#${n}`
export function planetDisplayName(planet: Planet, star: Star): string;
export function massEarths(planet: Planet): number | null;    // planet.mass / 5.972e24
export function gravityG(planet: Planet): number | null;      // planet.gravity / 9.807
export function densityGCm3(planet: Planet): number | null;   // mass/((4/3)π r³)/1000
export function relativeSize(diameter: number, maxDiameter: number): number; // 0 if max is 0
```

**D-10:** display name = `planet.name` when present, otherwise
`` `${star.name} ${orbitLetter(orbitalNumber)}` `` — orbit 1 → `b`, orbit 3 → `d`. Guard: for
`n > 25`, fall back to `#${n}` (unreachable in practice — planet counts are capped by `3d6`=18).

**D-21 short labels** (`PLANET_SHORT_LABEL`, exact strings verified against the canvas):
`Rocky`, `Gas giant`, `Ice world`, `Desert`, `Ice giant`, `Asteroid`, `Ocean`, `Earth-like`. Any
type with no entry falls through to the existing `PLANET_TYPE_DESCRIPTIONS` long map — the long
map itself is **not modified**; it still drives `DocumentationView.vue`, tooltips and
`planetTypeLabel()`.

`massEarths`/`gravityG`/`densityGCm3` return `null` (not `NaN`/`Infinity`) for a degenerate
planet (`mass: 0, diameter: 0`, e.g. an asteroid belt) so the UI can print `—`.

### `frontend/src/utils/starDisplay.ts` (new, D-21)

```ts
export const STAR_SHORT_LABEL: Record<string, string>;
export function getStarClassGradient(spectralClass: string): string; // the 8 CSS gradients from the handoff
export function getStarRingColor(spectralClass: string): string; // consolidates the 3 identical copies in ResultsDisplay/StarTable/SystemDetailView
```

**D-21 short labels** for `STAR_SHORT_LABEL`: `Red dwarf`, `Orange dwarf`, `Yellow dwarf`,
`Yellow-white`, `White dwarf`, `White`, `Black hole`, `Neutron star`. Same fall-through rule to
`STAR_TYPE_DESCRIPTIONS`, which is **not modified**.

### `frontend/src/utils/logScale.ts` (new, D-18)

```ts
export function toSlider(value: number, min: number, max: number): number;   // t in [0,1]
export function fromSlider(t: number, min: number, max: number, step?: number): number;
```

`value(t) = round(exp(ln(min) + t·(ln(max) − ln(min))))`, `t ∈ [0,1]` from an
`<input type="range" min="0" max="1000" step="1">`. Ranges: systems `1 … 5 000`, volume
`10 … 100 000 pc³`. Volume additionally snaps to the nearest 10 and never returns below 10
(matching today's `step="10"`). The store's and backend's wider bounds (volume up to
10 000 000) are unchanged; this scale simply does not reach them.

### `frontend/src/utils/orbitalScale.ts` (new)

```ts
export function orbitalProjection(
  distances: number[], hzInner: number, hzOuter: number
): { positions: number[]; hzRules: { inner: number; outer: number } | null };
```

Used by `OrbitalMap.vue` in story 009; projection formula:

```
domainMin = max(0.05, min(min(a_i), hzInner) * 0.8)
domainMax = max(max(a_i), hzOuter) * 1.1
x(a)      = 4% + 92% * (ln a − ln domainMin) / (ln domainMax − ln domainMin)
```

An empty planet list returns empty positions and no HZ rules; a single-planet system must not
divide by zero on a degenerate domain.

### `frontend/src/composables/useSectorStats.ts` (new)

`useSectorStats(sector)` — every aggregate below, all `computed`, all derived from
`(systems, stars, planets)` plus `STAR_PHYSICAL`. **Single pass over the arrays** — the current
`ResultsDisplay.getPlanetsInSystem` is O(stars × planets) per call and must not be reproduced:
build `starId → systemId` and `systemId → { stars, planets }` index maps once, as
`systemsWithLife` already does today.

| Key | Definition |
| --- | --- |
| `systemCount` `starCount` `planetCount` | array lengths |
| `moonCount` | `Σ planet.moonCount` |
| `habitableCount` | `planets.filter(p => p.habitableZone).length` |
| `lifeCount` | `planets.filter(p => p.hasLife).length` |
| `lifeSystemCount` | distinct systems containing a life-bearing planet |
| `lifePercent` | `lifeCount / planetCount` |
| `habitablePercent` | `habitableCount / planetCount` |
| `starsPerSystem` `planetsPerStar` `moonsPerPlanet` | ratios, 2 dp |
| `spectralDistribution` | `Array<{ cls, count, share, expected }>`, count desc; `expected` from `expectedShare(zone, cls)` |
| `planetTypeDistribution` | `Array<{ type, count, share, moons, lifeCount }>`, count desc |
| `thermalOccupancy` | `{ hot, goldilocks, temperate, cold }` via `thermalZone()` |
| `orbitBands` | `{ inner, medium, outer }` via `orbitBand()` (D-6) |
| `multiplicity` | systems bucketed by star count `1 / 2 / 3 / 4+` |
| `moonHistogram` | 10 buckets `0…9`, planets with `moonCount ≥ 9` fold into `9`; plus `mean`, `max` |
| `lifeByStage` | six buckets from `lifeStageLevel(p.lifeComplexity)` over `hasLife` planets |
| `notableSystems` | top 4 per D-28 |
| `systemRows` | one row per system: id, name, `hasProperName`, primary star, star/planet/moon/HZ counts, `hasLife`, `hasBH`, `hasNS`, coords, ordered planets |
| `maxPlanetDiameter` | for the 4a relative-size bar |

The **primary star** of a system is the first star in `stars` with that `systemId` (component
A, per the generator's insertion order).

**D-6:** orbit bands are derived, not transmitted — `band = a < a_inner ? inner : a > a_outer ?
outer : medium`.

**D-28 `notableSystems` ranking:** planets-with-life count desc → habitable-zone planet count
desc → planet count desc → `systemId` asc. Deterministic and seed-stable.

### Not touched by this story

Any Vue component, `frontend/src/stores/sectorStore.ts`, `frontend/src/types/index.ts` (both
packages), `frontend/src/App.vue`, all of `backend/` except the one new contract test.

## Tests

`backend/__tests__/unit/lib/star-physical-contract.test.ts` (new) — **T-B1**.

`frontend/src/utils/starPhysical.test.ts` (new) — **T-F1**, **T-F49** (D-36 frozen sets),
**T-F4** through **T-F8**.

`frontend/src/utils/thermalZone.test.ts` (new) — **T-F10**, **T-F11**, **T-F12**.

`frontend/src/utils/logScale.test.ts` (new) — **T-F13** through **T-F16**.

`frontend/src/utils/planetDisplay.test.ts` (new) — **T-F20** through **T-F23**.

`frontend/src/utils/expectedStarShares.test.ts` (new) — **T-F24** through **T-F27**.

`frontend/src/utils/orbitalScale.test.ts` (new) — **T-F28** through **T-F31**.

`frontend/src/composables/useSectorStats.test.ts` (new), fixture: 3 systems, 5 stars incl. one
`BH`, 9 planets incl. 2 habitable, 1 with life, 1 asteroid belt — **T-F32** through **T-F41**.

Verifiable: `cd backend && npm test` and `cd frontend && npm test` both green; no UI change.

**Priority:** Critical
**Dependencies:** None
