# life-on-planets-002-life-model-library

**Spec:** STORIES/SPECS/life-on-planets.md

**As a** backend developer
**I want** a pure, injectable module implementing the habitability probability, life-complexity
index and per-planet presence/name assignment from `docs/exoplanet-habitability-model.md`
**So that** the model's factors can each be verified independently before any generator wiring,
exactly like the naming algorithm precedent

## Acceptance Criteria

```gherkin
Feature: Pure life-model library (life.ts)

  Background:
    Given the module "backend/src/lib/life.ts"
    And it is not yet referenced by the generator

  # --- Individual factors (tests 16-23) ---

  Scenario Outline: starFactor by spectral class (test 16)
    When starFactor("<class>") is called
    Then it returns <value>

    Examples:
      | class | value |
      | G     | 1.0   |
      | K     | 0.9   |
      | F     | 0.7   |
      | M     | 0.5   |
      | A     | 0.1   |
      | gM    | 0.1   |
      | DA    | 0.1   |
      | NS    | 0.1   |
      | BH    | 0.1   |
      | ZZ    | 0.1   |

  Scenario: temperatureFactor is a Gaussian centred on 288K (test 17)
    Then temperatureFactor(288) equals 1
    And temperatureFactor(288 + 30) and temperatureFactor(288 - 30) both equal Math.exp(-0.5) (≈0.6065)
    And temperatureFactor(700) is below 1e-6
    And the function is symmetric about 288

  Scenario: radiusFactor bands and type overrides (test 18)
    Then radiusFactor returns 0 for planetType "A" at any diameter
    And radiusFactor returns 0.05 for planetType "G", "Q", "U" regardless of diameter
    And for a rocky type, radiusFactor returns 0.1 / 0.5 / 1.0 / 0.7 / 0.4 across the five radius
      bands, with explicit checks at the 0.3, 0.5, 1.5 and 2.0 R⊕ boundaries

  Scenario: atmosphereFactor per planet type (test 19)
    Then atmosphereFactor returns 1.0 for "E", "O", "J"
    And atmosphereFactor returns 0.3 for "I", "L", "F", "W", "A", "G", "Q", "U"
    And atmosphereFactor returns 0.6 for "S", "R", "D", "T", "#"
    And atmosphereFactor returns 0.6 for an unknown type code

  Scenario: Drift guard — every planet type has an atmosphere entry (test 20)
    Given the planet type codes "A G Q U S R E O I D C L F T N B J W H M X #"
    Then every one of them has an explicit ATMOSPHERE_FACTOR entry

  Scenario: Drift guard — main-sequence classes have a mass entry, others do not (test 21)
    Given the main-sequence spectral classes "O B A F G K M"
    Then each has a STELLAR_MASS_SOLAR entry
    And no off-main-sequence class has one

  Scenario: mainSequenceLifetimeGyr matches the model formula (test 22)
    Then mainSequenceLifetimeGyr(1) equals 10
    And mainSequenceLifetimeGyr(0.3) is approximately 202.8
    And mainSequenceLifetimeGyr(25) is approximately 0.0032

  Scenario: ageFactor gates on main-sequence status and lifetime (test 23)
    Then ageFactor returns 0 for every off-main-sequence class ("DA", "DB", "DF", "DG", "DK",
      "gF", "gG", "gK", "gM", "cB", "cA", "cF", "cG", "cK", "cM", "NS", "BH") at any age
    And ageFactor returns 0 for "O" and "B" at age 0.5 (lifetime already exceeded)
    And ageFactor returns approximately 1 for "G" at age 5
    And ageFactor returns 0 for "G" at age 11 (past its 10 Gyr lifetime)
    And ageFactor returns 0.5 for "G" at exactly age 0.5 (sigmoid midpoint)

  # --- Composite probability and complexity (tests 24-27) ---

  Scenario: habitabilityProbability is a hard 0 outside the habitable zone (test 24)
    When habitableZone is false
    Then habitabilityProbability returns exactly 0, whatever the other inputs

  Scenario: Model doc worked example — probability (test 25, decision #26)
    Given a rocky planet of 1.1 R⊕ (diameter 14016 km, type "R", A = 0.6) at 295 K around a
      "K" star aged 4.2 Gyr
    Then lifeProbability equals exactly 0.5252
    And the individual factors are S = 0.9, T = 0.97314, R = 1.0, A = 0.6, A_age = 0.99939
    And each factor is asserted separately so a future change points at the offending factor
    Note: the expected value is the formula's own result, not the model doc's printed
      approximation of 0.54 (decision #26 — the doc's worked-example arithmetic is wrong; the
      closed-form formula is normative and the doc is not edited by this feature)

  Scenario: Model doc worked example — complexity (test 26)
    Then complexityCurve(3.7) is approximately 3.942 (matches the doc's "≈3.9")
    And lifeComplexityIndex(0.5252, 3.7) equals 2.07
    And complexityCurve(0) is approximately 0.092
    And complexityCurve(20) approaches 6 without exceeding it

  Scenario: Perfect Earth analogue reaches the documented ceiling (test 27, decision #14)
    Given planetType "E", diameter 12742 km, temperature 288K, spectral class "G", system age
      8 Gyr, in the habitable zone
    Then lifeProbability equals exactly 1
    And the same planet at age 5 Gyr yields lifeProbability 0.9999 (age sigmoid not yet saturated)

  # --- Utility and assigner (tests 28-34) ---

  Scenario Outline: romanNumeral formats orbital numbers (test 28)
    When romanNumeral(<n>) is called
    Then it returns "<roman>"

    Examples:
      | n  | roman |
      | 1  | I     |
      | 2  | II    |
      | 4  | IV    |
      | 9  | IX    |
      | 14 | XIV   |
      | 18 | XVIII |

  Scenario: drawSystemAge stays within its zone's range (test 29)
    Then drawSystemAge returns a value inside the declared range for each of the five zones
    And the value is rounded to 2 decimals
    And an unrecognised zone string falls back to the "medium" range

  Scenario: assignLife consumes the documented number of PRNG draws (test 30)
    Given a counting fake PRNG
    Then assignLife consumes exactly one draw when no name is taken
    And exactly two draws when a pool name is taken

  Scenario: assignLife realises presence against the roll (test 31)
    Then hasLife is true when the roll is below lifeProbability, false when it is above
    And name is defined if and only if hasLife is true
    And the returned lifeProbability and lifeComplexity are rounded to 4 and 3 decimals
      respectively

  Scenario: Pool exhaustion falls back to a designation, never throws, never repeats (test 32)
    Given a 1-name pool and rolls that always produce life
    Then the first inhabited planet takes the pool name
    And later inhabited planets get "${starName} ${romanNumeral(orbit)}"
    And no error is thrown and no name repeats

  Scenario: No repeats across many draws (test 33)
    Given 200 inhabited planets drawn against a 20-name pool
    Then the multiset of pool-drawn names contains no duplicate

  Scenario: Determinism by seed (test 34)
    Given two LifeAssigners built from seedrandom('abc') and the same pool
    Then they produce identical outcomes for the same input sequence
    And a LifeAssigner built from seedrandom('xyz') produces at least one differing outcome
```

