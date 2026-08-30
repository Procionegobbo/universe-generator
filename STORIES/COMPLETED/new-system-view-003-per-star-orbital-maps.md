# new-system-view-003-per-star-orbital-maps

**Spec:** STORIES/SPECS/new-system-view.md

**As a** reader viewing a multi-star system's detail page
**I want** every star that has planets to show its own compact orbital map inside its own group
header, not just one full map for the primary sitting above the whole page
**So that** I can see the shape of every star's system, including a secondary's, at a glance —
without the map and the table repeating the same information underneath it

## Acceptance Criteria

**This story is deliberately separable and droppable.** It carries S-4, the one contested decision
in the spec (a departure from `new-design.md` §1d "OrbitalMap shows the primary star only"). If
S-4 is overridden on review, story 002 alone is already a coherent, shippable screen — dropping
this story does not require unpicking 001 or 002.

Uses the existing `KEPLER` fixture (G primary star 1 with 4 planets, M secondary star 2 with 1
planet) and `EXOTIC` fixture (NS primary star 9 with 0 planets, M secondary star 10 with 1
planet).

```gherkin
Feature: One compact orbital map per star, inside its own group header

  Scenario: One map per non-empty group, in the compact variant
    Given the KEPLER system is open
    Then exactly two OrbitalMap components are rendered
    And the one inside [data-star-group="1"]'s header receives star.starId 1, 4 planets,
      and variant "compact"
    And the one inside [data-star-group="2"]'s header receives star.starId 2, 1 planet,
      and variant "compact"

  Scenario: A map is handed its star's raw planets, not the table's display rows
    Given the KEPLER system is open
    Then the OrbitalMap inside group 1's header is given a planets prop whose items carry
      starId and semiMajorAxis — the raw StarPlanetGroup.planets — not the group's
      view-model rows built for the table (key, name, planetType, the formatted cells)
    And group 1's map node positions are NOT all left: 50%, which is what a missing
      semiMajorAxis would silently collapse every body to

  Scenario: A map draws only its own star's planets
    Given the KEPLER system is open
    Then group 2's [data-map-planet] keys are exactly ["2-1"]
    And group 1's [data-map-planet] keys are exactly ["1-1", "1-2", "1-3", "1-4"]

  Scenario: The compact map carries no header, legend or per-planet letters of its own;
    the star's identity comes from the surrounding group header and the map's accessible
    summary
    Given the KEPLER system is open
    Then group 2's OrbitalMap renders no [data-map-header] and no legend (compact suppresses
      both)
    And group 1's [data-map-planet] nodes render no visible orbit-letter span next to the
      planet thumbnail (compact suppresses `node.letter`, gated by the same `v-if="!isCompact"`
      as the header and legend)
    And group 2's [data-star-entry] still contains the <h2> reading "Kepler-442 B"
    And group 2's [data-map-summary] p reads "Orbital map of Kepler-442 B: 1 body."

    <!-- This scenario carries more weight than it looks like it does: there is no
         OrbitalMap.dom.test.ts and no PlanetDetailPanel test file in this repo, so once
         this story lands, systemDetail.dom.test.ts is the ONLY place in the suite that
         exercises compact's suppressions at all. Without this assertion, the Technical
         Notes' claim that "compact drops the per-planet letters" rests on prose alone. -->

  Scenario: A barren star renders no map and states its emptiness
    Given the EXOTIC system is open
    Then [data-star-group="9"] contains no [data-orbital-map]
    And its [data-star-empty="9"] reads "No planets orbit this star."
    And [data-star-group="10"] contains a map and the planet row "10-1"

  Scenario: No OrbitalMap is rendered outside a star block
    Given any system with at least one star is open
    Then every OrbitalMap component in the page has a [data-star-group] ancestor
    And the old top-level, primary-only map block no longer exists

  Scenario: The projection is unchanged per group; sizing follows the compact formula
    Given the KEPLER system is open
    Then group 1's map node positions match
      orbitalProjection([0.4, 1.0, 2.5, 8.13], hzInner('G'), hzOuter('G'))
    And its compact sizing rule (8 + 8 × d/dMax px, belts at 8px) and axis captions
      ("0.32 AU" / "8.9 AU") hold — the axis domain and captions are variant-independent,
      only the body-size formula and the (absent) orbit letters change from the old
      full-variant assertions

  Scenario: The HZ-caption merge behaviour is pinned by a direct full-variant mount, not
    by a map inside a group
    Given OrbitalMap is mounted directly with { star: <the KEPLER G primary>, planets: <its
      4 planets>, variant: 'full' }
    Then the existing narrow / wide / re-split / unmeasured HZ-caption merge behaviour runs
      exactly as it does today, against this direct mount's [data-map-box]
    And no group's compact map is asserted against for this behaviour, because compact
      renders no per-rule [data-hz-caption] at all — it prints one
      "HZ <inner> – <outer> AU" in its axis row instead

  Scenario: Each map keeps its accessible text summary
    Given the KEPLER system is open
    Then group 2's [data-map-summary] p reads "Orbital map of Kepler-442 B: 1 body."
    And group 1's [data-map-summary] still lists all 4 bodies with their type, distance and
      zone, unaffected by the switch to compact

  Scenario: OrbitalMap's own empty state stays covered, mounted directly
    Given OrbitalMap is mounted directly with an NS star and an empty planets array
    Then it renders [data-map-empty] reading "no planetary bodies" in rgb(51, 65, 85)
    And it renders no [data-hz-rule], no [data-map-planet] and no [data-map-axis]
    And its [data-map-summary] p reads "Orbital map of UG-0007-A: no planetary bodies."
```

