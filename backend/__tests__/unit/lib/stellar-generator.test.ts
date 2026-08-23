import { StellarGenerator, ZONE_A, ZONE_B, ZONE_C } from '../../../src/lib/example_star_generator';

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
    // The zone is now derived from the orbital distance relative to the star's
    // Goldilocks bounds: (semiMajorAxis, aInner, aOuter).
    const A_INNER = 0.95; // e.g. sqrt(1/1.1)
    const A_OUTER = 1.37; // e.g. sqrt(1/0.53)

    test('should return ZONE_A when inside the inner (hot) edge', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      expect(determineHabitableZone(0.4, A_INNER, A_OUTER)).toBe(ZONE_A);
      expect(determineHabitableZone(A_INNER - 0.01, A_INNER, A_OUTER)).toBe(ZONE_A);
    });

    test('should return ZONE_B when within the habitable (Goldilocks) bounds', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      expect(determineHabitableZone(A_INNER, A_INNER, A_OUTER)).toBe(ZONE_B); // inclusive
      expect(determineHabitableZone(1.0, A_INNER, A_OUTER)).toBe(ZONE_B);
      expect(determineHabitableZone(A_OUTER, A_INNER, A_OUTER)).toBe(ZONE_B); // inclusive
    });

    test('should return ZONE_C when beyond the outer (cold) edge', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

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
        expect(star.name).toMatch(/^\d+-\d+$/);
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
      const orbitalDistance = (generator as any).orbitalDistance.bind(generator);

      // Solar reference (L=1): 0.4 AU Mercury term, classic doubling out to Uranus
      // (19.6), then the ratio drops to 1.5 so the 9th orbit lands near Neptune
      // (~29) not ~38.8.
      const ladder = [0.4, 0.7, 1.0, 1.6, 2.8, 5.2, 10.0, 19.6, 29.2, 43.6];
      ladder.forEach((au, i) => {
        expect(orbitalDistance(i + 1)).toBeCloseTo(au, 5);
      });

      // Flux-equivalent sqrt(L) scaling pulls a red dwarf's ladder inward.
      expect(orbitalDistance(1, 0.04)).toBeCloseTo(0.08, 5); // 0.4 * sqrt(0.04)
      expect(orbitalDistance(3, 0.04)).toBeCloseTo(0.20, 5); // 1.0 * sqrt(0.04)
    });

    test('generateSector: only the 3rd orbit is habitable, with star-independent temperature', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const surfaceTemperature = (generator as any).surfaceTemperature.bind(generator);
      const sector = generator.generateSector(80, 1000);

      const orbit3 = sector.planets.filter(p => p.orbitalNumber === 3);
      expect(orbit3.length).toBeGreaterThan(0);

      sector.planets.forEach(p => {
        // With sqrt(L) scaling the flux at each orbit index is star-independent,
        // so orbit 3 (and only orbit 3) falls in the habitable band for every star.
        expect(p.habitableZone).toBe(p.orbitalNumber === 3);
        if (p.orbitalNumber === 3) {
          // Flux-equivalent: same surface temperature as the Solar orbit-3 for that type.
          expect(p.temperature).toBeCloseTo(surfaceTemperature(1, 1.0, p.planetType), 5);
        }
      });
    });

    test('surfaceTemperature: same type gets colder with distance', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const surfaceTemperature = (generator as any).surfaceTemperature.bind(generator);

      // Fixed type & star: farther orbit must be colder (albedo/greenhouse constant).
      expect(surfaceTemperature(1, 2.0, 'R')).toBeLessThan(surfaceTemperature(1, 1.0, 'R'));
      expect(surfaceTemperature(1, 5.0, 'R')).toBeLessThan(surfaceTemperature(1, 2.0, 'R'));
    });

    test('surfaceTemperature: albedo cools and greenhouse warms', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const surfaceTemperature = (generator as any).surfaceTemperature.bind(generator);

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
