# life-planet-types-001-description-data-model-and-resolution-module

**Spec:** STORIES/SPECS/life-planet-types.md

**As a** frontend developer
**I want** a pure resolution module and its supporting data tables that compose a planet's label and long description from `(planetType, hasLife, lifeComplexity)`
**So that** the three per-planet display surfaces have a single, tested source of truth for life-aware text instead of type-only prose that can contradict a planet's actual biology

## Acceptance Criteria

```gherkin
Feature: Planet description resolution module

Scenario: No life yields life state 0 regardless of complexity
  Given a planet with hasLife = false and lifeComplexity = 5.5
  When planetLifeState is computed for the planet
  Then the result is 0

Scenario: Life state mirrors the existing life-stage badge
  Given planets with hasLife = true and lifeComplexity 0.2, 1.4, 1.5, 3.2, 4.7, 12
  When planetLifeState is computed for each
  Then the results are 1, 1, 2, 3, 5, 6 respectively, matching lifeStageLevel(lifeComplexity)

Scenario: Life state is always within bounds
  Given lifeComplexity values swept from -1 to 8 in steps of 0.25, for both hasLife = true and hasLife = false
  When planetLifeState is computed
  Then every result is an integer between 0 and 6 inclusive

Scenario: Habitat group mapping covers every generator type code
  Given each of the 22 planet type codes the generator can emit (A G Q U S R E O I D C L F T N B J W H M X #)
  When habitatGroup is computed for each
  Then it matches the group recorded in PLANET_HABITAT_GROUP

Scenario: Unknown type codes fall back to the rocky habitat group
  Given a planet type of "Z" or an empty string
  When habitatGroup is computed
  Then the result is "rocky" (DEFAULT_HABITAT_GROUP)

Scenario: Jungle planets are labelled Rain World below multicellular life
  Given a Jungle ("J") planet with hasLife = false, or hasLife = true at complexity 1.1, 2.4 or 3.4
  When planetTypeLabel is computed
  Then the label is "Rain World"

Scenario: Jungle planets are labelled Jungle Planet from multicellular life onward
  Given a Jungle ("J") planet with hasLife = true at complexity 3.6, 5.2 or 6.0
  When planetTypeLabel is computed
  Then the label is "Jungle Planet"

Scenario: Non-Jungle labels are unaffected by life state
  Given each of the 21 non-"J" planet type codes at every life state 0 through 6
  When planetTypeLabel is computed
  Then the result equals PLANET_TYPE_DESCRIPTIONS[type] unchanged

Scenario: Unknown type codes fall back to the unknown label at every state
  Given a planet type of "Z" at life states 0 through 6
  When planetTypeLabel is computed
  Then the result is "Unknown planet type"

Scenario: Long description composes the physical core and the biosphere clause
  Given one representative planet of each of the six habitat groups
  When planetLongDescription is computed
  Then the result equals exactly PLANET_TYPE_LONG_DESCRIPTIONS[type] + " " + BIOSPHERE_CLAUSES[group][state]
  And the result contains no double space and does not end with a space

Scenario: Long description never contains a double space or trailing space
  Given all 22 planet type codes at all seven life states
  When planetLongDescription is computed for each
  Then no result contains "  " (double space) and no result ends with a space

Scenario: Worked example - sterile Jungle planet
  Given a Jungle planet with hasLife = false
  When planetLongDescription is computed
  Then the result ends with the temperate state-0 clause and contains the words "permanent overcast"

Scenario: Worked example - microbial Jungle planet
  Given a Jungle planet with hasLife = true and lifeComplexity = 1.1
  When planetLongDescription is computed
  Then the result ends with the temperate state-1 clause and contains "bacteria and archaea"

Scenario: Unknown type never renders undefined
  Given a planet with type "Z"
  When planetLongDescription is computed
  Then the core falls back to "Unknown planet type", the clause is still the rocky clause for its state, and the result never contains the string "undefined"

Scenario: Habitat group table is complete and closed
  Given the generator's full type list "A G Q U S R E O I D C L F T N B J W H M X #"
  Then PLANET_HABITAT_GROUP has an entry for every code in that list and no key outside it

Scenario: Description and label tables share the same key set
  Then the key sets of PLANET_TYPE_DESCRIPTIONS and PLANET_TYPE_LONG_DESCRIPTIONS are identical to each other and equal to the generator's 22-code type list

Scenario: Biosphere clause table is rectangular and non-empty
  Then BIOSPHERE_CLAUSES has exactly the six group keys, each with exactly the seven state keys 0 through 6, and every value is a non-empty, trimmed string ending in "."

Scenario: All 42 biosphere clauses are distinct
  Then no two cells of BIOSPHERE_CLAUSES share the same string

Scenario: No physical core contains life vocabulary
  Then no value in PLANET_TYPE_LONG_DESCRIPTIONS matches the regex
    /\blife\b|\bliving\b|\bbiosphere\b|organism|vegetation|forest|jungle|microb|extremophile|bacteri|\balgae\b|\bfungi\b|inhabited/i

Scenario: Label override table only references valid codes and states
  Then every key of PLANET_TYPE_LIFE_LABELS is a real planet type code and every nested key parses to an integer in 0 through 6
```

