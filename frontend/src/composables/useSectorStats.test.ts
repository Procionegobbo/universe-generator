import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useSectorStats } from './useSectorStats';
import type { Planet, Sector, Star, System } from '../types';

const system = (systemId: number, name: string, hasProperName = false): System => ({
    systemId,
    name,
    hasProperName,
    age: 4.6,
    xPos: systemId,
    yPos: systemId * 2,
    zPos: systemId * 3
});

const star = (starId: number, systemId: number, spectralClass: string): Star => ({
    starId,
    systemId,
    name: `Star-${starId}`,
    spectralClass
});

const planet = (
    starId: number,
    orbitalNumber: number,
    planetType: string,
    semiMajorAxis: number,
    temperature: number,
    habitableZone: boolean,
    moonCount: number,
    extra: Partial<Planet> = {}
): Planet => ({
    starId,
    orbitalNumber,
    planetType,
    diameter: 12000,
    moonCount,
    mass: 6e24,
    gravity: 9.8,
    semiMajorAxis,
    temperature,
    habitableZone,
    lifeProbability: 0,
    lifeComplexity: 0,
    hasLife: false,
    ...extra
});

// 3 systems, 5 stars (one BH), 9 planets: 2 habitable, 1 with life, 1 asteroid belt.
//
// Habitable-zone bounds used to place the planets in bands:
//   G  0.7495 .. 1.7678 AU   K  0.4740 .. 1.1180 AU   M  0.1499 .. 0.3536 AU
const FIXTURE: Sector = {
    systems: [system(1, 'UG-0001'), system(2, 'Necklace', true), system(3, 'UG-0003')],
    stars: [
        star(1, 1, 'G'),
        star(2, 1, 'M'),
        star(3, 2, 'K'),
        star(4, 3, 'BH'),
        star(5, 3, 'M')
    ],
    planets: [
        // Star 1 (G)
        planet(1, 1, 'R', 0.4, 400, false, 0),                       // inner, Hot
        planet(1, 2, 'E', 1.0, 288, true, 1, {                       // medium, Goldilocks, life
            hasLife: true, lifeComplexity: 4.2, lifeProbability: 0.6, name: 'Thalassa', diameter: 12742
        }),
        planet(1, 3, 'G', 5.2, 120, false, 12, { diameter: 140000 }), // outer, Cold
        // Star 2 (M) — also in system 1
        planet(2, 1, 'A', 0.05, 250, false, 0, {                     // inner, Temperate, asteroid belt
            diameter: 0, mass: 0, gravity: 0
        }),
        planet(2, 2, 'I', 0.25, 230, true, 0),                       // medium, Goldilocks
        // Star 3 (K)
        planet(3, 1, 'D', 0.3, 300, false, 0),                       // inner, Hot
        planet(3, 2, 'R', 0.8, 260, false, 2),                       // medium, Temperate
        // Star 5 (M) — star 4 is the black hole and has no planets
        planet(5, 1, 'X', 0.2, 200, false, 1),                       // medium, Cold
        planet(5, 2, 'U', 1.5, 90, false, 9, { diameter: 50000 })     // outer, Cold
    ]
};

const EMPTY: Sector = { systems: [], stars: [], planets: [] };

const stats = useSectorStats(() => FIXTURE);
const empty = useSectorStats(() => EMPTY);

describe('headline counts (T-F32)', () => {
    it('counts systems, stars, planets and moons', () => {
        expect(stats.systemCount.value).toBe(3);
        expect(stats.starCount.value).toBe(5);
        expect(stats.planetCount.value).toBe(9);
        expect(stats.moonCount.value).toBe(25);
    });

    it('counts habitable and life-bearing planets', () => {
        expect(stats.habitableCount.value).toBe(2);
        expect(stats.lifeCount.value).toBe(1);
    });
});

describe('per-entity ratios (T-F33)', () => {
    it('rounds to 2 decimal places', () => {
        expect(stats.starsPerSystem.value).toBe(1.67);
        expect(stats.planetsPerStar.value).toBe(1.8);
        expect(stats.moonsPerPlanet.value).toBe(2.78);
    });

    it('is 0, not NaN, on an empty sector', () => {
        expect(empty.starsPerSystem.value).toBe(0);
        expect(empty.planetsPerStar.value).toBe(0);
        expect(empty.moonsPerPlanet.value).toBe(0);
    });
});

