# navigation-001-sid-codec

**Spec:** STORIES/SPECS/navigation.md

**As a** developer building sector-scoped navigation
**I want** a reversible `sid` codec (`encodeSid`, `decodeSid`, `sameSid`, `normaliseSeed`) added to `frontend/src/utils/sectorLink.ts`
**So that** a sector's four generation parameters can be represented as one path segment that round-trips exactly, and later slices can key routing and regeneration off it

## Acceptance Criteria

```gherkin
Feature: sid codec

  Scenario: Encoding the canonical params
    Given params { seed: '766207', zone: 'medium', systemCount: 100, sectorVolume: 1000 }
    When I call encodeSid(params)
    Then the result is "766207-m-100-1000"

  Scenario Outline: Each zone gets its own code
    Given a SectorZone of "<zone>"
    When I call encodeSid with that zone and otherwise-canonical params
    Then the sid's second field is "<code>"

    Examples:
      | zone            | code |
      | extragalactic   | x    |
      | galactic edge   | g    |
      | medium          | m    |
      | central zone    | z    |
      | core            | c    |

  Scenario: Round trip
    Given any valid SectorLinkParams p, for each of the five zones
    When I call decodeSid(encodeSid(p))
    Then the result deep-equals p

  Scenario: Missing trailing fields default
    When I call decodeSid("766207")
    Then the result is { seed: '766207', zone: 'medium', systemCount: 100, sectorVolume: 1000 }

  Scenario: Partial trailing fields default
    When I call decodeSid("766207-c")
    Then zone is 'core' and systemCount/sectorVolume default to 100/1000

  Scenario: A future fifth field is ignored (forward compatibility)
    When I call decodeSid("766207-m-100-1000-9")
    Then it decodes the same as "766207-m-100-1000", ignoring field 5

  Scenario Outline: Malformed sids decode to null
    When I call decodeSid("<input>")
    Then the result is null

    Examples:
      | input                    |
      |                          |
      | foo                      |
      | -m-100-1000              |
      | 766207-q-100-1000        |
      | 766207-m-0-1000          |
      | 766207-m-100-0           |
      | 766207-m-lots-1000       |
      | 766207-m-10.5-1000       |

  Scenario: A fractional seed is accepted
    When I call decodeSid("1.5-m-100-1000")
    Then seed decodes to '1.5'

  Scenario Outline: sameSid compares every one of the four fields
    Given params a and params b that are identical except for "<field>"
    When I call sameSid(a, b)
    Then the result is false

    Examples:
      | field         |
      | seed          |
      | zone          |
      | systemCount   |
      | sectorVolume  |

  Scenario: sameSid is true for identical params
    Given identical params a and b
    When I call sameSid(a, b)
    Then the result is true

  Scenario: sameSid treats null as never equal
    When I call sameSid(null, x) or sameSid(x, null)
    Then both results are false

  Scenario Outline: normaliseSeed accepts every seed the app can produce
    When I call normaliseSeed("<input>")
    Then the result is "<output>"

    Examples:
      | input     | output   |
      | 766207    | "766207" |
      | '766207'  | "766207" |
      | '1.5'     | "1.5"    |

  Scenario Outline: normaliseSeed rejects everything else
    When I call normaliseSeed("<input>")
    Then the result is null

    Examples:
      | input       |
      | -5          |
      | 'abc'       |
      | ''          |
      | NaN         |
      | null        |
      | undefined   |
```

## Technical Notes

This slice is purely additive: the new functions are added alongside the existing
`sectorQuery`, `sameSector`, `sectorParamsFromQuery`, `one()` and `ZONES` exports, which
stay untouched here so nothing else in the app breaks. Nothing consumes the new functions
yet — they are wired up starting in `navigation-002`. Deletion of the old exports happens
in `navigation-003`, once every caller has migrated.

**A1. The `sid` grammar is `<seed>-<zoneCode>-<systemCount>-<sectorVolume>`**

Concretely: `766207-m-100-1000`.

- **Zone codes** (single letter): `x` extragalactic, `g` galactic edge, `m` medium,
  `z` central zone, `c` core.
- **Seed segment**: `^\d+(?:\.\d+)?$`. The seed input is `<input type="number" min="0">`
  (`SectorControls.vue:164`) and the randomiser is `Math.floor(Math.random() * 1000000)`,
  so every seed the app can produce is a non-negative number.
- **Field order is positional and left-to-right.** A future fifth field is appended;
  today's four-field links still decode with the fifth defaulted; today's decoder ignores
  a fifth field it does not know.

**A3. The invariant this codec exists to serve**

> The sid encodes **every** parameter that feeds generation, and the comparison that
> decides whether a link is honoured or the sector rebuilt is equality of the whole sid —
> not a curated subset. "Every parameter that feeds generation" is precisely the fields of
> `GenerationRequest` (`frontend/src/types/index.ts:46-51`, mirrored in
> `backend/src/types/index.ts:62-67`): `systemCount`, `sectorVolume`, `seed?`, `zone?`. All
> four are already in the sid. `sameSid` must compare all four — this is why it is
> implemented as string equality of the full encoded sid, not a field-by-field subset
> check.

Add to `frontend/src/utils/sectorLink.ts`:

