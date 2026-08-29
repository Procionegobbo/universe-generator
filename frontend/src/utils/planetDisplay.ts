// Planet display helpers (D-10, D-21).

import type { Planet, Star } from '../types';
import { PLANET_TYPE_DESCRIPTIONS } from '../types';

const EARTH_MASS_KG = 5.972e24;
const EARTH_GRAVITY_MS2 = 9.807;

/**
 * D-21 short labels for the dense surfaces (distribution rows, type cards,
 * table cells). Sentence case, shorter than PLANET_TYPE_DESCRIPTIONS, which is
 * left untouched and still drives DocumentationView, tooltips and
 * planetTypeLabel(). A type with no entry here falls through to the long map.
 */
export const PLANET_SHORT_LABEL: Record<string, string> = {
    'R': 'Rocky',
    'G': 'Gas giant',
    'I': 'Ice world',
    'D': 'Desert',
    'U': 'Ice giant',
    'A': 'Asteroid',
    'O': 'Ocean',
    'E': 'Earth-like'
};

/** Short label for a planet type, falling back to the canonical long map. */
export function planetShortLabel(planetType: string): string {
    return PLANET_SHORT_LABEL[planetType]
        || PLANET_TYPE_DESCRIPTIONS[planetType]
        || planetType;
}

/**
 * Orbit designation letter: orbit 1 → 'b', orbit 3 → 'd', matching the design's
 * `Kepler-442 b … h`. Guard for n > 25 (unreachable in practice — planet counts
 * are capped by 3d6 = 18).
 */
export function orbitLetter(n: number): string {
    if (n > 25) return `#${n}`;
    return String.fromCharCode(97 + n);
}

/**
 * D-10: the payload only carries `planet.name` when the planet bears life;
 * everything else is designated from its star and orbit.
 */
export function planetDisplayName(planet: Planet, star: Star): string {
    if (planet.name) return planet.name;
    return `${star.name} ${orbitLetter(planet.orbitalNumber)}`;
}

// A degenerate planet (an asteroid belt: mass 0, diameter 0) has no meaningful
// mass, gravity or density, so these return null and the UI prints an em dash
// rather than NaN or Infinity.

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Planet mass in Earth masses, or null for a degenerate planet. */
export function massEarths(planet: Planet): number | null {
    if (!planet.mass) return null;
    return round2(planet.mass / EARTH_MASS_KG);
}

/** Surface gravity in g, or null for a degenerate planet. */
export function gravityG(planet: Planet): number | null {
    if (!planet.gravity) return null;
    return round2(planet.gravity / EARTH_GRAVITY_MS2);
}

/** Bulk density in g/cm³, or null for a degenerate planet. */
export function densityGCm3(planet: Planet): number | null {
    if (!planet.mass || !planet.diameter) return null;
    const radiusM = (planet.diameter * 1000) / 2;
    const volumeM3 = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
    if (volumeM3 <= 0) return null;
    return round2(planet.mass / volumeM3 / 1000);
}

/** Width fraction of the 4a relative-size bar; 0 when there is no maximum. */
export function relativeSize(diameter: number, maxDiameter: number): number {
    if (!maxDiameter || maxDiameter <= 0) return 0;
    return Math.min(1, Math.max(0, diameter / maxDiameter));
}
