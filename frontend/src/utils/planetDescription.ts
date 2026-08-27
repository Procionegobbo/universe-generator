// Resolves the label and long description shown for ONE planet, from its type
// together with its realised life outcome. The internal planetType is never
// altered — only how the planet is presented. Type-level surfaces (the type
// filter, the type-distribution charts, the documentation catalogue) keep
// reading PLANET_TYPE_DESCRIPTIONS directly and are unaffected.

import type { Planet, HabitatGroup, LifeState } from '../types';
import {
    BIOSPHERE_CLAUSES,
    DEFAULT_HABITAT_GROUP,
    PLANET_HABITAT_GROUP,
    PLANET_TYPE_DESCRIPTIONS,
    PLANET_TYPE_LIFE_LABELS,
    PLANET_TYPE_LONG_DESCRIPTIONS
} from '../types';
import { lifeStageLevel } from './lifeStage';

/** The fields the description layer reads. Structural, so a full Planet fits. */
export type PlanetDescriptionInput = Pick<Planet, 'planetType' | 'hasLife' | 'lifeComplexity'>;

/** Fallback used when a type code is absent from the tables. */
export const UNKNOWN_PLANET_LABEL = 'Unknown planet type';

/**
 * 0 when no life arose, otherwise the same 1-6 display stage the life badge
 * shows. Reuses lifeStageLevel so the prose can never disagree with the badge.
 */
export function planetLifeState(planet: PlanetDescriptionInput): LifeState {
    if (!planet.hasLife) {
        return 0;
    }
    return lifeStageLevel(planet.lifeComplexity) as LifeState;
}

export function habitatGroup(planetType: string): HabitatGroup {
    return PLANET_HABITAT_GROUP[planetType] ?? DEFAULT_HABITAT_GROUP;
}

/**
 * Label for one planet. Falls through to the catalogue name unless this type
 * has an override for this life state (today: only 'J' below stage 4).
 */
export function planetTypeLabel(planet: PlanetDescriptionInput): string {
    const override = PLANET_TYPE_LIFE_LABELS[planet.planetType]?.[planetLifeState(planet)];
    return override ?? PLANET_TYPE_DESCRIPTIONS[planet.planetType] ?? UNKNOWN_PLANET_LABEL;
}

/** The life sentence for this planet's habitat group and life state. */
export function biosphereClause(planet: PlanetDescriptionInput): string {
    return BIOSPHERE_CLAUSES[habitatGroup(planet.planetType)][planetLifeState(planet)];
}

/** Physical core, then the biosphere clause, joined by a single space. */
export function planetLongDescription(planet: PlanetDescriptionInput): string {
    const core =
        PLANET_TYPE_LONG_DESCRIPTIONS[planet.planetType] ??
        PLANET_TYPE_DESCRIPTIONS[planet.planetType] ??
        UNKNOWN_PLANET_LABEL;
    return `${core} ${biosphereClause(planet)}`;
}
