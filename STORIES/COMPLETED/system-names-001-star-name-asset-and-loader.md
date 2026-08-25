# system-names-001-star-name-asset-and-loader

**Spec:** STORIES/SPECS/system-names.md

**As a** backend developer
**I want** a validated, IAU-sourced CSV asset of star proper names plus a loader/parser module
**So that** the generator has a deterministic, correctly-licensed pool of real star names to draw from, packaged so it is present at runtime in every deployment target

## Acceptance Criteria

```gherkin
Feature: Star proper-name CSV asset and loader

  Background:
    Given the CSV asset at "backend/src/assets/star-proper-names.csv"
    And the module "backend/src/lib/star-name-pool.ts"

  # --- Asset content & provenance ---

  Scenario: The asset is populated from the IAU catalogue
    Then the file contains at least 100 data rows (451 in the 2022-04-04 edition)
    And every row was extracted from IAU-CSN by fixed-width column offset, not whitespace splitting
    And the header comments name the IAU-CSN catalogue, its source URL, the WGSN as issuing
      authority, the CC BY license statement, the catalogue edition date, and a note that the
      data was modified (reduced to four columns, reformatted as CSV)
    And no row was sourced from Wikipedia

  Scenario: Repo-root NOTICE carries the same attribution
    Given a NOTICE file at the repository root
    Then it states the data comes from the IAU Catalog of Star Names (IAU-CSN)
    And it cites the WGSN and the IAU-CSN source URL
    And it states the CC BY license and that the data was modified
    If a NOTICE file already existed, the attribution is appended, not replacing prior content

  # --- Parser: parseStarNameCsv (tests 1-11) ---

  Scenario: Parses a valid minimal CSV in file order (test 1)
    When parseStarNameCsv is given a valid CSV with a header and several data rows
    Then it returns the "name" column values in file order

  Scenario: Skips comment and blank lines anywhere in the file (test 2)
    When the input has "#"-prefixed lines and blank lines before the header, between rows,
      and trailing
    Then all of them are ignored and only data rows are parsed

  Scenario: Accepts both line-ending styles and trims values (test 3)
    When the input uses "\r\n" line endings and values have surrounding whitespace
    Then parsing succeeds and every field is trimmed

  Scenario: Missing or misspelled header throws (test 4)
    When the first non-comment, non-blank line is not exactly
      "name,designation,constellation,iau_approval_date"
    Then parseStarNameCsv throws an Error naming the offending line

  Scenario Outline: Wrong column count throws (test 5)
    When a data row splits into <count> comma-separated fields instead of 4
    Then parseStarNameCsv throws an Error naming the line number and value

    Examples:
      | count |
      | 3     |
      | 5     |

  Scenario Outline: Invalid name length throws (test 6, test 7)
    When a row's "name" field, trimmed, is "<name>"
    Then parseStarNameCsv throws an Error

    Examples:
      | name                              |
      |                                   |
      | A                                 |
      | AaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaZ |

  Scenario: Disallowed characters in name throw (test 8)
    When a row's "name" field contains a digit or another character outside
      "/^[A-Za-z][A-Za-z '\-]*$/"
    Then parseStarNameCsv throws an Error

  Scenario: Case-insensitive duplicate name throws (test 9)
    When the file contains both "Vega" and "vega" as name values
    Then parseStarNameCsv throws an Error

  Scenario Outline: Empty provenance column throws (test 10)
    When a row's "<column>" field is empty after trimming
    Then parseStarNameCsv throws an Error

    Examples:
      | column            |
      | designation       |
      | constellation     |
      | iau_approval_date |

  Scenario: Malformed approval date throws (test 11)
    When a row's "iau_approval_date" does not match "/^\d{4}-\d{2}-\d{2}$/"
    Then parseStarNameCsv throws an Error

  Scenario: Fewer than MIN_POOL_SIZE data rows throws (test 12)
    When a programmatically-built CSV has fewer than 100 data rows
    Then parseStarNameCsv throws an Error

  # --- Loader: loadStarProperNames (tests 13-15) ---

  Scenario: Loader reads the packaged asset (test 13)
    When loadStarProperNames is called
    Then it returns at least 100 names

  Scenario: Every packaged name is valid and unique (test 14)
    Given the array returned by loadStarProperNames against the real asset
    Then every name matches NAME_PATTERN
    And the set of names is case-insensitively unique

  Scenario: Loader caches and freezes the result (test 15)
    When loadStarProperNames is called twice
    Then both calls return the identical (toBe) array reference
    And the array is frozen (Object.freeze)

  # --- Packaging: build script and Vercel config ---

  Scenario: Backend build copies and verifies the asset
    When "npm run build" runs in "backend/"
    Then "backend/dist/assets/star-proper-names.csv" exists
    And the build fails loudly if the file is missing after the copy step

  Scenario: Vercel bundles the asset with the serverless function
    Given "vercel.json"
    Then it declares "functions" -> "api/index.ts" -> "includeFiles" covering
      "backend/src/assets/**"
```

