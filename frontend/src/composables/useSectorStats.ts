// Sector-wide aggregates for the mission-console screens (spec 7.5).
//
// Everything is derived from (systems, stars, planets) plus STAR_PHYSICAL, in a
// single indexing pass: `starId -> systemId` and `systemId -> { stars, planets }`
// are built once and every aggregate reads them, so nothing repeats the
// O(stars x planets) scan the old ResultsDisplay.getPlanetsInSystem did per call.

import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { Planet, Sector, SectorZone, Star, System } from '../types';
import { orbitBand, type OrbitBand } from '../utils/starPhysical';
import { thermalZone } from '../utils/thermalZone';
import { expectedShare } from '../utils/expectedStarShares';
import { lifeStageLevel } from '../utils/lifeStage';

export interface SpectralRow {
    cls: string;
    count: number;
    share: number;
    expected: number;
}

export interface PlanetTypeRow {
    type: string;
    count: number;
    share: number;
    moons: number;
    lifeCount: number;
}

export interface ThermalOccupancy {
    hot: number;
    goldilocks: number;
    temperate: number;
    cold: number;
}

export type OrbitBandCounts = Record<OrbitBand, number>;

export interface Multiplicity {
    one: number;
    two: number;
    three: number;
    fourPlus: number;
}

export interface MoonHistogram {
    /** Ten buckets, 0..9; planets with nine moons or more fold into the last. */
    buckets: number[];
    mean: number;
    max: number;
}

export interface NotableSystem {
    systemId: number;
    name: string;
    lifePlanetCount: number;
    habitableCount: number;
    planetCount: number;
}

export interface SystemRow {
    systemId: number;
    name: string;
    hasProperName: boolean;
    primaryStar: Star | null;
    starCount: number;
    planetCount: number;
    moonCount: number;
    habitableCount: number;
    hasLife: boolean;
    hasBH: boolean;
    hasNS: boolean;
    xPos: number;
    yPos: number;
    zPos: number;
    planets: Planet[];
}

interface SystemBucket {
    system: System;
    stars: Star[];
    planets: Planet[];
}

interface SectorIndex {
    systems: System[];
    stars: Star[];
    planets: Planet[];
    starsById: Map<number, Star>;
    buckets: SystemBucket[];
}

const EMPTY_SECTOR: Sector = { systems: [], stars: [], planets: [] };

const round2 = (value: number): number => Math.round(value * 100) / 100;

const ratio = (part: number, total: number): number => (total === 0 ? 0 : round2(part / total));

const fraction = (part: number, total: number): number => (total === 0 ? 0 : part / total);

