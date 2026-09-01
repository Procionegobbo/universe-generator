// Which sector a link means.
//
// A sector is not stored anywhere: it is regenerated from its parameters, and
// only the parameters are persisted. So a link that names a planet has to name
// the sector too, or the recipient — who loads with nothing in memory — has
// nothing for the planet key to resolve against.
//
// Measured against the deployed generator, across systems 52, 199 and 287:
//
//   seed + zone   decide what every star and planet *is*. Same pair, same
//                 bodies; change the zone and star 87 goes from K-1 to K-8 and
//                 its third planet from a 16 000 km super-Earth to a 12 000 km
//                 ocean world.
//   systemCount   decides only how many systems exist, never their contents —
//                 asking for 400 leaves the first 300 byte-identical. It still
//                 belongs in the link: without it a system past the recipient's
//                 own count would simply not be there.
//   sectorVolume  scales the coordinates and nothing else (1 000 -> 9 000 pc3
//                 multiplies them by the cube root, 2.08). Carried so the
//                 readout matches what the sender saw.
//
// Hence the split below: `sameSector` compares the pair that determines the
// bodies, while the link carries all four so the regenerated sector is the one
// the sender was actually looking at.
//
// The `sid` codec added at the foot of this file packs the same four into a
// single path segment. Its own comparison, `sameSid`, is whole-sid equality
// rather than that pair, and deliberately so: count and volume still cannot
// change what a body *is*, but they change which bodies *exist*, so a link to
// system 350 of a 400-system sector must rebuild for a reader holding 100.
// Nothing consumes the codec yet — the query helpers above remain the live
// path until their callers migrate.

import type { GenerationRequest, SectorZone } from '../types';
import type { LocationQuery } from 'vue-router';

const ZONES: SectorZone[] = ['extragalactic', 'galactic edge', 'medium', 'central zone', 'core'];

/** The four parameters that reproduce a sector. */
export interface SectorLinkParams {
    seed: string;
    zone: SectorZone;
    systemCount: number;
    sectorVolume: number;
}

const one = (query: LocationQuery, key: string): string | null => {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' && value.length > 0 ? value : null;
};

const positiveInt = (value: string | null): number | null => {
    if (value === null || !/^\d+$/.test(value)) return null;
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/**
 * The sector a URL names, or null when it names none. All four are required:
 * a partial set cannot be completed from the reader's own settings without
 * risking a different sector under the same seed, which is the failure the
 * whole scheme exists to prevent.
 */
export function sectorParamsFromQuery(query: LocationQuery): SectorLinkParams | null {
    const seed = one(query, 'seed');
    const zone = one(query, 'zone') as SectorZone | null;
    const systemCount = positiveInt(one(query, 'systems'));
    const sectorVolume = positiveInt(one(query, 'volume'));

    if (seed === null || zone === null || !ZONES.includes(zone)) return null;
    if (systemCount === null || sectorVolume === null) return null;

    return { seed, zone, systemCount, sectorVolume };
}

/** The query fragment naming a sector, for writing back into the URL. */
export function sectorQuery(params: SectorLinkParams): Record<string, string> {
    return {
        seed: String(params.seed),
        zone: params.zone,
        systems: String(params.systemCount),
        volume: String(params.sectorVolume)
    };
}

/** The request that regenerates the sector a link names. */
export function requestFor(params: SectorLinkParams): GenerationRequest {
    return {
        systemCount: params.systemCount,
        sectorVolume: params.sectorVolume,
        seed: params.seed,
        zone: params.zone
    };
}

/**
 * Whether two parameter sets hold the same bodies — seed and zone only, since
 * neither of the other two changes what a star or planet is. Comparing all four
 * would refuse a link whose planet is demonstrably the same one.
 */
export function sameSector(
    a: SectorLinkParams | null,
    b: SectorLinkParams | null
): boolean {
    if (a === null || b === null) return false;
    return String(a.seed) === String(b.seed) && a.zone === b.zone;
}

/** The letter each zone takes in a sid. `central zone` cannot have `c`: `core` has it. */
export const ZONE_CODE: Record<SectorZone, string> = {
    'extragalactic': 'x',
    'galactic edge': 'g',
    'medium': 'm',
    'central zone': 'z',
    'core': 'c'
};

// A Map, not an object: an object would answer a lookup of `constructor` or
// `toString` from its prototype, and `decodeSid` would hand back a function
// where a SectorZone is declared.
const ZONE_BY_CODE = new Map<string, SectorZone>(
    Object.entries(ZONE_CODE).map(([zone, code]) => [code, zone as SectorZone])
);

/**
 * The defaults a sid's missing trailing fields take, so a link written before a
 * field existed still decodes. They are the store's own defaults.
 */
const SID_DEFAULTS = { zone: 'medium' as SectorZone, systemCount: 100, sectorVolume: 1000 };

const SEED_PATTERN = /^\d+(?:\.\d+)?$/;

/**
 * Every seed the app can produce, in its canonical string form, or null.
 * The seed input is `<input type="number" min="0">` and the randomiser is
 * `Math.floor(Math.random() * 1000000)`, so a non-negative number is the whole
 * range; anything else cannot be written into a sid, whose delimiter is `-`.
 */
export function normaliseSeed(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return SEED_PATTERN.test(text) ? text : null;
}

/** The single path segment naming a sector: `<seed>-<zone>-<systemCount>-<sectorVolume>`. */
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
    const [rawSeed, rawZone, rawSystems, rawVolume]: (string | undefined)[] = sid.split('-');

    const seed = normaliseSeed(rawSeed);
    if (seed === null) return null;

    let zone = SID_DEFAULTS.zone;
    if (rawZone !== undefined) {
        const named = ZONE_BY_CODE.get(rawZone);
        if (named === undefined) return null;
        zone = named;
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

/**
 * Whether two parameter sets name the same sector — all four fields, as string
 * equality of the whole sid, so a parameter added to the sid is compared for
 * free rather than forgotten here.
 */
export function sameSid(a: SectorLinkParams | null, b: SectorLinkParams | null): boolean {
    if (a === null || b === null) return false;
    return encodeSid(a) === encodeSid(b);
}