## Technical Notes

**Scope for this slice:** `frontend/src/types/index.ts` (data tables) and a new `frontend/src/utils/planetDescription.ts` (pure resolution functions), plus its test file. No `.vue` file is touched in this slice — `PlanetDetailModal.vue` etc. still call their old local helpers; this story only makes the new module exist and be correct. `PLANET_TYPE_DESCRIPTIONS`, `STAR_TYPE_DESCRIPTIONS` and `LIFE_STAGE_LABELS` must remain byte-identical to their current values.

### New types (add to `frontend/src/types/index.ts`)

```ts
/**
 * Display life state of one planet: 0 = no life, 1-6 = the milestone stage from
 * LIFE_STAGE_LABELS. Derived, never transmitted by the API.
 */
export type LifeState = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Where a biosphere would physically have to live on a planet of this type. */
export type HabitatGroup = 'belt' | 'giant' | 'temperate' | 'rocky' | 'frozen' | 'infernal';
```

### New constant: `PLANET_HABITAT_GROUP`

```ts
export const PLANET_HABITAT_GROUP: Record<string, HabitatGroup> = {
    'A': 'belt',                                            // no body, no surface
    'G': 'giant', 'Q': 'giant', 'U': 'giant',               // no solid surface
    'E': 'temperate', 'O': 'temperate', 'J': 'temperate',   // standing surface water
    'R': 'rocky', 'S': 'rocky', 'L': 'rocky', 'F': 'rocky',
    'W': 'rocky', 'C': 'rocky', 'D': 'rocky', 'X': 'rocky',
    '#': 'rocky',                                           // sparse or no surface water
    'I': 'frozen', 'N': 'frozen', 'B': 'frozen',            // habitat is under the ice
    'H': 'infernal', 'M': 'infernal', 'T': 'infernal'       // habitat is a refuge from the surface
};

/** Group for a code absent from the table. Matches '#' (Unknown). */
export const DEFAULT_HABITAT_GROUP: HabitatGroup = 'rocky';
```

### Rewritten constant: `PLANET_TYPE_LONG_DESCRIPTIONS` (physical cores)

Same key set, same shape, same file position as today. Replace the value for each code exactly as below (12 are byte-identical to current text: `G Q U S R I C L F B W M X #`; 10 are edited to drop a life claim, and `J` is a full rewrite):

