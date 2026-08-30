# new-system-view-002-grouped-star-planet-listing

**Spec:** STORIES/SPECS/new-system-view.md

**As a** reader viewing a multi-star system's detail page
**I want** each star's planets listed directly beneath that star, one self-contained block per
star, instead of a separate stars rail and a system-wide planet table
**So that** I can tell at a glance which planet orbits which star, without decoding the planet's
display name

## Acceptance Criteria

Uses the existing `KEPLER` fixture in `systemDetail.dom.test.ts` (G primary, star 1, with four
planets `1-1..1-4`; M secondary, star 2, with one planet `2-1`) and the existing `EXOTIC` fixture
(NS primary, star 9, no planets; M secondary, star 10, one planet).

```gherkin
Feature: The grouped star/planet listing

  Scenario: One group per star, in payload order
    Given the KEPLER system is open
    When I read the [data-star-group] elements in the content region
    Then their ids, in document order, are ["1", "2"]

  Scenario: Each group header names its star, class and facts
    Given the KEPLER system is open
    Then group 1's [data-star-entry] contains "Kepler-442 A", "G-2 · Yellow dwarf"
      and a [data-star-facts] containing "4 planets"
    And group 2's [data-star-entry] contains "Kepler-442 B" and "1 planets"

  Scenario: Planets are nested under their own star, in orbital order
    Given the KEPLER system is open
    Then the [data-planet-row] keys inside [data-star-group="1"] are
      ["1-1", "1-2", "1-3", "1-4"]
    And the [data-planet-row] keys inside [data-star-group="2"] are ["2-1"]

  Scenario: No planet row exists outside a group
    Given the KEPLER system is open
    Then every [data-planet-row] in the page has a [data-star-group] ancestor whose id
      matches the row key's starId

  Scenario: The old interleaved flat list is gone
    Given the KEPLER system is open
    When I read every [data-planet-row] in document order
    Then the keys are ["1-1", "1-2", "1-3", "1-4", "2-1"]
    And never the old ["1-1", "2-1", "1-2", "1-3", "1-4"]

  Scenario: A star with no planets shows its own empty message
    Given the EXOTIC system is open
    Then [data-star-group="9"] contains a [data-star-empty="9"] reading
      "No planets orbit this star."
    And [data-star-group="10"] contains the planet row "10-1"

  Scenario: The section band replaces the old headers
    Given the KEPLER system is open
    Then [data-contents-header] reads "STARS & PLANETS"
    And [data-stars-rail] no longer exists anywhere in the page
    And [data-planets-header] no longer exists anywhere in the page

  Scenario: Click selects the planet by its composite key
    Given the KEPLER system is open
    When I click [data-planet-row="2-1"]
    Then store.selectedPlanetKey is "2-1"
    And PlanetDetailPanel is mounted

  Scenario: Keyboard parity
    Given the KEPLER system is open
    Then [data-planet-row="1-1"] has role="button", tabindex="0" and
      aria-label="Open detail for <planet name>"
    And pressing Enter or Space on it opens the panel exactly as a click would

  Scenario: No navigation on row activation
    Given the KEPLER system is open at "/system/1"
    When I click a planet row
    Then route.path is still "/system/1"

  Scenario: A row in a secondary's group opens the right planet
    Given the KEPLER system is open
    When I click [data-planet-row="2-1"]
    Then store.selectedPlanetKey is "2-1", not "1-1"

  Scenario: Row decoration survives the move
    Given the KEPLER system is open
    Then [data-planet-row="1-2"] carries the "ug-row-habitable" class
    And it shows the LIFE badge
    And its [data-cell="zone"] reads "GOLDILOCKS"

  Scenario: Each group is labelled by its star for assistive tech
    Given the KEPLER system is open
    Then [data-star-group="1"] has role="group"
    And its aria-labelledby resolves to an <h2> whose text is "Kepler-442 A"

  Scenario: Only the planet grid scrolls sideways
    Given the KEPLER system is open at a narrow viewport
    Then the element carrying min-w-[620px] inside a group has an overflow-x-auto
      ancestor
    And that ancestor does not contain the group's [data-star-entry] header

  Scenario: Unchanged behaviour is not disturbed
    Given the KEPLER system is open
    Then the breadcrumb bar, the 5-up KPI strip, a change of the :id route param,
      the data-system-missing state for an unknown system, and the absence of
      PlanetDetailModal.vue all behave exactly as before this story
    And the tests asserting them are not edited
```

*(Manual, not automated in this story: reloading a URL carrying `?planet=2-1` — a planet on the
secondary — reopens that planet's panel. This is unchanged D-32 behaviour in
`usePlanetDeepLink.ts`, which this story does not touch; it is indirectly proven by the "row in a
secondary's group opens the right planet" scenario above, and confirmed by the manual checklist in
story 003, which covers the full feature end to end.)*

## Technical Notes