## Technical Notes

This module is **pure and injectable**: `LifeAssigner` receives `() => number` and a
`readonly string[]`; every factor is a free function taking primitives. It is not referenced by
the generator in this story — that wiring is life-on-planets-003. Unit tests drive it with a
scripted PRNG and a small (2-3 name) pool to exercise exhaustion without touching the filesystem,
in the fixture style already used by `backend/__tests__/unit/lib/naming.test.ts`.

**Model constants** (exported so tests can reference them):

| Constant | Value | Meaning |
|---|---|---|
| `EARTH_REFERENCE_TEMPERATURE_K` | `288` | Centre of the temperature Gaussian |
| `TEMPERATURE_SIGMA_K` | `30` | Tolerance band of the temperature Gaussian |
| `EARTH_DIAMETER_KM` | `12742` | Divisor converting `planet.diameter` to Earth radii |
| `LIFE_START_DELAY_GYR` | `0.5` | `t_0` — minimum time for prebiotic chemistry |
| `AGE_SIGMOID_K` | `2` | `k` in the age sigmoid |
| `MAIN_SEQUENCE_LIFETIME_COEFF_GYR` | `10` | Coefficient in `L = 10 × M^-2.5` |
| `MAIN_SEQUENCE_LIFETIME_EXPONENT` | `-2.5` | Exponent in `L = 10 × M^-2.5` |
| `COMPLEXITY_K` | `1.3` | `k_c` in the complexity logistic |
| `COMPLEXITY_MIDPOINT_GYR` | `3.2` | Midpoint of the complexity logistic |
| `MAX_COMPLEXITY` | `6` | Ceiling of the complexity curve (intelligent life) |
| `PROBABILITY_DECIMALS` | `4` | Rounding of `lifeProbability` |
| `COMPLEXITY_DECIMALS` | `3` | Rounding of `lifeComplexity` |
| `AGE_DECIMALS` | `2` | Rounding of `System.age` |

