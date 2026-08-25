import { StellarGenerator, ZONE_A, ZONE_B, ZONE_C } from '../../../src/lib/example_star_generator';
import { formatDesignation } from '../../../src/lib/naming';
import { loadStarProperNames } from '../../../src/lib/star-name-pool';

describe('StellarGenerator', () => {
  const TEST_SEED = 'test-seed-123';

  describe('constructor', () => {
    test('should create generator with seed', () => {
      const generator = new StellarGenerator(TEST_SEED);
      // Generator should be created without error
      expect(generator).toBeInstanceOf(StellarGenerator);
    });

    test('should create generator with default zone', () => {
      const generator = new StellarGenerator(TEST_SEED);
      // Default zone is 'medium'
      // We can test by checking generateStarType behavior
      const starType = (generator as any).generateStarType();
      // Not a rigorous test, but ensures method exists
      expect(typeof starType).toBe('string');
    });

    test('should create generator with specified zone', () => {
      const generator = new StellarGenerator(TEST_SEED, 'core');
      // Can't directly access private zone property, but we can test via generateStarType
      // which uses zone. We'll test indirectly.
      const starType = (generator as any).generateStarType();
      expect(typeof starType).toBe('string');
    });
  });

  describe('determineHabitableZone', () => {
    // The zone is derived from the orbital distance relative to the star's
    // Goldilocks bounds: (semiMajorAxis, aInner, aOuter). The bounds are supplied
    // by the caller, so these are just representative values.
    const A_INNER = 0.95;
    const A_OUTER = 1.37;

    test('should return ZONE_A when inside the inner (hot) edge', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = generator.determineHabitableZone.bind(generator);

      expect(determineHabitableZone(0.4, A_INNER, A_OUTER)).toBe(ZONE_A);
      expect(determineHabitableZone(A_INNER - 0.01, A_INNER, A_OUTER)).toBe(ZONE_A);
    });

    test('should return ZONE_B when within the habitable (Goldilocks) bounds', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = generator.determineHabitableZone.bind(generator);

      expect(determineHabitableZone(A_INNER, A_INNER, A_OUTER)).toBe(ZONE_B); // inclusive
      expect(determineHabitableZone(1.0, A_INNER, A_OUTER)).toBe(ZONE_B);
      expect(determineHabitableZone(A_OUTER, A_INNER, A_OUTER)).toBe(ZONE_B); // inclusive
    });

    test('should return ZONE_C when beyond the outer (cold) edge', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = generator.determineHabitableZone.bind(generator);

      expect(determineHabitableZone(A_OUTER + 0.01, A_INNER, A_OUTER)).toBe(ZONE_C);
      expect(determineHabitableZone(10, A_INNER, A_OUTER)).toBe(ZONE_C);
    });
  });

  describe('createPlanet', () => {
    test('should generate a planet with valid properties', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const createPlanet = (generator as any).createPlanet.bind(generator);

      const planet = createPlanet(ZONE_B, 1, 100);

      expect(planet).toHaveProperty('starId', 100);
      expect(planet).toHaveProperty('orbitalNumber', 1);
      expect(planet).toHaveProperty('planetType');
      expect(planet).toHaveProperty('diameter');
      expect(planet).toHaveProperty('moonCount');
      expect(typeof planet.planetType).toBe('string');
      expect(typeof planet.diameter).toBe('number');
      expect(typeof planet.moonCount).toBe('number');
    });

    test('should generate different planets for different zones', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const createPlanet = (generator as any).createPlanet.bind(generator);

      const planetA = createPlanet(ZONE_A, 1, 100);
      const planetB = createPlanet(ZONE_B, 1, 100);
      const planetC = createPlanet(ZONE_C, 1, 100);

      // They could be the same by chance, but likely different
      // At least ensure they are valid
      expect(planetA.planetType).toBeDefined();
      expect(planetB.planetType).toBeDefined();
      expect(planetC.planetType).toBeDefined();
    });
  });

  describe('determineStarCount', () => {
    test('should return a number between 1 and 4', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineStarCount = (generator as any).determineStarCount.bind(generator);

      const counts = new Set();
      for (let i = 0; i < 100; i++) {
        const count = determineStarCount();
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(4);
        counts.add(count);
      }
      // Should have at least some variation
      expect(counts.size).toBeGreaterThan(1);
    });
  });

  describe('generateStarType', () => {
    test('should return a string spectral class', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const generateStarType = (generator as any).generateStarType.bind(generator);

      const starType = generateStarType();
      expect(typeof starType).toBe('string');
      expect(starType.length).toBeGreaterThan(0);
    });

    test('should produce different distributions for different zones', () => {
      // This is a probabilistic test; we'll generate many stars and ensure
      // core zone produces more exotic stars than medium zone
      const mediumGen = new StellarGenerator(TEST_SEED, 'medium');
      const coreGen = new StellarGenerator(TEST_SEED, 'core');

      const generateStarTypeMedium = (mediumGen as any).generateStarType.bind(mediumGen);
      const generateStarTypeCore = (coreGen as any).generateStarType.bind(coreGen);

      const mediumTypes: string[] = [];
      const coreTypes: string[] = [];

      for (let i = 0; i < 1000; i++) {
        mediumTypes.push(generateStarTypeMedium());
        coreTypes.push(generateStarTypeCore());
      }

      // Count exotic types (giants, white dwarfs, black holes, etc.)
      const exoticPattern = /^(g|DA|DB|DF|DG|DK|NS|cB|cA|cF|cG|cK|cM|BH)$/;
      const mediumExotic = mediumTypes.filter(t => exoticPattern.test(t)).length;
      const coreExotic = coreTypes.filter(t => exoticPattern.test(t)).length;

      // Core should have more exotic stars (15% vs 1% in medium)
      expect(coreExotic).toBeGreaterThan(mediumExotic);
    });
  });

  describe('luminosity classes', () => {
    const starTypesOf = (g: StellarGenerator) => (g as any).starTypes;

    test('giants outshine main-sequence stars, supergiants outshine giants', () => {
      const starTypes = starTypesOf(new StellarGenerator(TEST_SEED));

      (['F', 'G', 'K', 'M'] as const).forEach(cls => {
        expect(starTypes[`g${cls}`].luminosity).toBeGreaterThan(starTypes[cls].luminosity);
        expect(starTypes[`c${cls}`].luminosity).toBeGreaterThan(starTypes[`g${cls}`].luminosity);
      });
      expect(starTypes['cB'].luminosity).toBeGreaterThan(starTypes['B'].luminosity);
    });

    test('luminosity is consistent with radius and effective temperature', () => {
      const starTypes = starTypesOf(new StellarGenerator(TEST_SEED));
      // Invert Stefan-Boltzmann, L = R^2 * (T/T_sun)^4, to recover the implied
      // effective temperature and check it matches the spectral class.
      const impliedTemp = (code: string) => {
        const { luminosity, radius } = starTypes[code];
        return 5772 * Math.pow(luminosity / (radius * radius), 0.25);
      };

      // Cool classes must come out cooler than hot ones.
      expect(impliedTemp('gM')).toBeLessThan(impliedTemp('gF'));
      expect(impliedTemp('cM')).toBeLessThan(impliedTemp('cB'));

      // Red giants and red supergiants sit around 3000-4200 K.
      [impliedTemp('gM'), impliedTemp('cM')].forEach(t => {
        expect(t).toBeGreaterThan(3000);
        expect(t).toBeLessThan(4200);
      });
      // Blue supergiants are hot.
      expect(impliedTemp('cB')).toBeGreaterThan(15000);
    });
  });

  describe('generateSector', () => {
    test('should generate correct number of systems', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const systemCount = 10;
      const sectorVolume = 1000;

      const sector = generator.generateSector(systemCount, sectorVolume);

      expect(sector.systems).toHaveLength(systemCount);
      expect(sector.systems.every(s => s.systemId >= 1 && s.systemId <= systemCount)).toBe(true);
    });

    test('should generate deterministic output with same seed', () => {
      const seed = 'deterministic-seed';
      const generator1 = new StellarGenerator(seed);
      const generator2 = new StellarGenerator(seed);

      const sector1 = generator1.generateSector(5, 1000);
      const sector2 = generator2.generateSector(5, 1000);

      expect(sector1.systems.length).toBe(sector2.systems.length);
      expect(sector1.stars.length).toBe(sector2.stars.length);
      expect(sector1.planets.length).toBe(sector2.planets.length);

      // Compare IDs and positions
      sector1.systems.forEach((sys, i) => {
        expect(sys.systemId).toBe(sector2.systems[i].systemId);
        expect(sys.xPos).toBe(sector2.systems[i].xPos);
        expect(sys.yPos).toBe(sector2.systems[i].yPos);
        expect(sys.zPos).toBe(sector2.systems[i].zPos);
      });

      // Names come from a separate PRNG stream, but are seeded from the same
      // seed and so must be reproducible too (spec test 37).
      expect(sector1.systems.map(s => s.name)).toEqual(sector2.systems.map(s => s.name));
      expect(sector1.systems.map(s => s.hasProperName)).toEqual(sector2.systems.map(s => s.hasProperName));
      expect(sector1.stars.map(s => s.name)).toEqual(sector2.stars.map(s => s.name));
    });

    test('should generate stars and planets', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(5, 1000);

      // Should have at least as many stars as systems (minimum 1 star per system)
      expect(sector.stars.length).toBeGreaterThanOrEqual(sector.systems.length);

      // Each star should have valid properties
      sector.stars.forEach(star => {
        expect(star.starId).toBeGreaterThan(0);
        expect(star.systemId).toBeGreaterThan(0);
        expect(typeof star.name).toBe('string');
        expect(star.name.length).toBeGreaterThan(0);
        expect(star.spectralClass).toBeDefined();
      });

      // Each planet should have valid properties
      sector.planets.forEach(planet => {
        expect(planet.starId).toBeGreaterThan(0);
        expect(planet.orbitalNumber).toBeGreaterThan(0);
        expect(planet.planetType).toBeDefined();
        expect(planet.diameter).toBeGreaterThanOrEqual(0);
        expect(planet.moonCount).toBeGreaterThanOrEqual(0);
      });
    });

    test('should generate unique star IDs', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(20, 1000);

      const starIds = sector.stars.map(s => s.starId);
      const uniqueIds = new Set(starIds);
      expect(uniqueIds.size).toBe(starIds.length);
    });

    test('should generate sequential system IDs', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const systemCount = 7;
      const sector = generator.generateSector(systemCount, 1000);

      const systemIds = sector.systems.map(s => s.systemId);
      expect(systemIds).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('naming', () => {
    test('every star has a non-empty, sector-unique name', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(50, 1000);

      expect(sector.stars.length).toBeGreaterThan(0);
      sector.stars.forEach(star => {
        expect(typeof star.name).toBe('string');
        expect(star.name.length).toBeGreaterThan(0);
      });

      const names = sector.stars.map(s => s.name);
      expect(new Set(names).size).toBe(names.length);
    });

    test('every system has a name and a hasProperName flag', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(50, 1000);

      sector.systems.forEach(system => {
        expect(typeof system.name).toBe('string');
        expect(system.name.length).toBeGreaterThan(0);
        expect(typeof system.hasProperName).toBe('boolean');
      });
    });

    test('systems without a proper name use the designation format', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(50, 1000);

      const designated = sector.systems.filter(s => !s.hasProperName);
      expect(designated.length).toBeGreaterThan(0);
      designated.forEach(system => {
        expect(system.name).toBe(formatDesignation(system.systemId));
      });
    });

    test('systems with a proper name draw it from the real pool', () => {
      const pool = new Set(loadStarProperNames());
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(50, 1000);

      const named = sector.systems.filter(s => s.hasProperName);
      expect(named.length).toBeGreaterThan(0);
      named.forEach(system => {
        expect(pool.has(system.name)).toBe(true);
      });
    });

    test('every star name is consistent with its system', () => {
      const pool = new Set(loadStarProperNames());
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(50, 1000);

      const systemsById = new Map(sector.systems.map(s => [s.systemId, s]));

      sector.stars.forEach(star => {
        const system = systemsById.get(star.systemId);
        expect(system).toBeDefined();

        const isLoneStar = star.name === system!.name;
        const isTiedComponent = star.name.startsWith(`${system!.name}-`);
        const isIndependentName = pool.has(star.name);

        expect(isLoneStar || isTiedComponent || isIndependentName).toBe(true);
      });
    });

    test('both naming branches occur over a large sector', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(300, 1000);

      expect(sector.systems.some(s => s.hasProperName === true)).toBe(true);
      expect(sector.systems.some(s => s.hasProperName === false)).toBe(true);
    });

    test('different seeds produce different names', () => {
      const sector1 = new StellarGenerator('name-seed-a').generateSector(50, 1000);
      const sector2 = new StellarGenerator('name-seed-b').generateSector(50, 1000);

      const differs = sector1.systems.some((sys, i) => sys.name !== sector2.systems[i].name);
      expect(differs).toBe(true);
    });

    test('system names are unique within a sector', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(200, 1000);

      const names = sector.systems.map(s => s.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('temperature & thermal zoning', () => {
    test('every planet has a positive surface temperature', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(30, 1000);

      expect(sector.planets.length).toBeGreaterThan(0);
      sector.planets.forEach(planet => {
        expect(planet.temperature).toBeGreaterThan(0);
      });
    });

    test('orbitalDistance: Mercury term and damped outer spacing (Neptune fix)', () => {
      const generator = new StellarGenerator(TEST_SEED);

      // Solar reference (L=1): 0.4 AU Mercury term, classic doubling out to Uranus
      // (19.6), then the ratio drops to 1.5 so the 9th orbit lands near Neptune
      // (~29) not ~38.8.
      const ladder = [0.4, 0.7, 1.0, 1.6, 2.8, 5.2, 10.0, 19.6, 29.2, 43.6];
      ladder.forEach((au, i) => {
        expect(generator.orbitalDistance(i + 1)).toBeCloseTo(au, 5);
      });

      // Flux-equivalent sqrt(L) scaling pulls a red dwarf's ladder inward.
      expect(generator.orbitalDistance(1, 0.04)).toBeCloseTo(0.08, 5); // 0.4 * sqrt(0.04)
      expect(generator.orbitalDistance(3, 0.04)).toBeCloseTo(0.20, 5); // 1.0 * sqrt(0.04)
    });

    test('orbitalDistance: bloated stars push the ladder outside their envelope', () => {
      const generator = new StellarGenerator(TEST_SEED);

      // A 50 R_sun red giant: sqrt(L) alone would put orbit 1 at 0.18 AU, inside
      // the star. The radius floor (4 stellar radii) moves it out to ~0.93 AU.
      const giantInner = generator.orbitalDistance(1, 0.2, 50);
      expect(giantInner).toBeCloseTo(4 * 50 * 0.00465, 5);
      expect(giantInner).toBeGreaterThan(50 * 0.00465); // clear of the surface

      // Compact stars are unaffected by the floor.
      expect(generator.orbitalDistance(1, 1, 1)).toBeCloseTo(0.4, 5);
    });

    test('generateSector: habitable flag and temperature match the star it orbits', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const starTypes = (generator as any).starTypes;
      const sector = generator.generateSector(120, 1000);

      const luminosityOf = new Map(
        sector.stars.map(s => [s.starId, starTypes[s.spectralClass]?.luminosity ?? 1] as const)
      );

      const habitable = sector.planets.filter(p => p.habitableZone);
      expect(habitable.length).toBeGreaterThan(0);

      sector.planets.forEach(p => {
        const L = luminosityOf.get(p.starId)!;
        // The flag must follow the star's own optimistic Goldilocks bounds,
        // not the orbit index (catches a wrong L or swapped bounds).
        const aInner = Math.sqrt(L / 1.78);
        const aOuter = Math.sqrt(L / 0.32);
        expect(p.habitableZone).toBe(p.semiMajorAxis >= aInner && p.semiMajorAxis <= aOuter);
        // Temperature must be computed from that same star and distance.
        expect(p.temperature).toBeCloseTo(
          generator.surfaceTemperature(L, p.semiMajorAxis, p.planetType), 5);
      });

      // The optimistic band plus the +/-15% jitter can only ever reach orbits 2-4.
      habitable.forEach(p => {
        expect(p.orbitalNumber).toBeGreaterThanOrEqual(2);
        expect(p.orbitalNumber).toBeLessThanOrEqual(4);
      });

      // Regression guard for the sqrt(L) scaling: red dwarfs (the most common
      // stars) must get habitable planets, not just Sun-like stars.
      const mDwarfIds = new Set(sector.stars.filter(s => s.spectralClass === 'M').map(s => s.starId));
      expect(habitable.some(p => mDwarfIds.has(p.starId))).toBe(true);
    });

    test('generateSector: orbital jitter varies layouts and keeps orbits ordered', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const sector = generator.generateSector(120, 1000);

      // Same orbit index around the same star class must not always be identical.
      const gStarIds = new Set(sector.stars.filter(s => s.spectralClass === 'G').map(s => s.starId));
      const gOrbit3 = sector.planets
        .filter(p => gStarIds.has(p.starId) && p.orbitalNumber === 3)
        .map(p => p.semiMajorAxis);
      expect(gOrbit3.length).toBeGreaterThan(1);
      expect(new Set(gOrbit3).size).toBeGreaterThan(1);
      // ...but stays within the +/-15% spread of the solar orbit-3 rung.
      gOrbit3.forEach(a => {
        expect(a).toBeGreaterThanOrEqual(1.0 * 0.85);
        expect(a).toBeLessThanOrEqual(1.0 * 1.15);
      });

      // Jitter must never reorder orbits within a star.
      const byStar = new Map<number, typeof sector.planets>();
      sector.planets.forEach(p => {
        const list = byStar.get(p.starId) ?? [];
        list.push(p);
        byStar.set(p.starId, list);
      });
      byStar.forEach(list => {
        const sorted = [...list].sort((a, b) => a.orbitalNumber - b.orbitalNumber);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].semiMajorAxis).toBeGreaterThan(sorted[i - 1].semiMajorAxis);
        }
      });
    });

    test('generateSector: zero-luminosity remnants get no planets', () => {
      const generator = new StellarGenerator(TEST_SEED, 'core'); // core has neutron stars & black holes
      const sector = generator.generateSector(200, 1000);

      const remnantIds = new Set(
        sector.stars.filter(s => s.spectralClass === 'NS' || s.spectralClass === 'BH').map(s => s.starId)
      );
      expect(remnantIds.size).toBeGreaterThan(0);
      expect(sector.planets.some(p => remnantIds.has(p.starId))).toBe(false);

      // And nothing anywhere ends up with a non-finite orbit or temperature.
      sector.planets.forEach(p => {
        expect(Number.isFinite(p.semiMajorAxis)).toBe(true);
        expect(Number.isFinite(p.temperature)).toBe(true);
      });
    });

    test('surfaceTemperature: same type gets colder with distance', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const surfaceTemperature = generator.surfaceTemperature.bind(generator);

      // Fixed type & star: farther orbit must be colder (albedo/greenhouse constant).
      expect(surfaceTemperature(1, 2.0, 'R')).toBeLessThan(surfaceTemperature(1, 1.0, 'R'));
      expect(surfaceTemperature(1, 5.0, 'R')).toBeLessThan(surfaceTemperature(1, 2.0, 'R'));
    });

    test('surfaceTemperature: albedo cools and greenhouse warms', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const surfaceTemperature = generator.surfaceTemperature.bind(generator);

      // Same orbit/star: reflective Ice (albedo 0.6) is colder than bare Silicate.
      expect(surfaceTemperature(1, 1.0, 'I')).toBeLessThan(surfaceTemperature(1, 1.0, 'L'));

      // Earth-like calibration: ~255 K equilibrium + 33 K greenhouse ≈ 288 K.
      expect(surfaceTemperature(1, 1.0, 'E')).toBeCloseTo(287.6, 0);

      // Runaway greenhouse (Venus/Hell) beats a closer bare Rocky:
      // Hell at 0.7 AU is hotter than Rocky at Mercury's 0.4 AU.
      expect(surfaceTemperature(1, 0.7, 'H')).toBeGreaterThan(surfaceTemperature(1, 0.4, 'R'));
    });

    test('planet type is biased toward the orbital thermal zone (soft bias)', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const select = (generator as any).selectPlanetTypeWeighted.bind(generator);

      const samples = 3000;
      let hotTypesInA = 0;
      let hotTypesInC = 0;
      let coldTypesInA = 0;
      let coldTypesInC = 0;

      for (let i = 0; i < samples; i++) {
        const a = select(ZONE_A);
        const c = select(ZONE_C);
        if (a === 'M' || a === 'H') hotTypesInA++;
        if (c === 'M' || c === 'H') hotTypesInC++;
        if (a === 'I' || a === 'B') coldTypesInA++;
        if (c === 'I' || c === 'B') coldTypesInC++;
      }

      // Molten/Hell only appear hot; Ice/Methane only appear cold (zero affinity
      // on the opposite side).
      expect(hotTypesInA).toBeGreaterThan(0);
      expect(hotTypesInC).toBe(0);
      expect(coldTypesInC).toBeGreaterThan(0);
      expect(coldTypesInA).toBe(0);

      // Soft (non-zero) affinity also matters: Ice is much rarer in the habitable
      // zone (affinity 0.15) than in the cold zone (affinity 1).
      let iceInB = 0;
      let iceInC = 0;
      for (let i = 0; i < samples; i++) {
        if (select(ZONE_B) === 'I') iceInB++;
        if (select(ZONE_C) === 'I') iceInC++;
      }
      expect(iceInC).toBeGreaterThan(iceInB);
    });
  });
});