describe('spectralDistribution (T-F34)', () => {
    it('is count-descending', () => {
        const rows = stats.spectralDistribution.value;
        expect(rows.map(row => row.cls)).toEqual(['M', 'BH', 'G', 'K']);
        for (let i = 1; i < rows.length; i++) {
            expect(rows[i].count).toBeLessThanOrEqual(rows[i - 1].count);
        }
    });

    it('has shares summing to 1', () => {
        const total = stats.spectralDistribution.value.reduce((sum, row) => sum + row.share, 0);
        expect(total).toBeCloseTo(1, 12);
    });

    it('carries the expected share for the sector zone', () => {
        const medium = useSectorStats(() => FIXTURE, 'medium');
        const core = useSectorStats(() => FIXTURE, 'core');
        const findM = (rows: { cls: string; expected: number }[]) =>
            rows.find(row => row.cls === 'M')!.expected;

        expect(findM(medium.spectralDistribution.value)).toBeCloseTo(0.677, 6);
        expect(findM(core.spectralDistribution.value)).toBeCloseTo(0.35, 6);
    });
});

describe('planetTypeDistribution', () => {
    it('is count-descending and its shares sum to 1', () => {
        const rows = stats.planetTypeDistribution.value;
        expect(rows[0].type).toBe('R');
        expect(rows[0].count).toBe(2);
        expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 12);
    });

    it('rolls up moons and life per type', () => {
        const earthLike = stats.planetTypeDistribution.value.find(row => row.type === 'E')!;
        expect(earthLike.lifeCount).toBe(1);
        expect(earthLike.moons).toBe(1);

        const gasGiant = stats.planetTypeDistribution.value.find(row => row.type === 'G')!;
        expect(gasGiant.moons).toBe(12);
        expect(gasGiant.lifeCount).toBe(0);
    });
});

describe('thermalOccupancy and orbitBands (T-F35)', () => {
    it('classifies every planet into a thermal zone', () => {
        const { hot, goldilocks, temperate, cold } = stats.thermalOccupancy.value;
        expect({ hot, goldilocks, temperate, cold }).toEqual({
            hot: 2, goldilocks: 2, temperate: 2, cold: 3
        });
        expect(hot + goldilocks + temperate + cold).toBe(stats.planetCount.value);
    });

    it('classifies every planet into an orbit band (D-6)', () => {
        const { inner, medium, outer } = stats.orbitBands.value;
        expect({ inner, medium, outer }).toEqual({ inner: 3, medium: 4, outer: 2 });
        expect(inner + medium + outer).toBe(stats.planetCount.value);
    });
});

describe('multiplicity (T-F36)', () => {
    it('buckets the fixture systems and sums to systemCount', () => {
        const { one, two, three, fourPlus } = stats.multiplicity.value;
        expect({ one, two, three, fourPlus }).toEqual({ one: 1, two: 2, three: 0, fourPlus: 0 });
        expect(one + two + three + fourPlus).toBe(stats.systemCount.value);
    });

    it('puts a 5-star system in the 4+ bucket', () => {
        const crowded: Sector = {
            systems: [system(1, 'UG-0001'), system(2, 'UG-0002')],
            stars: [
                star(1, 1, 'G'), star(2, 1, 'M'), star(3, 1, 'M'), star(4, 1, 'K'), star(5, 1, 'M'),
                star(6, 2, 'G'), star(7, 2, 'M'), star(8, 2, 'K')
            ],
            planets: []
        };
        const crowdedStats = useSectorStats(() => crowded);
        const { one, two, three, fourPlus } = crowdedStats.multiplicity.value;

        expect(fourPlus).toBe(1);
        expect(three).toBe(1);
        expect(one + two + three + fourPlus).toBe(2);
    });
});

describe('moonHistogram (T-F37)', () => {
    it('has 10 buckets and folds nine-or-more moons into the last', () => {
        const { buckets, mean, max } = stats.moonHistogram.value;

        expect(buckets).toHaveLength(10);
        expect(buckets).toEqual([4, 2, 1, 0, 0, 0, 0, 0, 0, 2]);
        expect(buckets.reduce((sum, n) => sum + n, 0)).toBe(stats.planetCount.value);
        expect(mean).toBe(2.78);
        expect(max).toBe(12);
    });
});

describe('lifeByStage (T-F38)', () => {
    it('has 6 buckets summing to lifeCount', () => {
        const buckets = stats.lifeByStage.value;

        expect(buckets).toHaveLength(6);
        // lifeComplexity 4.2 rounds to stage 4 (Multicellular life), index 3.
        expect(buckets).toEqual([0, 0, 0, 1, 0, 0]);
        expect(buckets.reduce((sum, n) => sum + n, 0)).toBe(stats.lifeCount.value);
    });
});

