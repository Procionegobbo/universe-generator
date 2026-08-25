# System & Star Proper Names

## Feature Name & Description

**Summary** — Give generated star systems astronomy-flavoured identities: a share of systems receive a real IAU proper name (e.g. `Necklace`) instead of a bare number, their component stars are named after the system (`Necklace-A`, `Necklace-B`), some components carry their own proper name instead, and every unnamed system falls back to a catalogue-style designation (`UG-0006`). The value is immersion and memorability: a sector reads like a star catalogue rather than a spreadsheet of IDs.

**Current state**

- `System` (`backend/src/types/index.ts`) has no name at all. The UI renders `System {{ system.systemId }}` (`frontend/src/components/ResultsDisplay.vue:98`) and `System #{{ system.systemId }}` (`frontend/src/views/SystemDetailView.vue:20`).
- `Star.name` is assigned in `backend/src/lib/example_star_generator.ts` as `` `${system.systemId}-${s}` `` — i.e. `6-1`, `6-2`.
- There is no name list anywhere in the repository, no assets directory in the backend, and no CSV loading of any kind.

**In scope**

- A CSV asset holding IAU-approved proper names of stars, plus a loader and validator.
- Deterministic, seed-reproducible assignment of system names, star component names and independent star proper names.
- A catalogue-style designation for systems that do not draw a proper name (including when the name pool is exhausted).
- New `name` and `hasProperName` fields on `System`, kept in sync between the backend and frontend type modules.
- Rendering the new names in the existing UI surfaces, and updating the API reference field list.
- Backend Jest tests for the loader, the namer, the generator wiring and the HTTP response; frontend fixture updates.

**Out of scope**

- Any API request parameter to tune naming (probabilities are code constants).
- Naming of planets and moons.
- Renaming or re-keying routes: `/system/:id` keeps using the numeric `systemId`.
- Search/filter by system name in the tables, and any new statistics on the stats tab.
- Populating the CSV by scraping at runtime — the CSV is a committed, static asset.

---

## Assumptions & Decisions

Each entry is a call made here because the draft left it open. They are listed so they can be accepted or overridden before story-creator runs.

