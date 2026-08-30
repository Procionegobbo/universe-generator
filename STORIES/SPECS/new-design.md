# Spec: Mission-Console Frontend Redesign

> Supersedes the draft (`STORIES/SPECS/new-design.draft.md`). Source of truth for the visual
> design is `STORIES/SPECS/design_handoff_universe_generator_ui/` — its `README.md`
> (tokens, per-screen structure, copy), the eight PNGs in `screenshots/`, and the
> `Universe Generator UI.dc.html` canvas. This spec resolves everything the handoff
> left open against the actual codebase.

---

## 1. Feature Name & Description

**Feature:** Universe Generator — mission-console frontend redesign.

**One-sentence summary.** Rebuild the Vue 3 frontend as a dense, instrument-panel dashboard
— fixed parameter rail, permanent KPI strip, scannable tables carrying the project's own
star and planet renders — so the numbers a user actually cares about (systems, stars,
planets, moons, habitable worlds, worlds with life) are readable at a glance instead of
being buried behind tabs.

### Current state

The app works and is feature-complete on the data side. What is wrong is presentation:

- `App.vue` renders a generic gradient shell with a `max-width: 1200px` centred container,
  a 6-item header and a 3-link footer.
- `HomeView.vue` is a 1/3 + 2/3 grid: `SectorControls.vue` on the left, `ResultsDisplay.vue`
  on the right, and an empty state that is a wall of marketing prose.
- `ResultsDisplay.vue` (522 lines) hosts four tabs (Statistics / Systems / Stars / Planets)
  plus a 3D view. Every element carries the same visual weight; the headline counts live
  inside the Statistics tab, so they are invisible from any other tab.
- `SystemDetailView.vue` renders one card per star with a flat 3-column grid of planet
  cards; nothing shows where a planet sits relative to the habitable zone.
- `PlanetDetailModal.vue` is a centred modal that covers the table behind it.
- Global styling is a mix of `frontend/src/style.css` utility classes (`.card`, `.btn`,
  `.form-input`) and ad-hoc Tailwind, with the system font stack.

### Scope

**In scope** — every screen in the handoff:

| Badge | Screen | Repo target |
| --- | --- | --- |
| 1a | Home / mission console (rail + KPI strip + Overview tab) | `HomeView.vue`, `SectorControls.vue`, `ResultsDisplay.vue` |
| 2a | Sector statistics tab | new `SectorStatistics.vue` |
| 3a | Systems index tab | new `SystemsTable.vue` |
| — | Stars tab | `StarTable.vue` (rewritten; **no design screen exists** — see D-23) |
| 4a | Planets table tab | `PlanetTable.vue` (rewritten) |
| 1d | System detail with orbital map | `SystemDetailView.vue` |
| 4b | Planet detail side panel | new `PlanetDetailPanel.vue`, replaces `PlanetDetailModal.vue` |
| 4c | Empty and generating states | new `EmptyState.vue`, `GeneratingState.vue` |
| 4d | Mobile (<768px) and the intermediate breakpoints | all of the above |

Also in scope: the design-token layer (Tailwind v4 `@theme`), IBM Plex web fonts, the
star/planet artwork mapping and its fallbacks, the live stellar-density gauge, and the
client-side statistics aggregates the new screens need.

**Out of scope** (state explicitly, do not implement):

- The 3D sector view (`SectorVisualization3D.vue`). The handoff excludes it. The file and
  the `three` dependency stay in the repo, unreferenced — see D-24.
- `DocumentationView.vue` and `ApiReferenceView.vue`. Left alone; they keep using the
  legacy global classes, which this spec preserves — see D-25.
- Any change to the generation algorithm, the seed contract, or `POST /api/sector/generate`.
- Turns `1b` (Field Report) and `1c` (Star Atlas) in the design canvas — explicitly
  rejected alternatives.

---

## 2. Assumptions & Decisions

Every open point, resolved. Each is independently reviewable — override any one without
disturbing the rest.

### Data availability

**D-1 · No backend or shared-type change is required. The API contract is untouched.**
`POST /api/sector/generate` keeps its exact request and response shape; `backend/src/types/index.ts`
and `frontend/src/types/index.ts` are not modified. Every number the design shows is either
already in the payload or derivable client-side from it plus a mirrored constant table
(D-2). Rationale: the payload already carries `age`, `hasProperName`, `semiMajorAxis`,
`temperature`, `habitableZone`, `mass`, `gravity`, `moonCount`, `lifeProbability`,
`lifeComplexity`, `hasLife`; the missing pieces are per-*class* constants, not per-star
data, so shipping them per-star would inflate the JSON for up to ~8 500 stars with values
that never vary.

**D-2 · Star luminosity, radius, mass and effective temperature come from a new frontend
constant table, `frontend/src/utils/starPhysical.ts` (new), mirroring the backend.**
The design needs `0.61 M☉ · 4 402 K · 7 planets` per star, `TOTAL MASS 1.34 M☉` per system,
and the habitable-zone bounds `HZ INNER 0.82 AU / HZ OUTER 1.41 AU`. Luminosity and radius
exist in `backend/src/lib/example_star_generator.ts` (`starTypes`); mass and effective
temperature exist nowhere. Precedent: `types/index.ts` is already duplicated verbatim
between backend and frontend and CLAUDE.md mandates keeping the two in sync, so a mirrored
constant table is the established pattern here. **Drift risk is mitigated by two pinned
tests** (see §10, T-B1/T-F1): a backend test asserting the `starTypes` luminosity/radius
values and a frontend test asserting the mirror, both naming the other file, so an
unsynchronised edit fails CI.

**D-3 · Effective temperature is per spectral *class*, not interpolated by subclass.**
The design's `4 402 K` for a K-4 star does not fall out of any published K-class ladder —
it is illustrative sample data. Interpolating across subclasses would be invented physics.
A K star reads `4 500 K` for every subclass. Same for all classes.

**D-4 · `TOTAL MASS` is the sum of the nominal class masses of the system's stars,
rendered to 2 decimals with the `M☉` unit.** Consistent with D-2/D-3.

**D-5 · Habitable-zone bounds are computed client-side with the backend's exact formula.**
`a_inner = sqrt(L / 1.78)`, `a_outer = sqrt(L / 0.32)`, `L` from D-2. This is a literal
transcription of `example_star_generator.ts` (the optimistic "recent Venus / early Mars"
band), so the drawn HZ boundaries always agree with the `habitableZone` flags in the
payload. Stars with `L = 0` (`NS`, `BH`) have no HZ and, per the generator, no planets.

**D-6 · Orbit bands (`INNER 301 / MEDIUM 288 / OUTER 223` on 2a) are derived, not
transmitted.** Band = `a < a_inner ? inner : a > a_outer ? outer : medium`, i.e. the
backend's `determineHabitableZone` reproduced on the client using D-5's bounds.

**D-7 · The 4b "Physical profile" drops `Water cover` and the 4b life pills drop
`O₂ 21%`, `liquid water`, `magnetosphere`.** None of these exist in the model and none is
derivable. Fabricating them would put invented facts in front of the user. Replacements,
all real:

| Design row | Ships as | Source |
| --- | --- | --- |
| Mass `1.18 M⊕` | Mass, `M⊕` | `planet.mass / 5.972e24` |
| Gravity `1.07 g` | Gravity, `g` | `planet.gravity / 9.807` |
| Density `5.4 g/cm³` | Density, `g/cm³` | `mass / ((4/3)π r³) / 1000` |
| Water cover `66 %` | **Life probability**, `%`, green bar | `planet.lifeProbability * 100` |
| `O₂ 21%` pill | `P 0.42` | `lifeProbability`, 2 dp |
| `liquid water` pill | `C 3.2 / 6` | `lifeComplexity`, 1 dp |
| `magnetosphere` pill | `GOLDILOCKS` / `HOT` / `TEMPERATE` / `COLD` | thermal zone |
| `1.1 Gyr` pill | `<system.age> Gyr` | `system.age` |

For a planet with `hasLife === false` the life block is omitted entirely (as today) and the
Life-probability bar still renders (it is a real number for any eligible planet).

**D-8 · The 4b life description reuses `planetLongDescription()`.**
`frontend/src/utils/planetDescription.ts` already composes a physical core plus a
life-state-aware biosphere clause, and `PlanetDetailModal.vue` already renders it. The
design's two-line placeholder copy is replaced by this real, life-aware prose. The stage
label above it is `LIFE_STAGE_LABELS[lifeStageLevel(planet.lifeComplexity)]`, uppercased.

**D-9 · Life-by-development-stage shows all six repo stages, not the design's four.**
The design lists Microbial / Simple multicellular / Complex / Intelligent; the repo's
canonical ladder is `LIFE_STAGE_LABELS` 1–6 (Microbial life, Oxygenic photosynthesis,
Eukaryotic life, Multicellular life, Complex animals, Intelligent life). Renaming the
repo's scientifically-grounded ladder to match illustrative sample copy would contradict
`docs/exoplanet-habitability-model.md` and the badges shown elsewhere. Six bars, teal ramp
extended across six steps: `#064e3b → #065f46 → #0f766e → #0d9488 → #10b981 → #34d399`.

**D-10 · Planet display name = `planet.name` when present, otherwise
`` `${star.name} ${orbitLetter(orbitalNumber)}` ``,** where `orbitLetter(n)` is
`String.fromCharCode(97 + n)` — orbit 1 → `b`, orbit 3 → `d`, matching the design's
`Kepler-442 b … h`. The payload only carries `planet.name` when `hasLife` is true. Guard:
for `n > 25`, fall back to `#${n}`. (Planet counts are capped by `3d6` = 18, so the guard
never fires in practice.)

**D-11 · Star and system names render verbatim from the payload.** The generator produces
`UG-0006` designations and `Kepler-442-A` component names (hyphen). The design's `SEC-0117`
and `Kepler-442 A` (space) are cosmetic sample data. Do **not** reformat — renaming would
break the search-by-name affordance and contradict `backend/src/lib/naming.ts`.

**D-12 · The `ID` column on 3a is the zero-padded `systemId`, minimum 3 digits**
(`001`, `140`, `1204`), matching the design's `001` while never truncating.

