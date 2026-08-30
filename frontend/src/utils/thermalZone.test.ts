import { describe, it, expect } from 'vitest';
import { thermalZone, zoneBadgeClass, tempTextClass, type ThermalZone } from './thermalZone';
import type { Planet } from '../types';

const planet = (temperature: number, habitableZone: boolean): Planet => ({
    starId: 1,
    orbitalNumber: 1,
    planetType: 'R',
    diameter: 12000,
    moonCount: 0,
    mass: 6e24,
    gravity: 9.8,
    semiMajorAxis: 1,
    temperature,
    habitableZone,
    lifeProbability: 0,
    lifeComplexity: 0,
    hasLife: false
});

const ZONES: ThermalZone[] = ['Hot', 'Temperate', 'Goldilocks', 'Cold'];

describe('thermalZone', () => {
    it('lets habitableZone win whatever the temperature (T-F10)', () => {
        expect(thermalZone(planet(400, true))).toBe('Goldilocks');
        expect(thermalZone(planet(100, true))).toBe('Goldilocks');
    });

    it.each([
        [285, 'Hot'],
        [284.99, 'Temperate'],
        [237, 'Temperate'],
        [236.99, 'Cold']
    ])('classifies %p K as %s (T-F11)', (temperature, expected) => {
        expect(thermalZone(planet(temperature, false))).toBe(expected);
    });
});

describe('zone classes (T-F12)', () => {
    it('gives every zone a non-empty badge class', () => {
        for (const zone of ZONES) {
            expect(zoneBadgeClass(zone).length).toBeGreaterThan(0);
        }
    });

    it('gives every zone a distinct badge class', () => {
        const classes = ZONES.map(zoneBadgeClass);
        expect(new Set(classes).size).toBe(ZONES.length);
    });

    it('gives every zone a non-empty, distinct temperature text class', () => {
        const classes = ZONES.map(tempTextClass);
        for (const value of classes) expect(value.length).toBeGreaterThan(0);
        expect(new Set(classes).size).toBe(ZONES.length);
    });
});
