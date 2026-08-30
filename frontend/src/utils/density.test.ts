import { describe, it, expect } from 'vitest';
import {
    AVG_STARS_PER_SYSTEM,
    DENSITY_MAP,
    densityMarker,
    densityVerdict,
    expectedDensity,
    starDensity,
    type DensityTone
} from './density';
import type { SectorZone } from '../types';

describe('the density formula is preserved verbatim (D-17)', () => {
    it('multiplies systems per pc³ by the mean star count', () => {
        // The handoff's own sample: 140 systems in 1 000 pc³ reads 0.239.
        expect(starDensity(140, 1000)).toBeCloseTo(0.2394, 6);
        expect(AVG_STARS_PER_SYSTEM).toBe(1.71);
    });

    it('yields 0 rather than Infinity or NaN for a zero or invalid volume', () => {
        expect(starDensity(140, 0)).toBe(0);
        expect(starDensity(Number.NaN, 1000)).toBe(0);
        expect(starDensity(140, Number.NaN)).toBe(0);
    });

    it('keeps the five zone densities', () => {
        expect(DENSITY_MAP).toEqual({
            'extragalactic': 0.001,
            'galactic edge': 0.01,
            'medium': 0.14,
            'central zone': 1.0,
            'core': 10.0
        });
        expect(expectedDensity('core')).toBe(10.0);
        // Unknown values are not reachable through the segmented control, but the
        // pre-redesign component fell back to `medium` and so does this one.
        expect(expectedDensity('nowhere' as SectorZone)).toBe(0.14);
    });
});

describe('the verdict buckets match the existing thresholds (D-17)', () => {
    const cases: Array<[number, string, DensityTone]> = [
        [0.04, 'VERY SPARSE', 'slate'],
        [0.05, 'SPARSE', 'slate'],
        [0.49, 'SPARSE', 'slate'],
        [0.5, 'REALISTIC', 'green'],
        [1, 'REALISTIC', 'green'],
        [2.0, 'REALISTIC', 'green'],
        [2.01, 'DENSE', 'amber'],
        [10, 'DENSE', 'amber'],
        [10.01, 'VERY DENSE', 'red']
    ];

    it.each(cases)('ratio %p reads %s in %s', (ratio, label, tone) => {
        // Ratio is expressed against the medium zone's expected density.
        const verdict = densityVerdict(ratio * DENSITY_MAP['medium'], 'medium');
        expect(verdict.label).toBe(label);
        expect(verdict.tone).toBe(tone);
        expect(verdict.ratio).toBeCloseTo(ratio, 6);
    });

    it('reads the expected density of the selected zone, not a fixed one', () => {
        // 1 star/pc³ is dense for a medium zone and sparse for the core.
        expect(densityVerdict(1, 'medium').label).toBe('DENSE');
        expect(densityVerdict(1, 'core').label).toBe('SPARSE');
    });
});

describe('gauge marker position (§7.7)', () => {
    it('puts ratio 1 at exactly 50%, where the expected tick is drawn', () => {
        expect(densityMarker(DENSITY_MAP['medium'], 'medium')).toBeCloseTo(0.5, 12);
        expect(densityMarker(DENSITY_MAP['core'], 'core')).toBeCloseTo(0.5, 12);
    });

    it('spans two decades either side of the expected value', () => {
        expect(densityMarker(0.014, 'medium')).toBeCloseTo(0.25, 12);
        expect(densityMarker(1.4, 'medium')).toBeCloseTo(0.75, 12);
    });

    it('clamps beyond the ends and never returns NaN', () => {
        expect(densityMarker(0.0000001, 'medium')).toBe(0);
        expect(densityMarker(1000, 'medium')).toBe(1);
        expect(densityMarker(0, 'medium')).toBe(0);
    });
});
