# System detail — planets grouped under the star they orbit

**Spec status:** implementation-ready. Supersedes the draft (preserved at
`STORIES/SPECS/new-system-view.draft.md`).

**Governing spec:** `STORIES/SPECS/new-design.md` (tokens, `ug-` classes, decisions D-1 … D-37).
Everything below stays inside those conventions; where it departs from a decision recorded there,
the departure is named explicitly in **Assumptions & Decisions**.

---

## 1. Feature Name & Description

**One sentence.** Rebuild the body of the system detail screen so a system reads as *one block per
star, each holding that star's own planets*, replacing the current split between a "STARS IN
SYSTEM" rail and a separate system-wide "PLANETS" table — so a reader can see at a glance which
planet orbits which star.

### Current state

`frontend/src/views/SystemDetailView.vue` renders, top to bottom:

1. a breadcrumb bar (`data-breadcrumb`) — back link, system name, `IAU` / `LIFE DETECTED` badges,
   and an X/Y/Z/AGE readout;
2. a 5-up KPI strip (`data-system-kpi`) — STARS, PLANETS, MOONS, IN HABITABLE ZONE, TOTAL MASS;
3. a single `OrbitalMap` for **the primary star only** (`frontend/src/components/OrbitalMap.vue`);
4. a two-column region, `lg:grid-cols-[300px_1fr]`:
   - left, `data-stars-rail` — one entry per star (thumbnail, name, `K-4 · Orange dwarf`, and a
     facts line `0.61 M☉ · 4 402 K · 7 planets`);
   - right, `data-planets-header` "PLANETS · n" over a 7-column grid of every planet in the
     system, ordered by `orbitalNumber` alone.

The defect is in (4). The planet table is a flat list across all stars ordered only by orbital
number, so a multi-star system interleaves its stars' planets with nothing to tell them apart.
The pinned expectation in `frontend/src/components/systemDetail.dom.test.ts:372` is the defect
in one line — for a system whose primary has four planets and whose secondary has one, the rows
render as:

```
['1-1', '2-1', '1-2', '1-3', '1-4']
```

`2-1` sits between the primary's first and second planets. The row is labelled with its planet's
display name (`UG-0052-A b`, D-10), which encodes the star, but that is a naming convention the
reader has to decode, not a structure they can see. The rail states each star's planet *count*
but never says *which* planets. And the orbital map compounds it: it draws the primary's planets
only, so a secondary's planets appear in the table attached to nothing on screen.

### Scope

**In scope**

- Replacing the stars rail + system-wide planet table with a grouped listing: one block per star,
  its planets nested beneath it, in the order the generator emitted the stars (primary first).
- A per-star orbital map, so every star's planets have a picture, not just the primary's.
- The reading of a star with no planets.
- Preserving planet-row interaction exactly: click / Enter / Space selects the planet by its
  composite key and opens `PlanetDetailPanel`, with no navigation (D-32).
- Narrow-width behaviour of the new listing.
- Moving the new grouping into `frontend/src/composables/useSectorStats.ts`, per the project rule
  that components aggregate nothing.
- Updating the affected tests.

**Out of scope — explicitly**

- **The backend, the API contract and the shared types.** This is a presentation change, exactly
  as D-1 frames the redesign. `backend/src/**`, `backend/src/types/index.ts`,
  `frontend/src/types/index.ts` and `backend/src/lib/example_star_generator.ts` are **not
  modified**. No new field is requested from the API; everything rendered is already in the
  `Sector` payload.
- **The taxonomy (D-36).** No spectral class and no planet code is added, removed or renamed.
- **The artwork (D-37).** `frontend/public/images/` is untouched; `CelestialThumb` is used as-is.
- The breadcrumb bar and the KPI strip — unchanged.
- `PlanetDetailPanel.vue` — unchanged.
- `OrbitalMap.vue` — unchanged (it is *mounted differently*; its own contract is not touched).
- The sector-wide Planets tab (`PlanetTable.vue`, 4a) and Systems tab (`SystemsTable.vue`, 3a) —
  unchanged.
- Sorting, filtering or paging controls on the system detail screen. There are none today and
  none are added; a system holds at most a few dozen bodies.

---

## 2. Assumptions & Decisions

Each entry is a decision the draft left open, made here, with its precedent. They are numbered
`S-n` so stories and reviews can cite them, and deliberately kept separable so any one can be
overridden without unpicking the rest.

**S-1 · The two regions are replaced by one full-width stack of star groups; the rail is not
kept alongside.**
The draft's shape (`Star 1 → planet 1..n`, `Star 2 → planet 1..n`) is a single listing. Keeping
the rail *and* grouping the table would state each star twice and leave the same two-places-to-
look problem in a milder form. The rail's content is not lost: every field it showed (thumbnail,
name, `class · label`, mass/temp/planet-count facts) becomes the group header, at the same font
sizes and colours. The `lg:grid-cols-[300px_1fr]` split is therefore removed and the region is
one column at every width.

**S-2 · Group order is the payload order of `SystemRow.stars`; planet order within a group is
`orbitalNumber` ascending.**
`useSectorStats`' index pushes stars in payload order, and `systemRows.primaryStar` is documented
as `bucket.stars[0]` — "component A: the first star the generator emitted". So payload order is
already the project's definition of primary-first, and the rail already relied on it. Orbital
order within a star is what the current table intends and what `OrbitalMap` sorts by
(`OrbitalMap.vue`, `ordered`). Both orders are seed-stable, so a link shared between two readers
shows the same page.

**S-3 · A star with no planets keeps its group, shows its header, and reads
"No planets orbit this star." — with no orbital map.**
Barren stars are common, not exceptional: `determineStarCount()` in
`backend/src/lib/example_star_generator.ts` makes 60% of systems multi-star, and every star in a
multi-star system has its planet count reduced by `1d6+1`, so zero is a frequent outcome; `NS`
and `BH` (L = 0) never get planets at all. Dropping such a star from the listing would hide a
real body of the system — the exact failure the current rail was added to prevent (its comment:
"so a secondary that the map leaves out is still listed"). Rendering an `OrbitalMap` for it would
paint a 150px gradient box whose only content is the string "no planetary bodies", directly under
a header that already says "0 planets" — two statements of nothing. So: group yes, header yes,
one line of prose, no map.