| # | Decision | Reasoning / precedent |
|---|---|---|
| 1 | **Names use a second, separate PRNG stream** (`seedrandom(`${seedStr}::names`)`) rather than drawing from the existing `this.prng`. | Drawing from the main stream would shift every subsequent draw and silently change the systems/stars/planets that existing seeds produce. Seeds are persisted in `localStorage` (`sectorStore.ts`) and users are offered "regenerate with saved parameters" on reload, so that would be a visible regression. A separate stream makes naming purely additive: **every existing seed still reproduces exactly the same sector geometry, star classes and planets.** |
| 2 | **30% of systems get a proper name** (`NAMED_SYSTEM_PROBABILITY = 0.3`). | The draft says "some systems". 30% keeps named systems special but common enough to be visible on the default 100-system sector (~30 of them) and on the 9-per-page systems grid (~2–3 per page). Constant, easy to override. |
| 3 | **15% of secondary components in a proper-named system get their own proper name** (`INDEPENDENT_COMPONENT_NAME_PROBABILITY = 0.15`). | The draft calls this "another possibility" (`Necklace-A` + `Dust-Ball`), i.e. an exception rather than the norm. The primary component (A) always keeps the tied name so the system name is always anchored to a visible star. |
| 4 | **Independent proper names are only drawn inside proper-named systems**, never inside designation systems. | `UG-0006-B` sitting next to a lyrically named sibling reads as inconsistent; the draft only shows the mixed case inside a named system. |
| 5 | **A single-star system's star takes the system name verbatim, with no `-A` suffix.** | Real usage: a lone star is "Vega", not "Vega A"; component letters only appear when there is more than one component. Multi-star systems always suffix, including the primary (`Necklace-A`). |
| 6 | **Separator is a hyphen** (`Necklace-A`, `UG-0006-B`), not a space. | The draft's own examples use `Necklace-A`/`Necklace-B`. Hyphens also keep the names single-token for the existing substring search in `StarTable.vue:166`. |
| 7 | **Designation format is `UG-` + zero-padded `systemId`, minimum width 4** → `UG-0006`, `UG-12345`. | Mirrors real catalogue designations (`HD 122563`, `Gl 581`): acronym + running number. `UG` = Universe Generator catalogue. Derived from `systemId`, so it is stable, unique and needs no PRNG draw. |
| 8 | **The proper-name pool is shared between system names and independent star names, drawn without replacement per generator instance.** | Guarantees no name appears twice in one sector, which is the property a reader will notice immediately if violated. |
| 9 | **Pool exhaustion falls back to designations** (systems) and to the tied `-<letter>` form (components), never throws. | The draft explicitly requires designations when systems outnumber available names. `systemCount` is capped at 10000 by the controller while the pool is ~450 names, so exhaustion is a normal operating mode, not an error. |
| 10 | **The CSV asset lives at `backend/src/assets/star-proper-names.csv` and is read once with `fs.readFileSync` at first use, then cached.** | The draft requires a CSV "in the feature assets". Backend is CommonJS/`tsc` (`backend/tsconfig.json`), so a synchronous read at module scope is safe and keeps the generator constructor synchronous. |
| 11 | **A missing/invalid CSV throws immediately with a descriptive error** rather than degrading to designation-only naming. | Silent degradation would make the same seed produce different output on different deployments — worse than a loud failure. A missing asset is a build/deploy defect and should surface as one. Mitigated by the three-candidate path resolution and the `postbuild` existence check below. |
| 12 | **The CSV must be populated during implementation** from the IAU Catalog of Star Names (IAU-CSN) at <https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt>. | The upstream authority, taken directly rather than via a third-party transcription. The 2022-04-04 edition was fetched and checked while writing this spec: 451 rows, all satisfying the validation rules below with no cleaning needed. The source is fixed-width, so extraction is by column offset; exact field mapping is in **Data Model → CSV asset**. |
| 13 | **`System` gains both `name: string` and `hasProperName: boolean`** (both required, not optional). | `name` is the display value. `hasProperName` exists so the UI (and tests) can distinguish a proper name from a designation without regex-sniffing the string; it is consumed by the badge in `ResultsDisplay.vue`. Making them required (rather than optional) means the API contract is unambiguous and TypeScript flags every fixture that needs updating. |
| 14 | **`Star` gains no new field** (no `component` letter, no `hasProperName`). | The draft does not ask for it and nothing in the UI needs it; the letter is recoverable from the name. Noted under Future Considerations. |
| 15 | **No frontend component tests are added.** | The repo has no component-test harness (`frontend/package.json` has no `@vue/test-utils`, and the only Vitest files are `src/stores/*.test.ts`). Introducing one is out of scope; the frontend changes are template bindings verified by `vue-tsc` in `npm run build` plus the updated store fixture. |
| 16 | **Naming probabilities are compile-time constants, not request parameters.** | The draft does not ask for tuning, and adding request fields would widen the `GenerationRequest` contract and its validation for no stated need. |
| 17 | **Open risk — Vercel serverless asset inclusion.** Runtime `fs` reads inside the `api/index.ts` function bundle require `functions.includeFiles` in `vercel.json`; this cannot be verified from the sandbox (no network). | Mitigated three ways: (a) `vercel.json` gains the `includeFiles` entry; (b) the loader tries three candidate paths; (c) the loader throws listing every path it tried, so a production failure is diagnosable in one log line. **The implementer must verify a Vercel preview deployment returns 200 from `POST /api/sector/generate` before the feature is considered done.** |
| 18 | **Changing the CSV changes the names produced by a previously used seed** (the sector geometry is unaffected — see #1). | Accepted: the asset content is part of the generation input. Recorded so nobody treats a later CSV edit as a bug. |
| 19 | **The CSV is sourced from the IAU directly and carried under CC BY (attribution only, no copyleft)**, with the attribution recorded both in the asset's header comments and in a repo-visible `NOTICE` file. **Wikipedia is explicitly rejected as a source.** | The IAU-CSN file states its own terms: IAU-produced products are released under Creative Commons Attribution, free to use in perpetuity world-wide as long as the source is mentioned. Wikipedia's transcription of the same catalogue is CC BY-SA, whose share-alike clause would attach copyleft obligations to the CSV; sourcing upstream avoids that and is more authoritative besides. See **Data Model → Licensing & attribution**. |

---

## Architecture / Design Overview

The feature adds one asset and two small library modules under `backend/src/lib/`, keeps the existing Controller → Service → Lib layering untouched, and touches the generator at exactly one point in its per-system loop.

```
POST /api/sector/generate
  → SectorController.generateSector          (unchanged)
    → StellarService.generateSector          (unchanged)
      → new StellarGenerator(seed, zone)
          prng      = seedrandom(seed)          ← existing stream, untouched
          namePrng  = seedrandom(seed + '::names')   ← NEW, independent stream
          namer     = new SectorNamer(namePrng, loadStarProperNames())
        → generateSector(systemCount, sectorVolume)
            for each system:
              system.xPos/yPos/zPos   ← prng          (unchanged order)
              starCount               ← prng          (unchanged order)
              naming = namer.nameSystem(systemId, starCount)   ← namePrng only
              system.name / system.hasProperName = naming
              for each star s:
                star.name = naming.starNames[s-1]
                spectralClass, subclass, planets ← prng   (unchanged order)

backend/src/assets/star-proper-names.csv
  → star-name-pool.ts   readFileSync + parse + validate + cache (module singleton)
  → naming.ts           SectorNamer: pure, PRNG + pool injected
```

**Key design points**

1. *Two PRNG streams.* `namePrng` is derived from the same user seed, so naming stays reproducible, but it never advances `prng`. Consequence: the byte-for-byte output of everything that existed before this feature is preserved for every seed (guarded by a golden test — see Testing).
2. *Naming is called after `determineStarCount()`.* The namer needs the component count to build the star name list, and this position leaves the main draw order untouched. `namePrng`'s own draw sequence depends only on `(systemCount, per-system starCount)`, which are themselves deterministic for a seed — so the naming stream is deterministic too.
3. *`SectorNamer` is pure and injectable.* It receives `() => number` and a `readonly string[]`, so unit tests can drive it with a fake PRNG and a 3-name pool to exercise exhaustion without touching the filesystem.
4. *Selection without replacement uses a partial Fisher–Yates.* The namer holds a mutable copy of the pool and a cursor; each draw picks a random index in `[cursor, length)`, swaps it to `cursor`, and advances. This costs exactly one PRNG draw per name assigned (no full shuffle), and never repeats a name within a generator instance.
5. *Decision draws happen before availability checks.* The "does this system get a proper name?" draw is taken unconditionally, and only then combined with `pool.hasNext()`. This keeps the draw sequence independent of pool state, so exhaustion cannot desynchronise the stream.

---

## Configuration

No environment variables and no feature flags are introduced. Three build/deploy configuration changes are required so the CSV asset is present at runtime:

1. **`backend/package.json`** — the build must copy the asset into `dist/` and verify it landed:

   ```json
   "build": "tsc && cp -R src/assets dist/assets && node -e \"require('fs').accessSync('dist/assets/star-proper-names.csv')\""
   ```

   `tsc` only emits `.ts` output, so without the copy `backend/dist/lib` has no sibling `assets/` directory and `npm start` / the Docker image would fail at first generation. The `node -e` check turns a silent packaging mistake into a failed build. (`cp -R` is acceptable: builds run on macOS, `node:20-alpine` in Docker, and `ubuntu-latest` in CI — see `.github/workflows/test.yml`.)

2. **`vercel.json`** — add a `functions` block so the asset is bundled with the serverless function:

   ```json
   "functions": {
     "api/index.ts": {
       "includeFiles": "backend/src/assets/**"
     }
   }
   ```

   `api/index.ts` re-exports the Express app from `backend/src/index`, and Vercel compiles that TypeScript itself; static assets are not traced automatically. See Assumptions & Decisions #17 for the verification step.

3. **`Dockerfile`** — no change required: it copies `/app/dist` wholesale from the backend builder stage, so the copied `dist/assets` comes along.

Naming constants live in code (`backend/src/lib/naming.ts`) and are exported so tests can reference them:

| Constant | Value | Meaning |
|---|---|---|
| `NAMED_SYSTEM_PROBABILITY` | `0.3` | Chance a system draws a proper name |
| `INDEPENDENT_COMPONENT_NAME_PROBABILITY` | `0.15` | Chance a secondary component of a proper-named system draws its own proper name |
| `DESIGNATION_PREFIX` | `'UG'` | Catalogue acronym |
| `DESIGNATION_MIN_DIGITS` | `4` | Zero-padding width of the designation number |
| `MIN_POOL_SIZE` | `100` | Minimum data rows the CSV must contain, else the loader throws |

---

## Data Model

There is **no database in this project** — the generator is stateless and returns JSON per request. "Data model" here means the shared TypeScript interfaces and the CSV asset schema.

### Modified interface: `System`

Identical text must land in `backend/src/types/index.ts` and `frontend/src/types/index.ts` (CLAUDE.md: the two type modules are kept synchronised).

```ts
export interface System {
    systemId: number;
    name: string;            // NEW — proper name ("Necklace") or designation ("UG-0006")
    hasProperName: boolean;  // NEW — true when `name` came from the IAU proper-name pool
    xPos: number;
    yPos: number;
    zPos: number;
}
```

### Unchanged interface: `Star`

No field changes. `Star.name` keeps its type (`string`) and its role; only the **format** of the generated value changes (see Impact on Existing Code → breaking-change note).

| Situation | `System.name` | `Star.name` values |
|---|---|---|
| Proper name, 1 star | `Necklace` | `Necklace` |
| Proper name, 3 stars | `Necklace` | `Necklace-A`, `Necklace-B`, `Necklace-C` |
| Proper name, 3 stars, component B draws its own name | `Necklace` | `Necklace-A`, `Dust-Ball`, `Necklace-C` |
| Designation, 1 star | `UG-0006` | `UG-0006` |
| Designation, 2 stars | `UG-0006` | `UG-0006-A`, `UG-0006-B` |

Component letters run `A`, `B`, `C`, `D` — `determineStarCount()` returns at most 4, and `componentLetter()` covers `A`–`Z`.

### CSV asset

**Path:** `backend/src/assets/star-proper-names.csv` *(new; `backend/src/assets/` is a new directory)*

**Provenance:** the **IAU Catalog of Star Names (IAU-CSN)**, the official catalogue of the IAU Division C Working Group on Star Names (WGSN) — the upstream authority, taken directly rather than via a third-party transcription.

- Canonical file: <https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt>
- WGSN: <https://www.iau.org/science/scientific_bodies/working_groups/280/>
- Edition used at spec time: **last updated 2022-04-04**, **451 name rows**.

Every row in IAU-CSN is already an IAU-**approved** name, so no filtering for approval status is needed. *(Note: the IAU URL cited inside the catalogue file itself, `iau.org/public/themes/naming_stars/`, currently returns 404 — the IAU reorganised its site. Cite the WGSN working-group URL above instead.)*

**Populating it is an implementation step** (Assumptions & Decisions #12). IAU-CSN is a **fixed-width** text file, not delimited — extract by column offset, not by splitting on whitespace, because 24 of the names contain spaces (`Alula Australis`, `Arkab Posterior`, …). Take these four fields and write them as CSV:

| CSV column | IAU-CSN field | Notes |
|---|---|---|
| `name` | (1) `Name/ASCII` | Already ASCII — use this, not (2) `Name/Diacritics`, which requires UTF-8 |
| `designation` | (3) `Designation` | e.g. `HR 897`, `XO-5` |
| `constellation` | (6) `Con` | IAU 3-letter abbreviation, e.g. `Eri`, `Lyn` |
| `iau_approval_date` | (15) `Date` | Already `YYYY-MM-DD` |

Field boundaries are derivable from the file's own `#Name/ASCII …` header line by dropping its leading `#`; the remaining label offsets align with the data rows. Skip `#`-prefixed lines — and note one malformed header line in the source begins with `$` instead of `#`, so skip that prefix too.

**The real data satisfies every validation rule below as-is** — verified against the 2022-04-04 edition: 451 rows, 0 `NAME_PATTERN` failures, name lengths 3–17, 0 case-insensitive duplicates, 0 embedded commas, 0 malformed dates, no `_` placeholders in the four columns used. No cleaning step beyond the column extraction is required. The loader's `MIN_POOL_SIZE = 100` floor leaves ample headroom.

**Format**

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
Achernar,HR 472,Eri,2016-06-30
Adhara,HR 2618,CMa,2016-08-21
Alula Australis,HR 4375,UMa,2016-08-21
```

| Column | Type | Constraints | Used at runtime? |
|---|---|---|---|
| `name` | string | Required, unique case-insensitively, 2–32 chars, matches `NAME_PATTERN` = `/^[A-Za-z][A-Za-z '\-]*$/`, no commas | **Yes** — this is the name pool |
| `designation` | string | Required, non-empty, no commas (e.g. `HR 897`) | No — provenance only |
| `constellation` | string | Required, non-empty, no commas; IAU 3-letter abbreviation (e.g. `Eri`) | No — provenance only |
| `iau_approval_date` | string | Required, `YYYY-MM-DD` | No — provenance only |

Rules: `#`-prefixed lines and blank lines are ignored anywhere in the file; the first non-comment, non-blank line must be the exact header `name,designation,constellation,iau_approval_date`; `\r\n` and `\n` line endings are both accepted; values are trimmed. Quoted fields are **not** supported — the no-commas constraint makes them unnecessary, and any row with a field count other than 4 is a hard error.

Pool ordering is CSV order; randomisation happens at draw time, not in the file.

**No indexes, migrations, enums or value objects are introduced** — there is no persistence layer.

### Licensing & attribution

The name data comes from the IAU Catalog of Star Names (IAU-CSN). The catalogue file states its own terms:

> All IAU-produced products (Images, Videos, Texts) are released under Creative Commons Attribution (i.e. free to use in all perpetuity, world-wide, as long as the source is mentioned).

So the asset is carried under **CC BY — attribution only. There is no share-alike / copyleft obligation**, and nothing in this repo is required to adopt any particular license as a result of including the CSV. The single condition is that the source is cited.

**Two places carry the attribution:**

1. **The CSV header comments** — exactly as shown in the Format block above: catalogue name, source URL, the WGSN as issuing authority, the CC BY license statement, a note of what was modified, and the catalogue edition date. These are `#` comment lines, which the parser already skips, so they cost nothing at runtime.

2. **A `NOTICE` file at the repo root** *(new)*, so the attribution is visible without opening the asset:

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

   If a `NOTICE` file already exists at implementation time, append to it rather than replacing it.

**No user-facing attribution is required in the app UI.** CC BY requires the source be mentioned, not that it appear in the running interface; for a data asset consumed server-side, the asset header plus a repo `NOTICE` satisfies it. A credit line in `DocumentationView.vue` is optional and recorded under Future Considerations, not required here.

**Do not re-source these names from Wikipedia.** Wikipedia's transcription of the same catalogue is CC BY-SA, which *would* attach share-alike obligations to the CSV. Taking the data from the IAU directly avoids that entirely, and is also the more authoritative source. This is a deliberate choice — see Decision #19.

---

## Impact on Existing Code

### New files

| Path | Purpose |
|---|---|
| `backend/src/assets/star-proper-names.csv` *(new)* | The IAU proper-name asset (schema above), carrying the CC BY attribution header. |
| `NOTICE` *(new, repo root)* | Third-party data attribution for the IAU-sourced star names (CC BY). Append if the file already exists. |
| `backend/src/lib/star-name-pool.ts` *(new)* | `parseStarNameCsv(content: string): string[]` (pure, exported for tests) and `loadStarProperNames(): readonly string[]` (path resolution + `readFileSync` + parse + validate + module-level cache). |
| `backend/src/lib/naming.ts` *(new)* | `SectorNamer`, `formatDesignation`, `componentLetter`, and the naming constants. |
| `backend/__tests__/unit/lib/star-name-pool.test.ts` *(new)* | Parser/validator/loader tests. |
| `backend/__tests__/unit/lib/naming.test.ts` *(new)* | Naming algorithm tests. |
| `backend/__tests__/unit/lib/generation-stability.test.ts` *(new)* | Golden-fixture guard proving pre-existing seeded output is unchanged. |

### Modified files

Every entry is marked **additive** (existing contract preserved) or **breaking** (with its migration path).

| Path | Change | Regression classification |
|---|---|---|
| `backend/src/types/index.ts` | Add `name: string` and `hasProperName: boolean` to `System`. | **Breaking (type-level, intentional).** Every object literal typed as `System` must now supply both fields. In-repo callers: the generator (updated here) and backend test fixtures (`sector-controller.test.ts:134` area, `stellar-service.test.ts:22/95/121/140` build `systems: []` or systems arrays — audit and update each). No runtime behaviour depends on the extra fields. |
| `frontend/src/types/index.ts` | Same two fields on `System`; must match the backend text exactly. | **Breaking (type-level, intentional).** Known caller: `frontend/src/stores/sectorStore.size.test.ts:5-10`, whose `generateSectorData` is typed `: Sector` — `vue-tsc` runs over `src/**/*.ts` (including `*.test.ts`) during `npm run build`, so an un-updated fixture fails the frontend build, not just the tests. |
| `backend/src/lib/example_star_generator.ts` | Import `SectorNamer` + `loadStarProperNames`; add `private namePrng` and `private namer` initialised in the constructor; inside `generateSector`, call `this.namer.nameSystem(system.systemId, starCount)` after `determineStarCount()` and assign `system.name`, `system.hasProperName`, and `star.name = naming.starNames[s - 1]` in place of `` `${system.systemId}-${s}` ``. | **Mixed.** The PRNG-order change is **additive/backward-compatible by construction** (separate stream — Decision #1), so `systemId`, `xPos/yPos/zPos`, `spectralClass`, `subclass` and every planet field are bit-identical for any given seed; guarded by `generation-stability.test.ts`. The **`Star.name` string format is a deliberate breaking change**: `6-2` becomes `Necklace-B` / `UG-0006-B`. Affected consumers: the two backend assertions on `/^\d+-\d+$/` (updated below), `StarTable.vue:166` free-text search (works unchanged — still a substring match over `star.name`), and `ResultsDisplay.vue:126` / `SystemDetailView.vue:55` display bindings (work unchanged). No persisted data stores star names — `sectorStore.ts` persists only `currentSeed`, `systemCount`, `sectorVolume`, `zone` — so **no data migration is needed**. |
| `backend/package.json` | Extend the `build` script (see Configuration). | **Additive** — `tsc` still runs first and identically; only extra steps are appended. |
| `vercel.json` | Add the `functions.includeFiles` block. | **Additive** — no existing key modified; `rewrites`, `headers`, `buildCommand` untouched. |
| `backend/__tests__/unit/lib/stellar-generator.test.ts` | Replace `expect(star.name).toMatch(/^\d+-\d+$/)` (line ~231) with the new assertions; add the naming tests listed under Testing. | **Breaking (intentional, test-only).** The old regex encodes the old format and must change. |
| `backend/__tests__/integration/api/sector-api.test.ts` | Replace `expect(star.name).toMatch(/^\d+-\d+$/)` (line ~79); add `system.name` / `system.hasProperName` assertions in the per-system loop (~line 73). | **Breaking (intentional, test-only).** Same reason. |
| `backend/__tests__/unit/services/stellar-service.test.ts`, `backend/__tests__/unit/controllers/sector-controller.test.ts` | Update any `System`-typed fixture literal to include `name` and `hasProperName`. Star fixtures using `name: '1-1'` are literals passed to `getSectorStats`, which never inspects `name` — they may keep their values, but updating them to the new format keeps the fixtures honest. | **Additive** — fixtures only; no assertion semantics change. |
| `frontend/src/stores/sectorStore.size.test.ts` | Add `name: \`UG-${String(i + 1).padStart(4, '0')}\`` and `hasProperName: false` to the system fixture. | **Additive** — the test measures serialized payload size; adding the fields nudges the measured bytes. Verify the test's size thresholds still hold and widen them only if the new fields genuinely push past a bound (record it if so). |
| `frontend/src/components/ResultsDisplay.vue` | Line 98: `System {{ system.systemId }}` → `{{ system.name }}`. Keep the `ID: {{ system.systemId }}` span at line 99 so the numeric id stays visible. Add a small badge next to the heading when `system.hasProperName` (e.g. an amber `IAU` pill) so proper names are distinguishable. | **Additive** — template-only; `navigateToSystem(system.systemId)` and every helper still key on `systemId`. |
| `frontend/src/views/SystemDetailView.vue` | Line 20: `System #{{ system.systemId }}` → `{{ system.name }}`, with `System #{{ system.systemId }}` demoted to a small secondary line beneath it (mirrors the existing `ID: {{ star.starId }}` treatment at line 57). | **Additive** — template-only; `getSystemById(route.params.id)` still resolves by numeric id. |
| `frontend/src/views/ApiReferenceView.vue` | In the `System` field list (lines 99–104) add `<li>name: string</li>` and `<li>hasProperName: boolean</li>`. | **Additive** — static documentation markup. |

### Deleted files

None.

### Explicitly not modified

`backend/src/services/stellar.service.ts`, `backend/src/controllers/sector.controller.ts`, `backend/src/routes/sector.routes.ts`, `backend/src/index.ts`, `api/index.ts`, `Dockerfile`, `frontend/src/composables/useSectorApi.ts`, `frontend/src/stores/sectorStore.ts`, `frontend/src/components/StarTable.vue`, `frontend/src/components/PlanetTable.vue`, `frontend/src/components/SectorVisualization3D.vue`, `frontend/src/views/DocumentationView.vue`. The `System` objects flow through these untouched, and `getSectorStats` reads only `spectralClass` / `planetType` / array lengths.

---

## Framework / Language-Specific Sections

Detected stack: **Node.js + Express 4 + TypeScript (CommonJS) backend; Vue 3 `<script setup>` + Vite + Pinia frontend; Jest/ts-jest backend tests; Vitest frontend tests.** The relevant layers are the lib layer and the shared types; there are no routes, middleware, jobs or events to add.

### Routes / Controllers / Services

**No changes.** `POST /api/sector/generate` keeps its request shape (`systemCount`, `sectorVolume`, `seed?`, `zone?`) and its response shape; `data.systems[]` simply carries two additional properties. Adding properties to a JSON response object is backward-compatible for every existing consumer.

### Lib layer — `backend/src/lib/star-name-pool.ts` *(new)*

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

`loadStarProperNames` resolves the asset by trying, in order, the first path that exists:

1. `path.join(__dirname, '../assets/star-proper-names.csv')` — covers `ts-node`/nodemon dev, Jest (`__dirname` = `backend/src/lib`), the compiled build (`backend/dist/lib` → `backend/dist/assets`, thanks to the build copy step) and the Vercel bundle.
2. `path.join(process.cwd(), 'backend/src/assets/star-proper-names.csv')` — repo-root cwd.
3. `path.join(process.cwd(), 'src/assets/star-proper-names.csv')` — `backend/` cwd.

If none exists it throws ``Error(`star-proper-names.csv not found; tried: ${candidates.join(', ')}`)``. The parsed array is frozen (`Object.freeze`) and memoised in a module-level variable, so repeated `StellarGenerator` construction costs one read per process.

### Lib layer — `backend/src/lib/naming.ts` *(new)*

```ts
export const NAMED_SYSTEM_PROBABILITY = 0.3;
export const INDEPENDENT_COMPONENT_NAME_PROBABILITY = 0.15;
export const DESIGNATION_PREFIX = 'UG';
export const DESIGNATION_MIN_DIGITS = 4;

export interface SystemNaming {
    systemName: string;
    hasProperName: boolean;
    starNames: string[];   // exactly `starCount` entries, index 0 = component A
}

/** `6` -> "UG-0006"; `12345` -> "UG-12345" (never truncated). */
export function formatDesignation(systemId: number): string;

/** 1 -> "A", 2 -> "B", ... (supports 1-26; star counts are 1-4). */
export function componentLetter(index: number): string;

export class SectorNamer {
    constructor(prng: () => number, pool: readonly string[]);
    nameSystem(systemId: number, starCount: number): SystemNaming;
}
```

Reference implementation of the algorithm (this is the normative behaviour — the draw order matters):

```ts
export class SectorNamer {
    private readonly names: string[];
    private cursor = 0;

    constructor(private readonly prng: () => number, pool: readonly string[]) {
        this.names = [...pool];            // per-instance mutable copy
    }

    private hasNext(): boolean {
        return this.cursor < this.names.length;
    }

    /** Partial Fisher-Yates: one PRNG draw, no repeats. */
    private take(): string {
        const i = this.cursor + Math.floor(this.prng() * (this.names.length - this.cursor));
        const picked = this.names[i];
        this.names[i] = this.names[this.cursor];
        this.names[this.cursor] = picked;
        this.cursor++;
        return picked;
    }

    nameSystem(systemId: number, starCount: number): SystemNaming {
        // 1. Always draw, then decide: keeps the stream independent of pool state.
        const systemRoll = this.prng();
        const hasProperName = systemRoll < NAMED_SYSTEM_PROBABILITY && this.hasNext();
        const systemName = hasProperName ? this.take() : formatDesignation(systemId);

        // 2. A lone star simply *is* the system.
        if (starCount === 1) {
            return { systemName, hasProperName, starNames: [systemName] };
        }

        // 3. Multi-star: primary always tied; secondaries may draw their own name.
        const starNames: string[] = [`${systemName}-${componentLetter(1)}`];
        for (let s = 2; s <= starCount; s++) {
            const componentRoll = this.prng();          // drawn unconditionally
            const independent =
                hasProperName &&
                componentRoll < INDEPENDENT_COMPONENT_NAME_PROBABILITY &&
                this.hasNext();
            starNames.push(independent ? this.take() : `${systemName}-${componentLetter(s)}`);
        }
        return { systemName, hasProperName, starNames };
    }
}
```

### Lib layer — `backend/src/lib/example_star_generator.ts` *(modified)*

Constructor:

```ts
private prng: seedrandom.PRNG;
private namePrng: seedrandom.PRNG;   // NEW
private namer: SectorNamer;          // NEW

constructor(seed?: string | number, zone: SectorZone = 'medium') {
    const seedStr = seed !== undefined ? seed.toString() : Math.random().toString();
    this.prng = seedrandom(seedStr);
    this.namePrng = seedrandom(`${seedStr}::names`);
    this.namer = new SectorNamer(this.namePrng, loadStarProperNames());
    this.zone = zone;
}
```

Inside the `generateSector` per-system loop, immediately after `const starCount = this.determineStarCount();`:

```ts
const naming = this.namer.nameSystem(system.systemId, starCount);
system.name = naming.systemName;
system.hasProperName = naming.hasProperName;
```

and inside the star loop, `name: \`${system.systemId}-${s}\`` becomes `name: naming.starNames[s - 1]`.

Note the `System` object literal at the top of the loop must be constructed with the new fields (TypeScript requires them at construction, so either build it with `name`/`hasProperName` after computing `starCount`, or reorder so `determineStarCount()` and `nameSystem()` run before the literal — **the `determineStarCount()` call must still be the second main-stream draw for the system, after the three position draws**, or the stability guarantee is void).

### Frontend — components / views

No new components, composables, store actions or routes. Three template edits (table in Impact on Existing Code) and the shared type update. Follow the existing `<script setup>` + Tailwind conventions; the `hasProperName` badge should reuse the existing pill styling vocabulary (`px-2 py-1 rounded text-xs`) seen in `ResultsDisplay.vue:127-130`.

---

## Validation Rules

### API input

**Unchanged.** `SectorController.generateSector` keeps its existing checks (`systemCount` a number in 1–10000; `sectorVolume` a number in 1–10000000). The feature adds no request fields, so no new request validation.

### CSV asset validation (`parseStarNameCsv`)

Every rule below throws an `Error` whose message names the offending line number and value.

| Rule | Constraint | Error condition |
|---|---|---|
| Header present | First non-blank, non-`#` line equals `name,designation,constellation,iau_approval_date` exactly | Missing or mismatched header |
| Column count | Every data row splits into exactly 4 comma-separated fields | Any other count (also catches an embedded comma) |
| `name` required | Trimmed length ≥ 2 | Empty or single-character |
| `name` length | Trimmed length ≤ 32 | Longer |
| `name` charset | Matches `/^[A-Za-z][A-Za-z '\-]*$/` (letters, spaces, apostrophes, hyphens; must start with a letter) | Any other character, incl. digits and commas |
| `name` uniqueness | Case-insensitively unique across the file | Duplicate |
| Other columns non-empty | `designation`, `constellation`, `iau_approval_date` each trimmed non-empty | Empty |
| Approval date format | `iau_approval_date` matches `/^\d{4}-\d{2}-\d{2}$/` | Any other shape |
| Pool size | At least `MIN_POOL_SIZE` (100) data rows | Fewer (catches a truncated or half-populated asset) |

Blank lines and `#` comment lines are skipped before any of the above apply.

### Business rules enforced by the namer

- `starNames.length === starCount` for every call.
- No proper name is returned twice by the same `SectorNamer` instance.
- `hasProperName === false` implies `systemName === formatDesignation(systemId)`.
- Component letters are contiguous from `A` for every tied name (`A`, `B`, `C`, `D`).
- Within one generated sector, all `Star.name` values are unique, and all `System.name` values are unique (proper names are drawn without replacement; designations are derived from the unique `systemId`).

---

## Authorization & Security

The API is **public and unauthenticated by design** — there are no users, sessions, policies, guards or middleware in this codebase (`backend/src/index.ts` mounts only `cors()`, `express.json()` and the sector router). This feature introduces no new endpoint, no new request field, and no user-supplied data path, so there is nothing new to authorize.

| Action | Who | Enforcement |
|---|---|---|
| Generate a sector (and thereby names) | Anyone who can reach the API | None — unchanged from today |
| Read system/star names | Anyone with the generated response | None — unchanged from today |

Security considerations specific to this change:

- **No untrusted input reaches the loader.** The CSV path is derived from `__dirname`/`process.cwd()` constants — never from the request — so there is no path-traversal surface. The CSV itself is a committed asset reviewed in the PR, not user upload.
- **Output injection.** Names are rendered through Vue's text interpolation (`{{ }}`), which escapes by default; the charset validation additionally forbids `<`, `>`, `&` and quotes. No `v-html` is introduced.
- **Denial of service.** The asset is read once per process and cached; parsing ~500 rows is sub-millisecond. Per-system naming is O(1) with one or two PRNG draws. At the existing `systemCount` ceiling of 10000 the added work is negligible, so the current absence of rate limiting is not made materially worse. Rate limiting and CSRF remain out of scope (no cookies, no state-changing endpoints).
- **Fail-fast is loud, not leaky.** The loader's error message lists filesystem paths; it is thrown server-side and surfaces to the client only as the controller's generic `'Internal server error while generating sector'` (the `catch` in `sector.controller.ts` already logs the detail and returns a generic message). No path disclosure to clients.

---

## Testing

Backend: Jest + ts-jest, run with `npm test` from `/backend`; unit tests under `backend/__tests__/unit/`, integration under `backend/__tests__/integration/`. Frontend: Vitest, `npm test` from `/frontend`. Both are run by `.github/workflows/test.yml`. Follow the existing style: `describe`/`test`, a `TEST_SEED` constant, direct construction of `StellarGenerator` (see `stellar-generator.test.ts`).

### `backend/__tests__/unit/lib/star-name-pool.test.ts` *(new)*

Drive `parseStarNameCsv` with inline strings (no filesystem), and `loadStarProperNames` against the real asset.

1. Parses a valid minimal CSV and returns the `name` column in file order.
2. Skips `#` comment lines and blank lines wherever they appear (before the header, between rows, trailing).
3. Accepts `\r\n` line endings and trims surrounding whitespace from values.
4. Throws when the header line is missing or misspelled.
5. Throws when a data row has 3 fields, and when it has 5 fields.
6. Throws when a `name` is empty (0 characters) and when it is a single character — both fail the "trimmed length ≥ 2" rule.
7. Throws when a `name` exceeds 32 characters.
8. Throws when a `name` contains a digit or another disallowed character.
9. Throws on a case-insensitive duplicate name (`Vega` / `vega`).
10. Throws when `designation`, `constellation` or `iau_approval_date` is empty.
11. Throws when `iau_approval_date` is not `YYYY-MM-DD`.
12. Throws when the file has fewer than `MIN_POOL_SIZE` data rows (build the fixture programmatically).
13. `loadStarProperNames()` reads the packaged asset and returns at least `MIN_POOL_SIZE` names.
14. Every name from the packaged asset satisfies `NAME_PATTERN`, and the set is case-insensitively unique.
15. `loadStarProperNames()` returns the identical (`toBe`) frozen array on a second call — i.e. it is cached and immutable.

### `backend/__tests__/unit/lib/naming.test.ts` *(new)*

Use an injected fake PRNG (a closure over a scripted array of numbers) plus small pools, so every branch is deterministic and exhaustion is reachable.

16. `formatDesignation(6) === 'UG-0006'`; `formatDesignation(1) === 'UG-0001'`; `formatDesignation(12345) === 'UG-12345'` (not truncated).
17. `componentLetter(1..4)` returns `'A'`, `'B'`, `'C'`, `'D'`.
18. Single-star proper-named system: `starNames` is `['Necklace']` — no `-A` suffix — and `hasProperName` is `true`.
19. Single-star designation system: `systemName` and the one star name are both `UG-0006`, `hasProperName` is `false`.
20. Two-star proper-named system with a high component roll: `['Necklace-A', 'Necklace-B']`.
21. Three-star proper-named system with a low roll on component B: `['Necklace-A', '<other pool name>', 'Necklace-C']`, and the drawn name is not the system name.
22. Two-star designation system: `['UG-0006-A', 'UG-0006-B']` — a designation system never draws an independent component name even when the component roll is low.
23. `starNames.length === starCount` for star counts 1, 2, 3 and 4.
24. Pool exhaustion: with a 1-name pool and rolls that always request a proper name, system 1 gets the name and every later system falls back to its designation with `hasProperName === false` — no throw.
25. No repeats: over 200 systems with a 20-name pool, the multiset of proper names contains no duplicate.
26. Determinism: two `SectorNamer`s built from `seedrandom('abc')` and the same pool produce identical output for the same `(systemId, starCount)` sequence.
27. Different seeds diverge: `seedrandom('abc')` vs `seedrandom('xyz')` over 50 systems produce at least one differing system name.
28. Stream independence from pool state: two namers driven by the same scripted PRNG but pools of different sizes consume the same number of draws for a run of designation-only systems.

### `backend/__tests__/unit/lib/generation-stability.test.ts` *(new)* — the regression guard

**Capture the golden fixture from the current `master` code before modifying the generator**: run `new StellarGenerator('deterministic-seed').generateSector(5, 1000)` on the unmodified generator and paste the resulting `systemId`/`xPos`/`yPos`/`zPos`, per-star `starId`/`systemId`/`spectralClass`/`subclass`, and per-planet `starId`/`orbitalNumber`/`planetType`/`diameter`/`moonCount`/`semiMajorAxis`/`temperature`/`habitableZone` into the test as literal expectations.

29. After the change, `new StellarGenerator('deterministic-seed').generateSector(5, 1000)` reproduces the golden fixture exactly for every field listed above (i.e. the naming stream did not disturb the main stream). Names are deliberately excluded from this fixture.
30. The same golden check for a second seed (`'test-seed-123'`, matching the existing `TEST_SEED`) with `generateSector(3, 1000)`.

### `backend/__tests__/unit/lib/stellar-generator.test.ts` *(modified)*

31. Replace the `expect(star.name).toMatch(/^\d+-\d+$/)` assertion (~line 231) with: every `star.name` is a non-empty string, and star names are unique across the sector.
32. Every `system` has a non-empty string `name` and a boolean `hasProperName`.
33. Every system with `hasProperName === false` has `name === formatDesignation(system.systemId)`.
34. Every system with `hasProperName === true` has a `name` that appears in `loadStarProperNames()`.
35. Every star's name either equals its system's name (single-star system), starts with `` `${system.name}-` `` (tied component), or is a member of the proper-name pool (independent component).
36. Over a 300-system sector, at least one system has `hasProperName === true` and at least one has `false` (both branches are actually exercised at the configured probability).
37. Determinism of names: two generators with the same seed produce identical `system.name`, `system.hasProperName` and `star.name` sequences (extend the existing "deterministic sector with same seed" test rather than duplicating it).
38. Two generators with different seeds produce at least one different system name for a 50-system sector.
39. System names are unique within a sector.

### `backend/__tests__/integration/api/sector-api.test.ts` *(modified)*

40. Replace the `/^\d+-\d+$/` star-name assertion (~line 79) with a non-empty-string check plus sector-wide uniqueness.
41. In the per-system loop (~line 73), assert `typeof system.name === 'string'`, `system.name.length > 0`, and `typeof system.hasProperName === 'boolean'`.
42. Two `POST /api/sector/generate` calls with the same body (including `seed`) return identical `system.name` and `star.name` arrays.
43. Two calls differing only in `seed` return at least one different system name.
44. A `systemCount: 1000` request still returns 200 with every system named (exercises pool exhaustion through the HTTP layer).

### Frontend — `frontend/src/stores/sectorStore.size.test.ts` *(modified)*

45. The `generateSectorData` fixture includes `name` and `hasProperName` on every system, and the existing size-estimation assertions still pass (adjust a threshold only if the added bytes genuinely cross it, and say so in the commit).

### Manual / deployment verification (not automatable here)

46. `cd backend && npm run build && npm start`, then `POST /api/sector/generate` returns named systems — proves the `dist/assets` copy works.
47. A Vercel preview deployment returns 200 from `POST /api/sector/generate` — proves `includeFiles` works (Assumptions & Decisions #17).

---

## Suggested Story Breakdown

Four vertical slices, in implementation order. Each is independently verifiable.

**1. Star-name asset and loader** *(no dependencies)*
Add `backend/src/assets/star-proper-names.csv` populated from IAU-CSN — including the CC BY attribution header comments — plus the repo-root `NOTICE` file, `backend/src/lib/star-name-pool.ts` with `parseStarNameCsv` and `loadStarProperNames`, and `star-name-pool.test.ts` (tests 1–15). Add the `dist/assets` copy + existence check to `backend/package.json`'s build script and the `functions.includeFiles` block to `vercel.json`. See **Data Model → Licensing & attribution**. Extract by fixed-width column offset, not whitespace splitting (24 names contain spaces).
*Verifiable:* `npm test` green in `/backend`; `npm run build` produces `backend/dist/assets/star-proper-names.csv`.

**2. Naming algorithm** *(depends on: nothing at runtime; pair with slice 1 for the real pool)*
Add `backend/src/lib/naming.ts` (constants, `formatDesignation`, `componentLetter`, `SectorNamer`) and `naming.test.ts` (tests 16–28). Pure module, PRNG and pool injected — no generator wiring yet.
*Verifiable:* `npm test` green; the module is not yet referenced by the generator.

**3. Generator wiring, types and API contract** *(depends on 1 and 2)*
**First** capture the golden fixture from the unmodified generator, then add `name`/`hasProperName` to `System` in `backend/src/types/index.ts`, add the `namePrng` + `namer` to `StellarGenerator`, assign the names in `generateSector`, update backend test fixtures, and add/adjust tests 29–44.
*Verifiable:* `npm test` green in `/backend`, including the stability golden test proving pre-existing seeded output is unchanged; a manual `curl` against `npm run dev` shows named systems.

**4. Frontend surfacing** *(depends on 3)*
Mirror the `System` fields in `frontend/src/types/index.ts`, update `ResultsDisplay.vue` (name heading + `IAU` badge), `SystemDetailView.vue` (name heading, id demoted), `ApiReferenceView.vue` (field list), and the `sectorStore.size.test.ts` fixture (test 45).
*Verifiable:* `npm run build` in `/frontend` passes `vue-tsc`; `npm test` green; the systems grid and system detail page show proper names and designations.

---

## Success Criteria

- [ ] `backend/src/assets/star-proper-names.csv` exists, carries the documented header and provenance comments, and contains ≥ 100 IAU-approved names (451 in the 2022-04-04 catalogue edition).
- [ ] The CSV's comment header names the IAU-CSN catalogue, its source URL, the WGSN as issuing authority, the CC BY license, the catalogue edition date, and the fact that the data was modified.
- [ ] A `NOTICE` file at the repo root carries the same attribution, and the parser still ignores every `#` comment line (no runtime impact from the added header).
- [ ] No part of the name data is sourced from Wikipedia; no CC BY-SA / share-alike obligation attaches to the repo.
- [ ] `loadStarProperNames()` resolves the asset under `npm run dev` (ts-node), `npm test` (Jest) and `node dist/index.js` after `npm run build`.
- [ ] `backend/npm run build` produces `backend/dist/assets/star-proper-names.csv` and fails loudly if it does not.
- [ ] `vercel.json` contains a `functions["api/index.ts"].includeFiles` entry covering `backend/src/assets/**`, and a preview deployment returns 200 from `POST /api/sector/generate`.
- [ ] `System` in `backend/src/types/index.ts` and `frontend/src/types/index.ts` both declare `name: string` and `hasProperName: boolean`, with identical text.
- [ ] `POST /api/sector/generate` returns a `name` and `hasProperName` on every element of `data.systems`.
- [ ] For a fixed seed, two generations produce byte-identical system names and star names.
- [ ] For a fixed seed, every pre-existing field (system coordinates, star spectral class/subclass, all planet fields) is identical to the values produced before this feature — proven by `generation-stability.test.ts`.
- [ ] In a 300-system sector, both proper-named and designation systems occur.
- [ ] No proper name appears twice within one generated sector; all `System.name` and all `Star.name` values are unique within a sector.
- [ ] A single-star system's star name equals its system name; a multi-star system's primary is `<SystemName>-A`.
- [ ] A designation system's name matches `/^UG-\d{4,}$/` and equals `formatDesignation(systemId)`.
- [ ] A sector of 1000 systems generates without error with a ~450-name pool (exhaustion falls back to designations).
- [ ] `cd backend && npm test` passes, including all new and updated tests.
- [ ] `cd frontend && npm test` and `cd frontend && npm run build` (vue-tsc) both pass.
- [ ] The systems grid shows the system name with the numeric ID still visible, and marks proper-named systems with a badge; the system detail page shows the name as its heading.
- [ ] `ApiReferenceView.vue` lists `name: string` and `hasProperName: boolean` under `System`.

---

## Future Considerations

Natural extensions deliberately **not** part of this spec:

- **`Star.component`** — expose the component letter as its own field so the UI can sort/label components without parsing the name.
- **Named-system statistics** — a `namedSystemCount` in `getSectorStats` and a tile on the stats tab.
- **Search by system name** — the systems grid has no search box today; adding one (and a system-name filter on `PlanetTable`) would make named systems findable.
- **Route by name** — `/system/Necklace` as an alias for `/system/6`.
- **Constellation-aware naming** — the CSV already carries `constellation`, so systems in the same spatial region of the sector could draw names from the same constellation for extra flavour.
- **Configurable naming density** — expose `NAMED_SYSTEM_PROBABILITY` as an optional request field once there is a reason to tune it.
- **Culturally-varied name pools** — additional CSVs (mythological, invented, catalogue-only) selectable per sector zone.