**System age ranges by sector zone** (uniform draw in `[min, max]`, rounded to `AGE_DECIMALS`):

| `SectorZone` | Population | min (Gyr) | max (Gyr) |
|---|---|---|---|
| `extragalactic` | Halo — old, low-mass stars | 8.0 | 13.5 |
| `galactic edge` | Thick disk | 5.0 | 12.0 |
| `medium` | Solar neighbourhood / thin disk | 0.5 | 10.0 |
| `central zone` | Population I — young, massive stars | 0.5 | 6.0 |
| `core` | Galactic bulge — old stars and remnants | 6.0 | 13.0 |

An unrecognised zone falls back to the `medium` range.

**Star type factor `S`:**

| Spectral class | `S` |
|---|---|
| `G` | 1.0 |
| `K` | 0.9 |
| `F` | 0.7 |
| `M` | 0.5 |
| anything else (`O`, `B`, `A`, `D*`, `g*`, `c*`, `NS`, `BH`) | 0.1 |

**Main-sequence mass `M`** (solar masses, used only by `ageFactor`; classes absent from this
table are off the main sequence and yield `A_age = 0`):

| Class | `M` | `L = 10 × M^-2.5` (Gyr) |
|---|---|---|
| `O` | 25 | 0.0032 |
| `B` | 10 | 0.0316 |
| `A` | 2.0 | 1.77 |
| `F` | 1.3 | 5.19 |
| `G` | 1.0 | 10.0 |
| `K` | 0.8 | 17.5 |
| `M` | 0.3 | 202.8 |

**Radius factor `R`** (radius is `diameter / EARTH_DIAMETER_KM`; type overrides checked first,
then bands in order):

| Condition | `R` |
|---|---|
| `planetType === 'A'` (asteroid belt) | 0 — hard exclusion |
| `planetType` in `G`, `Q`, `U` (gas / ice giants) | 0.05 |
| radius < 0.3 R⊕ | 0.1 |
| 0.3 ≤ radius < 0.5 R⊕ | 0.5 |
| 0.5 ≤ radius ≤ 1.5 R⊕ | 1.0 |
| 1.5 < radius ≤ 2.0 R⊕ | 0.7 |
| radius > 2.0 R⊕ | 0.4 |

**Atmosphere factor `A`** (one entry per planet type code):

| `A` | Planet types |
|---|---|
| 1.0 — stable, compatible | `E` Earth-like, `O` Ocean, `J` Jungle |
| 0.3 — absent / unstable | `A` Asteroid, `G` Gas Giant, `Q` Hot Gas Giant, `U` Ice Giant, `I` Ice, `L` Silicate, `F` Iron, `W` Dwarf |
| 0.6 — unknown (neutral default) | `S` Super-Earth, `R` Rocky, `D` Desert, `C` Carbon, `T` Toxic, `N` Ammonia, `B` Methane, `M` Molten, `H` Hell, `X` Cold Desert, `#` Unknown |

An unknown type code falls back to `0.6`.

**Module interface** (`backend/src/lib/life.ts`):

```ts
import { SectorZone } from '../types';

export interface LifeInput {
    spectralClass: string;
    systemAgeGyr: number;
    planetType: string;
    diameterKm: number;
    temperatureK: number;
    habitableZone: boolean;
    starName: string;
    orbitalNumber: number;
}

export interface LifeOutcome {
    lifeProbability: number;
    lifeComplexity: number;
    hasLife: boolean;
    name?: string;
}

// --- Pure factors (each independently unit-tested) --------------------------
export function starFactor(spectralClass: string): number;
export function temperatureFactor(temperatureK: number): number;
export function radiusFactor(planetType: string, diameterKm: number): number;
export function atmosphereFactor(planetType: string): number;
export function mainSequenceLifetimeGyr(massSolar: number): number;
export function ageFactor(spectralClass: string, systemAgeGyr: number): number;
export function habitabilityProbability(input: Omit<LifeInput, 'starName' | 'orbitalNumber'>): number;
export function complexityCurve(tBioGyr: number): number;
export function lifeComplexityIndex(probability: number, tBioGyr: number): number;

/** 1 -> "I", 4 -> "IV", 18 -> "XVIII". Supports 1-39 (orbit numbers max out far below). */
export function romanNumeral(value: number): string;

export class LifeAssigner {
    constructor(prng: () => number, namePool: readonly string[]);
    /** One PRNG draw. Uniform in the zone's range, rounded to AGE_DECIMALS. */
    drawSystemAge(zone: SectorZone): number;
    /** One PRNG draw, plus one more only when a pool name is taken. */
    assignLife(input: LifeInput): LifeOutcome;
}
```