**S-4 · Each star carries its own orbital map, in the `compact` variant, inside its group
header. The single primary-only map at the top is removed.**
This is the largest genuine choice, and it departs from `new-design.md` §"1d System detail"
("`OrbitalMap.vue` shows the **primary star only**"). Reasons to depart:

- The draft's stated defect — "it's difficult to understand which planet orbits which star" — is
  caused as much by the map as by the table. A primary-only map at the top of a page whose list
  below is organised per star leaves the page with two contradictory organising ideas.
- Each map is scaled to *its own* star's habitable-zone bounds (`habitableZoneBounds(spectralClass)`)
  and to its own planets' distances. A secondary's planets cannot be read against the primary's
  scale at all, so there is no correct way to show them on one map. **Measured**, on UG-0052 of
  seed 644212: the A group's axis runs 0.067–0.39 AU and the B group's 0.059–6.5 AU, a factor of
  sixteen. B's outer planets have no position on A's axis.
- It costs no change to `OrbitalMap.vue`: it already takes `star` + `planets` props and already
  ships a `compact` variant, mounted in the planet panel.
- The design mock (`STORIES/SPECS/design_handoff_universe_generator_ui/screenshots/1d-system-detail.png`)
  happens to show a system whose secondary has **zero** planets, so the mock never exercises the
  case the draft is complaining about. The design is not evidence against this change; it is
  silent on it.

**Compact, in the header, rather than the full map stacked under it.** The first draft of this
decision put a full 150px map inside each group, below the star header. Prototyped against the
running app, that is the worse of the two:

- It is redundant with the table directly beneath it. Both enumerate the same planets, one with
  labels and one with rows. The `compact` variant instead does a *different* job — the shape of
  the system at a glance — and leaves the detail to the table, which is a division of labour
  rather than a repetition.
- Four full maps on a four-star system add roughly 600px of scroll. Four 56px strips inside
  headers that already exist are nearly free.
- The legibility risk was the reason to doubt it, and it did not materialise: `compact` drops the
  per-planet letters and renders 8–16px bodies, and a nine-planet secondary was still fully
  separated at both 1400px and 900px, because the log scale spreads the crowded inner orbits.

What `compact` gives up, accepted: the per-planet letters, the legend, and the separate HZ rule
captions — it prints one `HZ <inner> – <outer> AU` in its axis row instead. A reader who wants to
know *which* body sits where reads the row beneath it; the map answers "what shape is this
system", which the old one could not answer for a secondary at all.

Cost, accepted: the group header grows from one line to a 56px row. Bounded at four by
`determineStarCount()`, and S-3 gives a barren star no map at all, which is the common secondary.

**Consequence — the `full` variant loses its last consumer.** `OrbitalMap` is mounted in exactly
two places: this view, with the default `full`, and `PlanetDetailPanel.vue`, with `compact`. Once
this view mounts `compact` too, nothing renders `full`, and with it nothing renders the per-planet
letters, the legend, the primary-star bleed, or the per-rule HZ captions — including the
caption-collision fix those captions carry. The component is still *unchanged*, but half of it
becomes unreachable from the app.

This is accepted rather than solved, for two reasons: the alternative is keeping a redundant map
on the page purely to exercise code, and the behaviour stays pinned by the direct-mount tests the
impact table below requires. It is recorded here so that whoever later finds `variant="full"`
apparently unused knows it was made unused deliberately, and by which decision. Removing the
variant is **not** in scope for this spec — that is a separate decision about a shared component,
and a future screen may well want the labelled map back.

