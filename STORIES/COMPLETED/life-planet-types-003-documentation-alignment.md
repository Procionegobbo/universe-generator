# life-planet-types-003-documentation-alignment

**Spec:** STORIES/SPECS/life-planet-types.md

**As a** reader of the in-app documentation or the README
**I want** the Jungle-type catalogue entry and the Life & Habitability write-up to stop asserting that a Jungle-type world is always forested
**So that** the documentation agrees with the corrected per-planet UI instead of repeating the claim this feature exists to remove

## Acceptance Criteria

```gherkin
Feature: Documentation reflects life-aware planet descriptions

Scenario: Documentation catalogue's Jungle entry no longer asserts vegetation
  Given the Documentation page's Planetary Types catalogue
  When the "J" entry's detail text is viewed
  Then it reads "Warm, cloud-wrapped worlds under permanent overcast and near-continuous rainfall, with standing water across most of the surface. Diameter: 6,000–9,000 km." instead of the old forest/vegetation text
  And the catalogue label for "J" remains "Jungle Planet"

Scenario: Documentation intro explains the per-planet life dependency
  Given the Documentation page's Planetary Types section intro paragraph
  When it is viewed
  Then it includes the sentence "The names and descriptions below classify the type; an individual planet's description also reflects whether life arose there and how far it got — see Life & Habitability."

Scenario: The other 21 catalogue entries are unchanged
  Given the Documentation page's Planetary Types catalogue
  Then every entry other than "J" is byte-identical to before this change, and all 22 types are still listed

Scenario: README documents the life-aware label behaviour
  Given README.md's "Life & Habitability" section
  When it is viewed
  Then its last bullet reads "A planet's displayed label and description are resolved from its type together with its life outcome, so a Jungle-class world with no biosphere is presented as a rain world rather than a jungle. The stored planet type is unchanged."

Scenario: README's planet-type list is unchanged
  Given README.md's planet-type list (lines 198-219)
  Then it is unchanged by this story, because PLANET_TYPE_DESCRIPTIONS itself is unchanged
```

## Technical Notes

**Scope for this slice:** static content edits only, in `frontend/src/views/DocumentationView.vue` and `README.md`. No logic, no new import, no dependency on the resolution module — these are the type-level catalogue and the top-level docs, not per-planet surfaces.

### `frontend/src/views/DocumentationView.vue`

- Change the `J` entry of the local `getPlanetDetailDescription` table (line 338) from:
  `Lush worlds covered in dense forests and rich vegetation. Diameter: 6,000–9,000 km.`
  to:
  `Warm, cloud-wrapped worlds under permanent overcast and near-continuous rainfall, with standing water across most of the surface. Diameter: 6,000–9,000 km.`
- Append one sentence to the Planetary Types intro paragraph (line 91):
  `The names and descriptions below classify the type; an individual planet's description also reflects whether life arose there and how far it got — see Life & Habitability.`
- The other 21 catalogue entries, `PLANET_TYPE_STATS`, the images and the colour helpers are untouched. This table is a *type catalogue*: entries like `T`'s "uninhabitable for Earth life" describe the class and are acceptable as-is — only `J`'s entry asserts a biological state of the class, which is what this story corrects.

### `README.md`

Append one bullet as the last item of the `### Life & Habitability` section (after line 267):

`- A planet's displayed label and description are resolved from its type together with its life outcome, so a Jungle-class world with no biosphere is presented as a rain world rather than a jungle. The stored planet type is unchanged.`

Do **not** edit the planet-type list at lines 198-219 — `PLANET_TYPE_DESCRIPTIONS` is unchanged by this feature (spec decision #4), so that list stays correct as-is.

## Tests

- Manual check: open the Documentation page — the Planetary Types catalogue still lists all 22 types with `J` shown as "Jungle Planet" and the corrected life-neutral detail text, and the intro carries the new sentence.
- Regression: `cd frontend && npm run build` passes `vue-tsc` (static content change only, no type-check impact expected).
- Regression: `README.md`'s planet-type list (lines 198-219) is confirmed unchanged.

**Priority:** Medium
**Dependencies:** life-planet-types-001-description-data-model-and-resolution-module.md
