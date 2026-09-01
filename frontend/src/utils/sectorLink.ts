// Which sector a link means.
//
// A sector is not stored anywhere: it is regenerated from its parameters, and
// only the parameters are persisted. So a link that names a planet has to name
// the sector too, or the recipient — who loads with nothing in memory — has
// nothing for the planet key to resolve against. The `sid` codec below packs
// the parameters into one path segment for exactly that.
//
// The invariant, and the whole reason `sameSid` is string equality of the
// encoded sid rather than a comparison of some chosen fields:
//
//   The sid encodes *every* parameter that feeds generation — today the four
//   fields of `GenerationRequest` — and the test deciding whether a link is
//   honoured or the sector rebuilt is equality of the whole sid. Not a curated
//   subset of "the ones that matter". A fifth generation parameter is added to
//   the codec, and the comparison follows for free instead of being forgotten
//   here.
//
// Measured against the deployed generator, across systems 52, 199 and 287:
//
//   seed + zone   decide what every star and planet *is*. Same pair, same
//                 bodies; change the zone and star 87 goes from K-1 to K-8 and
//                 its third planet from a 16 000 km super-Earth to a 12 000 km
//                 ocean world.
//   systemCount   decides only how many systems exist, never their contents —
//                 asking for 400 leaves the first 300 byte-identical. It is
//                 still part of the sector's identity: a link to system 350 of
//                 a 400-system sector, opened by a reader holding 100, must
//                 rebuild rather than report a missing system.
//   sectorVolume  scales the coordinates and nothing else (1 000 -> 9 000 pc3
//                 multiplies them by the cube root, 2.08). Carried so the
//                 readout matches what the sender saw.
//
// The last two are why the comparison is not the seed/zone pair: they cannot
// change what a body *is*, but they change which bodies *exist*, and the
// coordinate guard's checks are only sound against the sector the URL actually
// names.
//
// No `vue-router` dependency, deliberately: this is a pure codec, and the URL
// shape it serves lives in the router and the composables that read it.

import type { GenerationRequest, SectorZone } from '../types';

/** The four parameters that reproduce a sector. */
export interface SectorLinkParams {
    seed: string;
    zone: SectorZone;
    systemCount: number;
    sectorVolume: number;
}

const positiveInt = (value: string): number | null => {
    if (!/^\d+$/.test(value)) return null;
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** The request that regenerates the sector a link names. */
export function requestFor(params: SectorLinkParams): GenerationRequest {
    return {
        systemCount: params.systemCount,
        sectorVolume: params.sectorVolume,
        seed: params.seed,
        zone: params.zone
    };
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