**S-5 · The grouping is computed in `useSectorStats`, as a new `starGroups` field on `SystemRow`.**
The project rule is that components aggregate nothing and every count comes from the one indexing
pass (`SystemDetailView.vue`: "Every count on this page comes from the shared indexing pass; the
view itself aggregates nothing"). The index already holds `planetsByStar`, so the grouping is a
read of an existing map plus a sort — no new scan. It is added to `SystemRow` rather than exposed
as a separate sector-wide computed because it is per-system data and `SystemRow` already carries
the per-system `stars` and `planets` arrays it sits beside.

**S-6 · `starGroups` carries `{ starId, star, planets }` and nothing else.**
No `planetCount`, `habitableCount` or `moonCount`: `planets.length` is the count, and the other
two are already available per star from `starRows` if a future screen wants them. Adding derived
fields nothing reads would be speculative.

**S-7 · No new component is extracted; the groups are rendered inline in `SystemDetailView.vue`.**
The group block is used in exactly one place. The project's precedent for a row-and-header block
is to inline it (`PlanetTable.vue` and `SystemsTable.vue` both render their rows inline inside a
`v-for`). The view's script gets *shorter* — `starEntries`, `planetRows` and `primaryPlanets`
collapse into one `groups` computed.

**S-8 · The column header row (`# / PLANET / TYPE / Ø KM / TEMP / MOONS / ZONE`) repeats once per
group, not once for the section.**
Maps and star headers sit between the groups, so a single header at the top would be far from,
and visually detached from, the second and later groups. Each group is a self-contained small
table. The header keeps its current styling (mono 9px, `tracking-[.12em]`, `text-faint`).

**S-9 · The "PLANETS · n" section header is replaced by one thin band reading `STARS & PLANETS`
with the hint `each star with the planets that orbit it`.**
The counts it repeated (`n`) are already the second cell of the KPI strip immediately above, and
the per-star counts now live in each group header. The band keeps the screen's existing grammar —
a mono `.14em` `text-dim` label on the left, a 9px `text-faint` hint on the right — which is
exactly what the current row does with "sorted by orbital number".

**S-10 · Narrow widths: only the planet grid scrolls sideways; the star header never does.**
The existing pattern (`overflow-x-auto` around a `min-w-[620px]` grid) is kept, but scoped to each
group's planet grid alone. The star header, the map and the empty line stay in normal flow and are
always visible without horizontal scrolling — the header is precisely the thing the reader needs
in view to know whose planets these are, so it must not be the thing that scrolls away. The
7-column grid is not reflowed into cards below 620px; that would be a second layout to design and
test, and the current screen does not do it. See §7.

**S-11 · The star name becomes an `<h2>`, and each group is a labelled `role="group"`.**
The system name is already the page's `<h1>` (`data-system-name`). Making the star name an `<h2>`
with the group `aria-labelledby` it means a screen reader announces "which star" when entering a
group of rows — the same information the sighted change delivers. `OrbitalMap`'s existing
`sr-only` summary (`data-map-summary`) already names its own star, so each map stays
self-describing.

**S-12 · The planet row's markup, key, handlers, classes and `aria-label` are carried over
verbatim.**
Same `data-planet-row="<starId>-<orbitalNumber>"`, same `role="button"`, `tabindex="0"`,
`aria-label="Open detail for <name>"`, same `@click` / `@keydown.enter` / `@keydown.space` calling
`store.selectPlanet(key)`, same `ug-row` / `ug-row-habitable` / focus-outline classes, same
`CelestialThumb` sizing and `LIFE` badge. Nothing about D-32's deep link changes: the key is
unchanged, `usePlanetDeepLink()` is still called once by the view, and the panel still opens over
the page without a route change.

**S-13 · The system-level empty state (`data-empty`, "This system has no planets.") is removed.**
Every star now states its own emptiness (S-3), and every system has between 1 and 4 stars
(`determineStarCount()` never returns 0), so a system with no planets renders as a stack of star
groups each carrying the empty line — which says more than one sentence at the bottom of an empty
table did. The `data-system-missing` state (system not in the loaded sector) is unrelated and is
kept exactly as it is.

**S-14 · The facts line keeps its current wording, including "1 planets".**
The line is `<mass> M☉ · <temp> K · <n> planets` today and the pluralisation is wrong at n = 1.
Fixing it is unrelated to this feature and would change a passing assertion for no reason the
draft asked for; it is recorded under **Future Considerations** instead. *This is a deliberate
non-change.*

**S-15 · `OrbitalMap`'s `highlightKey` prop stays unused by this view.**
Passing `store.selectedPlanetKey` would ring the open planet on its star's map, and the prop
already exists — but the draft did not ask for it and it is a separable improvement. Recorded
under **Future Considerations**.

**S-16 · Groups are not collapsible and do not stick to the top on scroll.**
Neither was asked for, both add state and interaction to test, and the bounded group count (≤ 4)
makes the page navigable without them. Recorded under **Future Considerations**.

**S-17 · Open risk — `OrbitalMap` instance count.** (Unchanged by S-4's move to `compact`: the
listeners are per instance, not per variant, and the count is the same.)
Each map registers a `window.resize` listener and a `ResizeObserver` on mount and tears both down
on unmount (`OrbitalMap.vue`, `onMounted`/`onBeforeUnmount`). Mounting up to 4 instead of 1 means
up to four listeners on this screen. Bounded by `determineStarCount()` ≤ 4, symmetric teardown is
already implemented and already exercised by the panel's `compact` map, so this is judged safe —
but it is a change in instance count on a shared component and is recorded as a risk rather than
left implicit. Verification: the DOM tests unmount every wrapper in `afterEach`, and the
narrow-width HZ-caption tests must be re-pointed at a specific map (§10) rather than at "the"
map.

---

## 3. Architecture / Design Overview

No architectural change. The screen keeps its place in the existing chain:

```
router  /system/:id
  └─ views/SystemDetailView.vue
       ├─ composables/useSectorStats.ts   ← all aggregation (unchanged rule, one new field)
       ├─ composables/usePlanetDeepLink.ts ← unchanged (D-32)
       ├─ components/OrbitalMap.vue        ← unchanged component, mounted once per non-empty group
       ├─ components/CelestialThumb.vue    ← unchanged
       └─ components/PlanetDetailPanel.vue ← unchanged
```

### The shape, after

```
┌ breadcrumb ─────────────────────────────────────────────── unchanged ──┐
├ 5-up KPI strip ──────────────────────────────────────────── unchanged ─┤
├ STARS & PLANETS                   each star with the planets that orbit it
│ ┌ [data-star-group="1"] ──────────────────────────────────────────────┐│
│ │ (o)  Kepler-442 A    ░░▒▒▓▓ ·  · │· ·│   ·    ·    ·   ← compact,  ││
│ │      K-4 · Orange dwarf   0.4 AU  HZ 0.7 – 1.4 AU  12 AU  in the   ││
│ │      0.61 M☉ · 4 402 K · 7 planets         ← [data-star-facts]      ││
│ ├─────────────────────────────────────────────────────────────────────┤│
│ │ #  PLANET      TYPE      Ø KM   TEMP  MOONS   ZONE   ← per group    ││
│ │ 1  Kepler-442 b  Molten  6 118  1 022     0   [HOT]   ┐             ││
│ │ 2  Kepler-442 c  Desert  9 240    412     1   [TEMP]  │ scrolls     ││
│ │ 3  Kepler-442 d  Earth… 13 402    288     2   [GOLD]  │ sideways    ││
│ │ …                                                     ┘ below 620px ││
│ └─────────────────────────────────────────────────────────────────────┘│
│ ┌ [data-star-group="2"] ──────────────────────────────────────────────┐│
│ │ (·)  Kepler-442 B                                                   ││
│ │      DA · White dwarf                                               ││
│ │      0.73 M☉ · 9 800 K · 0 planets                                  ││
│ │      No planets orbit this star.           ← [data-star-empty="2"]  ││
│ └─────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

### Data flow

`route.params.id` → `stats.systemRows` → the matching `SystemRow` → `row.starGroups` → one
rendered block per group. Display-only derivations that are *not* aggregates stay in the view, as
they do today: the star thumbnail size (52–64px by mass relative to the system's heaviest star),
the planet thumbnail size (18–28px by diameter relative to the group's largest planet), the class
code string, the short labels (D-21) and the facts line.

One incidental improvement falls out of S-5. Today the view resolves each star's planet count with
`stats.starRows.value.find(entry => entry.starId === star.starId)` — a linear scan of the
**sector's** star list, run once per star on screen. In a 3 000-star sector that is up to 12 000
comparisons per render for a 4-star system. `starGroups` removes the lookup entirely.

---

## 4. Configuration

**No configuration required.** No environment variable, feature flag, config file or build setting
is introduced or modified. `frontend/vite.config.ts`, `frontend/package.json` and
`.github/workflows/test.yml` are untouched — the new tests are added to files the existing Vitest
projects already match (`src/**/*.test.ts` for node, `src/**/*.dom.test.ts` for jsdom).

---

## 5. Data Model

**No persistence, no schema, no migration.** Nothing is stored server-side, and `localStorage`
usage is unchanged (D-14: generation parameters only, written after a successful generation).

One **in-memory view-model type** is added, in `frontend/src/composables/useSectorStats.ts`:

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

and one field is added to the existing `SystemRow` interface in the same file:

```ts
export interface SystemRow {
    // … every existing field, unchanged …
    /** One group per star, in payload order (primary first). */
    starGroups: StarPlanetGroup[];
}
```

Built inside the existing `systemRows` computed, off the index that is already there:

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

**Invariants** (each is a test in §10):

| Invariant | Why it holds |
| --- | --- |
| One group per star, in `bucket.stars` order | `bucket.stars` is built by pushing in payload order |
| `sum(group.planets.length) === row.planetCount` | The index pushes a planet into its bucket and into `planetsByStar` under the same `starsById.get(planet.starId)` guard, so a planet counted in `bucket.planets` is always in exactly one group of that bucket |
| A star with no planets yields `planets: []` | `planetsByStar.get` misses and falls back to `[]`; the group is still emitted |
| A planet whose star is absent from the payload is in no group | It is skipped by the index's `if (!star) continue`, exactly as it is skipped by `planetRows` and `orbitBands` today |
| Keys `${starId}-${orbitalNumber}` are unique within a group | All planets in a group share one `starId`; `orbitalNumber` is unique per star by construction (D-32) |

No enum, no value object, no index. The type sets are untouched (D-36).

---

## 6. Impact on Existing Code

| File | Action | Change | Regression class |
| --- | --- | --- | --- |
| `frontend/src/composables/useSectorStats.ts` | modify | Export `StarPlanetGroup`; add `starGroups` to `SystemRow`; build it in the `systemRows` computed | **Additive / backward-compatible** — see below |
| `frontend/src/views/SystemDetailView.vue` | modify | Replace the stars rail + system-wide planet table + top-level orbital map with the grouped listing (§7) | **Deliberate change to this view's own DOM contract** — see below |
| `frontend/src/components/systemDetail.dom.test.ts` | modify | Re-point the assertions that pinned the old shape; add the new ones (§10) | Test-only |
| `frontend/src/composables/useSectorStats.test.ts` | modify | Add a `starGroups` describe block (§10) | Test-only, purely additive |
| `frontend/src/components/OrbitalMap.vue` | **unchanged** | Consumed with different props at a different mount count; its own props, events and rendering are not touched | — |
| `frontend/src/components/PlanetDetailPanel.vue` | **unchanged** | — | — |
| `frontend/src/components/CelestialThumb.vue` | **unchanged** | — | — |
| `frontend/src/composables/usePlanetDeepLink.ts` | **unchanged** | — | — |
| `frontend/src/stores/sectorStore.ts` | **unchanged** | `selectPlanet` / `selectedPlanetKey` used exactly as today (D-13) | — |
| `frontend/src/style.css` | **unchanged** | The grouped listing needs no new class: it uses existing tokens (`bg-panel`, `border-line-strong`, `border-line-soft`, `border-line-hairline`, `text-dim`, `text-faint`, `text-muted`, `text-ink`, `text-ink-2`) and the existing `ug-row`, `ug-row-habitable`, `ug-badge ug-badge-life` classes | — |
| `frontend/src/router/index.ts` | **unchanged** | Same route, same component | — |
| `frontend/src/types/index.ts`, `backend/src/**` | **unchanged** | D-1: presentation change only | — |

### Regression review of the two modified source files

**`useSectorStats.ts` — additive, backward-compatible.**
No existing field of `SystemRow` changes name, type or meaning; `stars` and `planets` both remain
and remain populated as they are today. The consumers are:

- `frontend/src/components/SystemsTable.vue` — `interface DisplayRow extends SystemRow` and reads
  `systemRows`. A structurally-typed extra property is transparent to it; `starCode()`,
  `row.planets` (the orbit profile) and every column keep working unchanged.
- `frontend/src/components/OverviewPanel.vue` — passes `stats.systemRows.value` to
  `NotableSystems` as `rows: SystemRow[]`. Unaffected.
- `frontend/src/components/NotableSystems.vue` — types its `rows` prop as `SystemRow[]` and reads
  display fields. Unaffected.
- `frontend/src/composables/useSectorStats.test.ts` — asserts `SystemRow` shape with
  `toMatchObject` (line 284) and `expect(empty.systemRows.value).toEqual([])` on an *empty*
  sector (line 407), which stays `[]`. **No deep-equality assertion on a populated `SystemRow`
  exists**, so no existing assertion is broken by the new field. *Verified by reading the file,
  not assumed.*

Cost: one extra array and object per star of the sector, inside a computed that already allocates
one sorted array per system. It reuses `planetsByStar`, which the index builds regardless, so no
new traversal of the planet list is introduced.

**`SystemDetailView.vue` — a deliberate, contained change to this view's rendered contract.**
The view is not imported by any component; its only consumer is `frontend/src/router/index.ts`
(by route) and its only assertion surface is `frontend/src/components/systemDetail.dom.test.ts`.
Nothing outside the view queries its `data-*` attributes — verified by grepping the whole of
`frontend/src` for `data-stars-rail`, `data-star-entry`, `data-star-facts`, `data-planets-header`
and `data-empty`; every hit outside this view belongs to a different component's own tests.

These previously-pinned behaviours are being changed **on purpose**, and each must be re-expressed
rather than deleted:

| Pinned behaviour (today) | Becomes | Migration |
| --- | --- | --- |
| `systemDetail.dom.test.ts:157` — the map draws only `['1-1','1-2','1-3','1-4']` | One map per non-empty group, each drawing its own star's planets | Rewrite the assertion per group; keep the "a group's map never shows another star's planet" guarantee |
| `:372` — one flat row list `['1-1','2-1','1-2','1-3','1-4']` | `['1-1','1-2','1-3','1-4']` inside group 1 and `['2-1']` inside group 2 | Rewrite; this row order *is* the defect |
| `:369` — `data-planets-header` reads `PLANETS · 5` | `data-contents-header` reads `STARS & PLANETS` (S-9) | Rewrite |
| `:377-380` — exactly one `OrbitalMap`, `star.starId === 1` | One per non-empty group; group 1's map has `star.starId === 1` | Rewrite |
| `:281-298` — `OrbitalMap`'s "no planetary bodies" empty state, reached through an NS primary on this view | The view no longer mounts a map for a barren star (S-3), so this path is unreachable **from this view** | **Do not delete the coverage.** Re-express it as a direct `mount(OrbitalMap, { props: { star, planets: [] } })` so the component's empty state, absent HZ rules, absent axis captions and empty summary line stay pinned |
| `:224-278` — the HZ-caption merge at narrow widths | **Unreachable from this view.** The merge is a `full`-variant behaviour: `compact` renders no per-rule captions at all, printing one `HZ <inner> – <outer> AU` in its axis row instead | **Do not delete the coverage.** Re-express it as a direct `mount(OrbitalMap, { props: { …, variant: 'full' } })`, alongside the empty-state relocation above, so the caption-collision fix stays pinned |
| `:163-173` — the rail lists every star with its own planet count | Every star has a group header with the same fields | Re-point at `[data-star-group]` / `[data-star-entry]`; the guarantee "a secondary is not hidden" is strengthened, not dropped |
| `:335-345` — a change of `:id` re-renders | Unchanged | Keep as-is |
| `:383-389` — `data-system-missing` for an unknown system | Unchanged | Keep as-is |
| `:392-397` — `PlanetDetailModal.vue` no longer exists | Unrelated | Keep as-is |

No other feature reads this view's markup, so the blast radius of the breaking change is the one
test file named above. There is no data migration, no deprecation window and no public contract
involved — no URL, no query parameter, no store field and no API response shape changes.

---

## 7. Vue 3 / Vite / TypeScript sections

The stack is a TypeScript monorepo: Express backend, Vue 3 SPA frontend (Composition API,
`<script setup>`, Pinia, Vue Router, Tailwind v4, Vitest). Only the frontend is touched. The
framework-specific sections that apply are Router, Store, Composables, Components and Styling.

### 7.1 Router

**Unchanged.** `/system/:id` → `SystemDetailView` (`frontend/src/router/index.ts`). No new route,
no new query parameter. The `?planet=<starId>-<orbitalNumber>` deep link (D-32) is written and
read by `usePlanetDeepLink()` exactly as today.

### 7.2 Store

**Unchanged** (D-13). The view reads `store.currentSeed`, `store.sectorData`, `store.zone`,
`store.selectedPlanetKey` and `store.getSystemById`, and calls `store.selectPlanet(key)` — all as
today.

### 7.3 Composable — `useSectorStats.ts`

Add `StarPlanetGroup` and the `starGroups` field, per §5. `starGroups` is **not** added to the
composable's returned object as a separate top-level key: it is reached through `systemRows`,
which is the existing route to per-system data.

### 7.4 Component — `SystemDetailView.vue`

Everything above the content region is untouched: `data-breadcrumb`, `data-system-readout`,
`data-system-kpi`, `data-system-missing`, and the `<PlanetDetailPanel>` mount at the end.

**Removed from the template:** the top-level `<OrbitalMap>` block, the
`grid lg:grid-cols-[300px_1fr]` wrapper, the `<aside data-stars-rail>`, the
`data-planets-header` bar, the single planet grid, and the `data-empty` paragraph.

**Added in their place**, directly after the KPI strip:

```
<section data-system-contents>
  <div>                                            ← thin band, S-9
    <span data-contents-header>STARS &amp; PLANETS</span>
    <span>each star with the planets that orbit it</span>
  </div>

  <article v-for="group in groups" :key="group.starId"
           :data-star-group="group.starId"
           role="group" :aria-labelledby="`star-name-${group.starId}`">

    <header :data-star-entry="group.starId">      ← the old rail entry, full width
      <CelestialThumb kind="star" :code="group.spectralClass" :px="group.px" />
      <h2 :id="`star-name-${group.starId}`">{{ group.name }}</h2>
      <span>{{ group.classCode }} · {{ group.classLabel }}</span>
      <span data-star-facts>{{ group.facts }}</span>
      </div>                                      ← the identity block ends here

      <div v-if="group.rawPlanets.length" class="min-w-0 flex-1">   ← S-4: in the header
        <OrbitalMap :star="group.star" :planets="group.rawPlanets" variant="compact" />
      </div>
    </header>

    <p v-if="group.planets.length === 0" :data-star-empty="group.starId">
      No planets orbit this star.
    </p>

    <template v-else>
      <div class="overflow-x-auto">               ← S-10: only this scrolls
        <div class="min-w-[620px] px-[18px]">
          <div :class="GRID"> # PLANET TYPE Ø KM TEMP MOONS ZONE </div>   ← S-8
          <div v-for="planetRow in group.planets" … :data-planet-row="planetRow.key" …>
            … the seven cells, verbatim from today …
          </div>
        </div>
      </div>
    </template>
  </article>
</section>
```

**Styling, all from existing tokens and precedent:**

| Element | Classes / values |
| --- | --- |
| Section band | `flex items-baseline justify-between gap-3 border-b border-line-strong px-[18px] py-[12px]`; label `font-mono font-semibold text-[10px] tracking-[.14em] text-dim`; hint `font-mono text-[9px] text-faint` — identical to today's `data-planets-header` row |
| Group container | `border-b border-line-strong` (the last group may keep it; the page ends below it) |
| Group header | `flex items-center gap-3 bg-panel px-[18px] py-[12px]`; the `bg-panel` carries the rail's tint across to the header band so a group reads as one object |
| Star name `<h2>` | `truncate font-sans font-semibold text-[14px] text-ink` (unchanged from the rail) |
| Class line | `truncate font-mono text-[10px] text-muted` (unchanged, D-21) |
| Facts line | `truncate font-mono text-[9px] text-faint` (unchanged, S-14) |
| Empty line | `px-[18px] py-[14px] font-sans text-[12px]` with `style="color: #475569"` — the same colour and idiom the removed `data-empty` used |
| Column header | `border-b border-line-strong py-[10px] font-mono font-medium text-[9px] tracking-[.12em] text-faint` (unchanged) |
| Planet row | `ug-row cursor-pointer border-b border-line-hairline py-[10px] transition-colors duration-150 focus:outline focus:outline-acc-blue`, plus `ug-row-habitable` when `habitableZone` (unchanged) |
| `GRID` | `grid items-center gap-[10px] grid-cols-[38px_1.3fr_1fr_84px_78px_70px_92px]` — the existing constant, unchanged |

**Script, after:**

```ts
const groups = computed(() => {
    const target = row.value;
    if (!target) return [];
    const maxMass = target.stars.reduce(
        (max, star) => Math.max(max, starPhysical(star.spectralClass).mass), 0);

    return target.starGroups.map(group => {
        const physical = starPhysical(group.star.spectralClass);
        const temp = physical.effectiveTemp > 0
            ? `${thinThousands(physical.effectiveTemp)} K` : '—';
        const maxDiameter = group.planets.reduce(
            (max, planet) => Math.max(max, planet.diameter), 0);

        return {
            starId: group.starId,
            star: group.star,
            name: group.star.name,
            spectralClass: group.star.spectralClass,
            classCode: group.star.subclass === undefined
                ? group.star.spectralClass
                : `${group.star.spectralClass}-${group.star.subclass}`,
            classLabel: starShortLabel(group.star.spectralClass),
            // Handoff 1d: 52-64px, sized by mass relative to the heaviest star.
            px: maxMass > 0 ? Math.round(52 + 12 * (physical.mass / maxMass)) : 52,
            facts: `${physical.mass.toFixed(2)} M☉ · ${temp} · ${group.planets.length} planets`,
            planets: group.planets.map(planet => ({
                key: `${planet.starId}-${planet.orbitalNumber}`,
                orbitalNumber: planet.orbitalNumber,
                name: planetDisplayName(planet, group.star),
                planetType: planet.planetType,
                diameter: planet.diameter,
                temperature: planet.temperature,
                moonCount: planet.moonCount,
                habitableZone: planet.habitableZone,
                hasLife: planet.hasLife,
                zone: thermalZone(planet),
                px: maxDiameter > 0
                    ? Math.round(18 + 10 * (planet.diameter / maxDiameter)) : 18
            }))
        };
    });
});
```

`starEntries`, `planetRows` and `primaryPlanets` are deleted. `openPanel` is unchanged. Note two
sizing details carried over deliberately: the star thumbnail is sized against the **system's**
heaviest star (so groups stay comparable to one another, as the rail did), while the planet
thumbnail is sized against the **group's** largest planet (matching `OrbitalMap`, which also
scales per star). All imports stay except `starDisplay`/`starPhysical`/`planetDisplay` usage,
which is unchanged; no import becomes unused.

### 7.5 Components not modified

`OrbitalMap.vue`, `PlanetDetailPanel.vue`, `CelestialThumb.vue` — used as-is, with their existing
props. `OrbitalMap` is given `variant="compact"` (S-4) and no `highlightKey` (S-15).

**It must be handed the raw planets, not the group's display rows.** `groups[].planets` is a
view-model built for the table — `key`, `name`, `planetType`, the formatted cells — and carries
neither `starId` nor `semiMajorAxis`. Passing it to `OrbitalMap` fails *silently*: the domain
collapses, every body renders at `left: 50%`, and both axis captions read `—`, with no error
anywhere. So `groups[]` also carries `rawPlanets: group.planets` straight off `starGroups`, and
that is what the map is given. This was found by prototyping, not by reading.

---

## 8. Validation Rules

**No user input is introduced.** The screen has no form, no filter, no search box and no editable
field, so there is nothing to validate at the input layer. The rules that apply are the existing
data-integrity rules the view must honour:

| Rule | Where enforced | Behaviour |
| --- | --- | --- |
| The route's `:id` must name a system in the loaded sector | `SystemDetailView.vue`, `row`/`system` computeds | Falls through to `data-system-missing` — unchanged |
| A planet whose `starId` is absent from the payload is not rendered | `useSectorStats` index (`if (!star) continue`) | Excluded from `bucket.planets` and from every group — unchanged behaviour, now also covered by a group test |
| A star with `effectiveTemp === 0` (NS, BH) | View, facts line | Prints `—`, never `0 K` — unchanged |
| `maxMass === 0` / `maxDiameter === 0` | View, thumbnail sizing | Falls back to the base size; no division by zero — unchanged |
| The planet panel key must match `/^\d+-\d+$/` **and** resolve in the loaded sector | `usePlanetDeepLink.ts` | Unchanged (D-32) |
| Group keys are unique | Vue `:key="group.starId"` | `starId` is unique across the sector by construction |

---

## 9. Authorization & Security

**No authorization model exists in this application and none is introduced.** The backend exposes
a single unauthenticated generation endpoint (`POST /api/sector/generate`) and the frontend is a
public SPA; there are no users, sessions, roles or ownership. Every visitor can perform every
action.

| Action | Who | Enforcement |
| --- | --- | --- |
| View a system's detail | Anyone with the URL | None required — the sector is generated client-side-triggered and held in memory |
| Open a planet's detail panel | Anyone | None required |

Security considerations relevant to this change:

- **No new network call, no new endpoint, no new query parameter.** The attack surface is
  unchanged. Rate limiting, CSRF and CORS are untouched (CORS is configured in
  `backend/src/index.ts` and is not modified).
- **No `v-html` and no dynamic HTML.** Star and planet names come from the generator and are
  rendered as text through interpolation, which Vue escapes. This is the same handling as today;
  the change must not introduce `v-html` anywhere.
- **No new persistence.** Nothing is written to `localStorage` (D-14 unchanged), so no new stored
  data and no new deserialization path.
- **The `aria-labelledby` id `star-name-<starId>`** is built from a numeric `starId`, so it cannot
  inject markup or collide with another element's id on this page.

---

## 10. Testing

Framework and conventions are the project's existing ones. Frontend tests run with
`cd frontend && npm test` (`vitest run`), across two projects declared in
`frontend/vite.config.ts`: `node` for `src/**/*.test.ts` and `jsdom` for `src/**/*.dom.test.ts`,
using `@vue/test-utils` + Pinia + a memory-history router, with `axios` mocked. **Baseline
verified before writing this spec: 29 files, 494 tests, all passing.** No backend test changes.

### 10.1 `frontend/src/composables/useSectorStats.test.ts` (node project) — new `describe('starGroups')`

Uses the file's existing `FIXTURE` (3 systems, 5 stars including a `BH`, 9 planets); system 1 has
star 1 (G, 3 planets) and star 2 (M, 2 planets), which is exactly the interleaving case.

1. **One group per star, in payload order.** `systemRows[0].starGroups.map(g => g.starId)` equals
   `[1, 2]`.
2. **Each group carries its own star object.** `starGroups[0].star.starId === 1` and
   `starGroups[0].star.spectralClass === 'G'`.
3. **A group holds only its star's planets.** Every planet in `starGroups[0].planets` has
   `starId === 1`; every planet in `starGroups[1].planets` has `starId === 2`.
4. **Planets are ordered by `orbitalNumber` ascending** within each group, and the flat
   `row.planets` interleaving (`[1, 1, 2, 2, 3]`, pinned at line 297) does **not** appear inside
   any single group.
5. **Totality.** For every system row, `starGroups.reduce((n, g) => n + g.planets.length, 0)`
   equals `row.planetCount`.
6. **A star with no planets keeps an empty group.** System 3's `BH` (star 4) yields a group with
   `planets: []` — the group is present, not omitted.
7. **A planet whose star is absent from the payload appears in no group.** Build a sector with a
   planet on `starId: 999` and assert it is in no `starGroups` entry and not in `row.planets`.
8. **An empty sector.** `useSectorStats(ref(null)).systemRows.value` is `[]` and does not throw
   (extends the existing empty-sector case at line 407).
9. **Existing `systemRows` assertions still pass unchanged** — the `toMatchObject` block at line
   284 is not edited, proving the field is additive.

### 10.2 `frontend/src/components/systemDetail.dom.test.ts` (jsdom project)

The existing `KEPLER` fixture (G primary with 4 planets, M secondary with 1) and `EXOTIC` fixture
(NS primary with 0 planets, M secondary with 1) already express both cases and are reused.

**The grouped listing**

10. **One group per star, in payload order.** `[data-star-group]` attributes equal `['1', '2']`
    for `KEPLER`.
11. **Each group header names its star, its class and its facts.** Group 1's `[data-star-entry]`
    contains `Kepler-442 A`, `G-2 · Yellow dwarf` and a `[data-star-facts]` containing
    `4 planets`; group 2's contains `Kepler-442 B` and `1 planets`.
12. **Planets are nested under their own star, in orbital order.** Inside `[data-star-group="1"]`,
    `[data-planet-row]` equals `['1-1', '1-2', '1-3', '1-4']`; inside `[data-star-group="2"]` it
    equals `['2-1']`.
13. **No planet row exists outside a group.** Every `[data-planet-row]` in the wrapper has a
    `[data-star-group]` ancestor whose id matches the row key's `starId`.
14. **The old interleaved flat list is gone.** The document-order list of all `[data-planet-row]`
    keys is `['1-1','1-2','1-3','1-4','2-1']` — never the old `['1-1','2-1','1-2','1-3','1-4']`.
    *This is the regression test for the defect the draft reports.*
15. **The section band.** `[data-contents-header]` reads `STARS & PLANETS`, and
    `[data-planets-header]` and `[data-stars-rail]` no longer exist.

**The orbital maps**

16. **One map per non-empty group.** `KEPLER` renders two `OrbitalMap` components; the one inside
    group 1 has `star.starId === 1` and `planets` of length 4; the one inside group 2 has
    `star.starId === 2` and `planets` of length 1.
17. **A map draws only its own star's planets.** Group 2's `[data-map-planet]` keys equal
    `['2-1']`; group 1's equal `['1-1','1-2','1-3','1-4']`.
18. **Each map belongs to its own star, and says which.** `compact` renders no
    `[data-map-header]` — that element is gated on the full variant — so the binding is the
    group: group 2's `[data-orbital-map]` sits inside `[data-star-group="2"]`, whose `<h2>` names
    Kepler-442 B, and the map's own `[data-map-summary]` names that star's planets.
19. **A barren star renders no map and states its emptiness.** For `EXOTIC`,
    `[data-star-group="9"]` contains no `[data-orbital-map]` and its `[data-star-empty="9"]` reads
    `No planets orbit this star.`; `[data-star-group="10"]` contains a map and the row `10-1`.
20. **The projection is unchanged per group.** Group 1's node positions still match
    `orbitalProjection([0.4, 1.0, 2.5, 8.13], hzInner('G'), hzOuter('G'))`, and the sizing rule
    (`20 + 24 × d/dMax`, belts at 14px) and the axis captions (`0.32 AU` / `8.9 AU`) still hold —
    the existing assertions, re-pointed at group 1's map.
21. **The HZ-caption merge still works, per map.** The existing narrow/wide/re-split/unmeasured
    cases run against the `[data-map-box]` **inside `[data-star-group="1"]`**, not against a bare
    document-wide selector.

**Planet-row behaviour preserved (S-12)**

22. **Click selects the planet by composite key.** Clicking `[data-planet-row="2-1"]` sets
    `store.selectedPlanetKey === '2-1'` and mounts `PlanetDetailPanel`.
23. **Keyboard parity.** `keydown.enter` and `keydown.space` on a row do the same as a click, and
    the row carries `role="button"`, `tabindex="0"` and
    `aria-label="Open detail for <planet name>"`.
24. **No navigation.** After a row click, `router.currentRoute.value.path` is still
    `/system/1` — the panel opens over the page.
25. **A row in a secondary's group opens the right planet.** Clicking `2-1` selects `2-1`, not
    `1-1` — the two are no longer adjacent in the DOM, and this pins that the key travelled with
    the row.
26. **Row decoration survives.** The habitable-zone row (`1-2`) still carries `ug-row-habitable`,
    still shows the `LIFE` badge, and its `[data-cell="zone"]` still reads `GOLDILOCKS`.

**Accessibility (S-11)**

27. **Each group is labelled by its star.** `[data-star-group="1"]` has `role="group"` and an
    `aria-labelledby` pointing at the `<h2>` whose text is `Kepler-442 A`.
28. **Each map keeps its text summary.** Group 2's `[data-map-summary] p` reads
    `Orbital map of Kepler-442 B: 1 body.`

**Narrow widths (S-10)**

29. **Only the planet grid scrolls.** Inside a group, the element with `min-w-[620px]` has an
    `overflow-x-auto` ancestor, and that ancestor does **not** contain the group's
    `[data-star-entry]` header or its `[data-orbital-map]`.

**Unchanged behaviour that must not regress**

30. **The breadcrumb and KPI strip.** The existing assertions (back link `← SECTOR 482913`, system
    name, `IAU`, `LIFE DETECTED`, `4.2 Gyr`, the five KPI cells with `2 / 5 / 15 / 1 / 1.30`) pass
    unedited.
31. **A change of the `:id` param re-renders** — existing test, unedited.
32. **An unknown system shows `data-system-missing`** and no `[data-orbital-map]` — existing test,
    unedited.
33. **`PlanetDetailModal.vue` still does not exist** — existing test, unedited.

### 10.3 Relocated coverage — `OrbitalMap`'s own empty state

The view no longer mounts a map for a barren star (S-3), so the assertions at
`systemDetail.dom.test.ts:281-298` lose their route. They are **re-expressed, not deleted**, as a
direct component mount in the same file:

34. `mount(OrbitalMap, { props: { star: <an NS star>, planets: [] } })` renders
    `[data-map-empty]` reading `no planetary bodies` in `rgb(51, 65, 85)`, renders no
    `[data-hz-rule]`, no `[data-map-planet]` and no `[data-map-axis]`, and its
    `[data-map-summary] p` reads `Orbital map of UG-0007-A: no planetary bodies.`

### 10.4 Manual verification

Run `npm run dev` from the repo root, generate a sector, and open a **multi-star** system from the
Systems tab (multiplicity is on the Statistics tab; ~60% of systems have 2+ stars). Confirm by eye:

- each star heads its own block, primary first, and every planet sits under the right star;
- a star with no planets shows its header and the one-line message, with no empty map box;
- clicking a planet in a *secondary's* block opens the panel for that planet, the URL gains
  `?planet=<starId>-<orbitalNumber>`, and reloading that URL reopens the same panel;
- at a 375px-wide viewport the star names and maps are fully visible and only the planet grid
  scrolls sideways.

---

## 11. Suggested Story Breakdown

Three vertical slices, each independently shippable and verifiable. story-creator may re-slice.

**Slice 1 — `starGroups` in `useSectorStats` (no visible change).**
Add `StarPlanetGroup` and `SystemRow.starGroups` (§5) plus the §10.1 tests. Nothing renders it
yet; the suite must stay green with every existing assertion unedited, which is the proof the
change is additive. *Depends on: nothing.*

**Slice 2 — the grouped listing replaces the rail and the flat table.**
Rewrite the content region of `SystemDetailView.vue` per §7.4: section band, one group per star,
group header, per-group column header and planet rows, the barren-star line, the a11y grouping and
the per-group horizontal scroller. **The orbital map stays where it is for now** — one map, the
primary's, above the section. Update `systemDetail.dom.test.ts` for §10.2 items 10-15, 22-27, 29,
and keep 30-33 unedited. This slice alone resolves the draft's stated complaint and is a coherent
screen on its own — it is exactly the "leave the map as it is" alternative to S-4, so if S-4 is
overridden on review, slice 2 is the whole feature. *Depends on: slice 1.*

**Slice 3 — one orbital map per star.**
Move the map inside each group, drop the top-level one, omit it for a barren star, and relocate
the `OrbitalMap` empty-state coverage to a direct mount (§10.3). Covers §10.2 items 16-21 and 28.
*Depends on: slice 2.*

---

## 12. Success Criteria

Each is binary pass/fail.

1. On a multi-star system, every planet is rendered inside a block headed by the star it orbits;
   no planet row appears outside a star's block.
2. Star blocks appear in payload order, primary first; planets inside a block are in
   `orbitalNumber` ascending order.
3. For the story-009 `KEPLER` fixture the rendered row order is `1-1, 1-2, 1-3, 1-4, 2-1` and
   never `1-1, 2-1, 1-2, 1-3, 1-4`.
4. Every star of the system has a block, including one with no planets; a star with no planets
   shows its header and the text `No planets orbit this star.` and renders no `OrbitalMap`.
5. Every star that has planets renders exactly one `OrbitalMap`, in the `compact` variant, inside
   its own group header, drawing only that star's planets. It carries no map header of its own —
   the `<h2>` beside it names the star.
6. No `OrbitalMap` is rendered outside a star block.
7. Clicking, or pressing Enter or Space on, a planet row sets `store.selectedPlanetKey` to
   `<starId>-<orbitalNumber>`, opens `PlanetDetailPanel`, and leaves `route.path` at
   `/system/:id`.
8. Reloading a URL carrying `?planet=<starId>-<orbitalNumber>` for a planet on a **secondary**
   star reopens that planet's panel.
9. `[data-stars-rail]` and `[data-planets-header]` no longer exist in the rendered output.
10. Each star block exposes `role="group"` with `aria-labelledby` resolving to an `<h2>` holding
    that star's name.
11. At a 375px viewport, no star name, star thumbnail or orbital map requires horizontal
    scrolling; only the planet grid scrolls sideways.
12. `SystemRow` gains `starGroups` and loses nothing: `SystemsTable.vue`, `OverviewPanel.vue` and
    `NotableSystems.vue` compile and behave unchanged, and every pre-existing assertion in
    `useSectorStats.test.ts` passes unedited.
13. For every system, `sum(starGroups[i].planets.length) === systemRow.planetCount`.
14. `cd frontend && npm test` passes, with a total no lower than the 494-test baseline plus the
    new cases, and `cd frontend && npm run build` (`vue-tsc && vite build`) succeeds with no type
    error.
15. `cd backend && npm test` passes, and `git diff` shows **no change** under `backend/`,
    `frontend/src/types/`, `frontend/public/images/` or `frontend/src/style.css` (D-1, D-36,
    D-37).
16. No `v-html` is introduced.

---

## Future Considerations

Deliberately **not** part of this spec. Each is a separable follow-up.

- **Pluralise the facts line** (S-14): `1 planet` / `0 planets`. A one-line copy fix with one test
  assertion to update.
- **Highlight the open planet on its star's map** (S-15): pass `store.selectedPlanetKey` as
  `OrbitalMap`'s existing `highlightKey`, so opening a planet rings it on the map above its row.
- **Collapsible star blocks and/or a sticky star header** (S-16), for a 4-star system with many
  planets.
- **A jump list of the system's stars** in the breadcrumb bar, anchoring to each block.
- **Reflow the planet grid into cards below 620px** instead of scrolling sideways — a change that
  would apply equally to `PlanetTable.vue` (4a) and should be specced across both screens rather
  than for this one alone.