describe('notableSystems (T-F39)', () => {
    it('ranks the fixture life-first', () => {
        expect(stats.notableSystems.value.map(row => row.systemId)).toEqual([1, 2, 3]);
    });

    it("applies D-28's tie-breaks in order and returns at most 4", () => {
        // Six systems, deliberately tied at each level in turn:
        //   10 — 1 life planet                       -> wins on life
        //   11 — 0 life, 2 HZ planets                -> wins on habitable count
        //   12 — 0 life, 1 HZ, 3 planets             -> wins on planet count
        //   13 — 0 life, 1 HZ, 2 planets             \ tied through every key,
        //   14 — 0 life, 1 HZ, 2 planets             / split by systemId asc
        //   15 — 0 life, 0 HZ, 0 planets             -> last
        const tied: Sector = {
            systems: [15, 14, 13, 12, 11, 10].map(id => system(id, `UG-${id}`)),
            stars: [10, 11, 12, 13, 14, 15].map(id => star(id, id, 'G')),
            planets: [
                planet(10, 1, 'E', 1.0, 288, false, 0, { hasLife: true, lifeComplexity: 2 }),
                planet(11, 1, 'E', 1.0, 288, true, 0),
                planet(11, 2, 'O', 1.2, 280, true, 0),
                planet(12, 1, 'E', 1.0, 288, true, 0),
                planet(12, 2, 'R', 0.4, 400, false, 0),
                planet(12, 3, 'G', 5.0, 120, false, 0),
                planet(13, 1, 'E', 1.0, 288, true, 0),
                planet(13, 2, 'R', 0.4, 400, false, 0),
                planet(14, 1, 'E', 1.0, 288, true, 0),
                planet(14, 2, 'R', 0.4, 400, false, 0)
            ]
        };
        const ranked = useSectorStats(() => tied).notableSystems.value;

        expect(ranked).toHaveLength(4);
        expect(ranked.map(row => row.systemId)).toEqual([10, 11, 12, 13]);
    });
});

describe('lifeSystemCount (T-F40)', () => {
    it('counts distinct systems, not planets', () => {
        const manyLifePlanets: Sector = {
            systems: [system(1, 'UG-0001'), system(2, 'UG-0002')],
            stars: [star(1, 1, 'G'), star(2, 2, 'G')],
            planets: [
                planet(1, 1, 'E', 1.0, 288, true, 0, { hasLife: true, lifeComplexity: 3 }),
                planet(1, 2, 'O', 1.3, 280, true, 0, { hasLife: true, lifeComplexity: 5 }),
                planet(2, 1, 'R', 0.4, 400, false, 0)
            ]
        };
        const many = useSectorStats(() => manyLifePlanets);

        expect(many.lifeCount.value).toBe(2);
        expect(many.lifeSystemCount.value).toBe(1);
        expect(stats.lifeSystemCount.value).toBe(1);
    });
});

describe('systemRows', () => {
    it('summarises each system with its primary star and flags', () => {
        const rows = stats.systemRows.value;
        expect(rows).toHaveLength(3);

        expect(rows[0]).toMatchObject({
            systemId: 1,
            name: 'UG-0001',
            hasProperName: false,
            starCount: 2,
            planetCount: 5,
            moonCount: 13,
            habitableCount: 2,
            hasLife: true,
            hasBH: false,
            hasNS: false
        });
        expect(rows[0].primaryStar!.starId).toBe(1);
        // Both of system 1's stars contribute, ordered by orbit.
        expect(rows[0].planets.map(p => p.orbitalNumber)).toEqual([1, 1, 2, 2, 3]);

        expect(rows[1]).toMatchObject({ systemId: 2, name: 'Necklace', hasProperName: true });
        expect(rows[2]).toMatchObject({ systemId: 3, starCount: 2, planetCount: 2, hasBH: true });
        expect(rows[2].primaryStar!.spectralClass).toBe('BH');
    });
});

