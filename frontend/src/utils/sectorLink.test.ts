import { describe, it, expect } from 'vitest';
import {
    sameSector, sectorParamsFromQuery, sectorQuery, requestFor, encodeSid, decodeSid,
    sameSid, normaliseSeed, type SectorLinkParams
} from './sectorLink';
import type { SectorZone } from '../types';

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

const SID_PARAMS: SectorLinkParams = {
    seed: '766207', zone: 'medium', systemCount: 100, sectorVolume: 1000
};

const ZONE_CODES: [SectorZone, string][] = [
    ['extragalactic', 'x'],
    ['galactic edge', 'g'],
    ['medium', 'm'],
    ['central zone', 'z'],
    ['core', 'c']
];

describe('encodeSid', () => {
    it('packs the four parameters into one segment', () => {
        expect(encodeSid(SID_PARAMS)).toBe('766207-m-100-1000');
    });

    it.each(ZONE_CODES)('writes %s as "%s"', (zone, code) => {
        expect(encodeSid({ ...SID_PARAMS, zone })).toBe(`766207-${code}-100-1000`);
    });
});

describe('decodeSid', () => {
    it.each(ZONE_CODES)('round-trips every field, in the %s zone', (zone) => {
        const params: SectorLinkParams = { seed: '1234', zone, systemCount: 400, sectorVolume: 9000 };
        expect(decodeSid(encodeSid(params))).toEqual(params);
    });

    // Trailing fields may be absent so that a link written before a parameter
    // existed still names a sector. The defaults are the store's own.
    it('defaults zone, count and volume when only the seed is given', () => {
        expect(decodeSid('766207')).toEqual(SID_PARAMS);
    });

    it('defaults count and volume when only the zone follows the seed', () => {
        expect(decodeSid('766207-c')).toEqual({ ...SID_PARAMS, zone: 'core' });
    });

    // Forward compatibility: a future build appends a fifth field, and this one
    // ignores what it cannot read rather than refusing the whole link.
    it('ignores a fifth field it does not know', () => {
        expect(decodeSid('766207-m-100-1000-9')).toEqual(decodeSid('766207-m-100-1000'));
    });

    // Present-but-wrong is never defaulted: a missing field is a shorter link,
    // a malformed one is not a link to anywhere.
    it.each([
        ['nothing', ''],
        ['a non-numeric seed', 'foo'],
        ['an empty seed', '-m-100-1000'],
        ['an unknown zone code', '766207-q-100-1000'],
        ['a zero count', '766207-m-0-1000'],
        ['a zero volume', '766207-m-100-0'],
        ['a non-numeric count', '766207-m-lots-1000'],
        ['a fractional count', '766207-m-10.5-1000']
    ])('refuses %s', (_label, sid) => {
        expect(decodeSid(sid)).toBeNull();
    });

    // A zone code naming a member of Object.prototype is still just an unknown
    // code. Looked up in an object rather than a Map, `constructor` would come
    // back as a function and be returned as the zone.
    it.each(['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty'])(
        'refuses "%s" as a zone code',
        (code) => {
            expect(decodeSid(`766207-${code}-100-1000`)).toBeNull();
        }
    );

    it('accepts a fractional seed, which the seed input can produce', () => {
        expect(decodeSid('1.5-m-100-1000')?.seed).toBe('1.5');
    });
});

describe('sameSid', () => {
    it('holds when every field agrees', () => {
        expect(sameSid(SID_PARAMS, { ...SID_PARAMS })).toBe(true);
    });

    // All four, not the seed/zone pair `sameSector` compares: count and volume
    // decide which systems exist, and a link naming one the reader has not got
    // must rebuild the sector rather than report a missing system.
    it.each([
        ['seed', { seed: '999' }],
        ['zone', { zone: 'core' as const }],
        ['systemCount', { systemCount: 400 }],
        ['sectorVolume', { sectorVolume: 9000 }]
    ])('breaks on a different %s', (_field, difference) => {
        expect(sameSid(SID_PARAMS, { ...SID_PARAMS, ...difference })).toBe(false);
    });

    it('is false when either side names no sector', () => {
        expect(sameSid(SID_PARAMS, null)).toBe(false);
        expect(sameSid(null, SID_PARAMS)).toBe(false);
    });
});

describe('normaliseSeed', () => {
    it.each([
        [766207, '766207'],
        ['766207', '766207'],
        ['1.5', '1.5']
    ])('accepts %o as "%s"', (input, expected) => {
        expect(normaliseSeed(input)).toBe(expected);
    });

    // A `-` cannot appear in a seed segment: it is the field delimiter.
    it.each([
        ['a negative number', -5],
        ['letters', 'abc'],
        ['the empty string', ''],
        ['NaN', NaN],
        ['null', null],
        ['undefined', undefined]
    ])('rejects %s', (_label, input) => {
        expect(normaliseSeed(input)).toBeNull();
    });
});
