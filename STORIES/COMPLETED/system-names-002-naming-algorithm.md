# system-names-002-naming-algorithm

**Spec:** STORIES/SPECS/system-names.md

**As a** backend developer
**I want** a pure, injectable `SectorNamer` module implementing the system/component naming
algorithm (proper names, tied and independent component names, catalogue designations)
**So that** the naming logic is deterministic and fully unit-testable in isolation, ready to be
wired into the generator without touching the filesystem or the main PRNG stream

## Acceptance Criteria

```gherkin
Feature: SectorNamer naming algorithm

  Background:
    Given the module "backend/src/lib/naming.ts"
    And SectorNamer is constructed with an injected PRNG function and a readonly string pool

  # --- formatDesignation / componentLetter (tests 16-17) ---

  Scenario Outline: formatDesignation zero-pads to at least 4 digits (test 16)
    When formatDesignation(<systemId>) is called
    Then it returns "<designation>"

    Examples:
      | systemId | designation |
      | 6        | UG-0006     |
      | 1        | UG-0001     |
      | 12345    | UG-12345    |

  Scenario Outline: componentLetter maps index to letter (test 17)
    When componentLetter(<index>) is called
    Then it returns "<letter>"

    Examples:
      | index | letter |
      | 1     | A      |
      | 2     | B      |
      | 3     | C      |
      | 4     | D      |

  # --- nameSystem core behaviour (tests 18-23) ---

  Scenario: Single-star proper-named system has no suffix (test 18)
    Given a PRNG scripted to draw a proper name for the system
    When nameSystem(systemId, 1) is called
    Then hasProperName is true
    And starNames equals a single-element array containing only the system name (e.g. ["Necklace"])

  Scenario: Single-star designation system (test 19)
    Given a PRNG scripted to not draw a proper name
    When nameSystem(systemId, 1) is called
    Then hasProperName is false
    And both systemName and the one star name equal formatDesignation(systemId) (e.g. "UG-0006")

  Scenario: Two-star proper-named system with a high component roll (test 20)
    Given a PRNG scripted to draw a proper name for the system and a high roll for component B
    When nameSystem(systemId, 2) is called
    Then starNames equals ["Necklace-A", "Necklace-B"]

  Scenario: Three-star proper-named system with a low roll on component B (test 21)
    Given a PRNG scripted to draw a proper name for the system, a low roll for component B, and
      an available pool
    When nameSystem(systemId, 3) is called
    Then starNames equals ["Necklace-A", "<other pool name>", "Necklace-C"]
    And the drawn component name is not equal to the system name

  Scenario: Two-star designation system never draws independent names (test 22)
    Given a PRNG scripted to not draw a proper name for the system, but a low roll for component B
    When nameSystem(systemId, 2) is called
    Then starNames equals ["UG-0006-A", "UG-0006-B"]

  Scenario Outline: starNames length always matches starCount (test 23)
    When nameSystem(systemId, <starCount>) is called
    Then starNames.length equals <starCount>

    Examples:
      | starCount |
      | 1         |
      | 2         |
      | 3         |
      | 4         |

  # --- Exhaustion, uniqueness, determinism (tests 24-28) ---

  Scenario: Pool exhaustion falls back to designations without throwing (test 24)
    Given a 1-name pool and a PRNG scripted to always request a proper name
    When nameSystem is called for system 1 and then for later systems
    Then system 1 receives the pool's one proper name
    And every later system falls back to its designation with hasProperName false
    And no call throws

  Scenario: No proper name repeats within one SectorNamer instance (test 25)
    Given a 20-name pool
    When nameSystem is called for 200 systems on the same SectorNamer instance
    Then the multiset of drawn proper names contains no duplicate

  Scenario: Determinism for the same seed (test 26)
    Given two SectorNamer instances built from seedrandom('abc') and the same pool
    When both are driven through the same sequence of (systemId, starCount) calls
    Then their outputs are identical

  Scenario: Different seeds diverge (test 27)
    Given two SectorNamer instances built from seedrandom('abc') and seedrandom('xyz') and the
      same pool
    When both are driven through the same sequence of calls for 50 systems
    Then at least one system name differs between the two runs

  Scenario: Naming stream draw count is independent of pool state (test 28)
    Given two SectorNamer instances driven by the same scripted PRNG but pools of different sizes
    When both run a sequence of designation-only systems
    Then both consume the same number of PRNG draws
```