## Technical Notes

**CSV asset path:** `backend/src/assets/star-proper-names.csv` (new; `backend/src/assets/` is a new directory).

**Provenance (Decision #12):** IAU Catalog of Star Names (IAU-CSN), canonical file
<https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt>. Edition used: last updated
2022-04-04, 451 name rows. The source is **fixed-width**, not delimited — extract by column
offset, not by splitting on whitespace, because 24 names contain spaces (`Alula Australis`,
`Arkab Posterior`, ...). Field boundaries derive from the file's own `#Name/ASCII ...` header
line (drop its leading `#`). Skip `#`-prefixed lines, and also skip the one malformed header
line in the source that begins with `$` instead of `#`.

Extract exactly these four fields and write them as CSV:

| CSV column | IAU-CSN field | Notes |
|---|---|---|
| `name` | (1) `Name/ASCII` | Use this, not (2) `Name/Diacritics` (requires UTF-8) |
| `designation` | (3) `Designation` | e.g. `HR 897`, `XO-5` |
| `constellation` | (6) `Con` | IAU 3-letter abbreviation, e.g. `Eri`, `Lyn` |
| `iau_approval_date` | (15) `Date` | Already `YYYY-MM-DD` |

The real 2022-04-04 data satisfies every validation rule as-is (0 `NAME_PATTERN` failures, name
lengths 3-17, 0 case-insensitive duplicates, 0 embedded commas, 0 malformed dates) — no cleaning
step beyond column extraction is required.

**CSV format** (exact header block to reproduce, `<YYYY-MM-DD>` = extraction date):

```csv
# Star names from the IAU Catalog of Star Names (IAU-CSN).
# Source:   https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt
# Authority: IAU Division C Working Group on Star Names (WGSN)
#           https://www.iau.org/science/scientific_bodies/working_groups/280/
# License:  Creative Commons Attribution (CC BY) — IAU-produced products are
#           free to use in perpetuity, world-wide, provided the source is cited.
# Modified: reduced to four columns (Name/ASCII, Designation, Con, Date) and
#           reformatted as CSV. No names, designations or dates were altered.
# Catalogue edition: 2022-04-04
# Extracted: <YYYY-MM-DD>
name,designation,constellation,iau_approval_date
Absolutno,XO-5,Lyn,2019-12-17
Acamar,HR 897,Eri,2016-07-20
```

**Validation rules** (`parseStarNameCsv`, every violation throws an `Error` naming the offending
line/value):

| Rule | Constraint |
|---|---|
| Header present | First non-blank, non-`#` line equals `name,designation,constellation,iau_approval_date` exactly |
| Column count | Every data row splits into exactly 4 comma-separated fields |
| `name` required | Trimmed length ≥ 2 |
| `name` length | Trimmed length ≤ 32 |
| `name` charset | `/^[A-Za-z][A-Za-z '\-]*$/` |
| `name` uniqueness | Case-insensitively unique across the file |
| Other columns non-empty | `designation`, `constellation`, `iau_approval_date` each trimmed non-empty |
| Approval date format | `/^\d{4}-\d{2}-\d{2}$/` |
| Pool size | At least `MIN_POOL_SIZE` (100) data rows |

Blank lines and `#` comment lines are skipped before any rule applies. Quoted fields are **not**
supported.

**Module signatures** (`backend/src/lib/star-name-pool.ts`, new):

```ts
import fs from 'fs';
import path from 'path';

export const MIN_POOL_SIZE = 100;
export const CSV_HEADER = 'name,designation,constellation,iau_approval_date';
export const NAME_PATTERN = /^[A-Za-z][A-Za-z '\-]*$/;

/** Parses the proper-name CSV and returns the name column. Throws on any violation. */
export function parseStarNameCsv(content: string): string[]

/** Reads, parses and caches the packaged CSV asset. Throws if it cannot be found or is invalid. */
export function loadStarProperNames(): readonly string[]
```

`loadStarProperNames` resolves the asset by trying, in order, the first path that exists
(Decision #10):

1. `path.join(__dirname, '../assets/star-proper-names.csv')` — ts-node/nodemon dev, Jest
   (`__dirname` = `backend/src/lib`), the compiled build, and the Vercel bundle.
2. `path.join(process.cwd(), 'backend/src/assets/star-proper-names.csv')` — repo-root cwd.
3. `path.join(process.cwd(), 'src/assets/star-proper-names.csv')` — `backend/` cwd.

If none exists, throw ``Error(`star-proper-names.csv not found; tried: ${candidates.join(', ')}`)``
(Decision #11 — a missing/invalid CSV must throw immediately, never degrade silently). The parsed
array is frozen (`Object.freeze`) and memoised in a module-level variable, so repeated
`StellarGenerator` construction costs one read per process.

**Build script** (`backend/package.json`):

```json
"build": "tsc && cp -R src/assets dist/assets && node -e \"require('fs').accessSync('dist/assets/star-proper-names.csv')\""
```

**Vercel config** (`vercel.json`, additive — no existing key modified):

```json
"functions": {
  "api/index.ts": {
    "includeFiles": "backend/src/assets/**"
  }
}
```

Note (Decision #17): a Vercel preview deployment returning 200 from
`POST /api/sector/generate` is the real proof this config works, but that check requires the
full feature (Story 3) to be wired — it is covered as a manual verification step there, not
here.

**NOTICE file** (repo root, new — append if one already exists):

```
This product includes data from the IAU Catalog of Star Names (IAU-CSN),
produced by the IAU Division C Working Group on Star Names (WGSN).
https://www.iau.org/science/scientific_bodies/working_groups/280/
Catalogue file: https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt
Licensed under Creative Commons Attribution (CC BY).
The data has been modified: reduced to four columns and reformatted as CSV.
No names, designations or approval dates were altered.
See backend/src/assets/star-proper-names.csv.
```

**Licensing (Decision #19):** the CSV is carried under CC BY (attribution only, no copyleft).
Do not re-source names from Wikipedia — its transcription is CC BY-SA, whose share-alike clause
would attach copyleft obligations to this repo.

**Decision #18 (informational, no action here):** changing the CSV later changes the names a
previously used seed produces (sector geometry is unaffected). Not a bug if it happens.

This story adds no wiring into the generator — `star-name-pool.ts` is a standalone module used
by no other code yet.

## Tests

`backend/__tests__/unit/lib/star-name-pool.test.ts` (new) — spec tests 1-15:

1. Parses a valid minimal CSV and returns the `name` column in file order.
2. Skips `#` comment lines and blank lines wherever they appear.
3. Accepts `\r\n` line endings and trims surrounding whitespace from values.
4. Throws when the header line is missing or misspelled.
5. Throws when a data row has 3 fields, and when it has 5 fields.
6. Throws when a `name` is empty (0 characters) and when it is a single character.
7. Throws when a `name` exceeds 32 characters.
8. Throws when a `name` contains a digit or another disallowed character.
9. Throws on a case-insensitive duplicate name (`Vega` / `vega`).
10. Throws when `designation`, `constellation` or `iau_approval_date` is empty.
11. Throws when `iau_approval_date` is not `YYYY-MM-DD`.
12. Throws when the file has fewer than `MIN_POOL_SIZE` data rows (build the fixture
    programmatically).
13. `loadStarProperNames()` reads the packaged asset and returns at least `MIN_POOL_SIZE` names.
14. Every name from the packaged asset satisfies `NAME_PATTERN`, and the set is
    case-insensitively unique.
15. `loadStarProperNames()` returns the identical (`toBe`) frozen array on a second call.

Plus manual verification: `cd backend && npm run build` produces
`backend/dist/assets/star-proper-names.csv` and fails loudly if the copy step is broken.

**Priority:** Critical
**Dependencies:** None
