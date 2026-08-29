// Per-class stellar physics for the mission-console UI (spec 7.4).
//
// The `luminosity` and `radius` columns are a verbatim transcription of
// `starTypes` in backend/src/lib/example_star_generator.ts — change both
// together. They are pinned from this side by starPhysical.test.ts (T-F1) and
// from the backend side by
// backend/__tests__/unit/lib/star-physical-contract.test.ts (T-B1), so an
// unsynchronised edit to either file fails CI.
//
// `mass` and `effectiveTemp` are display-only: the generator has no counterpart
// for them. An `effectiveTemp` of 0 means "not applicable" (NS, BH) and the UI
// prints an em dash instead of a temperature.

import type { Star } from '../types';

export interface StarPhysical {
    luminosity: number;    // L☉ — MUST match backend starTypes[].luminosity
    radius: number;        // R☉ — MUST match backend starTypes[].radius
    mass: number;          // M☉ — display only, no backend counterpart
    effectiveTemp: number; // K  — display only; 0 means "not applicable" (NS, BH)
}

export type OrbitBand = 'inner' | 'medium' | 'outer';

export const STAR_PHYSICAL: Record<string, StarPhysical> = {
    // Main sequence
    'O': { luminosity: 50000, radius: 10, mass: 20.0, effectiveTemp: 35000 },
    'B': { luminosity: 20000, radius: 5, mass: 7.0, effectiveTemp: 18000 },
    'A': { luminosity: 80, radius: 1.8, mass: 2.1, effectiveTemp: 8500 },
    'F': { luminosity: 6, radius: 1.3, mass: 1.3, effectiveTemp: 6500 },
    'G': { luminosity: 1, radius: 1, mass: 1.0, effectiveTemp: 5772 },
    'K': { luminosity: 0.4, radius: 0.8, mass: 0.8, effectiveTemp: 4500 },
    'M': { luminosity: 0.04, radius: 0.3, mass: 0.3, effectiveTemp: 3200 },
    // White dwarfs
    'DA': { luminosity: 0.001, radius: 0.013, mass: 0.6, effectiveTemp: 9800 },
    'DB': { luminosity: 0.001, radius: 0.013, mass: 0.6, effectiveTemp: 9800 },
    'DF': { luminosity: 0.001, radius: 0.013, mass: 0.6, effectiveTemp: 9800 },
    'DG': { luminosity: 0.001, radius: 0.013, mass: 0.6, effectiveTemp: 9800 },
    'DK': { luminosity: 0.001, radius: 0.013, mass: 0.6, effectiveTemp: 9800 },
    // Giants (class III)
    'gF': { luminosity: 45, radius: 5, mass: 1.5, effectiveTemp: 6700 },
    'gG': { luminosity: 65, radius: 10, mass: 2.0, effectiveTemp: 5200 },
    'gK': { luminosity: 150, radius: 20, mass: 2.5, effectiveTemp: 4500 },
    'gM': { luminosity: 380, radius: 50, mass: 3.0, effectiveTemp: 3600 },
    // Supergiants (class I)
    'cB': { luminosity: 90000, radius: 25, mass: 25.0, effectiveTemp: 20000 },
    'cA': { luminosity: 21000, radius: 60, mass: 16.0, effectiveTemp: 9000 },
    'cF': { luminosity: 21000, radius: 100, mass: 14.0, effectiveTemp: 7000 },
    'cG': { luminosity: 21000, radius: 180, mass: 13.0, effectiveTemp: 5200 },
    'cK': { luminosity: 22000, radius: 280, mass: 13.0, effectiveTemp: 4200 },
    'cM': { luminosity: 66000, radius: 700, mass: 15.0, effectiveTemp: 3500 },
    // Remnants
    'NS': { luminosity: 0, radius: 0.00002, mass: 1.4, effectiveTemp: 0 },
    'BH': { luminosity: 0, radius: 0, mass: 10.0, effectiveTemp: 0 }
};

// The generator falls back to the M-class row for a class it does not know
// (`this.starTypes[spectralClass] || this.starTypes['M']`,
// example_star_generator.ts:537). Mirroring that fallback keeps the habitable
// zone drawn here in agreement with the one the backend used to set
// `planet.habitableZone`. Unreachable in practice: the 24 classes are a closed
// set (D-36) and every one of them has a row above.
const FALLBACK: StarPhysical = STAR_PHYSICAL['M'];

/** Physical row for a spectral class, falling back to M for an unknown class. */
export function starPhysical(spectralClass: string): StarPhysical {
    return STAR_PHYSICAL[spectralClass] || FALLBACK;
}

/**
 * Optimistic Goldilocks bounds in AU, exactly as the generator computes them:
 * inner edge at the "recent Venus" flux (1.78 S⊕), outer edge at "early Mars"
 * (0.32 S⊕). Stellar remnants radiate nothing and therefore have no zone.
 */
export function habitableZoneBounds(spectralClass: string): { inner: number; outer: number } {
    const { luminosity } = starPhysical(spectralClass);
    if (luminosity === 0) return { inner: 0, outer: 0 };
    return {
        inner: Math.sqrt(luminosity / 1.78),
        outer: Math.sqrt(luminosity / 0.32)
    };
}

/**
 * Orbit band of a semi-major axis, reproducing the backend's
 * `determineHabitableZone` (D-6). Boundary values land in 'medium'.
 */
export function orbitBand(a: number, spectralClass: string): OrbitBand {
    const { inner, outer } = habitableZoneBounds(spectralClass);
    if (a < inner) return 'inner';
    if (a > outer) return 'outer';
    return 'medium';
}

/** Nominal combined mass of a system's stars, in solar masses. */
export function systemMass(stars: Star[]): number {
    return stars.reduce((total, star) => total + starPhysical(star.spectralClass).mass, 0);
}