export function useSectorStats(
    sector: MaybeRefOrGetter<Sector | null | undefined>,
    zone: MaybeRefOrGetter<SectorZone> = 'medium'
) {
    const index: ComputedRef<SectorIndex> = computed(() => {
        const data = toValue(sector) || EMPTY_SECTOR;
        const { systems, stars, planets } = data;

        const starsById = new Map<number, Star>();
        const bucketBySystem = new Map<number, SystemBucket>();
        const buckets: SystemBucket[] = systems.map(system => {
            const bucket: SystemBucket = { system, stars: [], planets: [] };
            bucketBySystem.set(system.systemId, bucket);
            return bucket;
        });

        for (const star of stars) {
            starsById.set(star.starId, star);
            bucketBySystem.get(star.systemId)?.stars.push(star);
        }

        for (const planet of planets) {
            const star = starsById.get(planet.starId);
            if (!star) continue;
            bucketBySystem.get(star.systemId)?.planets.push(planet);
        }

        return { systems, stars, planets, starsById, buckets };
    });

    const systemCount = computed(() => index.value.systems.length);
    const starCount = computed(() => index.value.stars.length);
    const planetCount = computed(() => index.value.planets.length);

    const moonCount = computed(() =>
        index.value.planets.reduce((total, planet) => total + planet.moonCount, 0));

    const habitableCount = computed(() =>
        index.value.planets.filter(planet => planet.habitableZone).length);

    const lifeCount = computed(() =>
        index.value.planets.filter(planet => planet.hasLife).length);

    const lifeSystemCount = computed(() =>
        index.value.buckets.filter(bucket => bucket.planets.some(planet => planet.hasLife)).length);

    const lifePercent = computed(() => fraction(lifeCount.value, planetCount.value));
    const habitablePercent = computed(() => fraction(habitableCount.value, planetCount.value));

    const starsPerSystem = computed(() => ratio(starCount.value, systemCount.value));
    const planetsPerStar = computed(() => ratio(planetCount.value, starCount.value));
    const moonsPerPlanet = computed(() => ratio(moonCount.value, planetCount.value));

    const spectralDistribution = computed<SpectralRow[]>(() => {
        const counts = new Map<string, number>();
        for (const star of index.value.stars) {
            counts.set(star.spectralClass, (counts.get(star.spectralClass) || 0) + 1);
        }
        const total = index.value.stars.length;
        const currentZone = toValue(zone);

        return [...counts.entries()]
            .map(([cls, count]) => ({
                cls,
                count,
                share: fraction(count, total),
                expected: expectedShare(currentZone, cls)
            }))
            // Count descending, then class ascending so the order is stable.
            .sort((a, b) => b.count - a.count || a.cls.localeCompare(b.cls));
    });

    const planetTypeDistribution = computed<PlanetTypeRow[]>(() => {
        const rows = new Map<string, { count: number; moons: number; lifeCount: number }>();
        for (const planet of index.value.planets) {
            let row = rows.get(planet.planetType);
            if (!row) {
                row = { count: 0, moons: 0, lifeCount: 0 };
                rows.set(planet.planetType, row);
            }
            row.count += 1;
            row.moons += planet.moonCount;
            if (planet.hasLife) row.lifeCount += 1;
        }
        const total = index.value.planets.length;

        return [...rows.entries()]
            .map(([type, row]) => ({
                type,
                count: row.count,
                share: fraction(row.count, total),
                moons: row.moons,
                lifeCount: row.lifeCount
            }))
            .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
    });

    const thermalOccupancy = computed<ThermalOccupancy>(() => {
        const occupancy: ThermalOccupancy = { hot: 0, goldilocks: 0, temperate: 0, cold: 0 };
        for (const planet of index.value.planets) {
            switch (thermalZone(planet)) {
                case 'Hot': occupancy.hot += 1; break;
                case 'Goldilocks': occupancy.goldilocks += 1; break;
                case 'Temperate': occupancy.temperate += 1; break;
                case 'Cold': occupancy.cold += 1; break;
            }
        }
        return occupancy;
    });

    // D-6: orbit bands are derived from the star's habitable-zone bounds, never
    // transmitted. A planet whose star is missing from the payload cannot be
    // classified and is skipped, so the totals still add up to the planets that
    // can be placed.
    const orbitBands = computed<OrbitBandCounts>(() => {
        const bands: OrbitBandCounts = { inner: 0, medium: 0, outer: 0 };
        for (const planet of index.value.planets) {
            const star = index.value.starsById.get(planet.starId);
            if (!star) continue;
            bands[orbitBand(planet.semiMajorAxis, star.spectralClass)] += 1;
        }
        return bands;
    });

    const multiplicity = computed<Multiplicity>(() => {
        const buckets: Multiplicity = { one: 0, two: 0, three: 0, fourPlus: 0 };
        for (const bucket of index.value.buckets) {
            const count = bucket.stars.length;
            if (count >= 4) buckets.fourPlus += 1;
            else if (count === 3) buckets.three += 1;
            else if (count === 2) buckets.two += 1;
            else buckets.one += 1;
        }
        return buckets;
    });

    const moonHistogram = computed<MoonHistogram>(() => {
        const buckets = new Array(10).fill(0);
        let total = 0;
        let max = 0;
        for (const planet of index.value.planets) {
            buckets[Math.min(9, Math.max(0, planet.moonCount))] += 1;
            total += planet.moonCount;
            if (planet.moonCount > max) max = planet.moonCount;
        }
        return { buckets, mean: ratio(total, index.value.planets.length), max };
    });

    // Six buckets, one per LIFE_STAGE_LABELS milestone (index 0 is stage 1).
    const lifeByStage = computed<number[]>(() => {
        const buckets = new Array(6).fill(0);
        for (const planet of index.value.planets) {
            if (!planet.hasLife) continue;
            buckets[lifeStageLevel(planet.lifeComplexity) - 1] += 1;
        }
        return buckets;
    });

    // D-28: planets-with-life desc -> habitable-zone planets desc -> planets
    // desc -> systemId asc. Deterministic and seed-stable.
    const notableSystems = computed<NotableSystem[]>(() =>
        index.value.buckets
            .map(bucket => ({
                systemId: bucket.system.systemId,
                name: bucket.system.name,
                lifePlanetCount: bucket.planets.filter(planet => planet.hasLife).length,
                habitableCount: bucket.planets.filter(planet => planet.habitableZone).length,
                planetCount: bucket.planets.length
            }))
            .sort((a, b) =>
                b.lifePlanetCount - a.lifePlanetCount
                || b.habitableCount - a.habitableCount
                || b.planetCount - a.planetCount
                || a.systemId - b.systemId)
            .slice(0, 4));

    const systemRows = computed<SystemRow[]>(() =>
        index.value.buckets.map(bucket => ({
            systemId: bucket.system.systemId,
            name: bucket.system.name,
            hasProperName: bucket.system.hasProperName,
            // The primary star is component A: the first star the generator
            // emitted for this system.
            primaryStar: bucket.stars[0] || null,
            starCount: bucket.stars.length,
            planetCount: bucket.planets.length,
            moonCount: bucket.planets.reduce((total, planet) => total + planet.moonCount, 0),
            habitableCount: bucket.planets.filter(planet => planet.habitableZone).length,
            hasLife: bucket.planets.some(planet => planet.hasLife),
            hasBH: bucket.stars.some(star => star.spectralClass === 'BH'),
            hasNS: bucket.stars.some(star => star.spectralClass === 'NS'),
            xPos: bucket.system.xPos,
            yPos: bucket.system.yPos,
            zPos: bucket.system.zPos,
            planets: [...bucket.planets].sort((a, b) => a.orbitalNumber - b.orbitalNumber)
        })));

    const maxPlanetDiameter = computed(() =>
        index.value.planets.reduce((max, planet) => Math.max(max, planet.diameter), 0));

    return {
        systemCount,
        starCount,
        planetCount,
        moonCount,
        habitableCount,
        lifeCount,
        lifeSystemCount,
        lifePercent,
        habitablePercent,
        starsPerSystem,
        planetsPerStar,
        moonsPerPlanet,
        spectralDistribution,
        planetTypeDistribution,
        thermalOccupancy,
        orbitBands,
        multiplicity,
        moonHistogram,
        lifeByStage,
        notableSystems,
        systemRows,
        maxPlanetDiameter
    };
}