```ts
export const ZONE_CODE: Record<SectorZone, string> = {
    'extragalactic': 'x',
    'galactic edge': 'g',
    'medium': 'm',
    'central zone': 'z',
    'core': 'c'
};
const ZONE_BY_CODE: Record<string, SectorZone> = Object.fromEntries(
    Object.entries(ZONE_CODE).map(([zone, code]) => [code, zone])
) as Record<string, SectorZone>;

/** The defaults a sid's missing trailing fields take, so a link written before a
 *  field existed still decodes. They are the store's own defaults. */
const SID_DEFAULTS = { zone: 'medium' as SectorZone, systemCount: 100, sectorVolume: 1000 };

const SEED_PATTERN = /^\d+(?:\.\d+)?$/;

/** Every seed the app can produce, in its canonical string form. */
export function normaliseSeed(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return SEED_PATTERN.test(text) ? text : null;
}

export function encodeSid(params: SectorLinkParams): string {
    return [
        String(params.seed),
        ZONE_CODE[params.zone],
        String(params.systemCount),
        String(params.sectorVolume)
    ].join('-');
}

/**
 * The sector a sid names, or null when it names none.
 *
 * Positional and left-to-right: field 1 seed, 2 zone, 3 systemCount, 4
 * sectorVolume. Trailing fields may be absent and take their default; fields
 * beyond the last one this version knows are ignored, so a link written by a
 * future build that appends a fifth parameter still resolves to a sector here.
 * Present-but-wrong is never defaulted — an unknown zone code or a non-positive
 * count is a malformed sid, not a missing field.
 */
export function decodeSid(sid: unknown): SectorLinkParams | null {
    if (typeof sid !== 'string' || sid.length === 0) return null;
    const [rawSeed, rawZone, rawSystems, rawVolume] = sid.split('-');

    const seed = normaliseSeed(rawSeed);
    if (seed === null) return null;

    let zone = SID_DEFAULTS.zone;
    if (rawZone !== undefined) {
        if (!(rawZone in ZONE_BY_CODE)) return null;
        zone = ZONE_BY_CODE[rawZone];
    }

    let systemCount = SID_DEFAULTS.systemCount;
    if (rawSystems !== undefined) {
        const n = positiveInt(rawSystems);
        if (n === null) return null;
        systemCount = n;
    }

    let sectorVolume = SID_DEFAULTS.sectorVolume;
    if (rawVolume !== undefined) {
        const n = positiveInt(rawVolume);
        if (n === null) return null;
        sectorVolume = n;
    }

    return { seed, zone, systemCount, sectorVolume };
}

/** Whether two parameter sets name the same sector — all four fields. See A3. */
export function sameSid(a: SectorLinkParams | null, b: SectorLinkParams | null): boolean {
    if (a === null || b === null) return false;
    return encodeSid(a) === encodeSid(b);
}
```

`positiveInt` is the existing private helper in the same file; its signature widens from
`string | null` to `string | undefined | null`, or it is called with a non-null argument
as above (either is acceptable — pick whichever keeps its existing callers typed
correctly). `requestFor` and `SectorLinkParams` are untouched by this slice.

**Value objects** (`utils/sectorLink.ts`):

| Name | Shape |
|---|---|
| `SectorLinkParams` (existing, unchanged) | `{ seed: string; zone: SectorZone; systemCount: number; sectorVolume: number }` |
| `sid` (new) | `string` — `<seed>-<zoneCode>-<systemCount>-<sectorVolume>` |

**Zone codes**

| `SectorZone` | code |
|---|---|
| `extragalactic` | `x` |
| `galactic edge` | `g` |
| `medium` | `m` |
| `central zone` | `z` |
| `core` | `c` |

## Tests

`frontend/src/utils/sectorLink.test.ts` (additions only — no deletions in this slice):

1. `encodeSid` produces `766207-m-100-1000` for the canonical params.
2. `encodeSid` emits the right code for each of the five zones.
3. `decodeSid(encodeSid(p))` round-trips all four fields, for each zone.
4. `decodeSid('766207')` defaults zone/count/volume to medium/100/1000.
5. `decodeSid('766207-c')` defaults count and volume only.
6. `decodeSid('766207-m-100-1000-9')` ignores the unknown fifth field (forward
   compatibility, Decision 1).
7. `decodeSid` returns `null` for: `''`, `'foo'`, `'-m-100-1000'` (empty seed),
   `'766207-q-100-1000'` (unknown zone), `'766207-m-0-1000'`, `'766207-m-100-0'`,
   `'766207-m-lots-1000'`, `'766207-m-10.5-1000'`.
8. `decodeSid('1.5-m-100-1000')` accepts a fractional seed and returns it as `'1.5'`.
9. `sameSid` is true for identical params and false when **any one** of the four differs —
   including `systemCount` and `sectorVolume`, which is what Decision 1-bis requires.
10. `sameSid(null, x)` and `sameSid(x, null)` are false.
11. `normaliseSeed` accepts `766207`, `'766207'`, `'1.5'`; rejects `-5`, `'abc'`, `''`,
    `NaN`, `null`, `undefined`.
12. `requestFor`'s existing describe block is retained unchanged — it is the only part of
    the old module untouched by this feature.

Regression: `npm test` in `/frontend` stays green; no existing test is modified in this
slice.

**Priority:** Critical
**Dependencies:** None
