// Thermal zone of a planet (D-22). The classification below was duplicated
// character for character in PlanetTable.vue and SystemDetailView.vue; it lives
// here once now, with its explanatory comment intact and no threshold changes.
//
// Thermal zone derived from the planet's surface temperature (consistent with
// the backend model). 285 K / 237 K are the zero-albedo equilibrium temps at the
// *conservative* HZ edges; they sit inside the wider optimistic band the backend
// uses, so the Hot/Cold labels bracket the Goldilocks planets.

import type { Planet } from '../types';

export type ThermalZone = 'Hot' | 'Temperate' | 'Goldilocks' | 'Cold';

export function thermalZone(planet: Planet): ThermalZone {
    if (planet.habitableZone) return 'Goldilocks';
    if (planet.temperature >= 285) return 'Hot';
    if (planet.temperature >= 237) return 'Temperate';
    return 'Cold';
}

/**
 * Badge classes for a zone. The colours themselves live in style.css
 * (`.ug-badge-*`, spec 7.1) so the handoff's badge palette stays in one place.
 */
export function zoneBadgeClass(zone: ThermalZone): string {
    switch (zone) {
        case 'Hot':
            return 'ug-badge ug-badge-hot';
        case 'Temperate':
            return 'ug-badge ug-badge-temperate';
        case 'Goldilocks':
            return 'ug-badge ug-badge-goldilocks';
        case 'Cold':
            return 'ug-badge ug-badge-cold';
    }
}

/**
 * Text-only colour for the temperature reading itself, from the design tokens
 * in style.css (`@theme --color-acc-*`).
 */
export function tempTextClass(zone: ThermalZone): string {
    switch (zone) {
        case 'Hot':
            return 'text-acc-red-pale';
        case 'Temperate':
            return 'text-acc-amber-light';
        case 'Goldilocks':
            return 'text-acc-green-pale';
        case 'Cold':
            return 'text-acc-blue-light';
    }
}
