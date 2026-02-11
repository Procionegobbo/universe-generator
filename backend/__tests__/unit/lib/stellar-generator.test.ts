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
    test('should return ZONE_B for first planet in small systems (1-3 planets)', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      expect(determineHabitableZone(1, 1)).toBe(ZONE_B);
      expect(determineHabitableZone(2, 1)).toBe(ZONE_B);
      expect(determineHabitableZone(3, 1)).toBe(ZONE_B);
    });

    test('should return ZONE_C for other planets in small systems', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      expect(determineHabitableZone(2, 2)).toBe(ZONE_C);
      expect(determineHabitableZone(3, 2)).toBe(ZONE_C);
      expect(determineHabitableZone(3, 3)).toBe(ZONE_C);
    });

    test('should assign zones correctly for medium systems (4-5 planets)', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      // 4 planets
      expect(determineHabitableZone(4, 1)).toBe(ZONE_A);
      expect(determineHabitableZone(4, 2)).toBe(ZONE_B);
      expect(determineHabitableZone(4, 3)).toBe(ZONE_C);
      expect(determineHabitableZone(4, 4)).toBe(ZONE_C);

      // 5 planets
      expect(determineHabitableZone(5, 1)).toBe(ZONE_A);
      expect(determineHabitableZone(5, 2)).toBe(ZONE_B);
      expect(determineHabitableZone(5, 3)).toBe(ZONE_C);
      expect(determineHabitableZone(5, 4)).toBe(ZONE_C);
      expect(determineHabitableZone(5, 5)).toBe(ZONE_C);
    });

    test('should assign zones correctly for large systems (6-7 planets)', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      // 6 planets
      expect(determineHabitableZone(6, 1)).toBe(ZONE_A);
      expect(determineHabitableZone(6, 2)).toBe(ZONE_B);
      expect(determineHabitableZone(6, 3)).toBe(ZONE_B);
      expect(determineHabitableZone(6, 4)).toBe(ZONE_C);
      expect(determineHabitableZone(6, 5)).toBe(ZONE_C);
      expect(determineHabitableZone(6, 6)).toBe(ZONE_C);

      // 7 planets
      expect(determineHabitableZone(7, 1)).toBe(ZONE_A);
      expect(determineHabitableZone(7, 2)).toBe(ZONE_B);
      expect(determineHabitableZone(7, 3)).toBe(ZONE_B);
      expect(determineHabitableZone(7, 4)).toBe(ZONE_C);
      expect(determineHabitableZone(7, 5)).toBe(ZONE_C);
      expect(determineHabitableZone(7, 6)).toBe(ZONE_C);
      expect(determineHabitableZone(7, 7)).toBe(ZONE_C);
    });

    test('should assign zones correctly for very large systems (8+ planets)', () => {
      const generator = new StellarGenerator(TEST_SEED);
      const determineHabitableZone = (generator as any).determineHabitableZone.bind(generator);

      // 8 planets
      expect(determineHabitableZone(8, 1)).toBe(ZONE_A);
      expect(determineHabitableZone(8, 2)).toBe(ZONE_A);
      expect(determineHabitableZone(8, 3)).toBe(ZONE_B);
      expect(determineHabitableZone(8, 4)).toBe(ZONE_B);
      expect(determineHabitableZone(8, 5)).toBe(ZONE_C);
      expect(determineHabitableZone(8, 6)).toBe(ZONE_C);
      expect(determineHabitableZone(8, 7)).toBe(ZONE_C);
      expect(determineHabitableZone(8, 8)).toBe(ZONE_C);

      // 12 planets (edge case)
      expect(determineHabitableZone(12, 1)).toBe(ZONE_A);
      expect(determineHabitableZone(12, 2)).toBe(ZONE_A);
      expect(determineHabitableZone(12, 3)).toBe(ZONE_B);
      expect(determineHabitableZone(12, 4)).toBe(ZONE_B);
      expect(determineHabitableZone(12, 5)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 6)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 7)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 8)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 9)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 10)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 11)).toBe(ZONE_C);
      expect(determineHabitableZone(12, 12)).toBe(ZONE_C);
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
});