**Files touched:** `frontend/src/views/SystemDetailView.vue` (modify),
`frontend/src/components/systemDetail.dom.test.ts` (modify). Depends on story 001's `starGroups`
field.

**Deliberately deferred to story 003:** the orbital map does not move in this story. The existing
top-level, primary-only `<OrbitalMap>` block stays exactly where it is today, unchanged, using the
existing `row.primaryStar` / `primaryPlanets` computed. Only the rail + flat planet table is
replaced. This keeps the two changes — "group the listing" and "one map per star" — independently
shippable and independently revertable (S-4 in the spec is the contested one).

**S-1 · One full-width stack, no rail.** Remove the `grid lg:grid-cols-[300px_1fr]` wrapper, the
`<aside data-stars-rail>` and the flat planet-table `<section>`. Replace with a single
`<section data-system-contents>` at every width. Every field the rail showed (thumbnail, name,
`class · label`, facts line) becomes the group header, at the same font sizes/colours.

**S-2 · Ordering.** Group order = payload order of `SystemRow.stars` (already `bucket.stars`
order). Planet order within a group = `orbitalNumber` ascending (already sorted by story 001).

**S-3 (partial, this story) · A barren star's group.** Keeps its header; shows one line,
`No planets orbit this star.`, styled `px-[18px] py-[14px] font-sans text-[12px]` with
`style="color: #475569"` (same colour/idiom as the removed `data-empty` paragraph). No map logic
changes here — a barren group simply has nothing else in it in this story.

**S-7 · No new component.** Render inline in `SystemDetailView.vue`, matching the project's
precedent (`PlanetTable.vue`, `SystemsTable.vue` both render rows inline in a `v-for`).

**S-8 · Column header repeats per group**, not once for the section: `# / PLANET / TYPE / Ø KM /
TEMP / MOONS / ZONE`, mono 9px, `tracking-[.12em]`, `text-faint` — unchanged styling.

**S-9 · Section band.** Replaces "PLANETS · n" with a thin band: label `STARS & PLANETS` (mono
`.14em` `text-dim`, left), hint `each star with the planets that orbit it` (9px `text-faint`,
right) — same grammar as the row it replaces.

**S-10 · Narrow widths.** `overflow-x-auto` wraps only each group's `min-w-[620px]` planet grid.
The star header stays in normal flow, always visible without horizontal scroll. The 7-column grid
is not reflowed into cards below 620px.

**S-11 · Accessibility.** The star name becomes an `<h2 :id="star-name-<starId>">`; each group is
`role="group"` with `:aria-labelledby="star-name-<starId>"`.

**S-12 · Planet row carried over verbatim.** Same `data-planet-row="<starId>-<orbitalNumber>"`,
`role="button"`, `tabindex="0"`, `aria-label="Open detail for <name>"`, same `@click` /
`@keydown.enter` / `@keydown.space` calling `store.selectPlanet(key)`, same `ug-row` /
`ug-row-habitable` / focus-outline classes, same `CelestialThumb` sizing and `LIFE` badge. Nothing
about D-32's deep link changes.

**S-13 · Remove the system-level empty state.** `data-empty` ("This system has no planets.") is
deleted — every star states its own emptiness now. `data-system-missing` (unknown system) is
unrelated and untouched.

**Interim template** (map block unchanged from today, kept above the new section):

```html
<!-- Unchanged from today — story 003 moves this. -->
<div class="border-b border-line-strong px-[18px] py-[16px]">
    <OrbitalMap v-if="row.primaryStar" :star="row.primaryStar" :planets="primaryPlanets" />
</div>

<section data-system-contents>
  <div class="flex items-baseline justify-between gap-3 border-b border-line-strong px-[18px] py-[12px]">
    <span data-contents-header class="font-mono font-semibold text-[10px] tracking-[.14em] text-dim">
      STARS &amp; PLANETS
    </span>
    <span class="font-mono text-[9px] text-faint">each star with the planets that orbit it</span>
  </div>

  <article v-for="group in groups" :key="group.starId"
           :data-star-group="group.starId" class="border-b border-line-strong"
           role="group" :aria-labelledby="`star-name-${group.starId}`">

    <header :data-star-entry="group.starId" class="flex items-center gap-3 bg-panel px-[18px] py-[12px]">
      <CelestialThumb kind="star" :code="group.spectralClass" :px="group.px" />
      <div class="flex min-w-0 flex-col gap-[3px]">
        <h2 :id="`star-name-${group.starId}`" class="truncate font-sans font-semibold text-[14px] text-ink">
          {{ group.name }}
        </h2>
        <span class="truncate font-mono text-[10px] text-muted">{{ group.classCode }} · {{ group.classLabel }}</span>
        <span data-star-facts class="truncate font-mono text-[9px] text-faint">{{ group.facts }}</span>
      </div>
    </header>

    <p v-if="group.planets.length === 0" :data-star-empty="group.starId"
       class="px-[18px] py-[14px] font-sans text-[12px]" style="color: #475569">
      No planets orbit this star.
    </p>

    <template v-else>
      <div class="overflow-x-auto">
        <div class="min-w-[620px] px-[18px]">
          <div :class="GRID" class="border-b border-line-strong py-[10px] font-mono font-medium text-[9px] tracking-[.12em] text-faint">
            <span>#</span><span>PLANET</span><span>TYPE</span>
            <span class="text-right">Ø KM</span><span class="text-right">TEMP</span>
            <span class="text-right">MOONS</span><span class="text-right">ZONE</span>
          </div>
          <div v-for="planetRow in group.planets" :key="planetRow.key"
               :data-planet-row="planetRow.key" role="button" tabindex="0"
               :aria-label="`Open detail for ${planetRow.name}`"
               :class="[GRID, planetRow.habitableZone ? 'ug-row-habitable' : '']"
               class="ug-row cursor-pointer border-b border-line-hairline py-[10px] transition-colors duration-150 focus:outline focus:outline-acc-blue"
               @click="openPanel(planetRow.key)"
               @keydown.enter.prevent="openPanel(planetRow.key)"
               @keydown.space.prevent="openPanel(planetRow.key)">
             <!-- the seven cells, verbatim from today's planet row markup (S-12):
                  #, thumbnail+name(+LIFE badge), type, Ø KM, temp, moons, zone -->
          </div>
        </div>
      </div>
    </template>
  </article>
</section>
```

