# Life-Aware Planet Labels and Descriptions

## Feature Name & Description

**Summary** — Make the label and the long description shown for an individual planet agree with whether life actually arose on it and how far it got, so the UI stops telling the reader about "dense jungles and a rich diversity of plant life" on a world the generator recorded as sterile.

**Current state**

- `planetType` is drawn by `selectPlanetTypeWeighted` (`backend/src/lib/example_star_generator.ts:209-225`) from the base weight table biased by the orbital thermal zone. Life is decided later and completely independently by `LifeAssigner.assignLife` (`backend/src/lib/life.ts:293-310`), from its own PRNG stream, and is deliberately rare: `ABIOGENESIS_FACTOR = 0.1` means a default 100-system sector carries roughly 2–3 inhabited worlds (`README.md:263`).
- The two are never reconciled for display. `PLANET_TYPE_DESCRIPTIONS` and `PLANET_TYPE_LONG_DESCRIPTIONS` (`frontend/src/types/index.ts:66-115`) are keyed on `planetType` alone, so every Jungle planet is captioned *"A lush, verdant planet covered in dense jungles and forests… a rich diversity of plant life"* even though the overwhelming majority have `hasLife === false`, and an inhabited one may be at stage 1 (microbial) — neither of which is a jungle.
- The same mismatch runs the other way. `PLANET_TYPE_LONG_DESCRIPTIONS` asserts the **absence** of life for types that can and do host it: `T` ("Toxic planets are uninhabitable"), `H` ("inhospitable to all known forms of life"), `D` ("life limited to hardy extremophiles"), `N` ("extremely hostile to Earth-like life"). Every one of those types has a non-zero habitable-zone affinity in `planetZoneAffinity` (`example_star_generator.ts:178-201`) and a non-zero `ATMOSPHERE_FACTOR` (`life.ts:72-98`), so all of them can legitimately come back with `hasLife === true`.
- The life data itself is already surfaced correctly and separately: `lifeStageLevel` (`frontend/src/utils/lifeStage.ts`) clamps `lifeComplexity` into 1–6 and `LIFE_STAGE_LABELS` (`frontend/src/types/index.ts:146-153`) names the stage. `PlanetTable.vue`, `PlanetDetailModal.vue` and `SystemDetailView.vue` all render that badge. What is missing is the *prose*.

**In scope**

- A display layer that resolves a planet's **label** and **long description** from the triple `(planetType, hasLife, lifeComplexity)`.
- Rewriting all 22 entries of `PLANET_TYPE_LONG_DESCRIPTIONS` into life-neutral **physical cores** (what the world is made of and what its weather does), stripped of every claim about the presence or absence of life.
- A new **biosphere clause** table keyed by habitat group × life state (7 states: no life, plus the six existing milestone stages), appended to the physical core.
- A sparse **label override** table, so a type whose *name* asserts biology reads correctly when the biology is not there. Today exactly one type qualifies: `J`.
- Wiring the three per-planet surfaces (`PlanetDetailModal.vue`, `PlanetTable.vue`, `SystemDetailView.vue`) to the new layer.
- Aligning the two documentation surfaces whose text makes the same claim at type level: the `J` entry in `DocumentationView.vue`'s local catalogue, and a one-line note in `README.md`.
- Vitest coverage for the new module and for the completeness/drift invariants of the three tables.

**Out of scope**