## Technical Notes

**Files touched:** `frontend/src/views/SystemDetailView.vue` (template + one small script
addition to the existing `groups` computed; no new computed is needed otherwise — `groups` from
story 002 already carries `group.star`), `frontend/src/components/systemDetail.dom.test.ts`
(modify — rewrite the map-specific describe blocks). Depends on story 002.

**S-4 · The change, and why it's here.** Each star's map moves into its own group header, as the
`compact` variant. The single primary-only map at the top is removed. Reasons (from the spec,
restated so this story is self-explanatory):

- A primary-only map above a page whose list is organised per star was two contradictory
  organising ideas on one screen.
- Each map is scaled to *its own* star's habitable-zone bounds
  (`habitableZoneBounds(spectralClass)`) and its own planets' distances; a secondary's planets
  cannot be read against the primary's scale at all. **Measured**, on UG-0052 of seed 644212: the
  A group's axis runs 0.067–0.39 AU and the B group's 0.059–6.5 AU, a factor of sixteen — there is
  no correct way to show both on one shared map.
- **Full-sized maps inside each group (below the header) were prototyped first and rejected.** A
  full 150px map per group is redundant with the table directly beneath it — both enumerate the
  same planets, one with labels, one with rows. Four full maps on a four-star system add roughly
  600px of scroll; four 56px `compact` strips inside headers that already exist are nearly free.
  The legibility doubt behind that hesitation did not survive contact: a nine-planet secondary was
  fully separated at both 1400px and 900px, because the log scale spreads the crowded inner
  orbits. `compact` does a *different* job than the table — the shape of the system at a glance —
  and leaves the detail to the table, rather than repeating it.
- `OrbitalMap.vue` itself is **not modified** — it already takes `star` + `planets` props and
  already ships the `compact` variant, mounted in the planet panel. No `highlightKey` is passed
  (S-15 — recorded as a future improvement, not done here).