`GRID` stays the existing constant: `grid items-center gap-[10px] grid-cols-[38px_1.3fr_1fr_84px_78px_70px_92px]`.

**Script.** Replace `starEntries` and `planetRows` with one `groups` computed (this is the same
computed story 003 will keep using unchanged — it already includes `star: group.star` for the
map story 003 wires up; that field is simply unread by this story's template):

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

Keep `row`, `system`, `readout`, `kpis`, `primaryPlanets` and `openPanel` exactly as they are —
`primaryPlanets` is still read by the unchanged top-level map block in this story. Do not delete
it here.

**S-14 (deliberate non-change, restated).** The facts line stays `<mass> M☉ · <temp> K · <n>
planets`, including "1 planets" at n = 1. Do not fix the pluralisation — it is recorded under
Future Considerations in the spec, not requested here.

**Constraints carried from the governing spec, restated here:**
- **D-36** — no spectral class or planet code is added, removed or renamed by this story.
- **D-37** — `frontend/public/images/` untouched; `CelestialThumb` used as-is, same props as
  today.
- No new class needed in `frontend/src/style.css` — every class above is an existing token or
  utility already in use on this screen.
- `backend/**`, `backend/src/types/index.ts`, `frontend/src/types/index.ts` untouched.
- No `v-html` is introduced anywhere in this template.

## Tests

From spec §10.2 (`frontend/src/components/systemDetail.dom.test.ts`, jsdom project):

- Items 10–15: one group per star in payload order; group header names/class/facts; planets
  nested in orbital order; no row outside a group; the old interleaved list is gone; the section
  band replaces the old headers.
- Items 22–27: click selects by composite key and opens the panel; keyboard parity; no
  navigation; a secondary's row opens the right planet; row decoration (habitable class, LIFE
  badge, zone cell) survives; each group is `role="group"` with `aria-labelledby` resolving to its
  `<h2>`.
- Item 29: only the planet grid's `overflow-x-auto` wrapper scrolls; it excludes the star header.
- Items 30–33 (existing tests: breadcrumb/KPI strip, `:id` change re-render, `data-system-missing`,
  `PlanetDetailModal.vue` absence) are **not edited** and must still pass.

Existing describe blocks that test the single top-level `OrbitalMap` (lines ~145–321 and ~375–381
of the current file) are **not touched** in this story — they still describe the unchanged
top-level map and continue to pass as-is; story 003 rewrites them.

**Exception, to avoid a stale name and a duplicate assertion:**
`describe('OrbitalMap — the primary star only', ...)` (lines ~145–174) holds three tests. Two of
them ('heads the map with ORBITAL MAP · <primary star name>', 'draws only the primary star's
planets') genuinely describe the untouched top-level map and are left alone, per the paragraph
above. The third, 'lists every star in the rail with its own planet count' (lines ~163–173),
duplicates this story's own "Each group header names its star, class and facts" scenario — it
asserts the same `[data-star-entry]` / `[data-star-facts]` content, just under the old "rail"
framing that no longer exists once this story lands. **Delete that third `it()` here** rather than
leaving a stale duplicate, and **rename the describe block** to `'OrbitalMap — the top-level map
(removed by story 003)'` so its name matches what it actually still tests until story 003 deletes
it outright.

**Priority:** Critical
**Dependencies:** new-system-view-001-star-planet-groups-in-sector-stats.md