### Parameters, generation and persistence

**D-13 · The store's existing public surface is preserved exactly.**
The handoff proposes a nested state shape (`params.*`, `derived.*`, `ui.*`). Adopting it
would rename `systemCount`, `sectorVolume`, `zone`, `currentSeed`, `sectorData` and break
`frontend/src/stores/sectorStore.test.ts` (which asserts all of them, the storage key
`universe-generator-sector-params`, and the defaults 100 / 1000 / `medium`). The handoff's
table is a logical model, not a required rename. **All existing refs, actions and the
storage payload keep their names and semantics; new UI state is added alongside.** See §7.3.

**D-14 · localStorage keeps storing parameters only, written only after a successful
generate.** Unchanged from today. `RESTORE LAST SECTOR` therefore means *re-generate from
the saved seed + systemCount + volume + zone*, which — because generation is deterministic
— reproduces the previous sector exactly. This is what the current restore modal already
does; the handoff's phrase "when localStorage holds a previous sector" is satisfied by
"holds previous parameters".

**D-15 · The auto-restore modal is replaced by the `RESTORE LAST SECTOR` button in the
empty state. This is a deliberate behaviour change endorsed by the handoff.**
Today `SectorControls.vue` pops a blocking modal on mount whenever saved params exist. The
design puts the same affordance in the empty state as an explicit, non-blocking button
(handoff §Persistence: "expose it explicitly through `RESTORE LAST SECTOR` in the empty
state and `CLEAR MEMORY` in the rail"). The modal's "No, start fresh" branch — which called
`clearPersistentMemory()` — is covered by `CLEAR MEMORY` in the rail. The button renders
only when `loadSavedParams()` returns a complete parameter set.

**D-16 · The `[sectorVolume, zone] → systemCount` auto-suggest watcher is removed.
This is a deliberate behaviour change.** Today, moving the volume slider or changing the
zone silently overwrites the systems count with `volume × zoneDensity`. With two
independent sliders side by side in the rail, that reads as a bug. The density gauge
(handoff: "the key new affordance") delivers the same guidance non-destructively — it tells
the user whether the pair is physically plausible without moving anything. Named callers:
only `SectorControls.vue`, which is being replaced.

**D-17 · The density formula and its five verdict buckets are preserved from
`SectorControls.vue`.** The handoff writes `density = systems / volume`, but its own sample
values disagree with that: 140 systems / 1 000 pc³ = 0.14, while the panel reads `0.239`.
`0.239 = (140 / 1000) × 1.71` — the existing
`currentStarDensity = (systemCount / sectorVolume) × AVG_STARS_PER_SYSTEM` with
`AVG_STARS_PER_SYSTEM = 1.71`. The handoff's prose is loose; its numbers match the code.
Keep the code. `DENSITY_MAP` (extragalactic 0.001, galactic edge 0.01, medium 0.14,
central zone 1.0, core 10.0) and the existing thresholds on `ratio = current / expected`
are kept verbatim; only the presentation changes:

| ratio | Label (existing) | Design colour family |
| --- | --- | --- |
| `< 0.05` | `VERY SPARSE` | slate |
| `< 0.5` | `SPARSE` | slate |
| `<= 2.0` | `REALISTIC` | green |
| `<= 10` | `DENSE` | amber |
| else | `VERY DENSE` | red |

**D-18 · Both sliders are logarithmic, with the numeric value also directly editable.**
Handoff: "Both sliders are logarithmic". Ranges: systems `1 … 5 000`, volume `10 … 100 000 pc³`
(the rail's bound captions). Mapping lives in `frontend/src/utils/logScale.ts` (new):
`value(t) = round(exp(ln(min) + t·(ln(max) − ln(min))))`, `t ∈ [0,1]` from an
`<input type="range" min="0" max="1000" step="1">`; volume additionally snaps to the
nearest 10 (matching today's `step="10"`). The KPI-style value at the right of each label
row is a click-to-edit number input so exact values remain reachable — the current UI has
number inputs and removing them outright would be a capability regression. The store's and
backend's wider bounds (volume up to 10 000 000) are unchanged; the slider simply does not
reach them.

**D-19 · Generation progress is animated, not measured.** The API returns a single
response with no progress channel, and adding one is out of scope (D-1). Per the handoff
("if it reports none, animate the stages on a timer and show the elapsed counter"):
five stages — `system coordinates`, `stellar classes`, `planetary bodies`, `moons`,
`habitability & life` — advance on a 250 ms timer, the bar is capped at 95 % until the
response lands, then snaps to 100 %. **No fabricated counts:** the `system coordinates` row
shows the requested `systemCount` (a known value); rows 2–5 show `pending` before they
start and nothing while running. The elapsed counter ticks every 100 ms from the request.
Stage counts are never back-filled, because the panel is replaced by the results the moment
the response arrives.

**D-20 · `CANCEL` aborts via `AbortController`.** `store.generateSector(request, signal?)`
gains an **optional** second parameter — additive, so every existing call site
(`sectorStore.test.ts`, `HomeView.vue`) keeps compiling and behaving identically. On abort
the store restores the sector snapshot captured before the request, or falls back to the
empty state.

### Presentation rules the design leaves implicit

**D-21 · Short display labels.** The design writes `M · Red dwarf`, `Ice world`, `Gas giant`
— sentence case, shorter than `STAR_TYPE_DESCRIPTIONS` (`Red Dwarf`, `Yellow Dwarf (like
our Sun)`) and `PLANET_TYPE_DESCRIPTIONS` (`Ice Planet`, `Gas Giant`). Two new maps,
`STAR_SHORT_LABEL` in `frontend/src/utils/starDisplay.ts` (new) and `PLANET_SHORT_LABEL` in
`frontend/src/utils/planetDisplay.ts` (new), hold the design's copy for the dense surfaces
(distribution rows, type cards, table cells). The existing full-length maps in
`types/index.ts` are **not modified** — they still drive `DocumentationView.vue`, tooltips
and `planetTypeLabel()`. Exact strings verified against the canvas: `Red dwarf`,
`Orange dwarf`, `Yellow dwarf`, `Yellow-white`, `White dwarf`, `White`, `Black hole`,
`Neutron star`; `Rocky`, `Gas giant`, `Ice world`, `Desert`, `Ice giant`, `Asteroid`,
`Ocean`, `Earth-like`. Any class or type with no entry falls through to the existing
long map.

**D-22 · Thermal-zone classification is unchanged and moves to one shared module.**
`getThermalZone` is currently duplicated, character for character, in `PlanetTable.vue` and
`SystemDetailView.vue` (`habitableZone → Goldilocks`; `≥ 285 K → Hot`; `≥ 237 K →
Temperate`; else `Cold`). Both files are being replaced, so the logic moves once to
`frontend/src/utils/thermalZone.ts` (new) with its explanatory comment intact. No threshold
changes.

**D-23 · The STARS tab has no design screen; it is built by analogy to 3a.**
The handoff documents Overview, Statistics, Systems, Planets, System detail, Planet panel,
states and mobile — but the tab bar in every screenshot includes `STARS · 239`, and
`StarTable.vue` exists today. It ships with 3a's exact shell: the same filter bar grammar
(search field + segmented preset + sort pill + right-hand mini-counters), the same row
rhythm, the same footer pager. Columns:
`ID 40px · STAR 190px · CLASS 112px · SYSTEM 1fr · PLANETS 52px · HZ 46px · MOONS 52px`,
plus a 20px class thumbnail in `CLASS`. Presets: `ALL`, `WITH PLANETS`, `HZ > 0`,
`EXOTIC` (`BH`/`NS`). Counters: `n SHOWN`, `n CLASSES` (violet), `n EXOTIC` (red).

**D-24 · `SectorVisualization3D.vue` is left in place, unreferenced.** The handoff excludes
the 3D view, so the `3D View` button disappears with `ResultsDisplay.vue`'s old body. Per
the project's "mention dead code, don't delete it" convention the file, the `three`
dependency and the `vendor-three` entry in `vite.config.ts`'s `manualChunks` all stay. The
`manualChunks` branch becomes inert (no `three` in the graph → no chunk emitted), which is
harmless. Flagged for the user: this is the one piece of the change that leaves an orphan.

**D-25 · `frontend/src/style.css`'s legacy global classes are preserved verbatim.**
`DocumentationView.vue` uses `.card` ×6, `.btn`, `.btn-secondary`; `ApiReferenceView.vue`
uses `.card` ×3, `.btn`, `.btn-secondary`. Deleting or restyling those rules would silently
break two shipped pages. New tokens and component classes are **added** to the file; the
existing `:root` variables, `.container`, `.card`, `.btn*`, `.form-*`, `.table*`, `.loading`
and the `@media (max-width: 768px)` block are left exactly as they are. (Pre-existing,
unrelated: `.btn-danger` is used by `SectorControls.vue` but never defined in `style.css`;
it disappears with that component — no fix needed, noted only.)

**D-26 · `frontend/tailwind.config.js` is left untouched and remains inert.**
Tailwind v4 via `@tailwindcss/postcss` does not auto-load a JS config; theme extension goes
in `@theme` inside `style.css`. Deleting the file is an unrelated cleanup — mentioned, not
done.

**D-27 · KPI progress rails use a log-of-value scale against the strip maximum.**
The handoff says "a 3px progress rail showing the value's share of its own max" without
defining "its own max"; the screenshot's bar widths fit no linear ratio. Rule adopted:
`width = ln(1 + value) / ln(1 + max(all values in the strip))`. Against the sample data
(140 / 239 / 812 / 1 204 / 27) this yields 70 / 77 / 94 / 100 / 47 %, closely matching the
screenshot, and it keeps small counts visible. Each rail takes its cell's accent colour.

**D-28 · `NOTABLE SYSTEMS` picks the top 4 by a deterministic ranking:**
planets-with-life count desc → habitable-zone planet count desc → planet count desc →
`systemId` asc. Deterministic, seed-stable, and reproduces the design's mix (life-bearing
systems first, then large/interesting ones).

**D-29 · Distribution panels show every present class/type; only mobile truncates.**
The sample sector happens to have exactly 8 spectral classes and 8 planet types, so the
design's 8 rows / 8 cards are not a cap. Spectral rows: all present classes, count desc.
Planet type cards: 1a shows the top 8 in `grid-cols-4` with a trailing `+N` chip when more
are present; 2a shows all present types in a wrapping `grid-cols-8` under the heading
`PLANET TYPE DISTRIBUTION · N OF 22 TYPES PRESENT`. Mobile shows the top 5 spectral rows
plus a `Show all N classes` disclosure (handoff §4d).

**D-30 · The tab bar has five tabs on every screen.**
`1a` shows `OVERVIEW · SYSTEMS · STARS · PLANETS`; `2a`/`3a` show
`STATISTICS · SYSTEMS · STARS · PLANETS`. The handoff's state table settles it:
`ui.activeTab: overview | statistics | systems | stars | planets`. Ships as
`OVERVIEW · STATISTICS · SYSTEMS · n · STARS · n · PLANETS · n`.

**D-31 · The parameter rail is shown only on the Overview tab**, matching 1a (rail present)
vs 2a/3a/4a (full width, sub-header reads `SECTOR <seed> · <ZONE> ZONE · <volume> pc³`).
On the other tabs the rail is reachable on desktop by returning to Overview, and on mobile
through the sticky `PARAMETERS ▲` sheet, which is available on every tab.

**D-32 · The planet side panel is deep-linked by the composite key `starId-orbitalNumber`,
scoped to its sector by `?seed=`.**
Planets carry no id, but `(starId, orbitalNumber)` is unique by construction — *within one
sector*. Query params `?seed=<seed>&planet=<starId>-<orbitalNumber>` on whatever route is
current, per the handoff's "deep-link the panel via a query param". Invalid or unresolvable
values are ignored and both params are stripped.

The seed is what makes the key name one planet rather than one coordinate. Without it a
link shared between two sectors does not fail — it resolves, against a different planet,
and opens the panel on the wrong world with nothing to signal the substitution. So a key is
honoured only when the URL's seed matches the seed of the sector actually loaded, and one
naming no seed is refused rather than guessed at: showing nothing is right where showing
the wrong planet is not. The seed is checked *before* the key is resolved, because the
failing case is precisely the one where the key does resolve.

This means the store must know which seed produced the loaded sector. `currentSeed` does
not answer that — it is the input field, which the user can retype without regenerating —
so `sectorStore` carries `loadedSeed`, set when a sector lands, restored with the snapshot
when a generation is aborted (D-20), and cleared with the sector.

**Recorded after the fact:** the original decision specified the key alone. The defect it
allowed was found by opening the running app, after story 009 had closed; the seed scoping
landed as a follow-up fix rather than as part of that story.

**D-33 · Fonts load from Google Fonts with a full local fallback stack.**
Exact URL taken from the canvas:
`https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`.
Fallbacks: sans → `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
mono → `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Not self-hosted: no font
pipeline exists in the build and the app is already dependent on external hosting (Vercel
Analytics). `display=swap` means an offline client renders the fallback stack, not blank
text. **Open risk:** the mono/sans metric difference makes the fallback rendering looser
than the design; acceptable, and the layout uses no fixed-width text boxes that would break.

**D-34 · Component tests are out of scope; testing stays at the pure-function and store
level.** `frontend/package.json` has `vitest` but no `jsdom` and no `@vue/test-utils`, and
there is no `vitest.config.ts` (Vitest reads `vite.config.ts`, environment `node`). All
four existing frontend tests target stores and utils. Adding a component-testing stack is a
separate infrastructure change; this spec instead pushes every non-trivial rule — scales,
aggregates, formatting, mappings, filters, sorts — into pure modules under
`frontend/src/utils/` and `frontend/src/composables/` and tests those directly. See §10.

**D-35 · No assets need to be copied.** The handoff bundle's `images/` is a strict subset of
`frontend/public/images/`, byte-identical where they overlap (verified by md5 on
`logo.png`, `planets/thumbs/earthlike.png`, `stars/thumbs/star-M.png`). The repo already
holds **22/22** planet renders in both `thumbs/` and `medium/`, and **21** star renders in
both, including `star-default.png`. See §7.6 for the full mapping and fallback rules.

**D-36 · The star and planet type sets are frozen.** The 24 spectral classes in
`STAR_TYPE_DESCRIPTIONS` (`O` `B` `A` `F` `G` `K` `M` `DB` `DA` `DF` `DG` `DK` `gF` `gG`
`gK` `gM` `NS` `cB` `cA` `cF` `cG` `cK` `cM` `BH`) and the 22 planet codes in
`PLANET_TYPE_DESCRIPTIONS` (21 types plus `#` for unknown) are the **complete and closed
sets** for this redesign. No story and no implementation may introduce a new spectral class
or planet type, drop an existing one from the model, or rename one out of the canonical
maps in `types/index.ts` — in either package. The redesign is a presentation-layer change;
it renders the taxonomy the generator already produces and does not extend it.

What this invariant does **not** forbid, since none of it changes the type sets:

- **New display labels.** `STAR_SHORT_LABEL` / `PLANET_SHORT_LABEL` (D-21) are an
  alternative *rendering* of existing classes, added in new files, with the canonical maps
  untouched and used as the fallback.
- **Artwork aliases.** `DB`/`DF`/`DG`/`DK` → `star-DA.png` and unknown → `star-default.png`
  / `unknown.png` (§7.6) map several existing classes onto one image; the classes remain
  distinct in the model and are still named exactly in the adjacent text.
- **Grouping and truncation in the UI.** The `EXOTIC` (`BH`/`NS`) preset, the top-8 type
  cards with a `+N` chip, and the mobile top-5 rows are display filters over the full set,
  never a reduced set.
- **Per-class constant tables.** `STAR_PHYSICAL` (§7.4) adds physical values *for the
  existing 24 classes*; it must contain a row for each and must not contain a row for
  anything else.

Enforced by success criterion 18 and by T-F49, which pins both key sets as literals so that
an addition and a removal both fail CI. T-F2/T-F3 back it up by iterating the canonical maps
rather than a hard-coded list, so a newly added type with no artwork also fails.

**D-37 · The existing star and planet artwork is correct and is used as-is.** The renders
under `frontend/public/images/` are the shipped, approved artwork. The redesign **consumes**
them and produces none: no story and no implementation may generate, redraw, re-export,
re-crop, rename, replace or delete a render, nor copy anything out of the handoff bundle
(which is a byte-identical subset of what is already there — D-35). `frontend/public/images/`
is unmodified by this work.

In particular, the two apparent "gaps" in §7.6 are settled, not open:

- **`DB` / `DF` / `DG` / `DK` have no dedicated render, and none is to be produced.**
  `getStarImage` already aliases all four to `star-DA.png`. They are the same physical
  object — a white dwarf — differing only in spectral lines, and the adjacent text always
  names the exact class. 20 class renders plus `star-default.png` is the intended set.
- **`star-default.png` and `unknown.png` are the intended fallbacks**, not placeholders
  awaiting real art.

Nothing here weakens the `@error` handler in `CelestialThumb.vue`: it guards against a
deploy slip, not against artwork believed to be missing. `stellar_prompts.md` documents how
the existing renders were produced and is reference material only — this redesign does not
run it.

---

## 3. Architecture / Design Overview

### How it fits

Nothing below the frontend moves. The Express API, the generator, the seed contract and the
shared types are untouched (D-1). Inside `frontend/`, the redesign is a presentation-layer
rewrite plus one additive store extension:

```
                     unchanged
  ┌───────────────────────────────────────────────┐
  │ backend/  routes → controller → service → lib │
  │           POST /api/sector/generate           │
  │           GET  /api/sector/health             │
  └───────────────────┬───────────────────────────┘
                      │  Sector { systems, stars, planets } + stats
                      ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ stores/sectorStore.ts   EXTENDED (additive)                   │
  │   existing: sectorData isLoading error currentSeed            │
  │             systemCount sectorVolume zone                     │
  │             generateSector clearPersistentMemory              │
  │             loadSavedParams checkHealth getSystemById         │
  │   added:    generationStatus/stage/progress/elapsedMs         │
  │             lastStats activeTab *Filters *Page selectedPlanet │
  └───────────────────┬───────────────────────────────────────────┘
                      ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ composables/useSectorStats.ts   NEW — every aggregate          │
  │   derived purely from (systems, stars, planets) + starPhysical │
  └───────────────────┬───────────────────────────────────────────┘
                      ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ App.vue  →  AppTopBar                                          │
  │ HomeView →  SectorControls | KpiStrip → SectorTabs → tab body   │
  │                                          ├ Overview  (1a)      │
  │                                          ├ SectorStatistics(2a)│
  │                                          ├ SystemsTable   (3a) │
  │                                          ├ StarTable      (—)  │
  │                                          └ PlanetTable    (4a) │
  │ SystemDetailView (1d) → OrbitalMap + stars rail + planet table │
  │ PlanetDetailPanel (4b) — overlays either view, query-param     │
  │ EmptyState / GeneratingState (4c) — replace the tab body       │
  └───────────────────────────────────────────────────────────────┘
```

### Key design decisions

**One aggregate source.** Every count, ratio, histogram and distribution the four data
screens need is computed once in `useSectorStats.ts` from the three arrays. Today the same
aggregates are recomputed independently in `ResultsDisplay.vue`, `StarTable.vue` and
`PlanetTable.vue`; the redesign needs strictly more of them (moons-per-planet histogram,
multiplicity, orbit bands, life-by-stage, expected-IMF shares), so a single memoised
composable keeps them consistent across the KPI strip, Overview and Statistics — the design
shows the same numbers in three places at once and they must never disagree.

**Physics constants mirrored, not transmitted.** See D-2/D-5. The frontend needs
luminosity to place the HZ, and mass/Teff to label stars. Mirroring 24 rows of constants
costs nothing at runtime and keeps the API response byte-identical.

**Pure modules over components.** Driven by D-34: scales (`logScale`, orbital-map
projection, relative sizing), formatting (thin space, true minus), classification (thermal
zone, orbit band), mapping (short labels, artwork paths) and aggregation all live in
testable `.ts` modules. Components stay thin.

**Token layer in CSS, not JS.** Tailwind v4's `@theme` in `style.css` (D-26), so the
design tokens are declared once and referenced as utilities (`bg-base`, `text-dim`,
`font-mono`) rather than repeated as arbitrary values.

### Data flow of one generation

```
GENERATE SECTOR
  └─ HomeView: snapshot current sectorData → store.generationStatus = 'running'
     ├─ GeneratingState mounts: stage timer (250 ms) + elapsed timer (100 ms)
     └─ store.generateSector(request, signal)
          ├─ writes params to localStorage (unchanged)
          ├─ axios.post('/api/sector/generate', request, { signal })
          ├─ success → sectorData = data; lastStats = stats; status='done'
          │             activeTab = 'overview'; progress = 1
          ├─ failure → error = msg; status='error'  → error card + RETRY
          └─ abort   → sectorData = snapshot; status = snapshot ? 'done' : 'idle'
```

---

## 4. Configuration

**No new environment variables, feature flags or config files.** `PORT` (backend) and the
Vite dev proxy in `frontend/vite.config.ts` are unchanged.

Two configuration-adjacent facts to record:

- **External font host.** `frontend/index.html` gains `<link>` tags to
  `fonts.googleapis.com` / `fonts.gstatic.com` (D-33), with `<link rel="preconnect">` for
  both. This is the app's only new external runtime dependency.
- **Build config unchanged.** `vite.config.ts`, `postcss.config.js`, `tsconfig.json`,
  `tailwind.config.js` (D-26) and both `package.json` files are untouched. No new npm
  dependency is introduced — the design uses literal glyph characters
  (`⌕ ⟳ ✕ ▾ ↓ → ← ▸ ✓ · ≡ ▲ ★ Ø ⊕ ☉`), no icon library.

---

## 5. Data Model

**No persistence layer exists and none is introduced.** The backend is stateless; the only
client-side persistence is `localStorage`.

### localStorage — unchanged

Key `universe-generator-sector-params` (constant `STORAGE_KEY` in `sectorStore.ts`).

| Field | Type | Notes |
| --- | --- | --- |
| `currentSeed` | `number \| string` | validated by `isNumber \|\| isString` on read |
| `systemCount` | `number` | default 100 |
| `sectorVolume` | `number` | default 1000 |
| `zone` | `SectorZone` | validated against the five-value list |

Written only inside `generateSector`, before the request. Shape, key and write timing are
unchanged (D-13, D-14) — `sectorStore.test.ts` asserts all of it.

### New client-side constant tables

`frontend/src/utils/starPhysical.ts` (new) — `STAR_PHYSICAL: Record<string, StarPhysical>`:

```ts
export interface StarPhysical {
    luminosity: number;   // L☉ — MUST match backend starTypes[].luminosity
    radius: number;       // R☉ — MUST match backend starTypes[].radius
    mass: number;         // M☉ — display only, no backend counterpart
    effectiveTemp: number; // K  — display only; 0 means "not applicable" (NS, BH)
}
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

L☉ and R☉ columns are a verbatim transcription of `starTypes` in
`backend/src/lib/example_star_generator.ts` and are pinned by T-B1/T-F1. Unknown class →
`{ luminosity: 0.04, radius: 0.3, mass: 0.3, effectiveTemp: 3200 }` — the **M-class row**,
matching the backend's `this.starTypes[spectralClass] || this.starTypes['M']` fallback at
`example_star_generator.ts:537`, so the habitable zone the frontend draws agrees with the
one the backend used to set `planet.habitableZone`. Unreachable in practice, since D-36
freezes the class set and all 24 classes have a row. Where
`effectiveTemp === 0` the UI prints `—` instead of a temperature.

Helper exports:

```ts
export function habitableZoneBounds(spectralClass: string): { inner: number; outer: number };
// L === 0 → { inner: 0, outer: 0 }; else sqrt(L/1.78), sqrt(L/0.32)
export function orbitBand(a: number, spectralClass: string): 'inner' | 'medium' | 'outer';
export function systemMass(stars: Star[]): number;  // Σ STAR_PHYSICAL[class].mass
```

`frontend/src/utils/expectedStarShares.ts` (new) — the expected spectral-class share per
galactic zone, used for the 1px white tick on 2a's distribution bars. Mirrors the three
threshold ladders in `generateStarType` / `generateStarType2` / `generateStarType3` as data
and folds the cascade:

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
```

Every ladder sums to exactly 100. `expectedShare(zone, spectralClass): number` returns a
fraction in `[0, 1]`, expanding `@2` / `@3a` / `@3b` by multiplication and summing duplicate
classes (`BH` appears in both the `core` primary ladder and `TERTIARY_B`).

### No enums or value objects added to `types/index.ts`

`SectorZone`, `LifeState`, `HabitatGroup`, `LIFE_STAGE_LABELS`, `PLANET_TYPE_DESCRIPTIONS`,
`STAR_TYPE_DESCRIPTIONS`, `PLANET_TYPE_LONG_DESCRIPTIONS`, `BIOSPHERE_CLAUSES`,
`PLANET_HABITAT_GROUP`, `PLANET_TYPE_LIFE_LABELS` are all reused as-is. `frontend/src/types/index.ts`
is **not modified**, keeping it in lockstep with `backend/src/types/index.ts` per CLAUDE.md.

New display-only union types live beside their modules:

```ts
// utils/thermalZone.ts
export type ThermalZone = 'Hot' | 'Temperate' | 'Goldilocks' | 'Cold';
// utils/starPhysical.ts
export type OrbitBand = 'inner' | 'medium' | 'outer';
// stores/sectorStore.ts
export type GenerationStatus = 'idle' | 'running' | 'done' | 'error';
export type GenerationStage = 'coordinates' | 'stars' | 'planets' | 'moons' | 'habitability';
export type SectorTab = 'overview' | 'statistics' | 'systems' | 'stars' | 'planets';
```

---

## 6. Impact on Existing Code

Every path below was verified to exist unless marked `(new)`.

### Modified — backward compatible

| File | Change | Compatibility |
| --- | --- | --- |
| `frontend/index.html` | Add IBM Plex `<link>`s + `preconnect`; set `<title>` to `Universe Generator`; replace the inline `body` background/font with the new base tokens; add `<meta name="color-scheme" content="dark">`. | Additive. The inline block duplicates `style.css`; the new values must match it, as they do today. |
| `frontend/src/style.css` | **Prepend** the `@theme` token block and **append** a component layer (`.ug-panel`, `.ug-btn-primary`, `.ug-badge-*`, `.ug-row`, `.ug-skeleton`, range-input styling). Change `body`'s font stack and background to the new tokens. | Every legacy rule (`.container`, `.card`, `.btn*`, `.form-*`, `.table*`, `.loading`, `:root` vars, the 768px media block) is left byte-identical — **required**, `DocumentationView.vue` and `ApiReferenceView.vue` depend on them (D-25). Only `body`'s two properties change, and both pages already render on a dark ground. |
| `frontend/src/stores/sectorStore.ts` | Add UI/generation state and actions (§7.3); add an optional `signal` parameter to `generateSector`. | Strictly additive. No existing ref, action, default or storage-key semantic changes (D-13). `generateSector(request)` with one argument behaves exactly as today, so `sectorStore.test.ts` passes unchanged. |
| `frontend/src/App.vue` | Replace the header/footer shell with `AppTopBar` + a full-bleed `<router-view>`. Keep `<Analytics />`, keep `exportData()` (moved into `AppTopBar` as an emitted action), move the 5 s health poll into `useBackendHealth`. | Behaviour preserved: export still downloads `stellar-sector-<ts>.json`; health still polls every 5 s; the logo still routes to `/`. The `.container`/`py-8` wrapper is dropped — see the regression note below. |

### Replaced — same path, new contents

| File | Was | Becomes |
| --- | --- | --- |
| `frontend/src/views/HomeView.vue` | 3-col grid + prose empty state | 1a shell: `grid-template-columns: 300px 1fr`, rail + KPI strip + tabs; delegates to `EmptyState` / `GeneratingState` / tab bodies. Keeps `handleGenerate` / `handleReset`, dropping the `controlsRef` imperative bridge (`setLoading`/`setError`/`updateStats`) in favour of store state. |
| `frontend/src/components/SectorControls.vue` | card form + restore modal | 1a parameter rail: log sliders, 5-up zone segmented control, density gauge, seed + reroll, `GENERATE SECTOR` / `RESET` / `CLEAR MEMORY`. Restore modal removed (D-15); auto-suggest watcher removed (D-16); `defineExpose` removed. |
| `frontend/src/components/ResultsDisplay.vue` | 522-line tab host + stats + systems grid | Thin host: renders `SectorTabs` and switches between `OverviewPanel`, `SectorStatistics`, `SystemsTable`, `StarTable`, `PlanetTable`. All aggregation moves to `useSectorStats`. |
| `frontend/src/components/PlanetTable.vue` | filter selects + card/table hybrid | 4a: type pill strip, zone+sort bar, 9-column grid table with relative-size bars, pager. Opens `PlanetDetailPanel` instead of navigating. |
| `frontend/src/components/StarTable.vue` | search + sortable table + distribution | Stars tab per D-23. |
| `frontend/src/views/SystemDetailView.vue` | per-star cards + planet card grid | 1d: breadcrumb bar, 5-up KPI strip, `OrbitalMap`, stars rail, planet table. |

### Deleted

| File | Reason |
| --- | --- |
| `frontend/src/components/PlanetDetailModal.vue` | Replaced by `PlanetDetailPanel.vue` (new). It has exactly **one** importer, `SystemDetailView.vue` (verified by grep), which is rewritten in the same change. `planetLongDescription`, `planetTypeLabel`, `lifeStageLevel` and `LIFE_STAGE_LABELS` are all carried over to the new panel, so no behaviour is lost. |

### New files

**Utilities** (`frontend/src/utils/`)

| Path | Purpose |
| --- | --- |
| `starPhysical.ts` (new) | `STAR_PHYSICAL`, `habitableZoneBounds`, `orbitBand`, `systemMass` |
| `starDisplay.ts` (new) | `STAR_SHORT_LABEL`, `getStarClassGradient` (the 8 CSS gradients from the handoff), `getStarRingColor` (consolidating the three identical copies in `ResultsDisplay`/`StarTable`/`SystemDetailView`) |
| `expectedStarShares.ts` (new) | `expectedShare(zone, class)` |
| `planetDisplay.ts` (new) | `PLANET_SHORT_LABEL`, `orbitLetter`, `planetDisplayName`, `massEarths`, `gravityG`, `densityGCm3`, `relativeSize` |
| `thermalZone.ts` (new) | `ThermalZone`, `thermalZone(planet)`, `zoneBadgeClass`, `tempTextClass` |
| `format.ts` (new) | `thinThousands` (U+2009), `trueMinus` (U+2212), `formatCoord`, `formatAu`, `formatPercent` |
| `logScale.ts` (new) | `toSlider(value,min,max)`, `fromSlider(t,min,max,step?)` |
| `orbitalScale.ts` (new) | `orbitalProjection(distances, hzInner, hzOuter)` → per-planet `x%` plus HZ rule positions and axis captions |

**Composables** (`frontend/src/composables/`)

| Path | Purpose |
| --- | --- |
| `useSectorStats.ts` (new) | Every aggregate in §7.5 |
| `useBackendHealth.ts` (new) | The 5 s poll extracted from `App.vue`; exposes `status: 'checking' \| 'online' \| 'offline'` |
| `useGenerationProgress.ts` (new) | The D-19 stage/elapsed timers |

**Components** (`frontend/src/components/`)

`AppTopBar.vue`, `KpiStrip.vue`, `SectorTabs.vue`, `OverviewPanel.vue`,
`SectorStatistics.vue`, `SystemsTable.vue`, `SpectralDistribution.vue`,
`PlanetTypeDistribution.vue`, `ThermalZoneBar.vue`, `NotableSystems.vue`,
`OrbitProfile.vue`, `OrbitalMap.vue`, `PlanetDetailPanel.vue`, `EmptyState.vue`,
`GeneratingState.vue`, `TablePager.vue`, `CelestialThumb.vue`, `MobileActionBar.vue`
— all `(new)`.

### Untouched

`frontend/src/router/index.ts` (the panel is a query param on existing routes, D-32),
`frontend/src/types/index.ts`, `frontend/src/main.ts`, `frontend/src/composables/useSectorApi.ts`,
`frontend/src/utils/planetImages.ts`, `frontend/src/utils/starColors.ts`,
`frontend/src/utils/starHexColors.ts`, `frontend/src/utils/lifeStage.ts`,
`frontend/src/utils/planetDescription.ts`, `frontend/src/views/DocumentationView.vue`,
`frontend/src/views/ApiReferenceView.vue`, `frontend/src/components/SectorVisualization3D.vue`,
`frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`,
both `package.json` files, and **all of `backend/`** except one new test file.

> `useSectorApi.ts` is currently imported by nothing (`sectorStore.ts` calls axios directly).
> Pre-existing dead code; left alone and noted.

### Regression review of every modified target

| Target | Verdict |
| --- | --- |
| `sectorStore.ts` | **Additive.** New refs and actions only; `generateSector`'s new parameter is optional. All four `sectorStore.test.ts` assertions (storage key, write-after-generate, restore-on-create, `clearPersistentMemory` defaults) hold unchanged. |
| `style.css` legacy classes | **Additive.** Preserved verbatim; `DocumentationView.vue` and `ApiReferenceView.vue` render identically apart from `body`'s background/font, which both already sit on. |
| `index.html` | **Additive.** Font links and a title change; the inline `body` rule is updated to match `style.css`, as it already does. |
| `App.vue` | **Deliberate change, contained.** The `<div class="container py-8">` wrapper around `<router-view>` (line 55, `max-width: 1200px`) is removed so the console can go full-bleed. Precise impact, verified per view: `DocumentationView.vue` has its own inner `max-w-7xl mx-auto px-4 lg:px-8`, so it would merely widen from 1200px to 1280px and lose its vertical padding; `ApiReferenceView.vue` has **no** width constraint of its own and would go edge-to-edge — a real regression. **Mitigation, required:** keep the wrapper for those two routes only, via a per-route conditional on `route.name` in `App.vue` (`<div :class="isLegacyRoute ? 'container py-8' : ''">`), or add `container py-8` to each view's own root element. Either keeps both measures identical; the spec requires one of them plus a manual check of both pages. |
| `HomeView.vue` / `SectorControls.vue` | **Deliberate changes**, both named: the restore modal (D-15) and the auto-suggest watcher (D-16). No other feature depends on either — both are local to `SectorControls.vue`. |
| `PlanetDetailModal.vue` deletion | **Safe.** Both call sites are replaced in the same change; every helper it used is reused by the new panel. |
| `ResultsDisplay.vue` / `PlanetTable.vue` / `StarTable.vue` / `SystemDetailView.vue` | **Full rewrites, no external contract.** None is imported outside the tree being rewritten; none exposes anything via `defineExpose` except `SectorControls.vue`, whose consumer (`HomeView.vue`) is rewritten with it. |
| `SectorVisualization3D.vue` | **Orphaned, not broken** (D-24). |
| `POST /api/sector/generate`, `GET /api/sector/health` | **Unchanged.** No request or response field added, removed or reinterpreted. All 11 backend test files keep passing untouched. |
| Seed reproducibility | **Unchanged.** No generator code is touched, so `generation-stability.test.ts`'s golden fixtures are unaffected. |
| `STAR_PHYSICAL` mirroring | **Open risk, mitigated.** A future edit to the backend's `starTypes` luminosity/radius would silently desynchronise the frontend's HZ drawing. T-B1 pins the backend values and names the frontend file; T-F1 pins the mirror and names the backend file. A one-sided edit fails CI. |

---

## 7. Vue 3 / Vite / Tailwind v4 Specifics

### 7.1 Design tokens — `frontend/src/style.css`

Prepend, immediately after `@import "tailwindcss";`, the font `@import` and:

```css
@theme {
  --color-base:        #0a0e17;
  --color-panel:       #0c1322;
  --color-header:      #0d1526;
  --color-input:       #0a1120;

  --color-line-strong:   rgb(148 163 184 / .18);
  --color-line-soft:     rgb(148 163 184 / .12);
  --color-line-hairline: rgb(148 163 184 / .07);
  --color-line-control:  rgb(148 163 184 / .22);

  --color-ink:        #f1f5f9;  /* text/primary */
  --color-ink-bright: #f8fafc;
  --color-ink-2:      #cbd5e1;  /* secondary */
  --color-muted:      #94a3b8;
  --color-dim:        #64748b;
  --color-faint:      #475569;
  --color-ghost:      #334155;

  --color-acc-blue:        #3b82f6;
  --color-acc-blue-600:    #2563eb;
  --color-acc-blue-light:  #93c5fd;
  --color-acc-blue-pale:   #bfdbfe;
  --color-acc-violet:      #8b5cf6;
  --color-acc-violet-light:#c4b5fd;
  --color-acc-violet-pale: #ddd6fe;
  --color-acc-green:       #10b981;
  --color-acc-green-light: #34d399;
  --color-acc-green-mid:   #6ee7b7;
  --color-acc-green-pale:  #a7f3d0;
  --color-acc-amber:       #f59e0b;
  --color-acc-amber-light: #fcd34d;
  --color-acc-red:         #ef4444;
  --color-acc-red-light:   #f87171;
  --color-acc-red-pale:    #fca5a5;

  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system,
               "Segoe UI", Roboto, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo,
               Consolas, monospace;

  --radius-ctl: 4px;  --radius-card: 5px;
  --radius-badge: 3px; --radius-pill: 99px;
}
```

Typography roles from the handoff table are expressed as utility combinations, not new
tokens (e.g. section label = `font-mono font-semibold text-[11px] tracking-[.12em]
text-[#e2e8f0]`). **Rule to enforce throughout: any number a user might compare is
`font-mono`.** Names and prose are `font-sans`.

Component classes appended to the same file (all prefixed `ug-` so they can never collide
with the legacy classes): `.ug-panel`, `.ug-btn-primary`
(`linear-gradient(180deg,#3b82f6,#2563eb)` + `0 6px 18px rgb(37 99 235 / .35)`;
hover `#60a5fa → #3b82f6`), `.ug-btn-outline`, `.ug-btn-danger`, `.ug-badge`,
`.ug-badge-iau` / `-life` / `-hot` / `-temperate` / `-goldilocks` / `-cold`,
`.ug-row-life` (`background rgb(16 185 129 / .06)` + `box-shadow: inset 2px 0 0 #34d399`),
`.ug-row:hover` (`background rgb(148 163 184 / .04)`), `.ug-skeleton`, and the
`input[type=range]` styling (4px track, 12px thumb with
`box-shadow: 0 0 0 3px rgb(59 130 246 / .25)`), replacing the scoped block currently in
`SectorControls.vue`. All transitions 120–150 ms ease-out.

### 7.2 Routing — unchanged

Routes stay `/`, `/system/:id`, `/api-reference`, `/documentation`. The planet panel is
`?seed=<seed>&planet=<starId>-<orbitalNumber>` on the current route (D-32); the active tab
is store state, not a route.

### 7.3 Pinia store — `sectorStore.ts`, additive only

**Preserved exactly:** `STORAGE_KEY`, `sectorData`, `isLoading`, `error`, `currentSeed`,
`systemCount`, `sectorVolume`, `zone`, the localStorage read/validate block, `loadSavedParams`,
`checkHealth`, `generateSector`'s existing behaviour, `getSystemById`, `clearPersistentMemory`,
and the defaults 100 / 1000 / `medium`.

**Added:**

```ts
const generationStatus = ref<GenerationStatus>('idle');
const generationStage  = ref<GenerationStage>('coordinates');
const generationProgress = ref(0);          // 0..1
const generationElapsedMs = ref(0);
const lastStats = ref<GenerationResponse['stats'] | null>(null);

const activeTab = ref<SectorTab>('overview');
const systemFilters = ref({ query: '', preset: 'all', primaryClass: 'any', sort: 'planets-desc' });
const starFilters   = ref({ query: '', preset: 'all', sort: 'id-asc' });
const planetFilters = ref({ types: [] as string[], zone: 'any', hasLife: false,
                            hasMoons: false, sort: 'diameter-desc' });
const selectedPlanetKey = ref<string | null>(null);   // "<starId>-<orbitalNumber>"
const loadedSeed = ref<number | string | null>(null); // the seed sectorData came from,
                                                     // which currentSeed is not (D-32)
const page = ref({ systems: 1, stars: 1, planets: 1 });

const hasSavedParams = computed(() => { /* loadSavedParams() has all four fields */ });
function resetFilters(): void;
function selectPlanet(key: string | null): void;      // also syncs the query param
```

`generateSector(request, signal?)` additionally: sets `generationStatus`/`progress`,
stores `lastStats` on success, sets `activeTab = 'overview'` on success, and — on
`axios.isCancel` — restores the pre-request `sectorData` snapshot. `isLoading` keeps its
current meaning and is kept in sync with `generationStatus === 'running'`, so any consumer
reading it still works.

`clearPersistentMemory()` additionally resets `lastStats`, filters, pagination and
`activeTab`; its existing assertions (localStorage cleared, params back to defaults,
`sectorData = null`) are unchanged.

### 7.4 Composables

`useBackendHealth()` — moves App.vue's `onMounted`/`onUnmounted` 5 s poll verbatim; returns
`status`, mapped to the LED (green `BACKEND ONLINE` / red `BACKEND OFFLINE` / blue
`GENERATING` while `generationStatus === 'running'`).

`useGenerationProgress()` — D-19's timers; returns `stages` (each `'done' | 'current' |
'pending'`), `progress`, `elapsedMs`. Cleans up both intervals in `onUnmounted` **and** when
status leaves `running`.

`useSectorStats(sector)` — §7.5.

### 7.5 Aggregates — `useSectorStats.ts`

All `computed`, all derived from `(systems, stars, planets)` plus `STAR_PHYSICAL`. Built in
single passes over the arrays (the current `ResultsDisplay.getPlanetsInSystem` is
O(stars × planets) per call and must not be reproduced — build `starId → systemId` and
`systemId → { stars, planets }` index maps once, as `systemsWithLife` already does today).

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

The **primary star** of a system is the first star in `stars` with that `systemId`
(component A, per the generator's insertion order).

### 7.6 Assets and the type → image mapping

**Where they live.** `frontend/public/images/` — already in the repo, already the source the
handoff bundle was copied from (D-35). Vite serves `public/` at the site root, so paths are
absolute (`/images/...`) and need no bundler import. Nothing to copy, move or add.

**Inventory (verified):**

| Directory | Count | Contents |
| --- | --- | --- |
| `images/planets/thumbs/` | 22 | all 22 type renders incl. `unknown.png` |
| `images/planets/medium/` | 22 | identical filenames |
| `images/stars/thumbs/` | 21 | `star-{O,B,A,F,G,K,M,DA,gF,gG,gK,gM,cA,cB,cF,cG,cK,cM,NS,BH}.png` + `star-default.png` |
| `images/stars/medium/` | 21 | identical filenames |
| `images/logo.png` | 1 | 28px top bar, 32px on mobile |

There is also a legacy flat copy at `images/planets/*.png` and `images/stars/*.png` (what
`getPlanetImage`/`getStarImage` return when `size` is omitted). The redesign **always
passes an explicit size**, so the flat copies go unused — pre-existing, left alone.

**Mapping.** Reuse the existing functions unchanged:
`getPlanetImage(code, size)` from `utils/planetImages.ts` and `getStarImage(spectralClass, size)`
from `utils/starColors.ts`.

**Size selection rule** (handoff §Assets): `thumbs` at ≤ 34px rendered, `medium` above.
Encapsulated in `CelestialThumb.vue` (new), which takes `kind`, `code`, `px`, plus optional
`ring` and `glow`, and picks the directory itself — so no caller ever hard-codes a size
folder. Rendering: `border-radius: 50%` always; `object-fit: contain` on a black backdrop
for planets, `object-fit: cover` for stars.

**Fallbacks — the four cases, all already handled by the existing functions:**

1. **Planet type with no dedicated render.** Cannot happen: all 22 codes in
   `PLANET_TYPE_DESCRIPTIONS` have a file. An unknown code returns `unknown.png`, which
   exists in both sizes.
2. **White dwarfs `DB` / `DF` / `DG` / `DK`.** No `star-DB.png` etc. exists; `getStarImage`
   already aliases all four to `star-DA.png`. Deliberate and preserved — they are
   visually identical objects, and the adjacent text still names the exact class.
3. **Unknown spectral class.** `star-default.png`, present in both sizes.
4. **Missing file at runtime** (a deploy slip). Every `<img>` in `CelestialThumb.vue`
   carries `@error` → swap to `/images/planets/thumbs/unknown.png` or
   `/images/stars/thumbs/star-default.png`, so a broken render never leaves an empty cell.
   Tests T-F2/T-F3 assert cases 1–3 against the real filesystem.

Per the handoff's accessibility note, all celestial renders are decorative: `alt=""` plus
`aria-hidden="true"`, with the class or type always named in adjacent text.

### 7.7 Screen-by-screen build notes

Layout, spacing, colour and copy come from the handoff README §Screens (1a, 2a, 3a, 1d, 4a,
4b, 4c, 4d) and are not restated here. The points below are the ones that need a codebase
decision.

**1a Overview.** Rail 300px + `1fr`; rail only on this tab (D-31). Density gauge: 2px rail
`linear-gradient(90deg,#475569,#10b981 45%,#f59e0b 75%,#ef4444)`; marker position
`clamp((log10(current/expected) + 2) / 4, 0, 1)`, so ratio 1 sits at 50 %, where the faint
expected tick is drawn. Caption `expected <DENSITY_MAP[zone]> · marker at current`.
KPI rails per D-27. Distributions per D-29. Notable systems per D-28.

**2a Statistics.** Six KPI cells with sub-captions
(`1.71 stars each`, `N classes present`, `3.40 per star`, `1.48 per planet`,
`11.0% of planets`, `across N systems`). Spectral bars carry the 1px white expected tick at
`expectedShare(zone, cls)`; legend `— tick = share expected for a <Zone> zone`.
`GENERATION RUN` reads `TIME` from `store.lastStats.generationTimeMs`, `ZONE`, `VOLUME`,
`DENSITY`, plus the fixed note *"Re-running with the same seed, volume and zone reproduces
this sector exactly."*

**3a Systems index.** 12 rows per page (`SHOWING 1–12 OF 140`). Orbit profile: the system's
planets in `orbitalNumber` order, `size = 10 + 18 × (d / dMax_row)` px rounded, `gap` 7px
(≤ 8 planets) or 14px, green 2px ring on `habitableZone`. Empty → `no planetary bodies` in
`#334155`. Rows with life get `.ug-row-life`. Filter-bar children are `flex-none
whitespace-nowrap` — they must never wrap.

**1d System detail.** `OrbitalMap.vue` shows the **primary star only** (header
`ORBITAL MAP · <primary star name>`), matching the design; the stars rail lists every star
with its own planet count, so secondaries are not hidden. Projection from
`orbitalScale.ts`:

```
domainMin = max(0.05, min(min(a_i), hzInner) * 0.8)
domainMax = max(max(a_i), hzOuter) * 1.1
x(a)      = 4% + 92% * (ln a − ln domainMin) / (ln domainMax − ln domainMin)
```

Planet size `20 + 24 × (d / dMax)` px; asteroid belts (`diameter === 0`) render at 14px.
Axis captions print `domainMin`/`domainMax` to 2 significant digits. If the primary has no
planets (an `NS`/`BH` primary, or an unlucky roll), the box shows `no planetary bodies`
centred in `#334155` and the HZ rules are omitted. The map carries a visually-hidden text
summary listing each planet's name, type, distance in AU and zone (handoff §Accessibility).

**4a Planets table.** 10 rows per page. Relative-size bar width `d / maxPlanetDiameter`;
fill colour precedence: `habitableZone` → green; else type in `{G, Q, U}` →
`linear-gradient(90deg,#8b5cf6,#3b82f6)`; else thermal zone → red / amber / blue. Type pills
show the top 8 present types with a trailing `+N` chip; clicking one toggles
`planetFilters.types`.

**4b Planet detail panel.** 520px, right-anchored, `translateX` in over 200 ms
`cubic-bezier(.2,.8,.2,1)`; the table behind keeps its scroll position. Closes on `✕`, `Esc`
and backdrop click. Content per D-7/D-8/D-10. `OPEN SYSTEM` routes to `/system/<systemId>`;
`COPY JSON` writes `JSON.stringify(planet, null, 2)` via `navigator.clipboard`, falling back
to a hidden `<textarea>` + `document.execCommand('copy')`, and flashes `COPIED` for 1.2 s.
Focus moves to the panel on open and returns to the originating row on close.

**4c states.** Empty state per D-15 and the handoff's exact copy: eyebrow `READY`, headline
*"Generate your first sector"*, body *"24 star types, 22 planet types, moons and habitable
zones from scientific probability distributions. Same seed, same universe, every time."*,
a 4-up parameter preview (`SYSTEMS`, `VOLUME`, `ZONE`, `SEED` — showing `random` in violet
when no seed is set), the two buttons, and the four micro-links (`24 star types`,
`22 planet types`, `deterministic seeds`, `Documentation` → `/documentation`). Generating
state per D-19.

**4d mobile / responsive.** `≥1280px` as documented. `1024–1279px`: rail 260px, KPI strip
stays 5-up, distributions stack. `768–1023px`: rail collapses to a top drawer, KPI 3-up,
tables drop the `COORDINATES` and `ORBIT PROFILE` columns. `<768px`: KPI 2×2 with 26px
numerals, horizontally scrolling tab bar with shortened labels, spectral rows collapse to
`22px 1fr 34px` showing the top 5 plus `Show all N classes`, planet types become a 2-column
icon+count+name list, and `MobileActionBar.vue` sticks to the bottom with
`PARAMETERS ▲` (opens the rail as a sheet) and `GENERATE`, both `padding: 13px` for a ≥44px
touch target.

**Loading / error.** Tables render 8 `.ug-skeleton` rows; KPI numerals show `—` until data
lands; the layout never collapses to a spinner. On error the tab body shows a compact card:
`Generation failed`, `store.error` in mono 11px, and a `RETRY` button that re-issues the
same request.

---

## 8. Validation Rules

Client-side only; the server's own validation (§9) is unchanged and remains authoritative.

| Field | Rule | On violation |
| --- | --- | --- |
| `systemCount` | integer, `1 ≤ n ≤ 5 000` | field border `rgb(239 68 68 / .5)`, inline mono 9px hint `1 – 5 000`, `GENERATE SECTOR` disabled at 40 % opacity |
| `sectorVolume` | integer, `10 ≤ v ≤ 100 000` (slider range, D-18) | same treatment, hint `10 – 100 000 pc³` |
| `zone` | one of `extragalactic \| galactic edge \| medium \| central zone \| core` | not reachable — segmented control, single-select |
| `seed` | integer `≥ 0`, or empty | empty is legal: `handleSubmit` randomises via `Math.floor(Math.random() * 1000000)`, as today |
| `?planet=` | matches `/^\d+-\d+$/` **and** resolves to a planet in the current sector | ignored, param stripped, no panel |
| `systemFilters.query` | free text, trimmed, case-insensitive; matches system `name` or `systemId` | no match → `No systems match the current filters.` in `#475569` |

The store-level clamps that exist today (`watch(systemCount)` → 1…5 000,
`watch(sectorVolume)` → 10…1 000 000) are kept. Sliders cannot produce an out-of-range
value; only the editable number inputs can, and they are clamped on blur.

**Business rules.** Density is advisory, never blocking — a `VERY DENSE` verdict still
generates. Large sectors are not blocked either, but at `systemCount > 2 000` the
`GENERATE SECTOR` button's helper caption reads `large sectors may take several seconds`.

---

## 9. Authorization & Security

The application has **no authentication, no authorization and no user-owned data**. It is a
stateless public generator; every visitor can do everything. There is no role model to
express, so per-action permissions are not applicable.

| Action | Who | Enforcement |
| --- | --- | --- |
| Generate a sector | anyone | none; validated by `SectorController.generateSector` |
| Read/export sector data | anyone | data exists only in the client's memory |
| Clear stored parameters | anyone | own browser's `localStorage` |

Security points this change touches:

- **Input validation is unchanged and still enforced server-side.** `sector.controller.ts`
  rejects non-numeric or out-of-range `systemCount` (1–10 000) and `sectorVolume`
  (1–10 000 000) with HTTP 400. The client's tighter bounds (§8) are a usability layer,
  never the security boundary.
- **No new injection surface.** All rendering is Vue text interpolation; `v-html` is not
  used anywhere in the new components. Filter queries never reach the server.
- **Clipboard.** `COPY JSON` writes only the already-displayed planet object; no other
  clipboard access.
- **New external origins.** `fonts.googleapis.com` and `fonts.gstatic.com` (D-33). If a CSP
  is added later it must allow `style-src` for the former and `font-src` for the latter.
- **No rate limiting and no CSRF token exist today**, and neither is introduced: the API is
  a stateless public POST with no cookies or credentials, so CSRF has nothing to forge.
  Rate limiting remains a pre-existing gap, noted in §13, not addressed here.
- **localStorage** stores only the four generation parameters — never personal data. Reads
  stay inside `try/catch` with per-field type validation, exactly as today, so a corrupted
  or hostile value falls back to defaults instead of throwing.

---

## 10. Testing

Framework and layout per CLAUDE.md: Vitest for the frontend (`*.test.ts` beside the source),
Jest for the backend (`backend/__tests__/unit/...`). Per D-34, frontend tests target pure
modules and the store. CI (`.github/workflows/test.yml`) runs both suites unchanged.

### Backend — one new file

`backend/__tests__/unit/lib/star-physical-contract.test.ts` (new)

- **T-B1** — for each of the 24 spectral classes, `new StellarGenerator()`'s `starTypes`
  entry has exactly the documented `luminosity` and `radius`. Literal expected table in the
  test, with a header comment: *"mirrored in frontend/src/utils/starPhysical.ts — change
  both together."* Fails loudly if the generator's physics is edited alone.

No other backend test changes. All 11 existing files must still pass untouched — in
particular `generation-stability.test.ts` (golden seed fixtures) and
`integration/api/sector-api.test.ts` (response shape).

### Frontend — new unit tests

`frontend/src/utils/starPhysical.test.ts` (new)
- **T-F1** — `STAR_PHYSICAL` luminosity/radius match T-B1's literal table (comment names the
  backend file).
- **T-F49** — **the frozen type sets (D-36).** `Object.keys(STAR_TYPE_DESCRIPTIONS).sort()`
  equals the literal 24-class list and `Object.keys(PLANET_TYPE_DESCRIPTIONS).sort()` equals
  the literal 22-code list, both spelled out in the test; and `Object.keys(STAR_PHYSICAL)`
  covers every spectral class with no extra key. The literal lists are the point: T-F2/T-F3
  iterate the maps, so they catch a type *added* without artwork but would silently shrink
  if one were *removed*. This test fails on an addition and a removal alike.
- **T-F4** — `habitableZoneBounds('G')` ≈ `{ inner: 0.7495, outer: 1.7678 }` (i.e.
  `sqrt(1/1.78)`, `sqrt(1/0.32)`), matching the generator's Solar reference.
- **T-F5** — `habitableZoneBounds('NS')` and `('BH')` return `{ inner: 0, outer: 0 }`.
- **T-F6** — `orbitBand` agrees with `determineHabitableZone` at, below and above both
  bounds, and exactly on each boundary (`a === inner` → `medium`, `a === outer` → `medium`).
- **T-F7** — an unknown class falls back to the M-class row (matching the backend's
  `starTypes[x] || starTypes['M']`) rather than throwing.
- **T-F8** — `systemMass([])` is 0; a G + DA pair sums to 1.6.

`frontend/src/utils/imageAssets.test.ts` (new) — filesystem-backed (Vitest's default node
environment makes `fs` available)
- **T-F2** — for every code in `PLANET_TYPE_DESCRIPTIONS`, both
  `getPlanetImage(code,'thumbs')` and `(code,'medium')` resolve to a file that exists under
  `frontend/public/`.
- **T-F3** — for every class in `STAR_TYPE_DESCRIPTIONS`, both sizes of `getStarImage` resolve
  to an existing file; and specifically `DB`, `DF`, `DG`, `DK` all resolve to `star-DA.png`.
- **T-F9** — an unrecognised planet code resolves to `unknown.png` and an unrecognised
  spectral class to `star-default.png`, in both sizes, and both files exist.

`frontend/src/utils/thermalZone.test.ts` (new)
- **T-F10** — `habitableZone: true` → `Goldilocks`, whatever the temperature (including
  400 K and 100 K), guarding the precedence.
- **T-F11** — boundaries: 285 K → `Hot`, 284.99 K → `Temperate`, 237 K → `Temperate`,
  236.99 K → `Cold`.
- **T-F12** — the returned badge class for each of the four zones is non-empty and distinct.

`frontend/src/utils/logScale.test.ts` (new)
- **T-F13** — `fromSlider(0, …)` is the minimum and `fromSlider(1, …)` the maximum for both
  the systems (1–5 000) and volume (10–100 000) ranges.
- **T-F14** — round-trip: `toSlider(fromSlider(t))` ≈ `t` for t ∈ {0, .25, .5, .75, 1}.
- **T-F15** — the volume scale snaps to multiples of 10 and never returns below 10.
- **T-F16** — monotonic: increasing `t` never decreases the value.

`frontend/src/utils/format.test.ts` (new)
- **T-F17** — `thinThousands(1204)` → `1 204` with U+2009; `812` → `812`; `142880` →
  `142 880`; `0` → `0`.
- **T-F18** — `formatCoord(-4.118)` renders U+2212, not U+002D, and always 3 decimals.
- **T-F19** — `formatPercent(27, 812)` → `3.3%`; a zero denominator → `0.0%`, never `NaN`.

`frontend/src/utils/planetDisplay.test.ts` (new)
- **T-F20** — `orbitLetter(1) === 'b'`, `orbitLetter(3) === 'd'`, `orbitLetter(26) === '#26'`.
- **T-F21** — `planetDisplayName` prefers `planet.name` when present, otherwise
  `` `${star.name} ${letter}` ``.
- **T-F22** — `massEarths`, `gravityG`, `densityGCm3` for a known Earth-like planet round to
  the expected values; an asteroid belt (`mass: 0`, `diameter: 0`) returns `null` for all
  three so the UI can print `—` instead of `NaN`/`Infinity`.
- **T-F23** — `relativeSize(d, 0)` returns 0 rather than dividing by zero.

`frontend/src/utils/expectedStarShares.test.ts` (new)
- **T-F24** — for each of the five zones, `Σ expectedShare(zone, cls)` over all 24 classes
  equals 1 within 1e-9.
- **T-F25** — `expectedShare('medium','M') ≈ 0.677` and `expectedShare('medium','G') ≈ 0.076`,
  matching the generator's ladder comments.
- **T-F26** — `expectedShare('core','BH')` includes both the primary ladder's 5 % and the
  cascade contribution (strictly greater than 0.05).
- **T-F27** — an unknown class returns 0, not `undefined`.

`frontend/src/utils/orbitalScale.test.ts` (new)
- **T-F28** — projected positions are strictly increasing with distance and all fall inside
  `[4%, 96%]`.
- **T-F29** — the HZ rules land between the innermost and outermost planet for a G-class
  star whose planets straddle the band.
- **T-F30** — a single-planet system produces a finite, in-range position (no
  divide-by-zero on a degenerate domain).
- **T-F31** — an empty planet list returns empty positions and no HZ rules.

`frontend/src/composables/useSectorStats.test.ts` (new) — on a hand-built fixture sector
(3 systems, 5 stars incl. one `BH`, 9 planets incl. 2 habitable, 1 with life, 1 asteroid belt)
- **T-F32** — headline counts and `moonCount` are correct.
- **T-F33** — `starsPerSystem`, `planetsPerStar`, `moonsPerPlanet` round to 2 dp and are 0
  (not `NaN`) on an empty sector.
- **T-F34** — `spectralDistribution` is count-descending and its `share` values sum to 1.
- **T-F35** — `thermalOccupancy` totals equal `planetCount`; `orbitBands` totals equal
  `planetCount`.
- **T-F36** — `multiplicity` buckets sum to `systemCount` and a 5-star system lands in `4+`.
- **T-F37** — `moonHistogram` has exactly 10 buckets and folds `moonCount ≥ 9` into the last.
- **T-F38** — `lifeByStage` has 6 buckets summing to `lifeCount`.
- **T-F39** — `notableSystems` returns at most 4 and applies D-28's tie-breaks in order.
- **T-F40** — `lifeSystemCount` counts distinct systems, not planets.
- **T-F41** — an empty sector yields zeros throughout with no `NaN` and no throw.

`frontend/src/stores/sectorStore.test.ts` (**existing, extended — all current cases must
keep passing verbatim**)
- **T-F42** — `generateSector` sets `generationStatus` to `running` then `done`, and
  populates `lastStats` from the response.
- **T-F43** — a failed response sets `generationStatus = 'error'` and leaves `sectorData`
  untouched.
- **T-F44** — an aborted request restores the previous `sectorData` snapshot and sets
  `generationStatus` back to `done`; with no previous sector it returns to `idle`.
- **T-F45** — `generateSector(request)` called with one argument behaves exactly as before
  (regression guard for the new optional parameter).
- **T-F46** — `hasSavedParams` is false on a clean store, true after a generate, false again
  after `clearPersistentMemory`.
- **T-F47** — `clearPersistentMemory` also resets `activeTab`, filters and pagination, while
  still clearing localStorage and restoring 100 / 1000 / `medium`.
- **T-F48** — `selectPlanet('7-3')` sets `selectedPlanetKey`; `selectPlanet(null)` clears it.

### Manual verification checklist (no automated coverage under D-34)

1. Each of the eight screenshots compared side by side at a 1280px viewport.
2. `/documentation` and `/api-reference` still render at their previous measure and padding
   — the named regression risk in §6. `/api-reference` in particular must not go
   edge-to-edge.
3. Generate → cancel mid-flight → previous sector still displayed.
4. Reload with saved params → empty state offers `RESTORE LAST SECTOR` → restoring
   reproduces the identical sector (same counts, same seed).
5. Keyboard: `Tab` reaches every control; `Esc` closes the planet panel; focus returns to
   the originating row.
6. Offline backend → red LED, `BACKEND OFFLINE`, error card with a working `RETRY`.
7. 390px, 800px, 1100px and 1440px viewports.

---

## 11. Suggested Story Breakdown

Six vertical slices. Each ends with the app running and something visibly better. Order is
strict where dependencies are noted; the story-creator may re-slice.

**Slice 1 — Design foundation and app shell.** *(no dependencies)*
Tokens in `style.css` `@theme`, IBM Plex in `index.html`, the `ug-*` component layer, the
legacy classes preserved, `AppTopBar.vue`, `useBackendHealth.ts`, `CelestialThumb.vue`,
`format.ts`, and the container fix for `/documentation` + `/api-reference`.
Tests: T-F17…T-F19, T-F2, T-F3, T-F9.
Verifiable: the top bar matches 1a; both legacy pages are unchanged; export and the health
LED still work.

**Slice 2 — Derived data layer.** *(no dependencies; parallel with 1)*
`starPhysical.ts`, `expectedStarShares.ts`, `thermalZone.ts`, `planetDisplay.ts`,
`starDisplay.ts`, `logScale.ts`, `orbitalScale.ts`, `useSectorStats.ts`, and the backend
contract test.
Tests: T-B1, T-F1, T-F4…T-F8, T-F10…T-F16, T-F20…T-F41.
Verifiable: `npm test` green in both packages; no UI change yet.

**Slice 3 — Parameter rail, KPI strip, states.** *(needs 1 and 2)*
Store extension (§7.3), `SectorControls.vue` rewritten (log sliders, zone segmented control,
density gauge, seed, three actions), `KpiStrip.vue`, `EmptyState.vue`, `GeneratingState.vue`,
`useGenerationProgress.ts`, `MobileActionBar.vue`, and `HomeView.vue`'s new shell hosting the
old `ResultsDisplay` body untouched for now.
Tests: T-F42…T-F48.
Verifiable: 1a's rail and KPI strip are pixel-correct; 4c both states render; generate,
cancel, restore and clear-memory all work.

**Slice 4 — Overview and Statistics tabs.** *(needs 3)*
`SectorTabs.vue`, `OverviewPanel.vue`, `SpectralDistribution.vue`,
`PlanetTypeDistribution.vue`, `ThermalZoneBar.vue`, `NotableSystems.vue`,
`SectorStatistics.vue`; `ResultsDisplay.vue` reduced to a tab host. The 3D button is removed
here.
Verifiable: 1a's right column and all of 2a match their screenshots; the same numbers agree
across both.

**Slice 5 — The three tables.** *(needs 4)*
`SystemsTable.vue` + `OrbitProfile.vue` + `TablePager.vue` (3a), `StarTable.vue` rewritten
(D-23), `PlanetTable.vue` rewritten (4a) with the type-pill cross-filter from the Overview
and Statistics type cards.
Verifiable: 3a and 4a match; filters, sorts and pagers work; clicking a type card on
Overview lands on a filtered Planets tab.

**Slice 6 — System detail and planet panel.** *(needs 5)*
`SystemDetailView.vue` rewritten (1d) with `OrbitalMap.vue`; `PlanetDetailPanel.vue` (4b)
with the query-param deep link; `PlanetDetailModal.vue` deleted.
Verifiable: 1d and 4b match; the panel opens from both 4a and 1d, deep-links, closes on
`Esc`, and preserves the table's scroll position.

---

## 12. Success Criteria

Binary, checkable.

1. All eight screens (1a, 2a, 3a, Stars tab, 1d, 4a, 4b, 4c) render at a 1280px viewport and
   match their screenshot in layout, colour, type and copy.
2. IBM Plex Sans and IBM Plex Mono load; every comparable numeral in the app is monospace.
3. The KPI strip is visible on every tab of the results area and never shows `NaN`,
   `undefined` or `Infinity`.
4. The density gauge updates live as the systems or volume slider moves, with no other
   field changing as a side effect (D-16).
5. Both sliders are logarithmic and each value is also directly editable, clamped to its
   documented range.
6. `GENERATE SECTOR` produces a sector; `CANCEL` mid-flight restores the previous one (or
   the empty state); a backend error shows the error card with a working `RETRY`.
7. Reloading with saved parameters shows `RESTORE LAST SECTOR`; using it reproduces the
   previous sector exactly (identical systems/stars/planets counts and seed).
8. `CLEAR MEMORY` empties `localStorage['universe-generator-sector-params']` and resets the
   parameters to 100 / 1000 / `medium`.
9. `POST /api/sector/generate` request and response bodies are byte-identical to `master`;
   `backend/src/` contains no change other than the new test file.
10. `frontend/src/types/index.ts` and `backend/src/types/index.ts` are unmodified and
    identical to each other in their shared section.
11. `cd backend && npm test` and `cd frontend && npm test` both pass; every pre-existing
    test passes without modification.
12. `cd frontend && npm run build` succeeds (`vue-tsc` clean, no TypeScript errors).
13. Every star class in `STAR_TYPE_DESCRIPTIONS` and every planet code in
    `PLANET_TYPE_DESCRIPTIONS` renders an image at both sizes with no broken `<img>`
    (T-F2/T-F3), and `DB`/`DF`/`DG`/`DK` render `star-DA.png`.
14. `/documentation` and `/api-reference` render with an unchanged measure and unchanged
    styling.
15. Every zone and life state is conveyed by a text badge, never by colour alone; all
    celestial renders carry `alt=""` and `aria-hidden="true"`; the orbital map has a
    visually-hidden text summary; the planet panel closes on `Esc` and returns focus.
16. Layouts hold at 390px, 800px, 1100px and 1440px with no horizontal page scroll; mobile
    touch targets are ≥44px.
17. The planet panel deep-links: reloading a URL with `?planet=<starId>-<orbitalNumber>` on
    a freshly generated sector reopens the same planet; an invalid value is ignored silently.
18. The type sets are unchanged (D-36): the key set of `STAR_TYPE_DESCRIPTIONS` is exactly
    the 24 classes it holds on `master`, the key set of `PLANET_TYPE_DESCRIPTIONS` is
    exactly the 22 codes it holds on `master`, and `STAR_PHYSICAL` has one row per spectral
    class and no extra rows. `git diff master -- '*/types/index.ts'` is empty.
19. The artwork is untouched (D-37): `git diff master -- frontend/public/images/` is empty —
    no render added, replaced, renamed or removed — and no file from
    `STORIES/SPECS/design_handoff_universe_generator_ui/` has been copied into the app.

---

## 13. Future Considerations

Deliberately **not** part of this spec. Recorded so they are not silently folded in.

- **Server-computed statistics.** `StellarService.getSectorStats()` already computes
  distributions and ratios but is never called by any route. Exposing it (or returning it
  from `/generate`) would let very large sectors skip client-side aggregation.
- **Real generation progress.** A streaming or chunked endpoint would replace D-19's
  animated stages with measured ones.
- **Per-star mass and effective temperature in the payload,** removing the D-2 mirror and
  its drift risk — worth doing if the design ever needs subclass-accurate values.
- **The 3D sector view,** currently orphaned by D-24: either delete
  `SectorVisualization3D.vue` and drop `three`, or restyle and reinstate it.
- **Component testing infrastructure** (`jsdom` + `@vue/test-utils`), which would lift the
  D-34 constraint.
- **Rate limiting** on `POST /api/sector/generate` — a pre-existing gap; a 5 000-system
  request is expensive and unthrottled.
- **Self-hosted fonts,** removing the external origin from D-33.
- **Removing the dead `useSectorApi.ts` and `tailwind.config.js`,** and the unused flat
  image copies at `images/planets/*.png` / `images/stars/*.png`.
