import { StellarService } from '../../../src/services/stellar.service';
import { StellarGenerator } from '../../../src/lib/example_star_generator';
import { Sector } from '../../../src/types';

// Mock the StellarGenerator class
jest.mock('../../../src/lib/example_star_generator');

const MockStellarGenerator = StellarGenerator as jest.MockedClass<typeof StellarGenerator>;

describe('StellarService', () => {
  let service: StellarService;

  beforeEach(() => {
    service = new StellarService();
    jest.clearAllMocks();
  });

  describe('generateSector', () => {
    test('should delegate to StellarGenerator with correct parameters', () => {
      const mockSector: Sector = {
        systems: [{ systemId: 1, xPos: 0, yPos: 0, zPos: 0 }],
        stars: [{ starId: 1, systemId: 1, name: '1-1', spectralClass: 'M' }],
        planets: []
      };

      const mockGeneratorInstance = {
        generateSector: jest.fn().mockReturnValue(mockSector)
      };
      MockStellarGenerator.mockImplementation(() => mockGeneratorInstance as any);

      const systemCount = 10;
      const sectorVolume = 1000;
      const seed = 'test-seed';
      const zone = 'core';

      const result = service.generateSector(systemCount, sectorVolume, seed, zone);

      // Verify constructor was called with correct arguments
      expect(MockStellarGenerator).toHaveBeenCalledWith(seed, zone);
      // Verify generateSector was called with correct arguments
      expect(mockGeneratorInstance.generateSector).toHaveBeenCalledWith(systemCount, sectorVolume);
      // Verify result matches mock
      expect(result).toBe(mockSector);
    });

    test('should use default zone when not provided', () => {
      const mockSector: Sector = { systems: [], stars: [], planets: [] };
      const mockGeneratorInstance = {
        generateSector: jest.fn().mockReturnValue(mockSector)
      };
      MockStellarGenerator.mockImplementation(() => mockGeneratorInstance as any);

      service.generateSector(5, 1000);

      // Default zone should be undefined (generator default is 'medium')
      expect(MockStellarGenerator).toHaveBeenCalledWith(undefined, undefined);
    });

    test('should use default seed when not provided', () => {
      const mockSector: Sector = { systems: [], stars: [], planets: [] };
      const mockGeneratorInstance = {
        generateSector: jest.fn().mockReturnValue(mockSector)
      };
      MockStellarGenerator.mockImplementation(() => mockGeneratorInstance as any);

      service.generateSector(5, 1000, undefined, 'medium');

      expect(MockStellarGenerator).toHaveBeenCalledWith(undefined, 'medium');
    });
  });

  describe('getSectorStats', () => {
    test('should calculate correct statistics for empty sector', () => {
      const emptySector: Sector = { systems: [], stars: [], planets: [] };
      const stats = service.getSectorStats(emptySector);

      expect(stats).toEqual({
        systemCount: 0,
        starCount: 0,
        planetCount: 0,
        starTypeDistribution: {},
        planetTypeDistribution: {},
        avgPlanetsPerStar: 0,
        avgStarsPerSystem: 0
      });
    });

    test('should calculate correct statistics for sector with data', () => {
      const sector: Sector = {
        systems: [
          { systemId: 1, xPos: 0, yPos: 0, zPos: 0 },
          { systemId: 2, xPos: 10, yPos: 10, zPos: 10 }
        ],
        stars: [
          { starId: 1, systemId: 1, name: '1-1', spectralClass: 'M' },
          { starId: 2, systemId: 1, name: '1-2', spectralClass: 'G' },
          { starId: 3, systemId: 2, name: '2-1', spectralClass: 'M' }
        ],
        planets: [
          { starId: 1, orbitalNumber: 1, planetType: 'R', diameter: 5000, moonCount: 2 },
          { starId: 1, orbitalNumber: 2, planetType: 'G', diameter: 8000, moonCount: 1 },
          { starId: 2, orbitalNumber: 1, planetType: 'R', diameter: 6000, moonCount: 0 }
        ]
      };

      const stats = service.getSectorStats(sector);

      expect(stats.systemCount).toBe(2);
      expect(stats.starCount).toBe(3);
      expect(stats.planetCount).toBe(3);
      expect(stats.starTypeDistribution).toEqual({ M: 2, G: 1 });
      expect(stats.planetTypeDistribution).toEqual({ R: 2, G: 1 });
      expect(stats.avgPlanetsPerStar).toBeCloseTo(1.0); // 3 planets / 3 stars = 1
      expect(stats.avgStarsPerSystem).toBeCloseTo(1.5); // 3 stars / 2 systems = 1.5
    });

    test('should round averages to two decimal places', () => {
      const sector: Sector = {
        systems: [{ systemId: 1, xPos: 0, yPos: 0, zPos: 0 }],
        stars: [
          { starId: 1, systemId: 1, name: '1-1', spectralClass: 'M' },
          { starId: 2, systemId: 1, name: '1-2', spectralClass: 'G' }
        ],
        planets: [
          { starId: 1, orbitalNumber: 1, planetType: 'R', diameter: 5000, moonCount: 0 },
          { starId: 2, orbitalNumber: 1, planetType: 'G', diameter: 8000, moonCount: 0 },
          { starId: 2, orbitalNumber: 2, planetType: 'R', diameter: 6000, moonCount: 0 }
        ]
      };

      const stats = service.getSectorStats(sector);
      // 3 planets / 2 stars = 1.5, 2 stars / 1 system = 2
      expect(stats.avgPlanetsPerStar).toBe(1.5);
      expect(stats.avgStarsPerSystem).toBe(2);
    });

    test('should handle sector with stars but no planets', () => {
      const sector: Sector = {
        systems: [{ systemId: 1, xPos: 0, yPos: 0, zPos: 0 }],
        stars: [{ starId: 1, systemId: 1, name: '1-1', spectralClass: 'M' }],
        planets: []
      };

      const stats = service.getSectorStats(sector);
      expect(stats.avgPlanetsPerStar).toBe(0);
      expect(stats.avgStarsPerSystem).toBe(1);
    });

    test('should handle sector with systems but no stars (edge case)', () => {
      const sector: Sector = {
        systems: [{ systemId: 1, xPos: 0, yPos: 0, zPos: 0 }],
        stars: [],
        planets: []
      };

      const stats = service.getSectorStats(sector);
      expect(stats.avgPlanetsPerStar).toBe(0);
      expect(stats.avgStarsPerSystem).toBe(0);
    });
  });
});