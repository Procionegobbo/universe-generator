import { describe, it, expect } from 'vitest';
import {
    sameSector, sectorParamsFromQuery, sectorQuery, requestFor, type SectorLinkParams
} from './sectorLink';

const PARAMS: SectorLinkParams = {
    seed: '644212', zone: 'medium', systemCount: 100, sectorVolume: 1000
};

const QUERY = { seed: '644212', zone: 'medium', systems: '100', volume: '1000' };

describe('sectorParamsFromQuery', () => {
    it('reads a complete sector out of the query', () => {
        expect(sectorParamsFromQuery(QUERY)).toEqual(PARAMS);
    });

    it('round-trips through sectorQuery', () => {
        expect(sectorParamsFromQuery(sectorQuery(PARAMS))).toEqual(PARAMS);
    });

    // A partial set is refused rather than completed from the reader's own
    // settings: the same seed under another zone is a different universe, and
    // filling the gap silently is how a link ends up naming the wrong planet.
    it.each(['seed', 'zone', 'systems', 'volume'])('refuses a query missing %s', (key) => {
        const partial: Record<string, string> = { ...QUERY };
        delete partial[key];
        expect(sectorParamsFromQuery(partial)).toBeNull();
    });

    it.each([
        ['an unknown zone', { ...QUERY, zone: 'nowhere' }],
        ['a non-numeric count', { ...QUERY, systems: 'lots' }],
        ['a zero count', { ...QUERY, systems: '0' }],
        ['a negative volume', { ...QUERY, volume: '-1' }],
        ['a fractional volume', { ...QUERY, volume: '10.5' }]
    ])('refuses %s', (_label, query) => {
        expect(sectorParamsFromQuery(query)).toBeNull();
    });

    it('takes the first value when a param is repeated', () => {
        expect(sectorParamsFromQuery({ ...QUERY, seed: ['644212', '999'] })).toEqual(PARAMS);
    });
});

describe('requestFor', () => {
    it('names every field the generator needs', () => {
        expect(requestFor(PARAMS)).toEqual({
            systemCount: 100, sectorVolume: 1000, seed: '644212', zone: 'medium'
        });
    });
});

describe('sameSector', () => {
    // Measured against the generator: seed and zone fix what every body is,
    // while count and volume decide how many systems there are and how far
    // apart they sit. So the first two are the identity of a planet.
    it('holds when the seed and zone agree', () => {
        expect(sameSector(PARAMS, PARAMS)).toBe(true);
    });

    it.each([
        ['a different count', { ...PARAMS, systemCount: 400 }],
        ['a different volume', { ...PARAMS, sectorVolume: 9000 }]
    ])('still holds across %s, which cannot change a body', (_label, other) => {
        expect(sameSector(PARAMS, other)).toBe(true);
    });

    it.each([
        ['a different seed', { ...PARAMS, seed: '999' }],
        ['a different zone', { ...PARAMS, zone: 'core' as const }]
    ])('breaks on %s, which remakes the bodies', (_label, other) => {
        expect(sameSector(PARAMS, other)).toBe(false);
    });

    it('is false when either side names no sector', () => {
        expect(sameSector(PARAMS, null)).toBe(false);
        expect(sameSector(null, PARAMS)).toBe(false);
    });

    it('compares the seed as text, so 644212 and "644212" agree', () => {
        expect(sameSector(PARAMS, { ...PARAMS, seed: 644212 as unknown as string })).toBe(true);
    });
});
