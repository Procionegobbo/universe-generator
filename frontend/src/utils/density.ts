// Stellar-density guidance for the parameter rail (D-17).
//
// The formula and its five verdict buckets are preserved verbatim from the
// pre-redesign SectorControls.vue; only the presentation changes. The gauge is
// advisory and never blocks a generation, and — unlike the removed auto-suggest
// watcher (D-16) — it has no side effect on any parameter.

import type { SectorZone } from '../types';

/** Mean number of stars a generated system contains. */
export const AVG_STARS_PER_SYSTEM = 1.71;

/** Stars per cubic parsec expected in each galactic zone. */
export const DENSITY_MAP: Record<SectorZone, number> = {
    'extragalactic': 0.001,
    'galactic edge': 0.01,
    'medium': 0.14,
    'central zone': 1.0,
    'core': 10.0
};

export type DensityTone = 'slate' | 'green' | 'amber' | 'red';

export interface DensityVerdict {
    label: string;
    tone: DensityTone;
    ratio: number;
}

/** `(systemCount / sectorVolume) * AVG_STARS_PER_SYSTEM`; a zero volume yields 0. */
export function starDensity(systemCount: number, sectorVolume: number): number {
    if (!Number.isFinite(systemCount) || !Number.isFinite(sectorVolume) || sectorVolume === 0) return 0;
    return (systemCount / sectorVolume) * AVG_STARS_PER_SYSTEM;
}

/** Expected density for a zone, falling back to `medium` for an unknown value. */
export function expectedDensity(zone: SectorZone): number {
    return DENSITY_MAP[zone] || DENSITY_MAP['medium'];
}

/** The five existing verdict buckets on `ratio = current / expected`. */
export function densityVerdict(current: number, zone: SectorZone): DensityVerdict {
    const ratio = current / expectedDensity(zone);
    if (ratio < 0.05) return { label: 'VERY SPARSE', tone: 'slate', ratio };
    if (ratio < 0.5) return { label: 'SPARSE', tone: 'slate', ratio };
    if (ratio <= 2.0) return { label: 'REALISTIC', tone: 'green', ratio };
    if (ratio <= 10) return { label: 'DENSE', tone: 'amber', ratio };
    return { label: 'VERY DENSE', tone: 'red', ratio };
}

/**
 * Gauge marker position in [0, 1]: `clamp((log10(current / expected) + 2) / 4, 0, 1)`,
 * so ratio 1 — where the faint expected tick is drawn — sits at exactly 50%.
 */
export function densityMarker(current: number, zone: SectorZone): number {
    const ratio = current / expectedDensity(zone);
    if (!(ratio > 0)) return 0;
    return Math.min(1, Math.max(0, (Math.log10(ratio) + 2) / 4));
}
