# life-on-planets-001-planet-name-asset-and-loader

**Spec:** STORIES/SPECS/life-on-planets.md

**As a** backend developer
**I want** a validated, deduplicated CSV asset of planet proper names plus a loader/parser module
**So that** the generator has a deterministic pool of names to draw from for inhabited planets, packaged so it is present at runtime in every deployment target

## Acceptance Criteria

```gherkin
Feature: Planet proper-name CSV asset and loader

  Background:
    Given the CSV asset at "backend/src/assets/planet-proper-names.csv"
    And the module "backend/src/lib/planet-name-pool.ts"

  # --- Asset content & provenance ---

  Scenario: The asset is populated from the feature draft, deduplicated
    Given the name list in "STORIES/SPECS/life-on-planets.draft.md" (297 rows)
    Then the asset contains exactly 288 unique data rows
    And the following case-insensitive duplicates were removed, keeping the first occurrence:
      "Terra", "Marte", "Europa", "Miranda", "Ariel", "Terra 2", "Elysium", "Nettuno", "Vulcan"
    And the header comments name the draft as the source, state that the "source" column is
      reference-only and never read at runtime, note that names from fiction are used purely as
      generated identifiers with no affiliation implied, list the 9 removed duplicates, and
      point to NOTICE

  Scenario: Repo-root NOTICE carries the planet-name attribution paragraph
    Given the existing NOTICE file at the repository root (IAU CC BY attribution)
    Then a new paragraph is appended stating planet proper names are drawn from science fiction,
      mythology and real astronomy, used solely as generated identifiers for procedurally created
      worlds, with no affiliation or endorsement implied by any rights holder, and that the
      "source" column is provenance reference only
    And the existing IAU paragraph is not replaced or altered

  # --- Parser: parsePlanetNameCsv (tests 1-12) ---

  Scenario: Parses a valid minimal CSV in file order (test 1)
    When parsePlanetNameCsv is given a valid CSV with a header and several data rows
    Then it returns the "name" column values in file order

  Scenario: Skips comment and blank lines anywhere in the file (test 2)
    When the input has "#"-prefixed lines and blank lines before the header, between rows,
      and trailing
    Then all of them are ignored and only data rows are parsed

  Scenario: Accepts both line-ending styles and trims values (test 3)
    When the input uses "\r\n" line endings and values have surrounding whitespace
    Then parsing succeeds and every field is trimmed

  Scenario: Missing or misspelled header throws (test 4)
    When the first non-comment, non-blank line is not exactly "name,source"
    Then parsePlanetNameCsv throws an Error naming the offending line

  Scenario Outline: Wrong column count throws (test 5)
    When a data row splits into <count> comma-separated fields instead of 2
    Then parsePlanetNameCsv throws an Error naming the line number and value

    Examples:
      | count |
      | 1     |
      | 3     |

  Scenario: A single-character name is accepted (test 6)
    When a row's "name" field, trimmed, is "O"
    Then parsePlanetNameCsv accepts it — the planet pool's minimum length is 1, unlike the star
      pool's minimum of 2

  Scenario Outline: Names with digits, leading digits, spaces, apostrophes and hyphens are
      accepted (test 7)
    When a row's "name" field is "<name>"
    Then parsePlanetNameCsv accepts it

    Examples:
      | name            |
      | Kepler-186f     |
      | 55 Cancri e     |
      | Eden Prime      |
      | Qo'noS          |
      | LV-426          |

  Scenario Outline: Invalid name length throws (test 8)
    When a row's "name" field, trimmed, is "<name>"
    Then parsePlanetNameCsv throws an Error

    Examples:
      | name                                                              |
      |                                                                   |
      | AaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaZ                               |

  Scenario: Disallowed character in name throws (test 9)
    When a row's "name" field contains a character outside "/^[A-Za-z0-9][A-Za-z0-9 '\-]*$/"
      (e.g. "Zeta*")
    Then parsePlanetNameCsv throws an Error

  Scenario: Case-insensitive duplicate name throws (test 10)
    When the file contains both "Terra" and "terra" as name values
    Then parsePlanetNameCsv throws an Error

  Scenario: Empty source column throws (test 11)
    When a row's "source" field is empty after trimming
    Then parsePlanetNameCsv throws an Error

  Scenario: Fewer than MIN_PLANET_POOL_SIZE data rows throws (test 12)
    When a programmatically-built CSV has fewer than 200 data rows
    Then parsePlanetNameCsv throws an Error

  # --- Loader: loadPlanetProperNames (tests 13-15) ---

  Scenario: Loader reads the packaged asset (test 13)
    When loadPlanetProperNames is called
    Then it returns at least 200 names

  Scenario: Every packaged name is valid and unique (test 14)
    Given the array returned by loadPlanetProperNames against the real asset
    Then every name matches PLANET_NAME_PATTERN
    And the set of names is case-insensitively unique

  Scenario: Loader caches and freezes the result (test 15)
    When loadPlanetProperNames is called twice
    Then both calls return the identical (toBe) array reference
    And the array is frozen (Object.freeze)

  # --- Packaging: build script ---

  Scenario: Backend build copies and verifies both CSV assets
    When "npm run build" runs in "backend/"
    Then "backend/dist/assets/planet-proper-names.csv" exists alongside
      "backend/dist/assets/star-proper-names.csv"
    And the build fails loudly if either file is missing after the copy step
```

