import { describe, it, expect } from 'vitest';
import {
    PLANET_SHORT_LABEL,
    planetShortLabel,
    orbitLetter,
    planetDisplayName,
    massEarths,
    gravityG,
    densityGCm3,
    relativeSize
} from './planetDisplay';
import { PLANET_TYPE_DESCRIPTIONS } from '../types';
import type { Planet, Star } from '../types';

// Built the way the generator builds them: radius in metres from the diameter,
// mass = density * volume, gravity = G * m / r^2.
const makePlanet = (overrides: Partial<Planet> & { diameterKm: number; densityKgM3: number }): Planet => {
    const { diameterKm, densityKgM3, ...rest } = overrides;
    const radius = (diameterKm * 1000) / 2;
    const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const mass = densityKgM3 * volume;
    const gravity = radius === 0 ? 0 : (6.6743e-11 * mass) / (radius * radius);

    return {
        starId: 1,
        orbitalNumber: 3,
        planetType: 'E',
        diameter: diameterKm,
        moonCount: 1,
        mass,
        gravity,
        semiMajorAxis: 1,
        temperature: 288,
        habitableZone: true,
        lifeProbability: 0.4,
        lifeComplexity: 3,
        hasLife: false,
        ...rest
    };
};

const EARTH = makePlanet({ diameterKm: 12742, densityKgM3: 5514 });
const SUPER_EARTH = makePlanet({ diameterKm: 14000, densityKgM3: 5500 });
const ASTEROID_BELT: Planet = {
    starId: 1,
    orbitalNumber: 2,
    planetType: 'A',
    diameter: 0,
    moonCount: 0,
    mass: 0,
    gravity: 0,
    semiMajorAxis: 2.4,
    temperature: 200,
    habitableZone: false,
    lifeProbability: 0,
    lifeComplexity: 0,
    hasLife: false
};

const STAR: Star = { starId: 1, systemId: 1, name: 'Kepler-442-A', spectralClass: 'G' };

describe('orbitLetter (T-F20)', () => {
    it.each([
        [1, 'b'],
        [3, 'd'],
        [26, '#26']
    ])('maps orbit %p to %s', (n, expected) => {
        expect(orbitLetter(n)).toBe(expected);
    });

    it('uses the last letter at the guard boundary', () => {
        expect(orbitLetter(25)).toBe('z');
    });
});

describe('planetDisplayName (T-F21)', () => {
    it('prefers the payload name when present', () => {
        expect(planetDisplayName({ ...EARTH, name: 'Thalassa' }, STAR)).toBe('Thalassa');
    });

    it('falls back to star name plus orbit letter', () => {
        expect(planetDisplayName(EARTH, STAR)).toBe('Kepler-442-A d');
        expect(planetDisplayName({ ...EARTH, orbitalNumber: 1 }, STAR)).toBe('Kepler-442-A b');
    });
});

describe('physical display helpers (T-F22)', () => {
    it('rounds an Earth-like planet to its expected values', () => {
        expect(massEarths(EARTH)).toBe(1);
        expect(gravityG(EARTH)).toBe(1);
        expect(densityGCm3(EARTH)).toBe(5.51);
    });

    it('rounds a super-Earth to two decimals', () => {
        expect(massEarths(SUPER_EARTH)).toBe(1.32);
        expect(gravityG(SUPER_EARTH)).toBe(1.1);
        expect(densityGCm3(SUPER_EARTH)).toBe(5.5);
    });

    it('returns null for an asteroid belt, never NaN or Infinity', () => {
        for (const value of [massEarths(ASTEROID_BELT), gravityG(ASTEROID_BELT), densityGCm3(ASTEROID_BELT)]) {
            expect(value).toBeNull();
            expect(Number.isNaN(value as unknown as number)).toBe(false);
        }
    });
});

describe('relativeSize (T-F23)', () => {
    it('returns 0 when the maximum is 0', () => {
        expect(relativeSize(12742, 0)).toBe(0);
    });

    it('is the plain ratio otherwise', () => {
        expect(relativeSize(6000, 12000)).toBe(0.5);
        expect(relativeSize(12000, 12000)).toBe(1);
    });
});

describe('PLANET_SHORT_LABEL (D-21)', () => {
    it('holds the design copy for the dense surfaces', () => {
        expect(PLANET_SHORT_LABEL).toEqual({
            'R': 'Rocky',
            'G': 'Gas giant',
            'I': 'Ice world',
            'D': 'Desert',
            'U': 'Ice giant',
            'A': 'Asteroid',
            'O': 'Ocean',
            'E': 'Earth-like'
        });
    });

    it('falls through to the untouched long map for every other type', () => {
        expect(planetShortLabel('R')).toBe('Rocky');
        expect(planetShortLabel('H')).toBe(PLANET_TYPE_DESCRIPTIONS['H']);
        expect(planetShortLabel('#')).toBe(PLANET_TYPE_DESCRIPTIONS['#']);
    });
});