| Code | Physical core (exact replacement text) |
|---|---|
| `A` | `A vast region of space filled with countless rocky bodies, ranging from tiny pebbles to large asteroids. Asteroid belts often form between planets and are remnants of planetary formation, rich in metals and minerals.` |
| `G` | `A massive planet composed primarily of hydrogen and helium, with no solid surface. Gas giants have thick, swirling atmospheres, powerful storms, and many moons. Their colorful cloud bands and immense size dominate their planetary systems.` |
| `Q` | `A gas giant orbiting very close to its star, resulting in extremely high temperatures. Hot gas giants often have bloated atmospheres, intense winds, and may appear bright due to their proximity to stellar radiation.` |
| `U` | `An ice giant, similar to Uranus or Neptune, with a thick atmosphere of hydrogen, helium, and ices such as water, ammonia, and methane. These planets are cold, blue-tinted, and often have faint rings and many moons.` |
| `S` | `A rocky planet larger than Earth but smaller than Neptune. Super-Earths can have diverse environments, from barren rocky worlds to those with thick atmospheres and oceans. Their higher gravity can affect surface conditions and atmospheric retention.` |
| `R` | `A terrestrial planet with a solid, rocky surface. Rocky planets may have mountains, valleys, craters, and little or no atmosphere. They are common in the galaxy and can vary greatly in temperature and composition.` |
| `E` | `A planet with conditions similar to Earth: a breathable atmosphere, liquid water, and a temperate climate. Earth-like planets sit squarely inside their star's habitable band and feature continents, oceans, weather systems and clouds.` |
| `O` | `A world almost entirely covered by deep oceans, with little or no landmass. Ocean planets may have perpetual storms, high humidity, and tides that sweep unbroken around the globe.` |
| `I` | `A frozen planet with a surface dominated by ice and snow. Ice planets are extremely cold, with possible subsurface oceans beneath thick ice crusts. Their atmospheres are thin or absent.` |
| `D` | `A dry, arid planet with vast deserts, rocky plateaus, and little water. Desert planets may have extreme temperature variations and frequent dust storms.` |
| `C` | `A rare type of planet with a surface rich in carbon compounds, such as graphite and diamond. Carbon planets are dark, dense, and may have exotic mineral formations.` |
| `L` | `A planet with a surface dominated by silicate rocks and minerals. Silicate planets are similar to rocky planets but may have unique geological features and mineral compositions.` |
| `F` | `A dense planet with a core and crust rich in iron and other metals. Iron planets are heavy, with strong magnetic fields and little to no atmosphere.` |
| `T` | `A hostile world wrapped in a thick, toxic atmosphere of poisonous gases, with corrosive clouds and crushing surface pressures.` |
| `N` | `A cold planet with an atmosphere rich in ammonia. Ammonia planets may have ammonia clouds, seas, or ice, and a surface chemistry utterly unlike Earth's.` |
| `B` | `A planet with a methane-rich atmosphere, often appearing blue or turquoise. Methane planets may have lakes or seas of liquid methane and are extremely cold.` |
| `J` | `A warm, cloud-wrapped world under permanent overcast and near-continuous rainfall. High humidity, standing water across most of the surface and a dense, heat-trapping atmosphere make it one of the wettest surfaces a rocky planet can have.` |
| `W` | `A small planetary body, often icy or rocky, that does not dominate its orbital zone. Dwarf planets are found in the outer reaches of systems and may have thin atmospheres or none at all.` |
| `H` | `An extremely hot and hostile planet with a scorched surface, frequent volcanic activity, and a thick, toxic atmosphere that traps heat in a runaway greenhouse.` |
| `M` | `A young planet with a surface covered in molten rock and active volcanism. Molten planets glow with heat and are in the early stages of planetary evolution.` |
| `X` | `A barren, rocky planet with a cold, desert-like environment. Cold desert planets have thin atmospheres, low temperatures, and little to no surface water.` |
| `#` | `A mysterious or unknown type of planet, with properties that do not fit any known classification. These worlds may be rare, exotic, or poorly understood.` |

### New constant: `BIOSPHERE_CLAUSES`

`Record<HabitatGroup, Record<LifeState, string>>`, 6 groups × 7 states, all 42 cells filled:

**`belt`**
| State | Clause |
|---|---|
| 0 | `Nothing here holds an atmosphere or a stable surface, and the survey records no biosphere.` |
| 1 | `Survey probes report microbial colonies sheltering inside the larger bodies, feeding on ice and mineral chemistry.` |
| 2 | `Photosynthetic films coat the sunward faces of the larger bodies, releasing faint traces of free oxygen.` |
| 3 | `Complex single-celled organisms occupy meltwater pockets deep inside the larger bodies.` |
| 4 | `Multicellular growths spread through the fractured interiors of the larger bodies, visible in every core sample.` |
| 5 | `Animal life has taken hold inside the largest bodies, moving through cavities kept liquid by tidal heating.` |
| 6 | `Coherent artificial signals originate from somewhere in the rubble — something out here is looking back.` |

**`giant`**
| State | Clause |
|---|---|
| 0 | `The cloud decks are chemically active but sterile; nothing lives in them.` |
| 1 | `Microbial cells drift through the temperate cloud layers, riding convection currents between the warm and cold bands.` |
| 2 | `Photosynthetic microbes tint the upper cloud bands and leave a persistent oxygen signature in the atmosphere.` |
| 3 | `Complex single-celled organisms populate the temperate cloud layer, grazing on the airborne microbial haze.` |
| 4 | `Multicellular colonies drift in the cloud decks, held aloft in gas-filled envelopes.` |
| 5 | `Large aerial animals migrate between the cloud bands — an entire ecosystem that never touches a solid surface.` |
| 6 | `An intelligent civilisation lives among the cloud decks, and its signals carry clearly across the system.` |