- What `compact` gives up, accepted: the per-planet letters, the legend, and the separate HZ rule
  captions — it prints one `HZ <inner> – <outer> AU` in its axis row instead (see
  `OrbitalMap.vue`'s `isCompact` branches). A reader who wants to know *which* body sits where
  reads the row beneath it.
- Accepted cost: the group header grows from one line to a 56px row. Bounded at four by
  `determineStarCount()`, and S-3 already gives a barren star no map at all (the common
  secondary).

**Consequence — the `full` variant loses its last consumer. This is intended, not an oversight.**
`OrbitalMap` is mounted in exactly two places: this view and `PlanetDetailPanel.vue`
(`compact`). Before this story, this view mounted `full` (the default). After this story, this
view mounts `compact` too, so nothing in the app renders `full` any more — no header, no legend,
no per-planet letters, no primary-star bleed, and no per-rule HZ captions (including the
caption-collision fix those captions carry). **`OrbitalMap.vue` is not modified and the `full`
variant is not removed** — that is a separate decision about a shared component, out of scope for
this story and this spec. The behaviour stays pinned by the direct-mount tests below (the
HZ-caption-merge scenario and the empty-state scenario) so it does not silently rot even though
nothing currently renders it.

**Handing the map raw planets, not display rows — read this before writing the template.**
`groups[].planets` (from story 002's `groups` computed) is a view-model built for the table: it
carries `key`, `name`, `planetType`, `diameter`, `temperature`, `moonCount`, `habitableZone`,
`hasLife`, `zone`, `px` — and **neither `starId` nor `semiMajorAxis`**. Passing it to `OrbitalMap`
fails **silently**: the domain collapses, every body renders at `left: 50%`, both axis captions
read `—`, and nothing errors or warns. This was found by prototyping, not by reading the code, so
it is easy to reintroduce. The fix: the `groups` computed gains one more field,
`rawPlanets: group.planets` — taken **straight off `starGroups`**, i.e. assigned from the raw
`StarPlanetGroup.planets` array *before* it is mapped into the table's display rows (the `group`
inside `target.starGroups.map(group => { … })` callback — see story 002's computed). `OrbitalMap`
is bound to `:planets="group.rawPlanets"`, never to `group.planets`.

**Template change.** Remove the top-level block entirely:

```html
<!-- DELETE -->
<!-- The centrepiece: the primary star's orbital map. -->
<div class="border-b border-line-strong px-[18px] py-[16px]">
    <OrbitalMap v-if="row.primaryStar" :star="row.primaryStar" :planets="primaryPlanets" />
</div>
```

Add the map inside each non-empty group's own `<header>`, alongside the existing identity block
(thumbnail, name, class line, facts line) — not below the header, and not in the planet grid:

```html
<header :data-star-entry="group.starId" class="flex items-center gap-3 bg-panel px-[18px] py-[12px]">
    <CelestialThumb kind="star" :code="group.spectralClass" :px="group.px" />
    <div class="flex min-w-0 flex-col gap-[3px]">
        <h2 :id="`star-name-${group.starId}`" class="truncate font-sans font-semibold text-[14px] text-ink">
            {{ group.name }}
        </h2>
        <span class="truncate font-mono text-[10px] text-muted">{{ group.classCode }} · {{ group.classLabel }}</span>
        <span data-star-facts class="truncate font-mono text-[9px] text-faint">{{ group.facts }}</span>
    </div>

    <div v-if="group.rawPlanets.length" class="min-w-0 flex-1">
        <OrbitalMap :star="group.star" :planets="group.rawPlanets" variant="compact" />
    </div>
</header>
```

The `v-if="group.planets.length === 0"` empty-message branch and the `v-else` planet-grid branch
(both story 002, unchanged) are untouched — the map lives in the `<header>` only, one level above
both branches, so it renders for every non-empty group regardless of which of those two branches
follows.

**Script change.** In the existing `groups` computed (story 002), add `rawPlanets: group.planets`
to the object returned for each group — placed next to the existing `planets:` field, both reading
from the same `group` (the raw `StarPlanetGroup`) inside the `.map()` callback:

```ts
return {
    starId: group.starId,
    star: group.star,
    // … name, spectralClass, classCode, classLabel, px, facts — unchanged …
    rawPlanets: group.planets,
    planets: group.planets.map(planet => ({ /* … unchanged display-row mapping … */ }))
};
```

`primaryPlanets` becomes unused once the top-level block is deleted — remove it. `groups`'
`star: group.star` field, added in story 002 and unread until now, is what the new
`<OrbitalMap :star="group.star" ...>` binding reads.

**S-17 · Open risk, restated.** Each `OrbitalMap` registers a `window.resize` listener and a
`ResizeObserver` on mount and tears both down on unmount. Mounting up to 4 instead of 1 means up to
four listeners on this screen — bounded by `determineStarCount()` ≤ 4, and teardown is already
exercised by the planet panel's `compact` map. The switch from `full` to `compact` does not change
this: the listeners are per instance, not per variant. Judged safe, but verify: the DOM tests must
`unmount()` every wrapper in `afterEach` (already the pattern in `systemDetail.dom.test.ts`), and
the narrow-width HZ-caption tests must target the direct full-variant mount (see the HZ-caption
scenario above), not "the" map inside a group.

**Constraints carried from the governing spec, restated here:**
- **D-36** — 24 spectral classes and 22 planet codes are a closed set, pinned by tests; no
  spectral class or planet code is added, removed or renamed. `OrbitalMap.vue` itself is not
  modified.
- **D-37** — existing artwork is used as-is; `frontend/public/images/` untouched; `CelestialThumb`
  used as-is (unchanged inside `OrbitalMap`).
- No new class needed in `frontend/src/style.css`.
- Out of scope: `backend/**`, the API contract, `types/index.ts` in either package,
  `frontend/src/style.css`, and artwork. Confirm with `git diff` after this story that none of
  these paths show any change across the whole feature (spec §12 success criterion 15).
- No `v-html` is introduced (spec §12 success criterion 16).

## Tests

From spec §10.2 (`frontend/src/components/systemDetail.dom.test.ts`, jsdom project):

- Items 16–18: one map per non-empty group, in the `compact` variant; a map draws only its own
  star's planets; the compact map carries no `[data-map-header]`, legend, or per-planet
  orbit-letter span of its own — the star's identity is carried by the surrounding group header's
  `<h2>` and the map's own accessible summary. The letter assertion matters more than it looks:
  there is no `OrbitalMap.dom.test.ts` and no `PlanetDetailPanel` test file in this repo, so once
  this story lands, `systemDetail.dom.test.ts` is the **only** place in the suite that exercises
  any of `compact`'s suppressions at all — without it, the Technical Notes' claim that compact
  drops the per-planet letters would rest on prose alone.
- Item 19: a barren star renders no map and states its emptiness; its non-barren sibling still
  gets a map. **Supersedes, rather than duplicates, story 002's "A star with no planets shows its
  own empty message" scenario** (same `[data-star-empty="9"]` text, on the same `EXOTIC` fixture):
  extend that existing `it()` in `systemDetail.dom.test.ts` to add the `[data-orbital-map]`
  absence/presence assertions for groups 9 and 10, rather than adding a second `it()` that
  re-asserts the same message text.
- Item 20: the projection and axis captions are unchanged, re-pointed at group 1's map; the sizing
  rule is now the `compact` formula (`8 + 8 × d/dMax` px, belts at 8px — see `OrbitalMap.vue`'s
  `bodySize`), not the old `full` formula (`20 + 24 × d/dMax`, belts at 14px).
- Item 21: the HZ-caption merge (narrow/wide/re-split/unmeasured) is **unreachable from this view**
  once every mounted map is `compact` (`compact` prints no per-rule `[data-hz-caption]` at all).
  Re-point it at a **direct `mount(OrbitalMap, { props: { star, planets, variant: 'full' } })`**
  in the same test file, so the caption-collision fix stays pinned even though nothing in the app
  currently renders `full`.
- Item 28: each map's accessible summary still names its own star — unaffected by the variant
  change, since `data-map-summary` is rendered unconditionally of `isCompact`.

Rewrite the existing describe blocks that pinned the single top-level map — by their actual
current names in `systemDetail.dom.test.ts`: `'OrbitalMap — the top-level map (removed by story
003)'`, `'OrbitalMap — the documented projection'`, `'OrbitalMap — the HZ captions at narrow
widths'`, and the `it('renders one OrbitalMap, for the system primary', …)` case inside
`'SystemDetailView — the 1d shell'` — per the items above. These are the ones story 002
deliberately left untouched. The `'OrbitalMap — the empty state and the text summary'` describe
block splits: its "no planetary bodies" case is relocated per §10.3 below; its "carries a
visually-hidden summary naming each body…" case (group 1, 4 lines) still runs through the view,
now against group 1's compact map, unedited in substance; its "says so in the summary when the
primary has nothing orbiting it" case (EXOTIC, NS primary) is subsumed by the §10.3 direct-mount
relocation below and can be deleted from here rather than duplicated, since a barren star mounts
no map in the view for it to run against any more.

From spec §10.3 — relocated coverage:

- Item 34: `OrbitalMap`'s own empty-state coverage (`no planetary bodies` in `rgb(51, 65, 85)`, no
  HZ rules, no map planets, no axis, and the summary text) is **re-expressed, not deleted**, as a
  direct `mount(OrbitalMap, { props: { star: <an NS star>, planets: [] } })` in the same test
  file — because the view no longer has a route to this state once the barren star's own map is
  never mounted.
- The HZ-caption merge at narrow widths (`'OrbitalMap — the HZ captions at narrow widths'`,
  currently exercised through the view's top-level `full` map) is likewise **re-expressed, not
  deleted**, as a direct `mount(OrbitalMap, { props: { star: <the KEPLER G primary>, planets: <its
  4 planets>, variant: 'full' } })` in the same test file, alongside the empty-state relocation
  above — because `compact` (the only variant this view mounts after this story) renders no
  per-rule HZ captions at all.

From spec §10.4 — manual verification (run `npm run dev`, generate a sector, open a multi-star
system from the Systems tab):

- Each star heads its own block, primary first, every planet under the right star, and a compact
  orbital map sits in the header of every star that has planets.
- A star with no planets shows its header and the one-line message, with no empty map box.
- Clicking a planet in a secondary's block opens the panel for that planet, the URL gains
  `?planet=<starId>-<orbitalNumber>`, and reloading that URL reopens the same panel (this is the
  end-to-end proof of success criterion 8, exercising unchanged `usePlanetDeepLink` behaviour).
- At a 375px-wide viewport the star names and maps are fully visible and only the planet grid
  scrolls sideways.

Run `cd frontend && npm test` (currently 29 files / 516 tests green with stories 001 and 002
landed; must stay at or above that baseline plus all new/relocated cases from this story, all
green) and `cd frontend && npm run build` (`vue-tsc && vite build`, no type error) as the final
gate for the whole feature. Run `cd backend && npm test` to confirm it is unaffected.

**Priority:** Medium — the largest genuine judgment call in the spec (S-4); independently
shippable and independently revertable without touching stories 001 or 002.
**Dependencies:** new-system-view-002-grouped-star-planet-listing.md