- **Any backend change whatsoever.** No generator change, no `life.ts` change, no new API field, no change to which PRNG streams are consumed or in what order. Seed invariance is preserved by construction, not by a test (see decision #1).
- Changing `planetType` selection, the habitability model, `ABIOGENESIS_FACTOR`, or how often life occurs.
- Changing the type-level catalogue label in `PLANET_TYPE_DESCRIPTIONS` (decision #4), the README planet-type list, the planet-type filter dropdown, the type-distribution charts, or `frontend/src/utils/planetImages.ts` — a planet's image stays keyed on its internal type.
- Widening `PlanetTable.vue`'s search predicate to match the rendered label (decision #11 — this was considered and rejected as a regression).
- Naming planets, moons, or generating civilisation flavour text beyond the stage-6 clause.

---

## Assumptions & Decisions

The draft left the mechanism, the granularity and the wording scheme open. Each row below is a decision made here; each can be accepted or overridden before `story-creator` runs.

| # | Decision | Reasoning / precedent |
|---|---|---|
| 1 | **The whole feature is frontend-only.** No file under `backend/` is touched, and `POST /api/sector/generate` keeps its exact request and response shape. | Descriptions already live exclusively in the frontend (`frontend/src/types/index.ts`); the API has never returned a label or a description, and adding one would inflate a payload that `frontend/src/stores/sectorStore.size.test.ts` explicitly measures. It also settles the draft's "seed invariance must be respected" requirement in the strongest possible way: if no backend code changes, no PRNG stream changes, so every existing seed reproduces byte-identical output — this is a structural guarantee, not something a test has to defend. The `life-on-planets` spec had to add a third PRNG stream (its decision #1) precisely because it touched generation; this feature does not. |
| 2 | **The internal `planetType` code is never altered or remapped.** The new layer reads it and derives presentation from it. | Explicit draft requirement ("the internal type of the planets must not change, only label and description"). It also keeps `getPlanetImage(planet.planetType, …)` (`frontend/src/utils/planetImages.ts`), the type filter, and the type-distribution charts working unchanged. |
| 3 | **The life state is the existing display stage, not the raw index**: `state = hasLife ? lifeStageLevel(lifeComplexity) : 0`, giving seven states `0…6`. | Reuses `frontend/src/utils/lifeStage.ts` verbatim rather than introducing a second, subtly different reading of `lifeComplexity`. The prose therefore always agrees with the stage badge already rendered next to it in `PlanetTable.vue:109` and `PlanetDetailModal.vue:33`. State `0` is unambiguous because `lifeStageLevel` clamps its floor to 1, so `0` can only ever mean `hasLife === false`. |
| 4 | **`PLANET_TYPE_DESCRIPTIONS` keeps its current values, including `'J': 'Jungle Planet'`.** It is the *type catalogue* name and stays life-neutral by remaining a classification. Per-planet label overrides live in a new, separate, sparse table. | That constant is consumed by four surfaces, three of which are type-level and must not change: the filter dropdown and the type-distribution list in `PlanetTable.vue:26,146`, the type-distribution chart in `ResultsDisplay.vue:275,280`, and the type catalogue in `DocumentationView.vue:94`. Only the fourth kind of use — naming one specific planet — is wrong today. Leaving the shared table alone confines the change to per-planet surfaces and keeps `README.md`'s type list, the filter values and the charts untouched. |
| 5 | **`PLANET_TYPE_LONG_DESCRIPTIONS` is rewritten in place into life-neutral physical cores** rather than being duplicated into a new constant. | Verified: its **only** consumer in the repo is `PlanetDetailModal.vue:59,69` — a strictly per-planet surface. `DocumentationView.vue` does **not** use it; it carries its own local `getPlanetDetailDescription` table (`DocumentationView.vue:320-347`). So rewriting it has exactly one caller, which this feature updates in the same change. A parallel constant would leave a life-asserting copy in the tree for someone to pick up later. |
| 6 | **Composition rule: `long description = physical core + " " + biosphere clause`.** The core is per planet *type* (22 entries); the clause is per habitat *group* × life state (6 × 7 = 42 entries). | Directly mirrors the draft's own two examples, which pair a type-specific physical phrase ("permanent cloud cover and endless rain") with a life-state phrase ("devoid of life" / "covered in a thick layer of bacteria, fungi or algae"). Per-type × per-state would need 154 hand-written strings; grouping the life narrative while keeping the physical text per type gets the same output quality at 64 strings, and every combination stays a plain table lookup with no string templating or interpolation. |
| 7 | **Six habitat groups**: `belt` (A), `giant` (G, Q, U), `temperate` (E, O, J), `rocky` (R, S, L, F, W, C, D, X, #), `frozen` (I, N, B), `infernal` (H, M, T). Unknown codes fall back to `rocky`. | The groups are cut by *where a biosphere would physically have to live* — no surface at all, standing surface water, sparse surface water, under ice, or in refuges from heat — which is what the clause has to describe. Grouping follows `ATMOSPHERE_FACTOR`'s own buckets (`life.ts:72-98`) where they agree. `rocky` is the fallback because `#` (Unknown) is already in it. |
| 8 | **Seven life states, one-to-one with `LIFE_STAGE_LABELS` plus a `0` for "no life"** — no merging of stages into coarser bands. | Any merge (e.g. treating stages 2 and 3 as one band) is an arbitrary judgement that would then disagree with the stage label rendered beside it. One-to-one keeps the prose and the badge in lockstep and makes the completeness invariant trivial: 6 groups × 7 states, no holes. |
| 9 | **Exactly one label override ships: `J` reads "Rain World" at states 0–3 and "Jungle Planet" at states 4–6.** The override table is general; its data is minimal. | Auditing all 22 names, `J` is the only one whose *name* asserts a biological state — "Jungle" means vegetation. "Earth-like", "Ocean", "Desert" etc. describe physical conditions and stay correct at every life state. The 4 threshold is where `LIFE_STAGE_LABELS` reaches "Multicellular life": below it there is nothing macroscopic to form a jungle; at and above it, the name is earned. Keeping the mechanism general means a future type needs a table row, not a code change. |
| 10 | **The `belt` group's states 1–6 are unreachable under the current backend model but are still authored.** | `radiusFactor` returns `0` for `planetType === 'A'` (`backend/src/lib/life.ts:163-167`), so `P = 0` and `hasLife` is always `false` for a belt. The clauses are written anyway so the table stays rectangular, the completeness test needs no exception, and a future model change cannot produce a blank caption. This is recorded so a reviewer does not read those six strings as a claim about current behaviour. |
| 11 | **`PlanetTable.vue`'s search predicate is NOT widened to match the rendered label.** | Considered and rejected. The predicate (`PlanetTable.vue:234-239`) currently matches `planetType`, `starId`, `orbitalNumber` and `name` — all short, high-precision tokens. Matching the label would make a one-character query like `a` match "Ocean Planet", "Rain World", "Gas Giant" and nearly everything else, destroying the filter's usefulness for short queries. Recorded under Future Considerations. |
| 12 | **Unknown/missing type codes preserve the current fallback chain exactly**: label → `PLANET_TYPE_DESCRIPTIONS[type] ?? 'Unknown planet type'`; core → `PLANET_TYPE_LONG_DESCRIPTIONS[type] ?? PLANET_TYPE_DESCRIPTIONS[type] ?? 'Unknown planet type'`. | Copied from the existing helpers (`PlanetDetailModal.vue:67-70`, `PlanetTable.vue:328-330`, `SystemDetailView.vue:190`). Keeping the chain byte-identical means a hypothetical unknown code renders exactly as it does today, plus a clause. |
| 13 | **Data tables go in `frontend/src/types/index.ts`; the resolution functions go in a new `frontend/src/utils/planetDescription.ts`.** | Exactly the split the `life-on-planets` feature established: `LIFE_STAGE_LABELS` is data in `types/index.ts`, `lifeStageLevel` is logic in `utils/lifeStage.ts`. It also keeps the dependency direction one-way (`utils` → `types`), so no import cycle is possible. |
| 14 | **No component tests are added; the new module gets a Vitest unit test file.** | Unchanged from `life-on-planets.md` decision #24: `frontend/package.json` has no `@vue/test-utils`, and the only Vitest files are `src/stores/*.test.ts` and `src/utils/lifeStage.test.ts`. `frontend/src/utils/planetDescription.test.ts` follows the latter's precedent directly. Template bindings are verified by `vue-tsc` during `npm run build`. |
| 15 | **A drift guard test asserts no physical core contains life vocabulary.** Regex: `/\blife\b\|\bliving\b\|\bbiosphere\b\|organism\|vegetation\|forest\|jungle\|microb\|extremophile\|bacteri\|\balgae\b\|\bfungi\b\|inhabited/i`. | The whole feature is one invariant — *the core states facts about rock and weather, the clause states facts about biology*. A regex over the 22 cores is the cheapest possible way to stop that invariant eroding the next time someone edits a description, and it is the reason the `J` core is worded to avoid the word "jungle". |
| 16 | **`DocumentationView.vue`'s local `J` entry is corrected and one explanatory sentence is added to the Planetary Types intro. Its other 21 entries are left alone.** | That table is a *type catalogue*, so entries like `T`'s "uninhabitable for Earth life" are acceptable statements about the class. `J`'s "Lush worlds covered in dense forests and rich vegetation" is not — it asserts of the class the exact thing this feature exists to stop asserting of the instance. The added sentence tells the reader that an individual planet's description reflects its biosphere, which is otherwise invisible from the catalogue. |
| 17 | **Open risk — prose quality is not machine-verifiable.** The tests can prove every cell is filled, that composition is `core + " " + clause`, and that no core contains life vocabulary. They cannot prove a sentence reads well or that a clause suits its group. | The 64 strings in this spec are the normative text and should be reviewed as content, not just as structure. If the owner wants different wording, changing it is a data edit in `frontend/src/types/index.ts` with no code change — which is itself an argument for the table-driven design. |

---

## Architecture / Design Overview

The feature adds one pure frontend utility module and three data tables, and changes what three existing per-planet templates call. Nothing else moves. The Controller → Service → Lib backend layering and the API contract are untouched.

```
API response (UNCHANGED)                       frontend/src/types/index.ts
  planet.planetType    ────────────┐             PLANET_TYPE_DESCRIPTIONS       (unchanged data)
  planet.hasLife       ──┐         │             PLANET_TYPE_LONG_DESCRIPTIONS  (rewritten: physical cores)
  planet.lifeComplexity ─┤         │             PLANET_TYPE_LIFE_LABELS  (new, sparse: J only)
                         │         │             PLANET_HABITAT_GROUP     (new: 22 codes -> 6 groups)
                         │         │             BIOSPHERE_CLAUSES        (new: 6 groups x 7 states)
                         ▼         ▼
        utils/lifeStage.ts     utils/planetDescription.ts  (new)
        lifeStageLevel()  ──►  planetLifeState(planet)  -> 0..6
                               habitatGroup(type)       -> HabitatGroup
                               planetTypeLabel(planet)  -> string
                               biosphereClause(planet)  -> string
                               planetLongDescription(planet) -> core + " " + clause
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
        PlanetDetailModal.vue      PlanetTable.vue      SystemDetailView.vue
        (title, subtitle,          (row description     (planet card label,
         long description)          cell, img alt)       title attr, img alt)
```

**Resolution for one planet**

```
state = planet.hasLife ? lifeStageLevel(planet.lifeComplexity) : 0        // 0..6
group = PLANET_HABITAT_GROUP[planet.planetType] ?? 'rocky'

label = PLANET_TYPE_LIFE_LABELS[planet.planetType]?.[state]
        ?? PLANET_TYPE_DESCRIPTIONS[planet.planetType]
        ?? 'Unknown planet type'

core   = PLANET_TYPE_LONG_DESCRIPTIONS[planet.planetType]
         ?? PLANET_TYPE_DESCRIPTIONS[planet.planetType]
         ?? 'Unknown planet type'
clause = BIOSPHERE_CLAUSES[group][state]

longDescription = core + ' ' + clause
```

**Worked examples** (the draft's own two cases, plus the inverse failure this feature also fixes):

| Planet | state | label | long description |
|---|---|---|---|
| `J`, `hasLife: false` | 0 | Rain World | *"A warm, cloud-wrapped world under permanent overcast and near-continuous rainfall. High humidity, standing water across most of the surface and a dense, heat-trapping atmosphere make it one of the wettest surfaces a rocky planet can have."* + *"Despite conditions that could support a biosphere, nothing ever took hold here: the surface is chemically rich and completely sterile."* |
| `J`, `hasLife: true`, `lifeComplexity: 1.1` | 1 | Rain World | same core + *"The surface is covered in a thick layer of bacteria and archaea — mats, films and slicks wherever there is standing water."* |
| `J`, `hasLife: true`, `lifeComplexity: 5.2` | 5 | Jungle Planet | same core + *"A full ecosystem of animals and large plants covers the world, from canopy to seabed."* |
| `T`, `hasLife: true`, `lifeComplexity: 1.4` | 1 | Toxic Planet | *"A hostile world with a thick, toxic atmosphere composed of poisonous gases, corrosive clouds and extreme surface pressures."* + *"Heat- and acid-tolerant microbes cling on where conditions ease — deep in the crust, or high in the cooler haze layers."* (today this planet is captioned "Toxic planets are uninhabitable") |

**Key design points**

1. *No backend, therefore no seed risk.* The draft's hardest constraint ("seed invariance must be respected") is satisfied structurally: the generator, `life.ts`, the PRNG streams and the API payload are byte-identical before and after. `backend/__tests__/unit/lib/generation-stability.test.ts` continues to pass without modification because nothing it observes changes.
2. *Two orthogonal tables, one composition rule.* Physical facts are per type; biological facts are per group × state. Neither table can contradict the other because neither talks about the other's subject — enforced by the decision #15 drift guard.
3. *Type-level surfaces stay type-level.* The catalogue, the filter and the charts keep reading `PLANET_TYPE_DESCRIPTIONS` directly. Only code paths that hold a concrete `Planet` object switch to the new functions.
4. *Data, not code.* Rewording any of the 64 strings is an edit to `frontend/src/types/index.ts` with no logic change and no test change beyond exact-string assertions.

---

## Configuration

**No configuration required.** The feature introduces no environment variable, feature flag, config file or build setting. It adds no dependency: `frontend/package.json` is unchanged. No asset is added, so `backend/package.json`'s build-time asset copy step is untouched.

---

## Data Model

**No persistence, and no API contract change.** Nothing is stored, no schema, table, migration or index is involved. `Planet` and `System` in `backend/src/types/index.ts` and `frontend/src/types/index.ts` are **unchanged** — the feature reads three fields that already exist (`planetType`, `hasLife`, `lifeComplexity`) and writes none. `frontend/src/stores/sectorStore.ts` persists only `currentSeed`, `systemCount`, `sectorVolume` and `zone` to `localStorage`, none of which is affected, so no stored-state migration is needed and reload-and-regenerate keeps working exactly as before.

What follows is the **display data model**: the constants and types the feature adds to `frontend/src/types/index.ts`.

### New types

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

Every one of the 22 planet type codes the generator can emit (`example_star_generator.ts:124-147`) has exactly one entry.

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

Same key set, same shape, same file position. Twelve entries are byte-identical to today (`G Q U S R I C L F B W M X #`); ten are edited to remove a claim about the presence or absence of life. Each value is the complete replacement text.

| Code | Physical core | Change |
|---|---|---|
| `A` | `A vast region of space filled with countless rocky bodies, ranging from tiny pebbles to large asteroids. Asteroid belts often form between planets and are remnants of planetary formation, rich in metals and minerals.` | dropped `but inhospitable to life` |
| `G` | *(unchanged)* `A massive planet composed primarily of hydrogen and helium, with no solid surface. Gas giants have thick, swirling atmospheres, powerful storms, and many moons. Their colorful cloud bands and immense size dominate their planetary systems.` | — |
| `Q` | *(unchanged)* `A gas giant orbiting very close to its star, resulting in extremely high temperatures. Hot gas giants often have bloated atmospheres, intense winds, and may appear bright due to their proximity to stellar radiation.` | — |
| `U` | *(unchanged)* `An ice giant, similar to Uranus or Neptune, with a thick atmosphere of hydrogen, helium, and ices such as water, ammonia, and methane. These planets are cold, blue-tinted, and often have faint rings and many moons.` | — |
| `S` | *(unchanged)* `A rocky planet larger than Earth but smaller than Neptune. Super-Earths can have diverse environments, from barren rocky worlds to those with thick atmospheres and oceans. Their higher gravity can affect surface conditions and atmospheric retention.` | — |
| `R` | *(unchanged)* `A terrestrial planet with a solid, rocky surface. Rocky planets may have mountains, valleys, craters, and little or no atmosphere. They are common in the galaxy and can vary greatly in temperature and composition.` | — |
| `E` | `A planet with conditions similar to Earth: a breathable atmosphere, liquid water, and a temperate climate. Earth-like planets sit squarely inside their star's habitable band and feature continents, oceans, weather systems and clouds.` | dropped `prime candidates for life` |
| `O` | `A world almost entirely covered by deep oceans, with little or no landmass. Ocean planets may have perpetual storms, high humidity, and tides that sweep unbroken around the globe.` | dropped `and unique forms of aquatic life, if any` |
| `I` | *(unchanged)* `A frozen planet with a surface dominated by ice and snow. Ice planets are extremely cold, with possible subsurface oceans beneath thick ice crusts. Their atmospheres are thin or absent.` | — |
| `D` | `A dry, arid planet with vast deserts, rocky plateaus, and little water. Desert planets may have extreme temperature variations and frequent dust storms.` | dropped `with life limited to hardy extremophiles` |
| `C` | *(unchanged)* `A rare type of planet with a surface rich in carbon compounds, such as graphite and diamond. Carbon planets are dark, dense, and may have exotic mineral formations.` | — |
| `L` | *(unchanged)* `A planet with a surface dominated by silicate rocks and minerals. Silicate planets are similar to rocky planets but may have unique geological features and mineral compositions.` | — |
| `F` | *(unchanged)* `A dense planet with a core and crust rich in iron and other metals. Iron planets are heavy, with strong magnetic fields and little to no atmosphere.` | — |
| `T` | `A hostile world wrapped in a thick, toxic atmosphere of poisonous gases, with corrosive clouds and crushing surface pressures.` | dropped `Toxic planets are uninhabitable` |
| `N` | `A cold planet with an atmosphere rich in ammonia. Ammonia planets may have ammonia clouds, seas, or ice, and a surface chemistry utterly unlike Earth's.` | dropped `extremely hostile to Earth-like life` |
| `B` | *(unchanged)* `A planet with a methane-rich atmosphere, often appearing blue or turquoise. Methane planets may have lakes or seas of liquid methane and are extremely cold.` | — |
| `J` | `A warm, cloud-wrapped world under permanent overcast and near-continuous rainfall. High humidity, standing water across most of the surface and a dense, heat-trapping atmosphere make it one of the wettest surfaces a rocky planet can have.` | full rewrite; deliberately avoids the word "jungle" so the decision #15 guard holds |
| `W` | *(unchanged)* `A small planetary body, often icy or rocky, that does not dominate its orbital zone. Dwarf planets are found in the outer reaches of systems and may have thin atmospheres or none at all.` | — |
| `H` | `An extremely hot and hostile planet with a scorched surface, frequent volcanic activity, and a thick, toxic atmosphere that traps heat in a runaway greenhouse.` | dropped `inhospitable to all known forms of life` |
| `M` | *(unchanged)* `A young planet with a surface covered in molten rock and active volcanism. Molten planets glow with heat and are in the early stages of planetary evolution.` | — |
| `X` | *(unchanged)* `A barren, rocky planet with a cold, desert-like environment. Cold desert planets have thin atmospheres, low temperatures, and little to no surface water.` | — |
| `#` | *(unchanged)* `A mysterious or unknown type of planet, with properties that do not fit any known classification. These worlds may be rare, exotic, or poorly understood.` | — |

### New constant: `BIOSPHERE_CLAUSES`

`Record<HabitatGroup, Record<LifeState, string>>` — every one of the 6 × 7 cells is filled. Each value is a complete sentence appended after the physical core, separated by a single space.

**`belt`** *(states 1–6 are unreachable while `radiusFactor('A') === 0` — decision #10)*

| State | Clause |
|---|---|
| 0 | `Nothing here holds an atmosphere or a stable surface, and the survey records no biosphere.` |
| 1 | `Survey probes report microbial colonies sheltering inside the larger bodies, feeding on ice and mineral chemistry.` |
| 2 | `Photosynthetic films coat the sunward faces of the larger bodies, releasing faint traces of free oxygen.` |
| 3 | `Complex single-celled organisms occupy meltwater pockets deep inside the larger bodies.` |
| 4 | `Multicellular growths spread through the fractured interiors of the larger bodies, visible in every core sample.` |
| 5 | `Animal life has taken hold inside the largest bodies, moving through cavities kept liquid by tidal heating.` |
| 6 | `Coherent artificial signals originate from somewhere in the rubble — something out here is looking back.` |

**`giant`** (G, Q, U)

| State | Clause |
|---|---|
| 0 | `The cloud decks are chemically active but sterile; nothing lives in them.` |
| 1 | `Microbial cells drift through the temperate cloud layers, riding convection currents between the warm and cold bands.` |
| 2 | `Photosynthetic microbes tint the upper cloud bands and leave a persistent oxygen signature in the atmosphere.` |
| 3 | `Complex single-celled organisms populate the temperate cloud layer, grazing on the airborne microbial haze.` |
| 4 | `Multicellular colonies drift in the cloud decks, held aloft in gas-filled envelopes.` |
| 5 | `Large aerial animals migrate between the cloud bands — an entire ecosystem that never touches a solid surface.` |
| 6 | `An intelligent civilisation lives among the cloud decks, and its signals carry clearly across the system.` |

**`temperate`** (E, O, J)

| State | Clause |
|---|---|
| 0 | `Despite conditions that could support a biosphere, nothing ever took hold here: the surface is chemically rich and completely sterile.` |
| 1 | `The surface is covered in a thick layer of bacteria and archaea — mats, films and slicks wherever there is standing water.` |
| 2 | `Photosynthetic mats have spread across the shallows and are slowly filling the atmosphere with free oxygen, tinting the water green.` |
| 3 | `Complex single-celled organisms fill the water column, an entire microscopic food web beneath a still-empty landscape.` |
| 4 | `Multicellular growth is visible from orbit: weed beds, mats and reefs colouring the shallows and the wet margins of the land.` |
| 5 | `A full ecosystem of animals and large plants covers the world, from canopy to seabed.` |
| 6 | `An intelligent species has emerged here: settlements, cleared land and artificial light are visible on the night side.` |

**`rocky`** (R, S, L, F, W, C, D, X, #)

| State | Clause |
|---|---|
| 0 | `The surface is barren and chemically inert, with no trace of a biosphere.` |
| 1 | `Microbial colonies survive in the few damp niches the surface offers — crevices, subsurface brine, and the shade of rock overhangs.` |
| 2 | `Photosynthetic crusts have spread over the damper ground, releasing the first traces of free oxygen into a thin atmosphere.` |
| 3 | `Complex single-celled organisms have colonised the subsurface water table, well out of reach of the surface conditions.` |
| 4 | `Multicellular growth clings to the wetter lowlands: low mats and cushions that darken visibly between dry seasons.` |
| 5 | `Animal life has spread across the habitable belts, hardy ecosystems clustered around whatever water the surface retains.` |
| 6 | `An intelligent species has taken hold, and its settlements cluster along the world's few reliable water sources.` |

**`frozen`** (I, N, B)

| State | Clause |
|---|---|
| 0 | `The ice is old, still and sterile from crust to core.` |
| 1 | `Microbial colonies persist in brine pockets within the ice and along the floor of the ocean beneath it.` |
| 2 | `Photosynthetic microbes crowd the thin, translucent ice near the surface, where enough light still reaches them.` |
| 3 | `Complex single-celled organisms drift through the subsurface ocean, sustained by chemistry venting from the sea floor.` |
| 4 | `Multicellular colonies anchor to the underside of the ice sheet and around the warm vents below.` |
| 5 | `Animal life fills the subsurface ocean — an ecosystem sealed under kilometres of ice and entirely independent of starlight.` |
| 6 | `An intelligent species lives beneath the ice, and its activity registers as heat and structure under the frozen crust.` |

**`infernal`** (H, M, T)

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

Sparse per-planet label overrides. A missing type, or a missing state within a present type, falls through to `PLANET_TYPE_DESCRIPTIONS`.

```ts
/**
 * Per-planet label overrides, keyed by planet type then life state. Only types
 * whose catalogue name asserts a biological state need an entry; every other
 * type falls through to PLANET_TYPE_DESCRIPTIONS at every state.
 */
export const PLANET_TYPE_LIFE_LABELS: Record<string, Partial<Record<LifeState, string>>> = {
    // "Jungle" claims vegetation. Below multicellular life (stage 4) there is
    // nothing macroscopic to form one, so the world is named for its weather.
    'J': { 0: 'Rain World', 1: 'Rain World', 2: 'Rain World', 3: 'Rain World' }
};
```

### Enums / value objects

`LifeState` and `HabitatGroup` above are the only new type-level values. No runtime enum is introduced — the codebase uses string-literal unions and `Record` tables throughout (`SectorZone`, `LIFE_STAGE_LABELS`), and this follows that.

---

## Impact on Existing Code

### New files

| Path | Purpose |
|---|---|
| `frontend/src/utils/planetDescription.ts` *(new)* | `planetLifeState`, `habitatGroup`, `planetTypeLabel`, `biosphereClause`, `planetLongDescription`. Pure functions over the tables in `types/index.ts`; imports `lifeStageLevel` from `./lifeStage`. |
| `frontend/src/utils/planetDescription.test.ts` *(new)* | Vitest unit tests for the module and the three table invariants (tests 1–20 below). |

### Modified files

Every entry is classified **additive** (existing contract preserved) or **breaking** (with its migration path).

| Path | Change | Regression classification |
|---|---|---|
| `frontend/src/types/index.ts` | Add `LifeState`, `HabitatGroup`, `PLANET_HABITAT_GROUP`, `DEFAULT_HABITAT_GROUP`, `BIOSPHERE_CLAUSES`, `PLANET_TYPE_LIFE_LABELS`. Rewrite the 22 values of `PLANET_TYPE_LONG_DESCRIPTIONS` per the table above. Leave `PLANET_TYPE_DESCRIPTIONS`, `STAR_TYPE_DESCRIPTIONS`, `LIFE_STAGE_LABELS` and every interface **untouched**. | **Additive at the type level** — no interface changes, so no fixture anywhere is forced to change and `vue-tsc` cannot newly fail. `frontend/src/stores/sectorStore.size.test.ts` and `sectorStore.test.ts` need no edit. **Intentional content change** to `PLANET_TYPE_LONG_DESCRIPTIONS`: its only consumer in the repo is `PlanetDetailModal.vue:59,69` (verified by grep across `*.ts`, `*.vue`, `*.md`), and that file is updated in the same change. No test asserts any of the old strings. |
| `frontend/src/components/PlanetDetailModal.vue` | Replace the local `getPlanetTypeDescription` / `getPlanetTypeLongDescription` helpers (lines 67-70) with `planetTypeLabel(planet)` and `planetLongDescription(planet)` from the new module; update the three template bindings (title line 7, subtitle line 8, description line 16) and the `<img :alt>` (line 6) to use `planetTypeLabel(planet)`. Drop the now-unused `PLANET_TYPE_DESCRIPTIONS` / `PLANET_TYPE_LONG_DESCRIPTIONS` imports (line 59), keeping `LIFE_STAGE_LABELS`. | **Additive/behaviour-preserving apart from the intended text change.** The `planet` prop type is unchanged, the Goldilocks ring, the life block, the stats list and the close handler are untouched. For every non-`J` planet the label is byte-identical to today; the long description gains a trailing clause. |
| `frontend/src/components/PlanetTable.vue` | In the table row only: the `Description` cell (line 86) and the row `<img :alt>` (line 76) switch from `getPlanetTypeDescription(planet.planetType)` to `planetTypeLabel(planet)`. Keep the local `getPlanetTypeDescription` helper and its `PLANET_TYPE_DESCRIPTIONS` import — the filter dropdown (line 26) and the type-distribution list (line 146) still use it, correctly, at type level. Import `planetTypeLabel`. | **Additive.** Filters, pagination, sorting, the search predicate (deliberately not widened — decision #11), the row click-through, the statistics block and the distribution chart are all untouched. `derivedPlanets` spreads the full `Planet`, so the three fields the new function needs are present on every row object. |
| `frontend/src/views/SystemDetailView.vue` | On the planet card, replace `getPlanetDescription(planet.planetType)` with `planetTypeLabel(planet)` in all three places: the `<img :alt>` (line 79), the `:title` attribute (line 92) and the rendered text (line 93). Remove the now-unused `getPlanetDescription` helper (line 190) and the `PLANET_TYPE_DESCRIPTIONS` import (line 132), keeping `STAR_TYPE_DESCRIPTIONS`. | **Additive** — template-only. One caveat to handle: `selectedPlanet` is declared `ref(null)` and `openPlanetDetail(planet: any)` (lines 192-195), so the card loop's `planet` is `any` there; `planetTypeLabel` must therefore accept a structurally-typed argument (`Pick<Planet, 'planetType' \| 'hasLife' \| 'lifeComplexity'>`) and the loop variable is the fully-typed `Planet` from `store.sectorData.planets`, so `vue-tsc` is satisfied without widening the existing `any`. Do **not** change the `any` — it is pre-existing and out of scope. |
| `frontend/src/views/DocumentationView.vue` | Change the `J` entry of the local `getPlanetDetailDescription` table (line 338) from `Lush worlds covered in dense forests and rich vegetation. Diameter: 6,000–9,000 km.` to `Warm, cloud-wrapped worlds under permanent overcast and near-continuous rainfall, with standing water across most of the surface. Diameter: 6,000–9,000 km.` Append one sentence to the Planetary Types intro paragraph (line 91): `The names and descriptions below classify the type; an individual planet's description also reflects whether life arose there and how far it got — see Life & Habitability.` | **Additive** — static content only, no logic, no new import. The other 21 catalogue entries, `PLANET_TYPE_STATS`, the images and the colour helpers are untouched. |
| `README.md` | Append one bullet as the last item of the `### Life & Habitability` section (i.e. after line 267): `- A planet's displayed label and description are resolved from its type together with its life outcome, so a Jungle-class world with no biosphere is presented as a rain world rather than a jungle. The stored planet type is unchanged.` | **Additive** — documentation. The planet-type list at lines 198-219 is deliberately **not** edited, because `PLANET_TYPE_DESCRIPTIONS` is unchanged (decision #4). |

### Deleted files

None.

### Explicitly not modified

Confirmed unchanged, and listed so the omissions are visibly deliberate:

- **All of `backend/`** — `src/lib/example_star_generator.ts`, `src/lib/life.ts`, `src/lib/naming.ts`, `src/lib/planet-name-pool.ts`, `src/lib/star-name-pool.ts`, `src/types/index.ts`, `src/services/stellar.service.ts`, `src/controllers/sector.controller.ts`, `src/routes/sector.routes.ts`, `src/index.ts`, every file under `backend/__tests__/`, and `backend/package.json`. This is what makes seed invariance structural (decision #1). `backend/__tests__/unit/lib/generation-stability.test.ts` in particular is not touched and must still pass unchanged.
- `frontend/src/components/ResultsDisplay.vue` — its `getPlanetTypeDescription` (line 463) feeds only the type-distribution chart (lines 275, 280), which is type-level and correct as is.
- `frontend/src/utils/lifeStage.ts` and `frontend/src/utils/lifeStage.test.ts` — reused as-is; `lifeStageLevel` keeps its exact signature and semantics.
- `frontend/src/utils/planetImages.ts` — images stay keyed on the internal type code (decision #2).
- `frontend/src/views/ApiReferenceView.vue` — the API contract does not change, so its field lists stay correct.
- `frontend/src/stores/sectorStore.ts`, `sectorStore.test.ts`, `sectorStore.size.test.ts` — no interface change, no payload change.
- `frontend/src/components/StarTable.vue`, `SectorControls.vue`, `SectorVisualization3D.vue`, `frontend/src/views/HomeView.vue`, `frontend/package.json`, `frontend/vite.config.ts`, `docs/exoplanet-habitability-model.md`, `Dockerfile`, `api/index.ts`.

---

## Framework / Language-Specific Sections

Detected stack: **Vue 3 (`<script setup>`, Composition API) + TypeScript + Vite + Pinia + Tailwind v4 frontend; Vitest for frontend unit tests.** The backend (Node/Express/TypeScript, Jest) is not involved. There are no routes, controllers, services, middleware, jobs, events or migrations in this feature — it lives entirely in the shared-types module, one utility module and three templates.

**Compiler constraints that shape the implementation** (`frontend/tsconfig.json`):

- `"noUnusedLocals": true` and `"noUnusedParameters": true` — so removing each helper and import that the switch-over orphans is **mandatory, not tidiness**: leaving `getPlanetTypeDescription` in `PlanetDetailModal.vue`, `getPlanetDescription` in `SystemDetailView.vue`, or an orphaned `PLANET_TYPE_LONG_DESCRIPTIONS` import behind fails `vue-tsc` and therefore fails `npm run build`.
- `"strict": true` but **no** `noUncheckedIndexedAccess` — a `Record<string, T>` index is typed `T`, not `T | undefined`. `?? fallback` and `?.` on such an access therefore compile cleanly (the existing `PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown planet type'` at `PlanetDetailModal.vue:67` is the precedent) while still doing the necessary work at runtime. The `Partial<Record<LifeState, string>>` inner type in `PLANET_TYPE_LIFE_LABELS` is what makes the override lookup genuinely `string | undefined` to the compiler.
- `"include": ["src/**/*.ts", …]` with `"types": [… "vitest" …]` — the new `planetDescription.test.ts` is type-checked by `vue-tsc` during the build, exactly as `lifeStage.test.ts` already is.

### Routes / Controllers / Services

**No changes.** `POST /api/sector/generate` keeps its request shape (`systemCount`, `sectorVolume`, `seed?`, `zone?`) and its response shape byte for byte. `frontend/src/composables/useSectorApi.ts` and `frontend/src/stores/sectorStore.ts` are untouched.

### Utility module — `frontend/src/utils/planetDescription.ts` *(new)*

Structurally a sibling of `frontend/src/utils/lifeStage.ts`: no framework imports, no reactivity, pure functions over plain data, directly unit-testable.

```ts
// Resolves the label and long description shown for ONE planet, from its type
// together with its realised life outcome. The internal planetType is never
// altered — only how the planet is presented. Type-level surfaces (the type
// filter, the type-distribution charts, the documentation catalogue) keep
// reading PLANET_TYPE_DESCRIPTIONS directly and are unaffected.

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

/**
 * 0 when no life arose, otherwise the same 1-6 display stage the life badge
 * shows. Reuses lifeStageLevel so the prose can never disagree with the badge.
 */
export function planetLifeState(planet: PlanetDescriptionInput): LifeState {
    if (!planet.hasLife) {
        return 0;
    }
    return lifeStageLevel(planet.lifeComplexity) as LifeState;
}

export function habitatGroup(planetType: string): HabitatGroup {
    return PLANET_HABITAT_GROUP[planetType] ?? DEFAULT_HABITAT_GROUP;
}

/**
 * Label for one planet. Falls through to the catalogue name unless this type
 * has an override for this life state (today: only 'J' below stage 4).
 */
export function planetTypeLabel(planet: PlanetDescriptionInput): string {
    const override = PLANET_TYPE_LIFE_LABELS[planet.planetType]?.[planetLifeState(planet)];
    return override ?? PLANET_TYPE_DESCRIPTIONS[planet.planetType] ?? UNKNOWN_PLANET_LABEL;
}

/** The life sentence for this planet's habitat group and life state. */
export function biosphereClause(planet: PlanetDescriptionInput): string {
    return BIOSPHERE_CLAUSES[habitatGroup(planet.planetType)][planetLifeState(planet)];
}

/** Physical core, then the biosphere clause, joined by a single space. */
export function planetLongDescription(planet: PlanetDescriptionInput): string {
    const core =
        PLANET_TYPE_LONG_DESCRIPTIONS[planet.planetType] ??
        PLANET_TYPE_DESCRIPTIONS[planet.planetType] ??
        UNKNOWN_PLANET_LABEL;
    return `${core} ${biosphereClause(planet)}`;
}
```

### Components / views

Three per-planet surfaces switch to the new functions. All three are `<script setup>` with typed props or store-derived data, matching the existing style.

**`PlanetDetailModal.vue`** — script:

```ts
import { LIFE_STAGE_LABELS } from '../types';
import { planetLongDescription, planetTypeLabel } from '../utils/planetDescription';
import { lifeStageLevel } from '../utils/lifeStage';
```

Template bindings (structure and classes unchanged):

```html
<img :src="getPlanetImage(planet.planetType, 'medium')" :alt="planetTypeLabel(planet)" … />
<h2 …>{{ planet.name || planetTypeLabel(planet) }}</h2>
<div v-if="planet.name" …>{{ planetTypeLabel(planet) }}</div>
…
<div class="text-gray-300 italic text-center">{{ planetLongDescription(planet) }}</div>
```

**`PlanetTable.vue`** — add `import { planetTypeLabel } from '../utils/planetDescription';`, keep the existing `getPlanetTypeDescription` helper for the two type-level uses, and change only the row cell and the row image alt:

```html
<img :src="getPlanetImage(planet.planetType, 'thumbs')" :alt="planetTypeLabel(planet)" … />
…
<td class="text-gray-400 text-sm">
    <div v-if="planet.name" class="font-bold text-gray-100">{{ planet.name }}</div>
    {{ planetTypeLabel(planet) }}
</td>
```

**`SystemDetailView.vue`** — add `import { planetTypeLabel } from '../utils/planetDescription';`, delete the local `getPlanetDescription`, and use `planetTypeLabel(planet)` for the card image alt, the `:title` and the rendered text.

---

## Validation Rules

The feature accepts **no user input**: there is no form, no query parameter, no request body and no route parameter. There is therefore nothing to validate at an input boundary.

What must hold instead are the table invariants, each enforced by a test (numbers refer to the Testing section):

| Rule | Enforcement |
|---|---|
| Every planet type code the generator can emit — `A G Q U S R E O I D C L F T N B J W H M X #` — has an entry in `PLANET_HABITAT_GROUP`. | test 15 |
| Every planet type code has an entry in `PLANET_TYPE_LONG_DESCRIPTIONS` and in `PLANET_TYPE_DESCRIPTIONS`. | test 16 |
| `BIOSPHERE_CLAUSES` has all 6 groups × all 7 states, and every value is a non-empty string. | test 17 |
| Every `BIOSPHERE_CLAUSES` value is unique — no two cells share a string, so no state silently duplicates another. | test 18 |
| No `PLANET_TYPE_LONG_DESCRIPTIONS` value contains life vocabulary (decision #15 regex). | test 19 |
| Every `PLANET_TYPE_LIFE_LABELS` key is a real planet type code, and every state key is in `0…6`. | test 20 |
| `planetLongDescription` output is always exactly `core + ' ' + clause` — no other separator, no trailing space. | tests 10, 11 |
| Any type code absent from the tables still returns the pre-existing fallback strings rather than `undefined`. | tests 12, 13, 14 |

---

## Authorization & Security

The application has **no authentication, no authorization and no user accounts**. `backend/src/index.ts` mounts a single unauthenticated route group (`/api/sector`) with CORS enabled; there is no session, cookie, token, policy, guard or middleware chain to extend, and `frontend/src/stores/sectorStore.ts` writes only non-sensitive generation parameters to `localStorage`.

Nothing in this feature changes that posture:

| Concern | Assessment |
|---|---|
| Who can read a planet's label/description | Everyone, exactly as today. All 64 strings are static, compiled into the client bundle, and identical for every visitor. |
| Who can create/update/delete | Nobody at runtime. There is no write path — the strings are source constants, changed only by a code change and a deploy. |
| New attack surface | None. No new endpoint, no new request parameter, no new dependency, no `eval`/`Function`, no template interpolation of user-controlled data. |
| Injection / XSS | Not applicable. All output goes through Vue's `{{ }}` mustache interpolation and `:alt` / `:title` attribute bindings, which escape by default. No `v-html` is introduced, and none of the 64 strings contains markup. |
| Rate limiting / CSRF | Unchanged and not applicable — the feature adds no request of any kind. |

---

## Testing

Frontend tests are Vitest, run with `npm test` (`vitest run`) from `/frontend`, and are executed in CI by the `test-frontend` job in `.github/workflows/test.yml`. Follow the style of `frontend/src/utils/lifeStage.test.ts`: `import { describe, it, expect } from 'vitest'`, direct imports from the module under test and from `../types`, no mocking, no component mounting (decision #14).

Build a tiny helper at the top of the file so each case reads as data, mirroring how `lifeStage.test.ts` keeps its cases terse:

```ts
const planet = (planetType: string, hasLife: boolean, lifeComplexity = 0) =>
    ({ planetType, hasLife, lifeComplexity });
```

### `frontend/src/utils/planetDescription.test.ts` *(new)*

**`planetLifeState`**

1. Returns `0` for `hasLife: false`, whatever `lifeComplexity` holds — including a high value such as `5.5` (a planet can score a high index and still have no life, because presence is a separate abiogenesis draw).
2. Returns `lifeStageLevel(lifeComplexity)` for `hasLife: true`: `0.2 → 1`, `1.4 → 1`, `1.5 → 2`, `3.2 → 3`, `4.7 → 5`, `12 → 6`.
3. Never returns a value outside `0…6` across a sweep of `lifeComplexity` from `-1` to `8` in steps of `0.25`, for both values of `hasLife`.

**`habitatGroup`**

4. Maps each of the 22 codes to the group named in `PLANET_HABITAT_GROUP` (assert the whole mapping in one table-driven case).
5. Returns `DEFAULT_HABITAT_GROUP` (`'rocky'`) for an unknown code such as `'Z'` and for `''`.

**`planetTypeLabel`**

6. `J` with no life returns `'Rain World'`; `J` at complexity `1.1`, `2.4` and `3.4` with life also returns `'Rain World'`.
7. `J` at complexity `3.6` (stage 4), `5.2` (stage 5) and `6.0` (stage 6) with life returns `'Jungle Planet'`.
8. Every non-`J` code returns its `PLANET_TYPE_DESCRIPTIONS` value unchanged at every one of the seven states — i.e. the override table changes nothing outside `J` (table-driven over 21 codes × 7 states).
9. An unknown code returns `'Unknown planet type'` at every state.

**`planetLongDescription` / `biosphereClause`**

10. For a representative planet of each group, the output equals exactly `PLANET_TYPE_LONG_DESCRIPTIONS[type] + ' ' + BIOSPHERE_CLAUSES[group][state]` — no double space, no trailing space.
11. The output never contains `'  '` (a double space) and never ends with a space, across all 22 codes × 7 states.
12. `J` with no life ends with the `temperate` state-0 clause and contains the words `permanent overcast` — the draft's first worked example.
13. `J` with life at complexity `1.1` ends with the `temperate` state-1 clause and contains `bacteria and archaea` — the draft's second worked example.
14. An unknown code (`'Z'`) falls back to `'Unknown planet type'` as its core and still receives the `rocky` clause for its state, so the result is never `undefined` and never contains the string `undefined`.

**Table invariants (drift guards)**

15. Every code in the generator's type list `A G Q U S R E O I D C L F T N B J W H M X #` has a `PLANET_HABITAT_GROUP` entry, and `PLANET_HABITAT_GROUP` has no key outside that list.
16. The key sets of `PLANET_TYPE_DESCRIPTIONS` and `PLANET_TYPE_LONG_DESCRIPTIONS` are identical, and equal to that same list.
17. `BIOSPHERE_CLAUSES` has exactly the six group keys, each with exactly the seven state keys `0…6`, and every value is a non-empty trimmed string ending in `.`.
18. The 42 clause strings are all distinct.
19. No `PLANET_TYPE_LONG_DESCRIPTIONS` value matches `/\blife\b|\bliving\b|\bbiosphere\b|organism|vegetation|forest|jungle|microb|extremophile|bacteri|\balgae\b|\bfungi\b|inhabited/i` — the decision #15 guard that keeps physical cores free of biology.
20. Every key of `PLANET_TYPE_LIFE_LABELS` is a valid planet type code, and every nested key parses to an integer in `0…6`.

### Regression checks (existing suites, unchanged)

21. `cd backend && npm test` passes with **no backend file modified**, including `backend/__tests__/unit/lib/generation-stability.test.ts` — the direct evidence that seed invariance is untouched.
22. `cd frontend && npm test` passes, including the pre-existing `frontend/src/utils/lifeStage.test.ts`, `sectorStore.test.ts` and `sectorStore.size.test.ts` with **no fixture edits** (no interface changed, so none is needed).
23. `cd frontend && npm run build` passes `vue-tsc` — the only check covering the three edited templates (decision #14).

### Manual verification (not automatable here)

24. Generate a sector, open the planets table, filter to a Jungle planet without life: the description cell reads "Rain World"; open its modal and the paragraph ends "…completely sterile."
25. Filter to `With life`, open an inhabited planet at stage 1: the modal paragraph's final sentence describes microbial life and agrees with the "Microbial life" badge directly beneath it.
26. Open the Documentation page: the Planetary Types catalogue still lists all 22 types with `J` shown as "Jungle Planet" and the corrected life-neutral detail text, and the intro carries the new sentence.

---

## Suggested Story Breakdown

Three vertical slices, in implementation order. Each is independently verifiable and leaves the app working.

**1. Description data model and resolution module** *(no dependencies)*
Add `LifeState`, `HabitatGroup`, `PLANET_HABITAT_GROUP`, `DEFAULT_HABITAT_GROUP`, `BIOSPHERE_CLAUSES` and `PLANET_TYPE_LIFE_LABELS` to `frontend/src/types/index.ts`; rewrite the 22 `PLANET_TYPE_LONG_DESCRIPTIONS` values into physical cores; add `frontend/src/utils/planetDescription.ts` and `frontend/src/utils/planetDescription.test.ts` (tests 1–20).
*Verifiable:* `cd frontend && npm test` green and `npm run build` passes `vue-tsc`. The new module is not yet referenced by any component, so the UI is unchanged except that `PlanetDetailModal.vue` now shows the life-neutral core (no clause yet) — acceptable and strictly less wrong than today.

**2. Wire the three per-planet surfaces** *(depends on 1)*
Point `PlanetDetailModal.vue` (title, subtitle, alt, long description), `PlanetTable.vue` (row description cell, row image alt) and `SystemDetailView.vue` (card text, `:title`, image alt) at `planetTypeLabel` / `planetLongDescription`; remove the helpers and imports each file no longer uses, keeping `PlanetTable.vue`'s type-level `getPlanetTypeDescription`.
*Verifiable:* `npm run build` passes; manual checks 24 and 25; the type filter, the Goldilocks filter, the life filter, the search box, pagination and both distribution charts behave exactly as before.

**3. Documentation alignment** *(depends on 1; independent of 2)*
Correct the `J` entry in `DocumentationView.vue`'s local catalogue and add the one-sentence note to the Planetary Types intro; add the bullet to `README.md`'s Life & Habitability section.
*Verifiable:* `npm run build` passes; manual check 26; `README.md`'s planet-type list is confirmed unchanged.

---

## Success Criteria

- [ ] No file under `backend/` is modified, and `cd backend && npm test` passes unchanged — including `generation-stability.test.ts`.
- [ ] `POST /api/sector/generate` returns exactly the same JSON shape as before; no field is added, removed or renamed in `backend/src/types/index.ts` or `frontend/src/types/index.ts`.
- [ ] For a fixed seed, a generated sector's `planetType`, `hasLife` and `lifeComplexity` values are identical to those produced before this change.
- [ ] `frontend/src/types/index.ts` exports `LifeState`, `HabitatGroup`, `PLANET_HABITAT_GROUP`, `DEFAULT_HABITAT_GROUP`, `BIOSPHERE_CLAUSES` and `PLANET_TYPE_LIFE_LABELS`, and `PLANET_TYPE_DESCRIPTIONS`, `STAR_TYPE_DESCRIPTIONS` and `LIFE_STAGE_LABELS` are byte-identical to their pre-change values.
- [ ] All 22 `PLANET_TYPE_LONG_DESCRIPTIONS` values match the Data Model table exactly, and none matches the decision #15 life-vocabulary regex.
- [ ] `BIOSPHERE_CLAUSES` contains 42 distinct non-empty sentences: all six groups × all seven states.
- [ ] `PLANET_HABITAT_GROUP` covers all 22 type codes and contains no extra key.
- [ ] `planetLongDescription` returns `core + ' ' + clause` for all 22 codes × 7 states, with no double space, no trailing space and no `undefined` anywhere in the output.
- [ ] A Jungle planet with `hasLife: false` is labelled `Rain World`; one at stage 1–3 is labelled `Rain World`; one at stage 4–6 is labelled `Jungle Planet`.
- [ ] Every non-`J` planet's label is unchanged from before this feature at every life state.
- [ ] No description shown for a planet with `hasLife: false` asserts the presence of life, and no description shown for a planet with `hasLife: true` asserts its absence — verified for `J`, `T`, `H`, `D`, `N`, `E` and `O`.
- [ ] `PlanetDetailModal.vue`, `PlanetTable.vue` and `SystemDetailView.vue` render per-planet labels via `planetTypeLabel`; the type filter dropdown, the `PlanetTable` type-distribution list and the `ResultsDisplay` type-distribution chart still read `PLANET_TYPE_DESCRIPTIONS` directly.
- [ ] `PlanetTable.vue`'s search predicate is unchanged (matches `planetType`, `starId`, `orbitalNumber`, `name` only), and the type, Goldilocks and life filters plus pagination behave exactly as before.
- [ ] `frontend/src/utils/planetImages.ts` is unchanged and every planet still renders the image for its internal type code.
- [ ] `DocumentationView.vue`'s catalogue lists all 22 types, its `J` detail text no longer claims forests or vegetation, and its Planetary Types intro carries the new sentence; the other 21 entries are unchanged.
- [ ] `README.md`'s Life & Habitability section carries the new bullet, and its planet-type list (lines 198-219) is unchanged.
- [ ] `cd frontend && npm test` and `cd frontend && npm run build` both pass; `frontend/src/stores/sectorStore.test.ts`, `sectorStore.size.test.ts` and `frontend/src/utils/lifeStage.test.ts` required no edits.
- [ ] `frontend/package.json` is unchanged — no new dependency.

---

## Future Considerations

Natural extensions deliberately **not** part of this spec:

- **Search by rendered label** — matching the label in `PlanetTable.vue`'s search predicate, gated behind a minimum query length so short queries do not match nearly everything (decision #11).
- **Per-type biosphere clauses** — override a group clause for a specific type (e.g. distinct microbial prose for Ocean versus Earth-like) by adding a sparse per-type layer above `BIOSPHERE_CLAUSES`, using the same fall-through the label table already demonstrates.
- **Backend-supplied descriptions** — move the resolution behind the API if a second client, an export format, or the JSON download ever needs the prose. Note this would change the response payload and its measured size.
- **More label overrides** — if new planet types are added whose names assert a biological state, they need only a `PLANET_TYPE_LIFE_LABELS` row.
- **Stage-6 civilisation flavour** — a short generated descriptor (technological era, settlement pattern) for intelligent worlds, replacing the single fixed clause per group.
- **Life-aware planet imagery** — a second image variant per type for inhabited versus sterile worlds, which would extend `frontend/src/utils/planetImages.ts` rather than this layer.
- **Localisation** — the 64 strings are the natural seam if the UI is ever translated.