**`temperate`**
| State | Clause |
|---|---|
| 0 | `Despite conditions that could support a biosphere, nothing ever took hold here: the surface is chemically rich and completely sterile.` |
| 1 | `The surface is covered in a thick layer of bacteria and archaea — mats, films and slicks wherever there is standing water.` |
| 2 | `Photosynthetic mats have spread across the shallows and are slowly filling the atmosphere with free oxygen, tinting the water green.` |
| 3 | `Complex single-celled organisms fill the water column, an entire microscopic food web beneath a still-empty landscape.` |
| 4 | `Multicellular growth is visible from orbit: weed beds, mats and reefs colouring the shallows and the wet margins of the land.` |
| 5 | `A full ecosystem of animals and large plants covers the world, from canopy to seabed.` |
| 6 | `An intelligent species has emerged here: settlements, cleared land and artificial light are visible on the night side.` |

**`rocky`**
| State | Clause |
|---|---|
| 0 | `The surface is barren and chemically inert, with no trace of a biosphere.` |
| 1 | `Microbial colonies survive in the few damp niches the surface offers — crevices, subsurface brine, and the shade of rock overhangs.` |
| 2 | `Photosynthetic crusts have spread over the damper ground, releasing the first traces of free oxygen into a thin atmosphere.` |
| 3 | `Complex single-celled organisms have colonised the subsurface water table, well out of reach of the surface conditions.` |
| 4 | `Multicellular growth clings to the wetter lowlands: low mats and cushions that darken visibly between dry seasons.` |
| 5 | `Animal life has spread across the habitable belts, hardy ecosystems clustered around whatever water the surface retains.` |
| 6 | `An intelligent species has taken hold, and its settlements cluster along the world's few reliable water sources.` |

**`frozen`**
| State | Clause |
|---|---|
| 0 | `The ice is old, still and sterile from crust to core.` |
| 1 | `Microbial colonies persist in brine pockets within the ice and along the floor of the ocean beneath it.` |
| 2 | `Photosynthetic microbes crowd the thin, translucent ice near the surface, where enough light still reaches them.` |
| 3 | `Complex single-celled organisms drift through the subsurface ocean, sustained by chemistry venting from the sea floor.` |
| 4 | `Multicellular colonies anchor to the underside of the ice sheet and around the warm vents below.` |
| 5 | `Animal life fills the subsurface ocean — an ecosystem sealed under kilometres of ice and entirely independent of starlight.` |
| 6 | `An intelligent species lives beneath the ice, and its activity registers as heat and structure under the frozen crust.` |

**`infernal`**
| State | Clause |
|---|---|
| 0 | `Nothing survives the heat, the pressure or the chemistry: the world is sterile.` |
| 1 | `Heat- and acid-tolerant microbes cling on where conditions ease — deep in the crust, or high in the cooler haze layers.` |
| 2 | `Photosynthetic extremophiles colour the upper haze, working the narrow altitude where light and survivable temperature briefly overlap.` |
| 3 | `Complex single-celled organisms occupy the deep crustal aquifers, insulated from the surface by kilometres of rock.` |
| 4 | `Multicellular colonies have formed in the crustal refuges, the first structures here larger than a single cell.` |
| 5 | `Animal life persists in isolated refuges, an ecosystem confined to the few places the world does not try to kill.` |
| 6 | `Against every expectation an intelligent species arose here, sheltered from a surface that would destroy it in seconds.` |

### New constant: `PLANET_TYPE_LIFE_LABELS`

```ts
/**
 * Per-planet label overrides, keyed by planet type then life state. Only types
 * whose catalogue name asserts a biological state need an entry; every other
 * type falls through to PLANET_TYPE_DESCRIPTIONS at every state.
 */
export const PLANET_TYPE_LIFE_LABELS: Record<string, Partial<Record<LifeState, string>>> = {
    'J': { 0: 'Rain World', 1: 'Rain World', 2: 'Rain World', 3: 'Rain World' }
};
```

### New file: `frontend/src/utils/planetDescription.ts`