## Technical Notes

**Module signatures** (`backend/src/lib/naming.ts`, new):

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

**Reference implementation** (normative — draw order matters, reproduce exactly):

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

**Governing decisions from the spec (copy into behaviour, do not deviate):**

- **#2** — 30% of systems get a proper name (`NAMED_SYSTEM_PROBABILITY = 0.3`).
- **#3** — 15% of secondary components in a proper-named system get their own proper name
  (`INDEPENDENT_COMPONENT_NAME_PROBABILITY = 0.15`). The primary component (A) always keeps the
  tied name.
- **#4** — Independent proper names are only drawn inside proper-named systems, never inside
  designation systems.
- **#5** — A single-star system's star takes the system name verbatim, no `-A` suffix. Multi-star
  systems always suffix, including the primary.
- **#6** — Separator is a hyphen (`Necklace-A`, `UG-0006-B`), not a space.
- **#7** — Designation format is `UG-` + zero-padded `systemId`, minimum width 4
  (`DESIGNATION_PREFIX`, `DESIGNATION_MIN_DIGITS`).
- **#8** — The proper-name pool is shared between system names and independent star names, drawn
  without replacement per generator instance (implemented via the partial Fisher-Yates cursor).
- **#9** — Pool exhaustion falls back to designations (systems) and to the tied `-<letter>` form
  (components), never throws.
- **#16** — Naming probabilities are compile-time constants, not request parameters; no request
  validation or API surface is added here.

**Business rules to verify (also re-checked at the generator level in story 003):**

- `starNames.length === starCount` for every call.
- No proper name is returned twice by the same `SectorNamer` instance.
- `hasProperName === false` implies `systemName === formatDesignation(systemId)`.
- Component letters are contiguous from `A` for every tied name.

This story is a **pure module** — no filesystem access, no wiring into
`example_star_generator.ts` yet. Tests drive it with a fake PRNG (a closure over a scripted
array of numbers) and small in-memory pools so every branch, including exhaustion, is reachable
without the real CSV.

## Tests

`backend/__tests__/unit/lib/naming.test.ts` (new) — spec tests 16-28:

16. `formatDesignation(6) === 'UG-0006'`; `formatDesignation(1) === 'UG-0001'`;
    `formatDesignation(12345) === 'UG-12345'`.
17. `componentLetter(1..4)` returns `'A'`, `'B'`, `'C'`, `'D'`.
18. Single-star proper-named system: `starNames` is `['Necklace']`, `hasProperName` true.
19. Single-star designation system: `systemName` and the one star name both `UG-0006`,
    `hasProperName` false.
20. Two-star proper-named system with a high component roll: `['Necklace-A', 'Necklace-B']`.
21. Three-star proper-named system with a low roll on component B:
    `['Necklace-A', '<other pool name>', 'Necklace-C']`, drawn name not equal to system name.
22. Two-star designation system: `['UG-0006-A', 'UG-0006-B']` — never draws an independent name
    even with a low component roll.
23. `starNames.length === starCount` for star counts 1, 2, 3 and 4.
24. Pool exhaustion: with a 1-name pool and rolls that always request a proper name, system 1
    gets the name and every later system falls back to its designation with
    `hasProperName === false` — no throw.
25. No repeats: over 200 systems with a 20-name pool, the multiset of proper names contains no
    duplicate.
26. Determinism: two `SectorNamer`s built from `seedrandom('abc')` and the same pool produce
    identical output for the same `(systemId, starCount)` sequence.
27. Different seeds diverge: `seedrandom('abc')` vs `seedrandom('xyz')` over 50 systems produce
    at least one differing system name.
28. Stream independence from pool state: two namers driven by the same scripted PRNG but pools
    of different sizes consume the same number of draws for a run of designation-only systems.

**Priority:** Critical
**Dependencies:** None
