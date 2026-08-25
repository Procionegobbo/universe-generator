# Life on Planets

## Feature Name & Description

**Summary** — Give every generated planet a physically-motivated verdict on whether life arose there and how far it got: planets in the Goldilocks zone receive a habitability probability and a life-complexity index computed from the model in `docs/exoplanet-habitability-model.md`, a coin-flip against that probability decides whether life is actually present, and each inhabited world earns a proper name drawn from a curated science-fiction/mythology pool. The sector stops being a catalogue of rocks and becomes a map of where somebody might be looking back.

**Current state**

- `Planet` (`backend/src/types/index.ts`) carries `planetType`, `diameter`, `moonCount`, `mass`, `gravity`, `semiMajorAxis`, `temperature` and `habitableZone`. There is no notion of life anywhere in the codebase — no field, no computation, no UI.
- `System` carries `systemId`, `name`, `hasProperName` and coordinates. **There is no stellar/system age**, and `StellarGenerator.starTypes` has no stellar mass — both are required inputs to the model's age factor.
- Planets have no name at all. `PlanetTable.vue` identifies them as `starId` + `orbitalNumber`; `PlanetDetailModal.vue` titles them by their type description.
- `PlanetTable.vue` already has a search box, a type filter and a Goldilocks filter. The Systems tab in `ResultsDisplay.vue` has **no filter UI at all** — just a paginated grid.
- Precedent for everything this feature needs already exists from the system/star naming feature (`STORIES/SPECS/system-names.md`, merged as #24): a committed CSV asset under `backend/src/assets/`, a pure loader/validator module, a pure naming module driven by an **injected, separate PRNG stream**, and a golden-fixture stability test (`backend/__tests__/unit/lib/generation-stability.test.ts`) that proves new random draws never disturb pre-existing seeded output.

**In scope**

- A CSV asset holding the planet proper-name pool from the draft, plus a loader and validator (`planet-name-pool.ts`).
- A pure `life.ts` library implementing the habitability probability `P`, the life-complexity index `C_index`, and the per-planet presence draw, with every factor exposed as an individually testable function.
- A new `System.age` field (Gyr), drawn per system from a zone-dependent range — the model's age factor cannot be evaluated without it.
- New `Planet` fields: `lifeProbability`, `lifeComplexity`, `hasLife`, and an optional `name` present only for inhabited planets.
- A third PRNG stream (`::life`) so that every pre-existing seed reproduces byte-identical geometry, spectral classes, planets **and names**.
- Frontend: a life filter on the planets list, a life filter on the systems list, a life column on the planets table, a life section in the planet detail modal, the planet's proper name wherever a planet is displayed, the system age on the system detail page, updated API reference, and a documentation section explaining the model.
- Backend Jest tests for the loader, the model, the generator wiring and the HTTP contract; frontend Vitest fixture updates.

**Out of scope**

- Any API request parameter to tune the model (probabilities and coefficients are code constants).
- Naming planets **without** life, and naming moons.
- Sector-level life statistics on the Statistics tab, and life-related fields in `StellarService.getSectorStats`.
- Changing the existing habitable-zone / temperature / orbital physics in any way.
- Routing or deep-linking by planet name.
- Re-deriving or "improving" the model in `docs/exoplanet-habitability-model.md` — that document is the normative input and is not modified by this feature.

---

## Assumptions & Decisions

Every decision the draft or the model document left open. This is the review surface: each row can be accepted or overridden before `story-creator` runs.

| # | Decision | Reasoning / precedent |
|---|---|---|
| 1 | **Life uses a third, separate PRNG stream**: `lifePrng = seedrandom(`${seedStr}::life`)`, alongside the existing `prng` and `namePrng`. | Direct precedent: `system-names.md` decision #1 and the `namePrng` already in `example_star_generator.ts:75`. Drawing from `prng` would shift every subsequent draw and silently change the sector that existing seeds produce; seeds are persisted in `localStorage` and users are offered "regenerate with saved parameters" on reload. A third stream makes life **purely additive**: every existing seed reproduces the same geometry, spectral classes, planets *and* system/star names. Guarded by the existing `generation-stability.test.ts`. |
| 2 | **The model's `T_eq` input is the existing `planet.temperature` field.** | The model doc centres its Gaussian on 288 K and calls it "Earth's mean equilibrium temperature". 288 K is in fact Earth's mean *surface* temperature, and `planet.temperature` is exactly that: `surfaceTemperature()` is calibrated so an Earth-like planet at 1 AU around a G star returns 254.7 + 33 = **287.7 K** (`example_star_generator.ts:230,257-262`). So `planet.temperature` is the field that matches the model's 288 K anchor. No new temperature quantity is introduced. |
| 3 | **Eligibility is a hard gate on `planet.habitableZone === true`**; planet *type* is handled softly by the radius factor `R`, not by a second hard gate. | The draft says "of the right type and in the goldilocks zone", but the model's own `R` table assigns gas giants 0.05 rather than 0 — i.e. the model expects every body to be scored, with type expressed as a weight. `habitableZone` is already computed and is the codebase's existing definition of "Goldilocks" (`determineHabitableZone`, ZONE_B). Asteroid belts (type `A`, diameter 0, no body) are the one hard exclusion: `R = 0`. |
| 4 | **Presence of life is a Bernoulli draw against `P`**: `hasLife = eligible && lifePrng() < lifeProbability`. The roll is taken **unconditionally for every planet**, then combined with eligibility. | The draft says planets "have a possibility to have life", so `P` is a probability and presence must be realised. Drawing unconditionally (decide-then-gate) is the same pattern as `SectorNamer.nameSystem` (`naming.ts`), and keeps the life stream's draw sequence independent of eligibility and pool state. |
| 5 | **`lifeComplexity` is the model's `C_index = P × C(t_bio)` verbatim, reported for every planet** (0 for ineligible ones), *not* the ungated `C(t_bio)`. | The model doc defines `C_index` this way and calls it a ranking index. Reporting the doc's own quantity keeps the spec faithful and auditable against `docs/exoplanet-habitability-model.md`. Consequence: an inhabited planet can carry a `C_index` below 1 (the doc's "first life" level); decision #6 handles the display. |
| 6 | **Display stage = `clamp(round(lifeComplexity), 1, 6)`, but only when `hasLife` is true.** | The presence of life implies at least milestone level 1 (prokaryotes), so a realised biosphere is never shown as "level 0". The clamp lives in the frontend (`frontend/src/utils/lifeStage.ts`), so the API keeps the raw model number and the UI owns the presentation rule. |
| 7 | **A new `System.age: number` field (Gyr), drawn once per system from a zone-dependent uniform range.** | `A_age` needs the current system age `t`; nothing in the codebase provides it. Age is a property of the co-forming system, not of individual components, so it belongs on `System`. It is exposed in the API (and in the API reference and system detail page) because the life numbers are uninterpretable without it. Zone dependence reuses the stellar-population semantics the generator already encodes in `generateStarType` ("Halo Population: Old, low-mass stars", "Population I: More young, massive stars"). |
| 8 | **The minimum system age is 0.5 Gyr in every zone**, equal to the model's `t_0`. | `t_bio = t − t_0` must not go negative, and a system younger than `t_0` has by definition no life under the model. Making 0.5 the floor removes a whole class of degenerate values without a special case. |
| 9 | **`A_age = 0` for any host star that is not on the main sequence** (all `D*` white dwarfs, `g*` giants, `c*` supergiants, `NS`, `BH`) — the step function `H(L − t)` is 0 by observation, not by arithmetic. | `H(L − t)` encodes "the star has exceeded its usable main-sequence lifetime". A star *observed* as a giant or a remnant has left the main sequence, which is exactly that condition, independent of the sector-level age draw. This is a faithful reading of the model's own step function, not an added rule. It also means the spectral-class → mass table only needs the seven main-sequence classes. |
| 10 | **Stellar masses live in the new `life.ts` module (`STELLAR_MASS_SOLAR`), not as a new `mass` key on `StellarGenerator.starTypes`.** | `starTypes` drives the orbital and thermal physics; adding a key there widens the blast radius of a feature that is otherwise inert for existing behaviour. `naming.ts` set the precedent of a pure module owning its own constants and receiving only primitives, which is what makes it unit-testable without constructing a generator. Guarded by a test asserting every main-sequence class the generator can emit has a mass entry. |
| 11 | **The radius factor uses the real body radius** (`diameter / 12742 km`), with the model's three rocky bands preserved verbatim and **two bands added below 0.5 R⊕** (`< 0.3 R⊕ → 0.1`, `0.3–0.5 R⊕ → 0.5`). | The model table starts at 0.5 R⊕ and says nothing about smaller bodies, but the generator routinely produces them: dwarf planets (`W`) are 600–2500 km (0.05–0.20 R⊕) and iron planets (`F`) can be 3000 km (0.24 R⊕). Without the added bands a 600 km iceball in the habitable zone would score the same as Earth. The two added rows are the only extension to the model's tables and are flagged here so they can be overridden. |
| 12 | **Gas and ice giants (`G`, `Q`, `U`) take `R = 0.05` by type, overriding the radius bands; asteroid belts (`A`) take `R = 0`.** | Directly from the model's `R` table ("Gas giant 0.05"). `A` has `diameter = 0` and represents a belt rather than a body, so it cannot host a surface biosphere and is the feature's one hard type exclusion (decision #3). |
| 13 | **The atmosphere factor `A` is an explicit per-planet-type table in `life.ts`, not derived at runtime from `StellarGenerator.planetThermal`.** Values: `1.0` for `E`/`O`/`J`; `0.3` for `A`/`G`/`Q`/`U`/`I`/`L`/`F`/`W`; `0.6` for everything else. | `planetThermal` is a private instance field of the generator; reading it would either require exposing it (a refactor of working code) or constructing a generator inside the life module (killing purity). The table's values mirror `planetThermal`'s greenhouse buckets — types the generator models as airless (greenhouse 0) get the model's "absent/unstable" 0.3, types defined as having a stable temperate atmosphere get 1.0, everything else gets the model's neutral "unknown" 0.6. A test asserts every planet type code has an entry, so the two tables cannot silently drift apart. |
| 14 | **A perfect Earth analogue scores `P = 1.0`.** This is accepted, not a bug. | The model is Earth-calibrated with `n = 1`: an Earth-radius planet with a stable atmosphere at 288 K around a mature G star hits 1.0 on every factor by construction. In practice this is rare — the habitable band spans two orbits and the outer one lands near 234 K (`T ≈ 0.20`), and 68% of stars in the default `medium` zone are M dwarfs (`S = 0.5`). Typical inhabited-planet probabilities land around 0.15–0.35. |
| 15 | **A second, separate name-pool module (`planet-name-pool.ts`) rather than generalising `star-name-pool.ts`.** | The two schemas genuinely differ: 2 columns vs 4, digits and leading digits allowed (`55 Cancri e`, `Kepler-186f`, `LV-426`), and a minimum name length of 1 (`O`, Le Guin). Generalising the star loader would modify a working shared utility that the merged naming feature depends on, for no functional gain. The duplication is ~90 lines of straight-line parsing; the refactor is recorded under Future Considerations. |
| 16 | **The draft's list contains 297 rows and 9 case-insensitive duplicates; the asset ships the 288 unique names, keeping the first occurrence of each.** Duplicates removed: `Terra`, `Marte`, `Europa`, `Miranda`, `Ariel`, `Terra 2`, `Elysium`, `Nettuno`, `Vulcan`. | Verified programmatically against the draft. The pool is drawn without replacement, so a duplicate would make the same name appear twice in one sector — the exact property a reader notices immediately. All 297 rows are pure ASCII, contain no commas in either column, and satisfy the planet name pattern; **no other cleaning is required**. |
| 17 | **Pool exhaustion falls back to an astronomical designation `` `${star.name} ${romanNumeral(orbitalNumber)}` `` (e.g. `UG-0142-B IV`), never throws and never reuses a name.** | 288 names cover a default 100-system sector comfortably (~30–45 inhabited planets) but are exhausted somewhere around 700–900 systems, while `systemCount` is capped at 10000. Exhaustion is therefore a normal operating mode, exactly as it is for star names (`system-names.md` decision #9). The designation mirrors real usage (`Proxima Centauri b`) and the draft's own pool (`Yavin IV`, `Talos IV`, `Fomalhaut III`); it is unique sector-wide because star names are unique and orbital numbers are unique per star. |
| 18 | **`Planet.name` is optional (`name?: string`) and present only when `hasLife === true`; there is no `Planet.hasProperName` flag.** | The draft asks for names only for inhabited planets. Unlike `System`, nothing in the UI needs to distinguish a pool name from an exhaustion designation — the badge that matters is "has life". Making it optional also means no existing `Planet` fixture is forced to change for this field alone. |
| 19 | **`lifeProbability` is rounded to 4 decimals, `lifeComplexity` to 3, `System.age` to 2 — at the point of computation, so every downstream consumer and test sees the same value.** | Full float precision would add ~15 bytes per planet to a payload that `sectorStore.size.test.ts` already measures and that is up to ~50k planets, for digits nobody can act on. Rounding the age at draw time (before it feeds `A_age` and `t_bio`) keeps the whole chain reproducible from the published number. |
| 20 | **`hasLife`, `lifeProbability` and `lifeComplexity` are required fields on `Planet`; `System.age` is required.** | Same reasoning as `system-names.md` decision #13: required fields make the API contract unambiguous and make TypeScript point at every fixture that needs updating, rather than letting a silently-missing field reach the UI as `undefined`. |
| 21 | **The systems-tab life filter derives "system has life" on the frontend from a single precomputed `Set<number>`**, not from a new server field. | One O(stars + planets) pass builds star→system and system→hasLife maps; filtering is then O(systems). Filtering naively (`getPlanetsInSystem` per system) would be O(systems × planets) — ~125M operations on a 5000-system sector. No new API field is needed, so the response contract stays as small as possible. |
| 22 | **Resolved by the project owner: the pool ships the full name list from the draft, unchanged.** | The owner reviewed the third-party-name question and chose to keep every name. The substance of the call: individual short names are generally not copyrightable, so the exposure was never a copyright question but a trademark one, and the owner accepted it. This is a recorded product decision, not a legal clearance. The CSV's `source` column remains reference-only, and `NOTICE` carries the paragraph stating the names are used as generated identifiers with no affiliation implied (see Data Model → Attribution). |
| 23 | **Open risk — model output rates are unverified until implementation.** The estimate of ~30–45 inhabited planets per 100-system sector is derived analytically from the weight tables, not measured. | The distribution test (test 34) asserts only that both outcomes occur in a 300-system sector, so it cannot fail on a plausible rate. If the measured rate turns out extreme (0 or nearly all Goldilocks planets), the constants to revisit are the atmosphere table (decision #13) and the added radius bands (decision #11) — not the model doc. Record the measured rate in the implementing commit. |
| 24 | **No frontend component tests are added.** | Unchanged from `system-names.md` decision #15: `frontend/package.json` has no `@vue/test-utils` and the only Vitest files are `src/stores/*.test.ts`. Frontend changes are template bindings verified by `vue-tsc` during `npm run build`, plus the updated store fixture. |
| 25 | **`DocumentationView.vue` gains a "Life & Habitability" block.** | Every other generation model in this app is explained there (Stellar Classification, Orbital Mechanics, Temperature & Habitability). Shipping a model whose numbers appear in the UI with no explanation of the 1–6 complexity scale would leave the feature unreadable. It is a static content block, no logic. |
| 26 | **The model doc's first worked example prints a total that its own formula does not produce; the formula wins.** `docs/exoplanet-habitability-model.md:74` computes the 295 K temperature factor as `0.995` and the product as `≈0.54`, but `exp(-(295−288)² / (2×30²)) = exp(-0.02722) = 0.97314`, giving `P = 0.9 × 0.97314 × 1.0 × 0.6 × 0.99939 = 0.5252`. | The closed-form formulas in Part 1 are the normative specification; the worked example is illustrative arithmetic and is simply slightly off (the second worked example, `C(3.7) ≈ 3.9`, is correct). Implementing the printed 0.54 would mean hard-coding an error. **The doc is not edited by this feature** (it is the input, and out of scope); the discrepancy is recorded here and encoded in test 25, which asserts `0.5252`. If the owner would rather the doc be corrected, that is a one-line follow-up. |

---

## Architecture / Design Overview

The feature adds one asset and two library modules under `backend/src/lib/`, leaves the Controller → Service → Lib layering untouched, and touches the generator at exactly two points in its loops. It mirrors the shape of the merged naming feature one-for-one.

```
POST /api/sector/generate
  → SectorController.generateSector          (unchanged)
    → StellarService.generateSector          (unchanged)
      → new StellarGenerator(seed, zone)
          prng     = seedrandom(seed)              ← existing, untouched
          namePrng = seedrandom(seed + '::names')  ← existing, untouched
          lifePrng = seedrandom(seed + '::life')   ← NEW, independent stream
          life     = new LifeAssigner(lifePrng, loadPlanetProperNames())
        → generateSector(systemCount, sectorVolume)
            for each system:
              xPos/yPos/zPos, starCount   ← prng      (unchanged order)
              naming                      ← namePrng  (unchanged order)
              system.age = life.drawSystemAge(zone)   ← lifePrng, 1 draw
              for each star:
                spectralClass, subclass, planetCount ← prng  (unchanged order)
                for each planet:
                  semiMajorAxis, type, diameter, moons ← prng (unchanged order)
                  temperature, habitableZone           (unchanged)
                  life.assignLife(...)      ← lifePrng, 1 draw + 0/1 name draw

backend/src/assets/planet-proper-names.csv
  → planet-name-pool.ts   readFileSync + parse + validate + cache (module singleton)
  → life.ts               pure factor functions + LifeAssigner (PRNG + pool injected)
```

**Model pipeline for one planet**

```
                     ┌─ S  starFactor(spectralClass)        G 1.0 · K 0.9 · F 0.7 · M 0.5 · else 0.1
                     ├─ T  temperatureFactor(temperature)   exp(-(T-288)^2 / (2*30^2))
habitableZone? ──────┼─ R  radiusFactor(type, diameter)     radius bands, giants 0.05, belts 0
    │  no → P = 0    ├─ A  atmosphereFactor(type)           1.0 / 0.6 / 0.3
    │                └─ Aa ageFactor(spectralClass, age)    sigmoid(k=2, t0=0.5) × H(L - t), 0 off-MS
    │                                                        L = 10 × (M/Msun)^-2.5 Gyr
    ▼
  P = S × T × R × A × Aa            → planet.lifeProbability   (4 dp)
  C = 6 / (1 + exp(-1.3 × (t_bio - 3.2))),  t_bio = age - 0.5
  C_index = P × C                   → planet.lifeComplexity    (3 dp)
  hasLife = eligible && roll < P    → planet.hasLife
  if hasLife: pool.take() or `${star.name} ${roman(orbit)}`  → planet.name
```

**Key design points**

1. *Three PRNG streams.* `lifePrng` is derived from the same user seed, so life stays reproducible, but it never advances `prng` or `namePrng`. Consequence: the byte-for-byte output of everything that existed before this feature — including the names added by #24 — is preserved for every seed. Guarded by `generation-stability.test.ts` (which already strips fields explicitly, so it needs no change) plus a new name-stability assertion.
2. *`life.ts` is pure and injectable.* `LifeAssigner` receives `() => number` and a `readonly string[]`; every factor is a free function taking primitives. Unit tests drive it with a scripted PRNG and a 3-name pool to exercise exhaustion without touching the filesystem — exactly the fixture style already in `backend/__tests__/unit/lib/naming.test.ts`.
3. *Decision draws happen before eligibility checks.* The presence roll is taken for every planet unconditionally and only then combined with eligibility and `P`, so the life stream cannot desynchronise on a planet that turns out ineligible.
4. *Name selection without replacement uses the same partial Fisher–Yates as `SectorNamer`* — one PRNG draw per name assigned, no full shuffle, no repeats within a generator instance.
5. *Age is drawn per system, before the star loop.* This gives one draw per system regardless of how many stars or planets it has, keeping the stream's structure simple and the age shared by all components of a co-forming system.
6. *Nothing in the existing physics moves.* `surfaceTemperature`, `orbitalDistance`, `determineHabitableZone`, `createPlanet`, `selectPlanetTypeWeighted`, the `starTypes` / `planetTypes` / `planetThermal` tables and every weight are read-only inputs to this feature.

---

## Configuration

**No environment variables and no feature flags are introduced.** One build-configuration change is required:

**`backend/package.json`** — extend the existing post-build asset check to cover the second CSV:

```json
"build": "tsc && mkdir -p dist/assets && cp -R src/assets/. dist/assets && node -e \"['star-proper-names.csv','planet-proper-names.csv'].forEach(f=>require('fs').accessSync('dist/assets/'+f))\""
```

The `cp -R src/assets/.` step already copies the whole assets directory, so the new CSV is carried without change; only the existence assertion needs the extra filename, so a packaging mistake fails the build loudly instead of at first generation.

**`vercel.json`** — **no change required.** The existing `functions["api/index.ts"].includeFiles` value is `"backend/src/assets/**"`, which already matches the new CSV.

**`Dockerfile`** — **no change required.** It copies `/app/dist` wholesale from the backend builder stage.

Model constants live in code (`backend/src/lib/life.ts`) and are exported so tests can reference them:

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

and in `backend/src/lib/planet-name-pool.ts`:

| Constant | Value | Meaning |
|---|---|---|
| `MIN_PLANET_POOL_SIZE` | `200` | Minimum data rows the CSV must contain, else the loader throws |
| `PLANET_CSV_HEADER` | `'name,source'` | Required header line |
| `PLANET_NAME_PATTERN` | `/^[A-Za-z0-9][A-Za-z0-9 '\-]*$/` | Allowed name charset |

---

## Data Model

There is **no database in this project** — the generator is stateless and returns JSON per request. "Data model" here means the shared TypeScript interfaces and the CSV asset schema. **No indexes, migrations or value objects are introduced.**

### Modified interface: `System`

Identical text must land in `backend/src/types/index.ts` and `frontend/src/types/index.ts` (CLAUDE.md: the two type modules are kept synchronised).

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

### Modified interface: `Planet`

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

`Star` is **unchanged**.

### Enum-like constant: life stage labels *(frontend only)*

Added to `frontend/src/types/index.ts`, alongside the existing `PLANET_TYPE_DESCRIPTIONS` (same file, same style):

```ts
// Evolutionary milestones from docs/exoplanet-habitability-model.md, Part 2.
export const LIFE_STAGE_LABELS: Record<number, string> = {
    1: 'Microbial life',
    2: 'Oxygenic photosynthesis',
    3: 'Eukaryotic life',
    4: 'Multicellular life',
    5: 'Complex animals',
    6: 'Intelligent life'
};
```

### System age ranges by sector zone

Uniform draw in `[min, max]`, one draw per system, rounded to 2 decimals. Ranges follow the stellar-population semantics already encoded in `generateStarType`:

| `SectorZone` | Population | min (Gyr) | max (Gyr) |
|---|---|---|---|
| `extragalactic` | Halo — old, low-mass stars | 8.0 | 13.5 |
| `galactic edge` | Thick disk | 5.0 | 12.0 |
| `medium` | Solar neighbourhood / thin disk | 0.5 | 10.0 |
| `central zone` | Population I — young, massive stars | 0.5 | 6.0 |
| `core` | Galactic bulge — old stars and remnants | 6.0 | 13.0 |

An unrecognised zone falls back to the `medium` range (matches the generator's own `else` branch in `generateStarType`).

### Model tables

**Star type factor `S`** — verbatim from the model doc:

| Spectral class | `S` |
|---|---|
| `G` | 1.0 |
| `K` | 0.9 |
| `F` | 0.7 |
| `M` | 0.5 |
| anything else (`O`, `B`, `A`, `D*`, `g*`, `c*`, `NS`, `BH`) | 0.1 |

**Main-sequence mass `M`** (solar masses) — used only by `ageFactor`; classes absent from this table are off the main sequence and yield `A_age = 0` (decision #9):

| Class | `M` | `L = 10 × M^-2.5` (Gyr) |
|---|---|---|
| `O` | 25 | 0.0032 |
| `B` | 10 | 0.0316 |
| `A` | 2.0 | 1.77 |
| `F` | 1.3 | 5.19 |
| `G` | 1.0 | 10.0 |
| `K` | 0.8 | 17.5 |
| `M` | 0.3 | 202.8 |

Consequence worth noting: `O` and `B` hosts always score `A_age = 0` (their lifetime is below the 0.5 Gyr age floor), so no `O`/`B` system ever has life. `A` hosts only qualify in systems younger than 1.77 Gyr. This is the model's step function doing its job.

**Radius factor `R`** — the three bands in bold are verbatim from the model doc; the two below 0.5 R⊕ are the additions from decision #11. Radius is `diameter / EARTH_DIAMETER_KM`. The type overrides are checked first, then the bands in the order listed; the boundary values 0.3, 0.5, 1.5 and 2.0 belong to the rows shown below:

| Condition | `R` |
|---|---|
| `planetType === 'A'` (asteroid belt) | **0** — hard exclusion |
| `planetType` in `G`, `Q`, `U` (gas / ice giants) | **0.05** *(doc)* |
| radius < 0.3 R⊕ | 0.1 *(added)* |
| 0.3 ≤ radius < 0.5 R⊕ | 0.5 *(added)* |
| 0.5 ≤ radius ≤ 1.5 R⊕ | **1.0** *(doc)* |
| 1.5 < radius ≤ 2.0 R⊕ | **0.7** *(doc)* |
| radius > 2.0 R⊕ | **0.4** *(doc: sub-Neptune / ocean world)* |

**Atmosphere factor `A`** — one entry per planet type code (decision #13):

| `A` | Planet types |
|---|---|
| 1.0 — stable, compatible | `E` Earth-like, `O` Ocean, `J` Jungle |
| 0.3 — absent / unstable | `A` Asteroid, `G` Gas Giant, `Q` Hot Gas Giant, `U` Ice Giant, `I` Ice, `L` Silicate, `F` Iron, `W` Dwarf |
| 0.6 — unknown (neutral default) | `S` Super-Earth, `R` Rocky, `D` Desert, `C` Carbon, `T` Toxic, `N` Ammonia, `B` Methane, `M` Molten, `H` Hell, `X` Cold Desert, `#` Unknown |

An unknown type code falls back to `0.6`, matching the model's neutral default.

### CSV asset

**Path:** `backend/src/assets/planet-proper-names.csv` *(new)*

**Provenance:** the list supplied in the feature draft — planet names from science fiction, mythology and real astronomy. The `source` column is reference/provenance only and is never read at runtime.

**Format**

```csv
# Planet proper names used to name worlds where life was generated.
# Source: the feature draft (STORIES/SPECS/life-on-planets.md).
# The `source` column records where each name comes from and is reference only:
# it is never read at runtime. Names originating in works of fiction are used
# here purely as generated identifiers; no affiliation with, or endorsement by,
# any rights holder is implied. See NOTICE.
# Duplicates in the draft list were removed, keeping the first occurrence:
# Terra, Marte, Europa, Miranda, Ariel, Terra 2, Elysium, Nettuno, Vulcan.
name,source
Arrakis,Dune
Caladan,Dune
Giedi Prime,Dune
...
Nibiru,Folklore/pseudoscience
```

| Column | Type | Constraints | Used at runtime? |
|---|---|---|---|
| `name` | string | Required, unique case-insensitively, 1–32 chars, matches `PLANET_NAME_PATTERN` = `/^[A-Za-z0-9][A-Za-z0-9 '\-]*$/`, no commas | **Yes** — this is the name pool |
| `source` | string | Required, non-empty, no commas | No — provenance only |

Rules (identical in spirit to the star asset, so the two loaders read the same way): `#`-prefixed lines and blank lines are ignored anywhere in the file; the first non-comment, non-blank line must be exactly `name,source`; `\r\n` and `\n` line endings are both accepted; values are trimmed; quoted fields are **not** supported and any row whose field count is not 2 is a hard error. Pool ordering is CSV order; randomisation happens at draw time.

**Verified against the draft list** (297 rows): all ASCII, zero commas in either column, zero pattern failures, name lengths 1–19, and exactly the 9 case-insensitive duplicates named in decision #16 — leaving **288 unique names**, comfortably above `MIN_PLANET_POOL_SIZE = 200`. The only preparation step is the duplicate removal.

### Attribution

Append to the existing repo-root `NOTICE` (which currently carries the IAU CC BY attribution) — do not replace it:

```
Planet proper names in backend/src/assets/planet-proper-names.csv are drawn from
works of science fiction, from mythology, and from real astronomy. They are used
solely as generated identifiers for procedurally created worlds. No affiliation
with, or endorsement by, any rights holder is implied. The `source` column is
provenance reference only and is not used at runtime.
```

---

## Impact on Existing Code

### New files

| Path | Purpose |
|---|---|
| `backend/src/assets/planet-proper-names.csv` *(new)* | The 288-name planet pool (schema above), with the provenance header. |
| `backend/src/lib/planet-name-pool.ts` *(new)* | `parsePlanetNameCsv(content: string): string[]` (pure, exported for tests) and `loadPlanetProperNames(): readonly string[]` (path resolution + `readFileSync` + parse + validate + module-level cache). |
| `backend/src/lib/life.ts` *(new)* | Model constants, the pure factor functions, `romanNumeral`, and `LifeAssigner`. |
| `frontend/src/utils/lifeStage.ts` *(new)* | `lifeStageLevel(complexity: number): number` — the `clamp(round(c), 1, 6)` display rule (decision #6). |
| `backend/__tests__/unit/lib/planet-name-pool.test.ts` *(new)* | Parser/validator/loader tests. |
| `backend/__tests__/unit/lib/life.test.ts` *(new)* | Model and assigner tests. |

### Modified files

Every entry is classified **additive** (existing contract preserved) or **breaking** (with its migration path).

| Path | Change | Regression classification |
|---|---|---|
| `backend/src/types/index.ts` | Add `age: number` to `System`; add `lifeProbability: number`, `lifeComplexity: number`, `hasLife: boolean`, `name?: string` to `Planet`. | **Breaking (type-level, intentional).** Every object literal typed as `System` or `Planet` must supply the new required fields. In-repo callers: the generator (updated here) and the backend fixtures listed below. `name?` is optional and forces no change. No runtime behaviour depends on the new fields — `StellarService.getSectorStats` reads only `spectralClass`, `planetType` and array lengths, so it is unaffected. |
| `frontend/src/types/index.ts` | The same fields on `System` and `Planet`, matching the backend text exactly; plus the new `LIFE_STAGE_LABELS` const. | **Breaking (type-level, intentional).** Known caller: `frontend/src/stores/sectorStore.size.test.ts:4-33`, whose `generateSectorData` is typed `: Sector`. `vue-tsc` runs over `src/**/*.ts` (including `*.test.ts`) during `npm run build`, so an un-updated fixture fails the frontend **build**, not just the tests. |
| `backend/src/lib/example_star_generator.ts` | Import `LifeAssigner` + `loadPlanetProperNames`; add `private lifePrng` and `private lifeAssigner` initialised in the constructor (mirroring `namePrng`/`namer` at lines 68-77); in `generateSector`, draw `const systemAge = this.lifeAssigner.drawSystemAge(this.zone)` and add `age: systemAge` to the `System` literal (line ~509); inside the planet loop, call `this.lifeAssigner.assignLife(...)` immediately before `planets.push(planet)` (line ~579) and copy its four outputs onto the planet; add the three new fields to `createPlanet`'s return literal with defaults `0 / 0 / false`. | **Mixed.** The PRNG change is **additive/backward-compatible by construction** (third independent stream — decision #1), so every pre-existing field *and* every name is bit-identical for any given seed; guarded by `generation-stability.test.ts` (unchanged — it strips fields explicitly) plus a new name-stability test. The **`Planet` and `System` shapes gain fields**, which is backward-compatible for every JSON consumer. `createPlanet` gains three keys in its return value — its signature is unchanged, it is called from exactly one place (`generateSector:572`), and its existing direct tests (`stellar-generator.test.ts:66-96`) assert with `toHaveProperty` rather than `toEqual`, so extra keys cannot break them. **No data migration is needed**: `sectorStore.ts:87-92` persists only `currentSeed`, `systemCount`, `sectorVolume`, `zone`. |
| `backend/package.json` | Extend the `build` script's existence check to both CSVs (see Configuration). | **Additive** — `tsc`, `mkdir` and `cp` still run first and identically; only the assertion list grows. |
| `NOTICE` | Append the planet-name paragraph (see Data Model → Attribution). | **Additive** — the existing IAU paragraph is untouched. |
| `backend/__tests__/unit/services/stellar-service.test.ts` | Add `age` to the four `System` literals (lines 21, 91-92, 119, 139, 151) and the three life fields to the six `Planet` literals (lines 100-102, 125-127). | **Additive** — fixtures only. `getSectorStats` never reads the new fields, so no assertion semantics change. |
| `backend/__tests__/unit/controllers/sector-controller.test.ts` | Add `age` to the `System` literal (line 133). | **Additive** — fixture only. |
| `backend/__tests__/unit/lib/stellar-generator.test.ts` | Add the generator-wiring tests listed under Testing (tests 28-36). No existing assertion is removed or weakened. | **Additive.** |
| `backend/__tests__/integration/api/sector-api.test.ts` | Extend the per-system loop (~line 68) with `age` assertions and the per-planet loop (~line 91) with life-field assertions; add tests 37-41. No existing assertion changes. | **Additive** — new assertions only. |
| `backend/__tests__/unit/lib/generation-stability.test.ts` | **No change.** It compares explicitly stripped field sets, so new fields cannot break it. Listed here so the reviewer can confirm the omission is deliberate. | **Unmodified.** |
| `frontend/src/stores/sectorStore.size.test.ts` | Add `age: 4.5` to the system fixture and `lifeProbability: 0.25`, `lifeComplexity: 1.2`, `hasLife: false` to the planet fixture. | **Additive** — the test measures serialized payload size. The existing thresholds have ~10× headroom (`results[100] < 500` KB against a fixture that produces far less), so they should still hold; verify and widen only if a bound is genuinely crossed, and say so in the commit. |
| `frontend/src/components/PlanetTable.vue` | Add a `Life` filter select (All / With life / Without life) next to the Goldilocks filter; add a `Life` column rendering a green badge with the stage label when `hasLife`, `—` otherwise; render `planet.name` as a bold line above the type description in the `Description` column; extend the search predicate to match `planet.name`; add `hasLife` to the `watch` that resets pagination. | **Additive** — a new filter defaults to "All" (no behaviour change), a new column and a widened search predicate. Existing filters, pagination, sorting, row click-through and the statistics block are untouched. |
| `frontend/src/components/PlanetDetailModal.vue` | Title becomes `planet.name` when present, with the type description demoted to the existing subtitle line (mirrors the `ID: {{ star.starId }}` treatment in `SystemDetailView.vue:58`); add a life block below the Goldilocks block showing presence, stage label, `lifeProbability` as a percentage and `lifeComplexity` to one decimal. | **Additive** — template-only. The `planet` prop type is unchanged (the new fields come from the shared interface); the existing Goldilocks ring and stats list are untouched. |
| `frontend/src/views/SystemDetailView.vue` | Show `Age: {{ system.age }} Gyr` in the system info card next to the coordinates; on each planet card show `planet.name` when present and a small life marker when `planet.hasLife`. | **Additive** — template-only. `getSystemById(route.params.id)` still resolves by numeric id; `getThermalZone`/`getZoneColor` are untouched. |
| `frontend/src/components/ResultsDisplay.vue` | Add a filter bar above the Systems grid with a `Life` select (All / With life / Without life); add a `systemsWithLife` computed `Set<number>` (decision #21) and a `filteredSystems` computed that `paginatedSystems` and `totalSystemPages` read from instead of `props.systems`; reset `currentSystemPage` to 1 when the filter changes; show a green life badge on system cards whose id is in the set. | **Additive** with one contract note: pagination now derives from `filteredSystems`. With the filter at its default "All", `filteredSystems === props.systems`, so the current behaviour is preserved exactly. The tab header still shows the unfiltered `systems.length`, and `navigateToSystem(system.systemId)` is unchanged. |
| `frontend/src/views/ApiReferenceView.vue` | Add `<li>age: number</li>` to the `System` field list (lines 99-107); add `lifeProbability`, `lifeComplexity`, `hasLife` and `name?` to the `Planet` list (lines 89-96). | **Additive** — static documentation markup. |
| `frontend/src/views/DocumentationView.vue` | Add a "Life & Habitability" block after the existing "Temperature & Habitability" section (~line 206) explaining the five factors, the age gate and the 1–6 complexity scale. | **Additive** — static content, no logic, matching the existing section markup. |

### Deleted files

None.

### Explicitly not modified

`backend/src/services/stellar.service.ts`, `backend/src/controllers/sector.controller.ts`, `backend/src/routes/sector.routes.ts`, `backend/src/index.ts`, `backend/src/lib/naming.ts`, `backend/src/lib/star-name-pool.ts`, `backend/src/assets/star-proper-names.csv`, `api/index.ts`, `vercel.json`, `Dockerfile`, `frontend/src/composables/useSectorApi.ts`, `frontend/src/stores/sectorStore.ts`, `frontend/src/stores/sectorStore.test.ts`, `frontend/src/components/StarTable.vue`, `frontend/src/components/SectorVisualization3D.vue`, `frontend/src/components/SectorControls.vue`, `frontend/src/views/HomeView.vue`, `frontend/src/utils/planetImages.ts`, `frontend/src/utils/starColors.ts`, `docs/exoplanet-habitability-model.md`. The `System` and `Planet` objects flow through these untouched.

---

## Framework / Language-Specific Sections

Detected stack: **Node.js + Express 4 + TypeScript (CommonJS) backend; Vue 3 `<script setup>` + Vite + Pinia + Tailwind v4 frontend; Jest/ts-jest backend tests; Vitest frontend tests.** The relevant layers are the lib layer and the shared types; there are no routes, middleware, jobs, events or migrations to add.

### Routes / Controllers / Services

**No changes.** `POST /api/sector/generate` keeps its request shape (`systemCount`, `sectorVolume`, `seed?`, `zone?`) and its response shape; `data.systems[]` and `data.planets[]` simply carry additional properties. Adding properties to a JSON response object is backward-compatible for every existing consumer.

### Lib layer — `backend/src/lib/planet-name-pool.ts` *(new)*

Structurally a mirror of `star-name-pool.ts` (same path-resolution strategy, same cache-and-freeze, same error style naming the offending line number and value).

```ts
import fs from 'fs';
import path from 'path';

export const MIN_PLANET_POOL_SIZE = 200;
export const PLANET_CSV_HEADER = 'name,source';
export const PLANET_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 '\-]*$/;

/** Parses the planet-name CSV and returns the name column. Throws on any violation. */
export function parsePlanetNameCsv(content: string): string[];

/** Reads, parses and caches the packaged CSV asset. Throws if it cannot be found or is invalid. */
export function loadPlanetProperNames(): readonly string[];
```

`loadPlanetProperNames` resolves the asset by trying, in order, the first path that exists — identical to `loadStarProperNames` (`star-name-pool.ts:111-125`) with the new filename:

1. `path.join(__dirname, '../assets/planet-proper-names.csv')` — ts-node/nodemon dev, Jest, the compiled build and the Vercel bundle.
2. `path.join(process.cwd(), 'backend/src/assets/planet-proper-names.csv')` — repo-root cwd.
3. `path.join(process.cwd(), 'src/assets/planet-proper-names.csv')` — `backend/` cwd.

If none exists it throws `` Error(`planet-proper-names.csv not found; tried: ${candidates.join(', ')}`) ``. The parsed array is `Object.freeze`d and memoised in a module-level variable. A missing or invalid asset **throws immediately** rather than degrading to an empty pool, for the same reason as the star asset: silent degradation would make the same seed produce different output on different deployments.

### Lib layer — `backend/src/lib/life.ts` *(new)*

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

Normative behaviour of the factors:

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

atmosphereFactor:      ATMOSPHERE_FACTOR[type] ?? 0.6      // table in Data Model

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

Reference implementation of the assigner (the draw order is normative):

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

### Lib layer — `backend/src/lib/example_star_generator.ts` *(modified)*

Constructor (mirroring the existing `namePrng` block at lines 64-78):

```ts
private prng: seedrandom.PRNG;
private namePrng: seedrandom.PRNG;
// Life draws from its own stream too, so adding life leaves the geometry,
// spectral classes, planets AND names of every pre-existing seed bit-identical.
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

In `generateSector`, immediately after `const naming = this.namer.nameSystem(...)` (line 507) and before the `System` literal:

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

In the planet loop, replacing `planets.push(planet)` (line 579):

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

`createPlanet` gains the three new required fields in its return literal, following the existing default-then-overwrite convention already used for `semiMajorAxis`, `temperature` and `habitableZone` (lines 354-356):

```ts
semiMajorAxis: 0,       // Default value, will be updated in the system generation
temperature: 0,         // Default value, will be updated in the system generation
habitableZone: false,   // Default value, will be updated in the system generation
lifeProbability: 0,     // Default value, will be updated in the system generation
lifeComplexity: 0,      // Default value, will be updated in the system generation
hasLife: false          // Default value, will be updated in the system generation
```

**The order of main-stream (`prng`) draws must not change.** `drawSystemAge` and `assignLife` touch only `lifePrng`.

### Frontend — components / views

No new components, composables, store actions or routes. One new utility module (`frontend/src/utils/lifeStage.ts`), the shared type update, and template/script edits to five existing files (table in Impact on Existing Code). Follow the existing `<script setup>` + Tailwind conventions.

Life badge styling reuses the existing green Goldilocks vocabulary so the two read as related but distinct — Goldilocks keeps its ring (`ring-2 ring-green-400/60`), life gets an emerald pill in the existing pill idiom (`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-700/80 text-emerald-100`), matching `PlanetTable.vue:68-72` and `getZoneColor`.

`ResultsDisplay.vue` filtering (decision #21):

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

`totalSystemPages` and `paginatedSystems` then read `filteredSystems.value` instead of `props.systems`. The `'' | '1' | '0'` filter encoding matches the existing `goldilocksFilter` in `PlanetTable.vue:184`.

---

## Validation Rules

### API input

**Unchanged.** `SectorController.generateSector` keeps its existing checks (`systemCount` a number in 1–10000; `sectorVolume` a number in 1–10000000). The feature adds no request fields, so there is no new request validation.

### CSV asset validation (`parsePlanetNameCsv`)

Every rule below throws an `Error` whose message names the offending line number and value.

| Rule | Constraint | Error condition |
|---|---|---|
| Header present | First non-blank, non-`#` line equals `name,source` exactly | Missing or mismatched header |
| Column count | Every data row splits into exactly 2 comma-separated fields | Any other count (also catches an embedded comma) |
| `name` required | Trimmed length ≥ 1 | Empty |
| `name` length | Trimmed length ≤ 32 | Longer |
| `name` charset | Matches `/^[A-Za-z0-9][A-Za-z0-9 '\-]*$/` (letters, digits, spaces, apostrophes, hyphens; must start with a letter or digit) | Any other character, incl. commas |
| `name` uniqueness | Case-insensitively unique across the file | Duplicate |
| `source` non-empty | Trimmed non-empty | Empty |
| Pool size | At least `MIN_PLANET_POOL_SIZE` (200) data rows | Fewer (catches a truncated or half-populated asset) |

Blank lines and `#` comment lines are skipped before any of the above apply.

### Business rules enforced by the model and the assigner

- `lifeProbability` is in `[0, 1]` for every planet, and is exactly `0` whenever `habitableZone === false`.
- `lifeComplexity` is in `[0, 6]` for every planet, and `lifeComplexity <= lifeProbability * 6`.
- `hasLife === true` implies `lifeProbability > 0` and `name !== undefined`.
- `hasLife === false` implies `name === undefined`.
- `System.age` is within its zone's declared range for every system.
- No pool name is returned twice by the same `LifeAssigner` instance.
- Within one generated sector, all defined `Planet.name` values are unique (pool names are drawn without replacement; designations combine a sector-unique star name with a star-unique orbital number).
- Every host star that is not on the main sequence yields `lifeProbability === 0` for all of its planets.
- Every planet of type `A` (asteroid belt) yields `lifeProbability === 0`.

---

## Authorization & Security

The API is **public and unauthenticated by design** — there are no users, sessions, policies, guards or middleware in this codebase (`backend/src/index.ts` mounts only `cors()`, `express.json()` and the sector router). This feature introduces no new endpoint, no new request field, and no user-supplied data path, so there is nothing new to authorize.

| Action | Who | Enforcement |
|---|---|---|
| Generate a sector (and thereby life) | Anyone who can reach the API | None — unchanged from today |
| Read life data and planet names | Anyone with the generated response | None — unchanged from today |

Security considerations specific to this change:

- **No untrusted input reaches the loader.** The CSV path is derived from `__dirname` / `process.cwd()` constants — never from the request — so there is no path-traversal surface. The CSV is a committed asset reviewed in the PR, not a user upload.
- **Output injection.** Planet names are rendered through Vue's text interpolation (`{{ }}`), which escapes by default; the charset validation additionally forbids `<`, `>`, `&` and quote characters. No `v-html` is introduced.
- **Denial of service.** The asset is read once per process and cached; parsing ~290 rows is sub-millisecond. Per-planet work is a handful of `Math.exp`/`Math.pow` calls plus one or two PRNG draws — O(1). At the existing `systemCount` ceiling of 10000 the added work is a small constant factor on an already-O(planets) generation, so the current absence of rate limiting is not made materially worse. Rate limiting and CSRF remain out of scope (no cookies, no state-changing endpoints).
- **Response size growth.** Three numbers/booleans plus an optional short string per planet, with the numbers rounded (decision #19). At the 10000-system ceiling this is on the order of a few MB added to an already-large payload; it does not change the order of magnitude, and `sectorStore.size.test.ts` keeps measuring it.
- **Fail-fast is loud, not leaky.** The loader's error message lists filesystem paths; it is thrown server-side and surfaces to the client only as the controller's generic `'Internal server error while generating sector'` (`sector.controller.ts` already logs the detail and returns a generic message). No path disclosure to clients.

---

## Testing

Backend: Jest + ts-jest, run with `npm test` from `/backend`; unit tests under `backend/__tests__/unit/`, integration under `backend/__tests__/integration/`. Frontend: Vitest, `npm test` from `/frontend`. Both are run by `.github/workflows/test.yml`. Follow the existing style: `describe`/`test`, a `TEST_SEED` constant, direct construction of `StellarGenerator`, and the scripted/constant/counting fake-PRNG helpers already defined at the top of `backend/__tests__/unit/lib/naming.test.ts`.

### `backend/__tests__/unit/lib/planet-name-pool.test.ts` *(new)*

Drive `parsePlanetNameCsv` with inline strings (no filesystem), and `loadPlanetProperNames` against the real asset.

1. Parses a valid minimal CSV and returns the `name` column in file order.
2. Skips `#` comment lines and blank lines wherever they appear (before the header, between rows, trailing).
3. Accepts `\r\n` line endings and trims surrounding whitespace from values.
4. Throws when the header line is missing or misspelled.
5. Throws when a data row has 1 field, and when it has 3 fields.
6. Accepts a single-character name (`O`) — the star pool's 2-character minimum does **not** apply here.
7. Accepts names containing digits (`Kepler-186f`), a leading digit (`55 Cancri e`), spaces (`Eden Prime`), apostrophes (`Qo'noS`) and hyphens (`LV-426`).
8. Throws when a `name` is empty, and when it exceeds 32 characters.
9. Throws when a `name` contains a disallowed character (e.g. `Zeta*`).
10. Throws on a case-insensitive duplicate name (`Terra` / `terra`).
11. Throws when `source` is empty.
12. Throws when the file has fewer than `MIN_PLANET_POOL_SIZE` data rows (build the fixture programmatically).
13. `loadPlanetProperNames()` reads the packaged asset and returns at least `MIN_PLANET_POOL_SIZE` names.
14. Every name from the packaged asset satisfies `PLANET_NAME_PATTERN`, and the set is case-insensitively unique.
15. `loadPlanetProperNames()` returns the identical (`toBe`) frozen array on a second call — i.e. it is cached and immutable.

### `backend/__tests__/unit/lib/life.test.ts` *(new)*

Pure-function tests need no PRNG; assigner tests use a scripted fake PRNG plus small pools so every branch is deterministic and exhaustion is reachable.

16. `starFactor` returns 1.0 / 0.9 / 0.7 / 0.5 for `G` / `K` / `F` / `M`, and 0.1 for `A`, `gM`, `DA`, `NS`, `BH` and an unknown class.
17. `temperatureFactor(288)` is 1; `temperatureFactor(288 ± 30)` is `Math.exp(-0.5)` (≈0.6065); `temperatureFactor(700)` is below 1e-6; the function is symmetric about 288.
18. `radiusFactor` returns 0 for `A`, 0.05 for `G`/`Q`/`U` regardless of diameter, and — for a rocky type — 0.1 / 0.5 / 1.0 / 0.7 / 0.4 at diameters spanning the five bands, with explicit checks at the 0.3, 0.5, 1.5 and 2.0 R⊕ boundaries.
19. `atmosphereFactor` returns 1.0 for `E`/`O`/`J`, 0.3 for `I`/`L`/`F`/`W`/`A`/`G`/`Q`/`U`, 0.6 for `S`/`R`/`D`/`T`/`#`, and 0.6 for an unknown code.
20. **Drift guard:** every planet type code in `PLANET_TYPE_DESCRIPTIONS`-equivalent list (`A G Q U S R E O I D C L F T N B J W H M X #`) has an explicit `ATMOSPHERE_FACTOR` entry.
21. **Drift guard:** every main-sequence spectral class the generator can emit (`O B A F G K M`) has a `STELLAR_MASS_SOLAR` entry, and no off-main-sequence class does.
22. `mainSequenceLifetimeGyr(1)` is 10; `mainSequenceLifetimeGyr(0.3)` is ≈202.8; `mainSequenceLifetimeGyr(25)` is ≈0.0032.
23. `ageFactor` returns 0 for every off-main-sequence class (`DA`, `DB`, `DF`, `DG`, `DK`, `gF`, `gG`, `gK`, `gM`, `cB`, `cA`, `cF`, `cG`, `cK`, `cM`, `NS`, `BH`) at any age; returns 0 for `O` and `B` at age 0.5 (lifetime exceeded); returns ≈1 for `G` at age 5; returns 0 for `G` at age 11 (past its 10 Gyr lifetime); returns 0.5 for `G` at exactly age 0.5 (sigmoid midpoint).
24. `habitabilityProbability` returns exactly 0 when `habitableZone` is false, whatever the other inputs.
25. **Model doc worked example** (see decision #26 — the expected value is the formula's, not the doc's printed total): a rocky planet of 1.1 R⊕ (`diameter` 14016 km, type `R` → `A = 0.6`) at 295 K around a `K` star aged 4.2 Gyr yields `lifeProbability === 0.5252`, from `S = 0.9`, `T = 0.97314`, `R = 1.0`, `A = 0.6`, `A_age = 0.99939`. Assert the exact rounded value, and assert each factor separately so a future change points at the offending factor.
26. **Model doc worked example, part 2:** `complexityCurve(3.7)` is `toBeCloseTo(3.942, 3)` (the doc's ≈3.9) and `lifeComplexityIndex(0.5252, 3.7)` is `2.07`. `complexityCurve(0)` is ≈0.092 and `complexityCurve(20)` approaches 6 without exceeding it.
27. A perfect Earth analogue (`E`, 12742 km, 288 K, `G` star, **8 Gyr**, in zone) yields `lifeProbability === 1` — the documented ceiling (decision #14). At 5 Gyr the same planet yields `0.9999`, because the age sigmoid has not fully saturated.
28. `romanNumeral` returns `I`, `II`, `IV`, `IX`, `XIV`, `XVIII` for 1, 2, 4, 9, 14, 18.
29. `drawSystemAge` returns a value inside the declared range for each of the five zones, is rounded to 2 decimals, and falls back to the `medium` range for an unrecognised zone string.
30. `assignLife` consumes exactly one PRNG draw when no name is taken, and exactly two when one is (use the counting fake PRNG).
31. `assignLife` sets `hasLife` true when the roll is below `P` and false when it is above; `name` is defined iff `hasLife`; the returned `lifeProbability` and `lifeComplexity` are rounded to 4 and 3 decimals respectively.
32. Pool exhaustion: with a 1-name pool and rolls that always produce life, the first inhabited planet takes the pool name and later ones get `` `${starName} ${romanNumeral(orbit)}` `` — no throw, and no name repeats.
33. No repeats: over 200 inhabited planets with a 20-name pool, the multiset of pool-drawn names contains no duplicate.
34. Determinism: two `LifeAssigner`s built from `seedrandom('abc')` and the same pool produce identical outcomes for the same input sequence; `seedrandom('xyz')` produces at least one differing outcome.

### `backend/__tests__/unit/lib/stellar-generator.test.ts` *(modified — additive)*

35. Every system has a numeric `age` within the `medium` zone range (0.5–10.0), and a `core`-zone sector's ages fall within 6.0–13.0.
36. Every planet has numeric `lifeProbability` in `[0, 1]`, numeric `lifeComplexity` in `[0, 6]`, and a boolean `hasLife`.
37. Every planet with `habitableZone === false` has `lifeProbability === 0`, `lifeComplexity === 0` and `hasLife === false`.
38. Every planet with `hasLife === true` has a defined non-empty `name`; every planet with `hasLife === false` has `name === undefined`.
39. Over a 300-system sector, at least one planet has `hasLife === true` and at least one Goldilocks planet has `hasLife === false` (both branches are actually exercised).
40. Planet names are unique across a 300-system sector.
41. Every planet whose host star is off the main sequence (spectral class not in `O B A F G K M`) has `lifeProbability === 0`.
42. Determinism: two generators with the same seed produce identical `system.age`, `planet.lifeProbability`, `planet.lifeComplexity`, `planet.hasLife` and `planet.name` sequences; two generators with different seeds differ in at least one of them over a 50-system sector.
43. **Name-stream stability:** `new StellarGenerator('test-seed-123').generateSector(20, 1000)` produces the same `system.name`, `system.hasProperName` and `star.name` sequences as a golden literal captured **before** the life code is wired in — proving the `::life` stream did not disturb `namePrng`. (Capture the literal from the current `master` build in the same commit that adds the test.)

`backend/__tests__/unit/lib/generation-stability.test.ts` needs **no change** and must keep passing unmodified — it is the guard that the main `prng` stream is undisturbed.

### `backend/__tests__/integration/api/sector-api.test.ts` *(modified — additive)*

44. In the per-system loop (~line 68), assert `typeof system.age === 'number'` and `system.age >= 0.5`.
45. In the per-planet loop (~line 91), assert `typeof planet.lifeProbability === 'number'`, `typeof planet.lifeComplexity === 'number'` and `typeof planet.hasLife === 'boolean'`.
46. Two `POST /api/sector/generate` calls with the same body (including `seed`) return identical `age`, `lifeProbability`, `hasLife` and `name` arrays.
47. Two calls differing only in `seed` return at least one different `hasLife` or `age` value.
48. A `systemCount: 1000` request still returns 200 with every planet scored (exercises name-pool exhaustion through the HTTP layer), and every defined `planet.name` in the response is unique.

### Frontend — `frontend/src/stores/sectorStore.size.test.ts` *(modified)*

49. The `generateSectorData` fixture includes `age` on every system and `lifeProbability` / `lifeComplexity` / `hasLife` on every planet, and the existing size-estimation assertions still pass (adjust a threshold only if the added bytes genuinely cross it, and say so in the commit).

### Manual / deployment verification (not automatable here)

50. `cd backend && npm run build && npm start`, then `POST /api/sector/generate` returns planets carrying life fields and named inhabited worlds — proves the `dist/assets` copy covers the second CSV.
51. `cd frontend && npm run dev`: generating a sector, filtering planets by "With life", opening an inhabited planet's detail modal (name + stage + probability), and filtering the Systems tab by life all behave as specified.
52. Record the measured inhabited-planet rate for a default 100-system `medium` sector in the implementing commit (decision #23).

---

## Suggested Story Breakdown

Five vertical slices, in implementation order. Each is independently verifiable.

**1. Planet-name asset and loader** *(no dependencies)*
Add `backend/src/assets/planet-proper-names.csv` populated from the draft list — 288 unique names after removing the 9 duplicates named in decision #16 — with the provenance header; add `backend/src/lib/planet-name-pool.ts` (`parsePlanetNameCsv`, `loadPlanetProperNames`) and `planet-name-pool.test.ts` (tests 1–15); extend the `backend/package.json` build existence check to both CSVs; append the planet-name paragraph to `NOTICE`.
*Verifiable:* `npm test` green in `/backend`; `npm run build` produces `backend/dist/assets/planet-proper-names.csv` and fails loudly if it does not.

**2. Life model library** *(no runtime dependency; pair with slice 1 for the real pool)*
Add `backend/src/lib/life.ts` — constants, the five factor functions, `mainSequenceLifetimeGyr`, `habitabilityProbability`, `complexityCurve`, `lifeComplexityIndex`, `romanNumeral` and `LifeAssigner` — plus `life.test.ts` (tests 16–34). Pure module, PRNG and pool injected; no generator wiring yet.
*Verifiable:* `npm test` green, including the two worked examples from `docs/exoplanet-habitability-model.md`; the module is not yet referenced by the generator.

**3. Generator wiring, types and API contract** *(depends on 1 and 2)*
**First** capture the golden name literal for test 43 from the unmodified generator. Then add `age` to `System` and the four life fields to `Planet` in `backend/src/types/index.ts`; add `lifePrng` + `lifeAssigner` to `StellarGenerator`; draw the age per system and assign life per planet; update the backend fixtures in `stellar-service.test.ts` and `sector-controller.test.ts`; add tests 35–48.
*Verifiable:* `npm test` green in `/backend`, including the untouched `generation-stability.test.ts` and the new name-stability test; a manual `curl` against `npm run dev` shows life fields and named inhabited planets.

**4. Frontend — planet life display and planet filter** *(depends on 3)*
Mirror the `System`/`Planet` fields and add `LIFE_STAGE_LABELS` in `frontend/src/types/index.ts`; add `frontend/src/utils/lifeStage.ts`; update `PlanetTable.vue` (life filter, life column, name in the description cell, name in the search predicate), `PlanetDetailModal.vue` (name as title, life block) and `SystemDetailView.vue` (system age, planet name and life marker); update the `sectorStore.size.test.ts` fixture (test 49).
*Verifiable:* `npm run build` in `/frontend` passes `vue-tsc`; `npm test` green; the planets table filters by life and the detail modal shows presence, stage and probability.

**5. Frontend — systems life filter, API reference and documentation** *(depends on 4)*
Add the life filter bar, `systemsWithLife` set, `filteredSystems` and the system-card life badge to `ResultsDisplay.vue`; add the new fields to `ApiReferenceView.vue`; add the "Life & Habitability" block to `DocumentationView.vue`.
*Verifiable:* `npm run build` passes; the Systems tab filters and paginates correctly with the filter both on and off; the API reference and documentation list the new fields and explain the 1–6 scale.

---

## Success Criteria

- [ ] `backend/src/assets/planet-proper-names.csv` exists, carries the documented provenance header, and contains exactly 288 unique names (297 draft rows minus the 9 duplicates named in decision #16).
- [ ] `loadPlanetProperNames()` resolves the asset under `npm run dev` (ts-node), `npm test` (Jest) and `node dist/index.js` after `npm run build`.
- [ ] `cd backend && npm run build` produces `backend/dist/assets/planet-proper-names.csv` and fails loudly if it does not.
- [ ] `NOTICE` carries the planet-name paragraph in addition to the existing IAU paragraph.
- [ ] `System` in `backend/src/types/index.ts` and `frontend/src/types/index.ts` both declare `age: number`, and `Planet` in both declares `lifeProbability: number`, `lifeComplexity: number`, `hasLife: boolean` and `name?: string`, with identical text.
- [ ] `POST /api/sector/generate` returns `age` on every element of `data.systems` and `lifeProbability` / `lifeComplexity` / `hasLife` on every element of `data.planets`.
- [ ] `life.ts` implements both worked-example formulas from `docs/exoplanet-habitability-model.md` correctly, computing `P = 0.5252` (**not** the doc's printed approximation of 0.54 — see decision #26), `C(3.7) = 3.942` and `C_index = 2.07`.
- [ ] Every planet with `habitableZone === false` has `lifeProbability === 0`, `lifeComplexity === 0` and `hasLife === false`.
- [ ] Every planet whose host star is off the main sequence has `lifeProbability === 0`; every asteroid belt (`planetType === 'A'`) has `lifeProbability === 0`.
- [ ] Every planet with `hasLife === true` has a defined, non-empty `name`; no planet with `hasLife === false` has a `name`; planet names are unique within a sector.
- [ ] A sector of 1000 systems generates without error with a 288-name pool (exhaustion falls back to `<star name> <roman orbit>` designations).
- [ ] For a fixed seed, two generations produce identical `age`, `lifeProbability`, `lifeComplexity`, `hasLife` and `name` values.
- [ ] For a fixed seed, every pre-existing field (system coordinates, star spectral class/subclass, all pre-existing planet fields) is identical to the values produced before this feature — proven by the **unmodified** `generation-stability.test.ts`.
- [ ] For a fixed seed, every system name, `hasProperName` flag and star name is identical to the values produced before this feature — proven by the new name-stability test (test 43).
- [ ] In a 300-system sector, both inhabited and uninhabited Goldilocks planets occur.
- [ ] `cd backend && npm test` passes, including all new and updated tests.
- [ ] `cd frontend && npm test` and `cd frontend && npm run build` (vue-tsc) both pass.
- [ ] The planets table has a working life filter, shows a life column, and shows the proper name of inhabited planets; the existing type, search and Goldilocks filters still work.
- [ ] The Systems tab has a working life filter that also drives pagination, and defaults to showing every system exactly as before.
- [ ] The planet detail modal shows the proper name as its title (when present), the presence of life, the complexity stage label and the habitability probability.
- [ ] The system detail page shows the system age in Gyr.
- [ ] `ApiReferenceView.vue` lists `age` under `System` and the four new fields under `Planet`; `DocumentationView.vue` explains the five factors, the age gate and the 1–6 complexity scale.

---

## Future Considerations

Natural extensions deliberately **not** part of this spec:

- **Sector-level life statistics** — an inhabited-planet count and a complexity histogram on the Statistics tab, and matching fields in `StellarService.getSectorStats`.
- **Shared CSV parser** — factor `star-name-pool.ts` and `planet-name-pool.ts` onto a common schema-driven parser once a third asset appears (decision #15).
- **Naming every planet, not just inhabited ones** — using the `<star name> <roman orbit>` designation as the default and reserving pool names for life.
- **Civilisation flavour** — a short generated descriptor for level-6 worlds (technological era, atmosphere composition, biosphere colour).
- **Tunable model** — expose the atmosphere table or the age ranges as optional request fields once there is a reason to tune them.
- **Stellar mass on `starTypes`** — promote `STELLAR_MASS_SOLAR` into the generator's star table if a second feature ever needs stellar mass (decision #10).
- **Per-star ages in multiple systems** — model slight component-age differences instead of a single system age.
- **Filter and route by planet name** — `/planet/Arrakis` and a name column sort.
