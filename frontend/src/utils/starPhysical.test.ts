// The luminosity/radius table below is mirrored from `starTypes` in
// backend/src/lib/example_star_generator.ts — change both together. The backend
// half of the pair is pinned by
// backend/__tests__/unit/lib/star-physical-contract.test.ts (T-B1).

import { describe, it, expect } from 'vitest';
import {
    STAR_PHYSICAL,
    starPhysical,
    habitableZoneBounds,
    orbitBand,
    systemMass
} from './starPhysical';
import { STAR_TYPE_DESCRIPTIONS, PLANET_TYPE_DESCRIPTIONS } from '../types';
import type { Star } from '../types';

// [spectralClass, luminosity (L_sun), radius (R_sun)] — identical to T-B1's table.
const BACKEND_STAR_TYPES: Array<[string, number, number]> = [
    ['O', 50000, 10],
    ['B', 20000, 5],
    ['A', 80, 1.8],
    ['F', 6, 1.3],
    ['G', 1, 1],
    ['K', 0.4, 0.8],
    ['M', 0.04, 0.3],
    ['DA', 0.001, 0.013],
    ['DB', 0.001, 0.013],
    ['DF', 0.001, 0.013],
    ['DG', 0.001, 0.013],
    ['DK', 0.001, 0.013],
    ['gF', 45, 5],
    ['gG', 65, 10],
    ['gK', 150, 20],
    ['gM', 380, 50],
    ['cB', 90000, 25],
    ['cA', 21000, 60],
    ['cF', 21000, 100],
    ['cG', 21000, 180],
    ['cK', 22000, 280],
    ['cM', 66000, 700],
    ['NS', 0, 0.00002],
    ['BH', 0, 0]
];

// D-36: the closed 24-class and 22-code sets, spelled out as literals so that
// both an addition and a removal fail.
const FROZEN_STAR_CLASSES = [
    'O', 'B', 'A', 'F', 'G', 'K', 'M',
    'DA', 'DB', 'DF', 'DG', 'DK',
    'gF', 'gG', 'gK', 'gM',
    'NS',
    'cB', 'cA', 'cF', 'cG', 'cK', 'cM',
    'BH'
];

const FROZEN_PLANET_CODES = [
    'A', 'G', 'Q', 'U', 'S', 'R', 'E', 'O', 'I', 'D', 'C',
    'L', 'F', 'T', 'N', 'B', 'J', 'W', 'H', 'M', 'X', '#'
];

const star = (spectralClass: string): Star =>
    ({ starId: 1, systemId: 1, name: 'Test', spectralClass });

describe('STAR_PHYSICAL mirrors the backend starTypes table (T-F1)', () => {
    it.each(BACKEND_STAR_TYPES)(
        '%s has luminosity %p and radius %p',
        (spectralClass, luminosity, radius) => {
            const row = STAR_PHYSICAL[spectralClass];
            expect(row).toBeDefined();
            expect(row.luminosity).toBe(luminosity);
            expect(row.radius).toBe(radius);
        }
    );

    it('has a row for every backend class and no extra rows', () => {
        expect(Object.keys(STAR_PHYSICAL).sort())
            .toEqual(BACKEND_STAR_TYPES.map(([cls]) => cls).sort());
    });
});

describe('the star and planet type sets are frozen (D-36, T-F49)', () => {
    it('STAR_TYPE_DESCRIPTIONS holds exactly the 24 spectral classes', () => {
        expect(FROZEN_STAR_CLASSES).toHaveLength(24);
        expect(Object.keys(STAR_TYPE_DESCRIPTIONS).sort())
            .toEqual([...FROZEN_STAR_CLASSES].sort());
    });

    it('PLANET_TYPE_DESCRIPTIONS holds exactly the 22 planet codes', () => {
        expect(FROZEN_PLANET_CODES).toHaveLength(22);
        expect(Object.keys(PLANET_TYPE_DESCRIPTIONS).sort())
            .toEqual([...FROZEN_PLANET_CODES].sort());
    });

    it('STAR_PHYSICAL covers every spectral class with no extra key', () => {
        expect(Object.keys(STAR_PHYSICAL).sort())
            .toEqual([...FROZEN_STAR_CLASSES].sort());
    });
});

describe('habitableZoneBounds', () => {
    it("matches the generator's Solar reference (T-F4)", () => {
        const { inner, outer } = habitableZoneBounds('G');
        expect(inner).toBeCloseTo(Math.sqrt(1 / 1.78), 10);
        expect(outer).toBeCloseTo(Math.sqrt(1 / 0.32), 10);
        expect(inner).toBeCloseTo(0.7495, 4);
        expect(outer).toBeCloseTo(1.7678, 4);
    });

    it('gives non-luminous classes no habitable zone (T-F5)', () => {
        expect(habitableZoneBounds('NS')).toEqual({ inner: 0, outer: 0 });
        expect(habitableZoneBounds('BH')).toEqual({ inner: 0, outer: 0 });
    });
});

describe('orbitBand (T-F6)', () => {
    it("agrees with the generator's determineHabitableZone around both bounds", () => {
        const { inner, outer } = habitableZoneBounds('G');

        expect(orbitBand(inner * 0.5, 'G')).toBe('inner');
        expect(orbitBand(inner, 'G')).toBe('medium');
        expect(orbitBand((inner + outer) / 2, 'G')).toBe('medium');
        expect(orbitBand(outer, 'G')).toBe('medium');
        expect(orbitBand(outer * 1.5, 'G')).toBe('outer');
    });

    it('holds for a dim class too', () => {
        const { inner, outer } = habitableZoneBounds('M');

        expect(orbitBand(inner - 1e-6, 'M')).toBe('inner');
        expect(orbitBand(inner, 'M')).toBe('medium');
        expect(orbitBand(outer, 'M')).toBe('medium');
        expect(orbitBand(outer + 1e-6, 'M')).toBe('outer');
    });
});

describe('unknown spectral class (T-F7)', () => {
    it('falls back to the M-class row rather than throwing', () => {
        expect(starPhysical('not-a-class'))
            .toEqual({ luminosity: 0.04, radius: 0.3, mass: 0.3, effectiveTemp: 3200 });
        expect(starPhysical('not-a-class')).toEqual(STAR_PHYSICAL['M']);
    });

    it('gives the unknown class the M-class habitable zone', () => {
        expect(habitableZoneBounds('not-a-class')).toEqual(habitableZoneBounds('M'));
    });
});

describe('systemMass (T-F8)', () => {
    it('is 0 for a system with no stars', () => {
        expect(systemMass([])).toBe(0);
    });

    it('sums the nominal class masses', () => {
        expect(systemMass([star('G'), star('DA')])).toBeCloseTo(1.6, 10);
    });

    it('uses the M-class mass for an unknown class', () => {
        expect(systemMass([star('not-a-class')])).toBeCloseTo(0.3, 10);
    });
});