## Technical Notes

**CSV asset path:** `backend/src/assets/planet-proper-names.csv` (new).

**Source of the 288 names:** the full list is in `STORIES/SPECS/life-on-planets.draft.md` (297
rows, under "## Names of planets with life"), **not** in the spec — the spec's CSV block is a
13-row schema example only. Copy the draft's list into the asset, then remove the 9
case-insensitive duplicates named in decision #16, keeping the first occurrence of each: `Terra`,
`Marte`, `Europa`, `Miranda`, `Ariel`, `Terra 2`, `Elysium`, `Nettuno`, `Vulcan`. The draft file is
a source to copy from — do not delete or modify it as part of this story. Result: 288 unique
rows, comfortably above `MIN_PLANET_POOL_SIZE = 200`. All 297 draft rows are pure ASCII, contain
no commas in either column, and satisfy the planet name pattern — no other cleaning is required.

**CSV format** (exact header block to reproduce):

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

**Validation rules** (`parsePlanetNameCsv`, every violation throws an `Error` naming the
offending line/value):

| Rule | Constraint |
|---|---|
| Header present | First non-blank, non-`#` line equals `name,source` exactly |
| Column count | Every data row splits into exactly 2 comma-separated fields |
| `name` required | Trimmed length ≥ 1 |
| `name` length | Trimmed length ≤ 32 |
| `name` charset | `/^[A-Za-z0-9][A-Za-z0-9 '\-]*$/` (letters, digits, spaces, apostrophes, hyphens; must start with a letter or digit) |
| `name` uniqueness | Case-insensitively unique across the file |
| `source` non-empty | Trimmed non-empty |
| Pool size | At least `MIN_PLANET_POOL_SIZE` (200) data rows |

Blank lines and `#` comment lines are skipped before any rule applies. Quoted fields are **not**
supported.

**Module signatures** (`backend/src/lib/planet-name-pool.ts`, new — structurally a mirror of
`star-name-pool.ts`, same path-resolution strategy, same cache-and-freeze, same error style):

```ts
import fs from 'fs';
import path from 'path';

export const MIN_PLANET_POOL_SIZE = 200;
export const PLANET_CSV_HEADER = 'name,source';
export const PLANET_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 '\-]*$/;

/** Parses the planet-name CSV and returns the name column. Throws on any violation. */
export function parsePlanetNameCsv(content: string): string[]

/** Reads, parses and caches the packaged CSV asset. Throws if it cannot be found or is invalid. */
export function loadPlanetProperNames(): readonly string[]
```

