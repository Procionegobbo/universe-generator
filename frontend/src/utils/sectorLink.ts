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