**Normative factor behaviour:**

```ts
starFactor:            'G' -> 1.0, 'K' -> 0.9, 'F' -> 0.7, 'M' -> 0.5, default 0.1

temperatureFactor(t):  Math.exp(-Math.pow(t - 288, 2) / (2 * 30 * 30))

radiusFactor(type, d): type === 'A'                 -> 0
                       'G' | 'Q' | 'U'              -> 0.05
                       r = d / 12742
                       r < 0.3                      -> 0.1
                       r < 0.5                      -> 0.5
                       r <= 1.5                     -> 1.0
                       r <= 2.0                     -> 0.7
                       else                         -> 0.4

atmosphereFactor:      ATMOSPHERE_FACTOR[type] ?? 0.6      // table above

mainSequenceLifetimeGyr(m): 10 * Math.pow(m, -2.5)

ageFactor(cls, t):     const m = STELLAR_MASS_SOLAR[cls];
                       if (m === undefined) return 0;      // off the main sequence
                       const L = mainSequenceLifetimeGyr(m);
                       if (t > L) return 0;                // H(L - t)
                       return 1 / (1 + Math.exp(-2 * (t - 0.5)));

habitabilityProbability(i):
                       if (!i.habitableZone) return 0;
                       const p = starFactor(i.spectralClass)
                               * temperatureFactor(i.temperatureK)
                               * radiusFactor(i.planetType, i.diameterKm)
                               * atmosphereFactor(i.planetType)
                               * ageFactor(i.spectralClass, i.systemAgeGyr);
                       return round(p, 4);

complexityCurve(tBio): 6 / (1 + Math.exp(-1.3 * (tBio - 3.2)))

lifeComplexityIndex(p, tBio):
                       round(p * complexityCurve(Math.max(0, tBio)), 3)
```

**Reference implementation of the assigner (draw order is normative — this is what test 30 and
the future generation-stability guarantee both depend on):**

```ts
export class LifeAssigner {
    private readonly names: string[];
    private cursor = 0;

    constructor(private readonly prng: () => number, namePool: readonly string[]) {
        this.names = [...namePool];        // per-instance mutable copy
    }

    private hasNext(): boolean {
        return this.cursor < this.names.length;
    }

    /** Partial Fisher-Yates: one PRNG draw, no repeats. Same algorithm as SectorNamer. */
    private take(): string {
        const i = this.cursor + Math.floor(this.prng() * (this.names.length - this.cursor));
        const picked = this.names[i];
        this.names[i] = this.names[this.cursor];
        this.names[this.cursor] = picked;
        this.cursor++;
        return picked;
    }

    drawSystemAge(zone: SectorZone): number {
        const [min, max] = SYSTEM_AGE_RANGE_GYR[zone] ?? SYSTEM_AGE_RANGE_GYR['medium'];
        return round(min + this.prng() * (max - min), AGE_DECIMALS);
    }

    assignLife(input: LifeInput): LifeOutcome {
        const lifeProbability = habitabilityProbability(input);
        const tBio = input.systemAgeGyr - LIFE_START_DELAY_GYR;
        const lifeComplexity = lifeComplexityIndex(lifeProbability, tBio);

        // Always draw, then decide: keeps the stream independent of eligibility
        // and of pool state.
        const roll = this.prng();
        const hasLife = lifeProbability > 0 && roll < lifeProbability;
        if (!hasLife) {
            return { lifeProbability, lifeComplexity, hasLife: false };
        }

        const name = this.hasNext()
            ? this.take()
            : `${input.starName} ${romanNumeral(input.orbitalNumber)}`;
        return { lifeProbability, lifeComplexity, hasLife: true, name };
    }
}
```

**Not touched by this story:** `backend/src/lib/example_star_generator.ts`,
`backend/src/types/index.ts`, and everything downstream — the module exists but nothing calls it
yet. `docs/exoplanet-habitability-model.md` is a read-only input and is never modified.

## Tests

`backend/__tests__/unit/lib/life.test.ts` (new) — spec tests 16-34:

