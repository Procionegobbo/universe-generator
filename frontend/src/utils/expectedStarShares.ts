// Expected spectral-class share per galactic zone, used for the 1px white tick
// on the distribution bars.
//
// This mirrors the three threshold ladders in `generateStarType` /
// `generateStarType2` / `generateStarType3`
// (backend/src/lib/example_star_generator.ts) as data. Each ladder is written
// as [class, percentage] pairs summing to exactly 100, with `@2` / `@3a` / `@3b`
// standing for a recursive call into the next ladder: those expand by
// multiplication, and duplicate classes sum (BH appears both in the `core`
// primary ladder and in TERTIARY_B).

import type { SectorZone } from '../types';

type Ladder = Array<[string, number]>;

const PRIMARY: Record<SectorZone, Ladder> = {
    'extragalactic': [['@2', 0.01], ['G', 0.09], ['K', 4.9], ['M', 87.0], ['DA', 6.0], ['DF', 2.0]],
    'galactic edge': [['@2', 0.1], ['F', 0.4], ['G', 3.5], ['K', 11.0], ['M', 75.0], ['DA', 7.0], ['DF', 3.0]],
    'medium': [['@2', 1.0], ['B', 0.1], ['A', 0.6], ['F', 3.0], ['G', 7.6], ['K', 12.0],
        ['M', 67.7], ['DA', 3.0], ['DB', 2.0], ['DF', 1.0], ['DG', 1.0], ['DK', 1.0]],
    'central zone': [['@2', 2.0], ['B', 0.5], ['A', 1.5], ['F', 6.0], ['G', 10.0], ['K', 15.0],
        ['M', 55.0], ['DA', 10.0]],
    'core': [['@2', 15.0], ['B', 1.0], ['A', 2.0], ['F', 7.0], ['G', 10.0], ['K', 15.0],
        ['M', 35.0], ['DA', 10.0], ['BH', 5.0]]
};

// generateStarType2
const SECONDARY: Ladder =
    [['@3a', 1.0], ['gF', 4.0], ['gG', 5.0], ['gK', 45.0], ['gM', 40.0], ['NS', 4.0], ['@3b', 1.0]];

// generateStarType3(1)
const TERTIARY_A: Ladder = [['cB', 10], ['cA', 10], ['cF', 20], ['cG', 20], ['cK', 20], ['cM', 20]];

// generateStarType3(100)
const TERTIARY_B: Ladder = [['BH', 5], ['O', 95]];

const LADDERS: Record<string, Ladder> = {
    '@2': SECONDARY,
    '@3a': TERTIARY_A,
    '@3b': TERTIARY_B
};

/** Accumulates a ladder's shares into `into`, expanding the recursive markers. */
function accumulate(ladder: Ladder, weight: number, into: Record<string, number>): void {
    for (const [key, percent] of ladder) {
        const share = (percent / 100) * weight;
        const nested = LADDERS[key];
        if (nested) {
            accumulate(nested, share, into);
            continue;
        }
        into[key] = (into[key] || 0) + share;
    }
}

const SHARES_BY_ZONE: Record<string, Record<string, number>> = {};

function sharesFor(zone: SectorZone): Record<string, number> {
    let shares = SHARES_BY_ZONE[zone];
    if (!shares) {
        shares = {};
        accumulate(PRIMARY[zone] || PRIMARY['medium'], 1, shares);
        SHARES_BY_ZONE[zone] = shares;
    }
    return shares;
}

/** Expected fraction in [0, 1] of a zone's stars belonging to a spectral class. */
export function expectedShare(zone: SectorZone, spectralClass: string): number {
    return sharesFor(zone)[spectralClass] || 0;
}