describe('starRows', () => {
    it('summarises each star with its own planets, not its system\'s', () => {
        const rows = stats.starRows.value;
        expect(rows.map(row => row.starId)).toEqual([1, 2, 3, 4, 5]);

        // Star 1 (G) and star 2 (M) share system 1; each reports only its own.
        expect(rows[0]).toMatchObject({
            starId: 1,
            systemId: 1,
            name: 'Star-1',
            spectralClass: 'G',
            systemName: 'UG-0001',
            planetCount: 3,
            habitableCount: 1,
            moonCount: 13,
            isExotic: false
        });
        expect(rows[1]).toMatchObject({
            starId: 2,
            systemId: 1,
            systemName: 'UG-0001',
            planetCount: 2,
            habitableCount: 1,
            moonCount: 0
        });
        expect(rows[2]).toMatchObject({ starId: 3, systemName: 'Necklace', planetCount: 2 });
    });

    it('flags BH and NS as exotic, and a planetless star as zero rather than absent', () => {
        const rows = stats.starRows.value;

        expect(rows[3]).toMatchObject({
            starId: 4,
            spectralClass: 'BH',
            isExotic: true,
            planetCount: 0,
            habitableCount: 0,
            moonCount: 0
        });
        expect(rows.filter(row => row.isExotic).map(row => row.starId)).toEqual([4]);

        const neutron: Sector = {
            systems: [system(1, 'UG-0001')],
            stars: [star(1, 1, 'NS')],
            planets: []
        };
        expect(useSectorStats(() => neutron).starRows.value[0].isExotic).toBe(true);
    });

    it('carries the subclass through when the payload has one', () => {
        const withSubclass: Sector = {
            systems: [system(1, 'UG-0001')],
            stars: [{ ...star(1, 1, 'K'), subclass: 4 }, star(2, 1, 'M')],
            planets: []
        };
        const rows = useSectorStats(() => withSubclass).starRows.value;

        expect(rows[0].subclass).toBe(4);
        expect(rows[1].subclass).toBeUndefined();
    });
});

describe('percentages and maxPlanetDiameter', () => {
    it('reports life and habitable shares as fractions of planetCount', () => {
        expect(stats.lifePercent.value).toBeCloseTo(1 / 9, 12);
        expect(stats.habitablePercent.value).toBeCloseTo(2 / 9, 12);
    });

    it('finds the largest planet diameter', () => {
        expect(stats.maxPlanetDiameter.value).toBe(140000);
    });
});

describe('an empty sector (T-F41)', () => {
    const values: Array<[string, number]> = [
        ['systemCount', empty.systemCount.value],
        ['starCount', empty.starCount.value],
        ['planetCount', empty.planetCount.value],
        ['moonCount', empty.moonCount.value],
        ['habitableCount', empty.habitableCount.value],
        ['lifeCount', empty.lifeCount.value],
        ['lifeSystemCount', empty.lifeSystemCount.value],
        ['lifePercent', empty.lifePercent.value],
        ['habitablePercent', empty.habitablePercent.value],
        ['starsPerSystem', empty.starsPerSystem.value],
        ['planetsPerStar', empty.planetsPerStar.value],
        ['moonsPerPlanet', empty.moonsPerPlanet.value],
        ['maxPlanetDiameter', empty.maxPlanetDiameter.value],
        ['moonHistogram.mean', empty.moonHistogram.value.mean],
        ['moonHistogram.max', empty.moonHistogram.value.max]
    ];

    it.each(values)('%s is 0 and not NaN', (_key, value) => {
        expect(value).toBe(0);
        expect(Number.isNaN(value)).toBe(false);
    });

    it('yields empty collections and zeroed buckets', () => {
        expect(empty.spectralDistribution.value).toEqual([]);
        expect(empty.planetTypeDistribution.value).toEqual([]);
        expect(empty.notableSystems.value).toEqual([]);
        expect(empty.systemRows.value).toEqual([]);
        expect(empty.starRows.value).toEqual([]);
        expect(empty.thermalOccupancy.value).toEqual({ hot: 0, goldilocks: 0, temperate: 0, cold: 0 });
        expect(empty.orbitBands.value).toEqual({ inner: 0, medium: 0, outer: 0 });
        expect(empty.multiplicity.value).toEqual({ one: 0, two: 0, three: 0, fourPlus: 0 });
        expect(empty.moonHistogram.value.buckets).toEqual(new Array(10).fill(0));
        expect(empty.lifeByStage.value).toEqual(new Array(6).fill(0));
    });

    it('does not throw for a null sector either', () => {
        const nothing = useSectorStats(ref(null));
        expect(() => nothing.systemRows.value).not.toThrow();
        expect(nothing.systemCount.value).toBe(0);
        expect(nothing.moonsPerPlanet.value).toBe(0);
    });
});