```ts
import type { Planet, HabitatGroup, LifeState } from '../types';
import {
    BIOSPHERE_CLAUSES,
    DEFAULT_HABITAT_GROUP,
    PLANET_HABITAT_GROUP,
    PLANET_TYPE_DESCRIPTIONS,
    PLANET_TYPE_LIFE_LABELS,
    PLANET_TYPE_LONG_DESCRIPTIONS
} from '../types';
import { lifeStageLevel } from './lifeStage';

/** The fields the description layer reads. Structural, so a full Planet fits. */
export type PlanetDescriptionInput = Pick<Planet, 'planetType' | 'hasLife' | 'lifeComplexity'>;

/** Fallback used when a type code is absent from the tables. */
export const UNKNOWN_PLANET_LABEL = 'Unknown planet type';

export function planetLifeState(planet: PlanetDescriptionInput): LifeState {
    if (!planet.hasLife) {
        return 0;
    }
    return lifeStageLevel(planet.lifeComplexity) as LifeState;
}

export function habitatGroup(planetType: string): HabitatGroup {
    return PLANET_HABITAT_GROUP[planetType] ?? DEFAULT_HABITAT_GROUP;
}

export function planetTypeLabel(planet: PlanetDescriptionInput): string {
    const override = PLANET_TYPE_LIFE_LABELS[planet.planetType]?.[planetLifeState(planet)];
    return override ?? PLANET_TYPE_DESCRIPTIONS[planet.planetType] ?? UNKNOWN_PLANET_LABEL;
}

export function biosphereClause(planet: PlanetDescriptionInput): string {
    return BIOSPHERE_CLAUSES[habitatGroup(planet.planetType)][planetLifeState(planet)];
}

export function planetLongDescription(planet: PlanetDescriptionInput): string {
    const core =
        PLANET_TYPE_LONG_DESCRIPTIONS[planet.planetType] ??
        PLANET_TYPE_DESCRIPTIONS[planet.planetType] ??
        UNKNOWN_PLANET_LABEL;
    return `${core} ${biosphereClause(planet)}`;
}
```

### Compiler constraints (`frontend/tsconfig.json`)

- `"strict": true` with no `noUncheckedIndexedAccess` — a `Record<string, T>` index is typed `T`, not `T | undefined`, so `??`/`?.` compile cleanly on `PLANET_TYPE_DESCRIPTIONS[type]` etc. while still doing the necessary runtime work. `Partial<Record<LifeState, string>>` on `PLANET_TYPE_LIFE_LABELS`'s inner type is what makes that lookup genuinely `string | undefined` to the compiler.
- The new `planetDescription.test.ts` is type-checked by `vue-tsc` during `npm run build`, exactly as `lifeStage.test.ts` already is.

### Test file: `frontend/src/utils/planetDescription.test.ts` *(new)*

Follow the style of `frontend/src/utils/lifeStage.test.ts`: `import { describe, it, expect } from 'vitest'`, direct imports from the module under test and from `../types`, no mocking, no component mounting. Use a terse planet-builder helper:

```ts
const planet = (planetType: string, hasLife: boolean, lifeComplexity = 0) =>
    ({ planetType, hasLife, lifeComplexity });
```

## Tests

- `planetLifeState`: no-life always 0 regardless of complexity; matches `lifeStageLevel` for `hasLife: true` across `0.2→1, 1.4→1, 1.5→2, 3.2→3, 4.7→5, 12→6`; never leaves `0…6` across a sweep of `lifeComplexity` from `-1` to `8` in steps of `0.25` for both `hasLife` values.
- `habitatGroup`: maps all 22 codes correctly (table-driven, one assertion); returns `DEFAULT_HABITAT_GROUP` for `'Z'` and `''`.
- `planetTypeLabel`: `J` at states 0–3 returns `'Rain World'`; `J` at complexity `3.6`, `5.2`, `6.0` returns `'Jungle Planet'`; every non-`J` code returns its `PLANET_TYPE_DESCRIPTIONS` value unchanged at every state (table-driven, 21 codes × 7 states); unknown code returns `'Unknown planet type'` at every state.
- `planetLongDescription` / `biosphereClause`: one representative planet per group equals `core + ' ' + clause` exactly; no double space or trailing space across all 22 codes × 7 states; `J` no-life ends with the `temperate` state-0 clause and contains `permanent overcast`; `J` at complexity `1.1` ends with the `temperate` state-1 clause and contains `bacteria and archaea`; unknown code `'Z'` falls back to `'Unknown planet type'` core plus the `rocky` clause, never `undefined`.
- Table invariants: every generator type code has a `PLANET_HABITAT_GROUP` entry and no extra keys exist; `PLANET_TYPE_DESCRIPTIONS` and `PLANET_TYPE_LONG_DESCRIPTIONS` key sets are identical and match the generator's list; `BIOSPHERE_CLAUSES` has exactly 6 groups × 7 states, every value non-empty and ending in `.`; the 42 clause strings are all distinct; no `PLANET_TYPE_LONG_DESCRIPTIONS` value matches the decision #15 life-vocabulary regex; every `PLANET_TYPE_LIFE_LABELS` key/state is valid.
- Regression: `cd frontend && npm test` passes with the new test file green and no existing test edited; `cd frontend && npm run build` passes `vue-tsc`.
- Regression: no file under `backend/` is touched by this story, so `cd backend && npm test` passes unchanged, including `backend/__tests__/unit/lib/generation-stability.test.ts` — this is what makes seed invariance structural rather than something a test has to defend.

**Priority:** Critical
**Dependencies:** None