16. `starFactor` returns 1.0 / 0.9 / 0.7 / 0.5 for `G` / `K` / `F` / `M`, and 0.1 for `A`, `gM`,
    `DA`, `NS`, `BH` and an unknown class.
17. `temperatureFactor(288)` is 1; `temperatureFactor(288 ± 30)` is `Math.exp(-0.5)` (≈0.6065);
    `temperatureFactor(700)` is below 1e-6; the function is symmetric about 288.
18. `radiusFactor` returns 0 for `A`, 0.05 for `G`/`Q`/`U` regardless of diameter, and — for a
    rocky type — 0.1 / 0.5 / 1.0 / 0.7 / 0.4 at diameters spanning the five bands, with explicit
    checks at the 0.3, 0.5, 1.5 and 2.0 R⊕ boundaries.
19. `atmosphereFactor` returns 1.0 for `E`/`O`/`J`, 0.3 for `I`/`L`/`F`/`W`/`A`/`G`/`Q`/`U`, 0.6
    for `S`/`R`/`D`/`T`/`#`, and 0.6 for an unknown code.
20. Drift guard: every planet type code in `A G Q U S R E O I D C L F T N B J W H M X #` has an
    explicit `ATMOSPHERE_FACTOR` entry.
21. Drift guard: every main-sequence spectral class the generator can emit (`O B A F G K M`) has
    a `STELLAR_MASS_SOLAR` entry, and no off-main-sequence class does.
22. `mainSequenceLifetimeGyr(1)` is 10; `mainSequenceLifetimeGyr(0.3)` is ≈202.8;
    `mainSequenceLifetimeGyr(25)` is ≈0.0032.
23. `ageFactor` returns 0 for every off-main-sequence class (`DA`, `DB`, `DF`, `DG`, `DK`, `gF`,
    `gG`, `gK`, `gM`, `cB`, `cA`, `cF`, `cG`, `cK`, `cM`, `NS`, `BH`) at any age; returns 0 for
    `O` and `B` at age 0.5 (lifetime exceeded); returns ≈1 for `G` at age 5; returns 0 for `G` at
    age 11 (past its 10 Gyr lifetime); returns 0.5 for `G` at exactly age 0.5 (sigmoid midpoint).
24. `habitabilityProbability` returns exactly 0 when `habitableZone` is false, whatever the other
    inputs.
25. Model doc worked example: a rocky planet of 1.1 R⊕ (`diameter` 14016 km, type `R` → `A = 0.6`)
    at 295 K around a `K` star aged 4.2 Gyr yields `lifeProbability === 0.5252`, from `S = 0.9`,
    `T = 0.97314`, `R = 1.0`, `A = 0.6`, `A_age = 0.99939`. Assert the exact rounded value, and
    each factor separately.
26. Model doc worked example, part 2: `complexityCurve(3.7)` is `toBeCloseTo(3.942, 3)` and
    `lifeComplexityIndex(0.5252, 3.7)` is `2.07`. `complexityCurve(0)` is ≈0.092 and
    `complexityCurve(20)` approaches 6 without exceeding it.
27. A perfect Earth analogue (`E`, 12742 km, 288 K, `G` star, 8 Gyr, in zone) yields
    `lifeProbability === 1`. At 5 Gyr the same planet yields `0.9999`.
28. `romanNumeral` returns `I`, `II`, `IV`, `IX`, `XIV`, `XVIII` for 1, 2, 4, 9, 14, 18.
29. `drawSystemAge` returns a value inside the declared range for each of the five zones, is
    rounded to 2 decimals, and falls back to the `medium` range for an unrecognised zone string.
30. `assignLife` consumes exactly one PRNG draw when no name is taken, and exactly two when one
    is (use the counting fake PRNG).
31. `assignLife` sets `hasLife` true when the roll is below `P` and false when it is above;
    `name` is defined iff `hasLife`; the returned `lifeProbability` and `lifeComplexity` are
    rounded to 4 and 3 decimals respectively.
32. Pool exhaustion: with a 1-name pool and rolls that always produce life, the first inhabited
    planet takes the pool name and later ones get `` `${starName} ${romanNumeral(orbit)}` `` —
    no throw, and no name repeats.
33. No repeats: over 200 inhabited planets with a 20-name pool, the multiset of pool-drawn names
    contains no duplicate.
34. Determinism: two `LifeAssigner`s built from `seedrandom('abc')` and the same pool produce
    identical outcomes for the same input sequence; `seedrandom('xyz')` produces at least one
    differing outcome.

**Priority:** Critical
**Dependencies:** None
