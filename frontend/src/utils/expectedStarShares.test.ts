import { describe, it, expect } from 'vitest';
import { expectedShare } from './expectedStarShares';
import { STAR_TYPE_DESCRIPTIONS } from '../types';
import type { SectorZone } from '../types';

const ZONES: SectorZone[] = ['extragalactic', 'galactic edge', 'medium', 'central zone', 'core'];
const CLASSES = Object.keys(STAR_TYPE_DESCRIPTIONS);

describe('expectedShare', () => {
    it.each(ZONES)('sums to 1 over all 24 classes in the %s zone (T-F24)', zone => {
        const total = CLASSES.reduce((sum, cls) => sum + expectedShare(zone, cls), 0);
        expect(CLASSES).toHaveLength(24);
        expect(Math.abs(total - 1)).toBeLessThan(1e-9);
    });

    it("matches the generator's ladder comments (T-F25)", () => {
        expect(expectedShare('medium', 'M')).toBeCloseTo(0.677, 6);
        expect(expectedShare('medium', 'G')).toBeCloseTo(0.076, 6);
    });

    it('folds the cascade contribution into the core BH share (T-F26)', () => {
        // 5% from the primary ladder plus 15% * 1% * 5% from generateStarType3(100).
        expect(expectedShare('core', 'BH')).toBeGreaterThan(0.05);
        expect(expectedShare('core', 'BH')).toBeCloseTo(0.05 + 0.15 * 0.01 * 0.05, 12);
    });

    it('reaches the classes that only exist behind the cascade', () => {
        // gK and cM are only reachable via generateStarType2 / generateStarType3.
        expect(expectedShare('core', 'gK')).toBeCloseTo(0.15 * 0.45, 12);
        expect(expectedShare('core', 'cM')).toBeCloseTo(0.15 * 0.01 * 0.2, 12);
        expect(expectedShare('core', 'O')).toBeCloseTo(0.15 * 0.01 * 0.95, 12);
    });

    it('returns 0, not undefined, for an unknown class (T-F27)', () => {
        for (const zone of ZONES) {
            expect(expectedShare(zone, 'not-a-class')).toBe(0);
        }
    });
});