`loadPlanetProperNames` resolves the asset by trying, in order, the first path that exists —
identical to `loadStarProperNames` (`star-name-pool.ts:111-125`) with the new filename:

1. `path.join(__dirname, '../assets/planet-proper-names.csv')` — ts-node/nodemon dev, Jest, the
   compiled build and the Vercel bundle.
2. `path.join(process.cwd(), 'backend/src/assets/planet-proper-names.csv')` — repo-root cwd.
3. `path.join(process.cwd(), 'src/assets/planet-proper-names.csv')` — `backend/` cwd.

If none exists, throw
`` Error(`planet-proper-names.csv not found; tried: ${candidates.join(', ')}`) ``. A missing or
invalid asset **throws immediately** rather than degrading to an empty pool — the same reasoning
as the star asset: silent degradation would make the same seed produce different output on
different deployments. The parsed array is `Object.freeze`d and memoised in a module-level
variable.

**Build script** (`backend/package.json`) — extend the existing post-build asset check to cover
the second CSV:

```json
"build": "tsc && mkdir -p dist/assets && cp -R src/assets/. dist/assets && node -e \"['star-proper-names.csv','planet-proper-names.csv'].forEach(f=>require('fs').accessSync('dist/assets/'+f))\""
```

The `cp -R src/assets/.` step already copies the whole assets directory, so the new CSV is
carried without change; only the existence assertion needs the extra filename.

**`vercel.json`** — no change required. The existing `includeFiles` value
`"backend/src/assets/**"` already matches the new CSV.

**NOTICE file** (repo root, existing — append, do not replace):

```
Planet proper names in backend/src/assets/planet-proper-names.csv are drawn from
works of science fiction, from mythology, and from real astronomy. They are used
solely as generated identifiers for procedurally created worlds. No affiliation
with, or endorsement by, any rights holder is implied. The `source` column is
provenance reference only and is not used at runtime.
```

**Licensing (decision #22):** the project owner reviewed the third-party-name question and chose
to keep every name from the draft unchanged — a recorded product decision, not a legal clearance.
No name substitution is needed in this story.

This story adds no wiring into the generator — `planet-name-pool.ts` is a standalone module used
by no other code yet.

## Tests

`backend/__tests__/unit/lib/planet-name-pool.test.ts` (new) — spec tests 1-15:

1. Parses a valid minimal CSV and returns the `name` column in file order.
2. Skips `#` comment lines and blank lines wherever they appear (before the header, between rows,
   trailing).
3. Accepts `\r\n` line endings and trims surrounding whitespace from values.
4. Throws when the header line is missing or misspelled.
5. Throws when a data row has 1 field, and when it has 3 fields.
6. Accepts a single-character name (`O`) — the star pool's 2-character minimum does not apply.
7. Accepts names containing digits (`Kepler-186f`), a leading digit (`55 Cancri e`), spaces
   (`Eden Prime`), apostrophes (`Qo'noS`) and hyphens (`LV-426`).
8. Throws when a `name` is empty, and when it exceeds 32 characters.
9. Throws when a `name` contains a disallowed character (e.g. `Zeta*`).
10. Throws on a case-insensitive duplicate name (`Terra` / `terra`).
11. Throws when `source` is empty.
12. Throws when the file has fewer than `MIN_PLANET_POOL_SIZE` data rows (build the fixture
    programmatically).
13. `loadPlanetProperNames()` reads the packaged asset and returns at least
    `MIN_PLANET_POOL_SIZE` names.
14. Every name from the packaged asset satisfies `PLANET_NAME_PATTERN`, and the set is
    case-insensitively unique.
15. `loadPlanetProperNames()` returns the identical (`toBe`) frozen array on a second call — i.e.
    it is cached and immutable.

Plus manual verification: `cd backend && npm run build` produces
`backend/dist/assets/planet-proper-names.csv` and fails loudly if the copy step is broken.

**Priority:** Critical
**Dependencies:** None
