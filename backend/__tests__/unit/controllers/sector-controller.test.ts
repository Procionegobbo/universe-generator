import { Request, Response } from 'express';
import { SectorController } from '../../../src/controllers/sector.controller';
import { StellarService } from '../../../src/services/stellar.service';
import { Sector } from '../../../src/types';

// Mock the StellarService
jest.mock('../../../src/services/stellar.service');

const MockStellarService = StellarService as jest.MockedClass<typeof StellarService>;

describe('SectorController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createControllerWithMock = (mockSector?: Sector, shouldThrow = false) => {
    const mockServiceInstance = {
      generateSector: jest.fn().mockImplementation(() => {
        if (shouldThrow) {
          throw new Error('Service error');
        }
        return mockSector || { systems: [], stars: [], planets: [] };
      })
    };
    MockStellarService.mockImplementation(() => mockServiceInstance as any);
    return {
      controller: new SectorController(),
      mockServiceInstance
    };
  };

  describe('generateSector', () => {
    test('should return 400 for invalid systemCount (non-number)', () => {
      const { controller } = createControllerWithMock();
      mockReq = { body: { systemCount: 'not-a-number', sectorVolume: 1000 } };
      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'systemCount must be a positive number between 1 and 10000'
        })
      );
    });

    test('should return 400 for systemCount <= 0', () => {
      const { controller } = createControllerWithMock();
      mockReq = { body: { systemCount: 0, sectorVolume: 1000 } };
      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'systemCount must be a positive number between 1 and 10000'
        })
      );
    });

    test('should return 400 for systemCount > 10000', () => {
      const { controller } = createControllerWithMock();
      mockReq = { body: { systemCount: 10001, sectorVolume: 1000 } };
      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'systemCount must be a positive number between 1 and 10000'
        })
      );
    });

    test('should return 400 for invalid sectorVolume (non-number)', () => {
      const { controller } = createControllerWithMock();
      mockReq = { body: { systemCount: 10, sectorVolume: 'invalid' } };
      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'sectorVolume must be a positive number between 1 and 10000000'
        })
      );
    });

    test('should return 400 for sectorVolume <= 0', () => {
      const { controller } = createControllerWithMock();
      mockReq = { body: { systemCount: 10, sectorVolume: 0 } };
      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'sectorVolume must be a positive number between 1 and 10000000'
        })
      );
    });

    test('should return 400 for sectorVolume > 10000000', () => {
      const { controller } = createControllerWithMock();
      mockReq = { body: { systemCount: 10, sectorVolume: 10000001 } };
      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'sectorVolume must be a positive number between 1 and 10000000'
        })
      );
    });

    test('should call service and return success for valid input', () => {
      const mockSector: Sector = {
        systems: [{ systemId: 1, xPos: 0, yPos: 0, zPos: 0 }],
        stars: [{ starId: 1, systemId: 1, name: '1-1', spectralClass: 'M' }],
        planets: []
      };
      const { controller, mockServiceInstance } = createControllerWithMock(mockSector);

      mockReq = {
        body: {
          systemCount: 50,
          sectorVolume: 5000,
          seed: 'test-seed',
          zone: 'medium'
        }
      };

      // Mock Date.now for consistent generation time
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1000);

      controller.generateSector(mockReq as Request, mockRes as Response);

      Date.now = originalDateNow;

      expect(mockServiceInstance.generateSector).toHaveBeenCalledWith(50, 5000, 'test-seed', 'medium');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSector,
          stats: expect.objectContaining({
            systemCount: 1,
            starCount: 1,
            planetCount: 0,
            generationTimeMs: expect.any(Number)
          })
        })
      );
      // Should not have called status (default 200)
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should handle service throwing an error', () => {
      const { controller } = createControllerWithMock(undefined, true);
      mockReq = { body: { systemCount: 10, sectorVolume: 1000 } };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      controller.generateSector(mockReq as Request, mockRes as Response);

      expect(consoleSpy).toHaveBeenCalledWith('Error generating sector:', expect.any(Error));
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error while generating sector'
        })
      );

      consoleSpy.mockRestore();
    });

    test('should handle missing optional parameters', () => {
      const mockSector: Sector = { systems: [], stars: [], planets: [] };
      const { controller, mockServiceInstance } = createControllerWithMock(mockSector);
      mockReq = { body: { systemCount: 5, sectorVolume: 1000 } };

      controller.generateSector(mockReq as Request, mockRes as Response);

      // Should call with undefined for seed and zone
      expect(mockServiceInstance.generateSector).toHaveBeenCalledWith(5, 1000, undefined, undefined);
    });
  });

  describe('healthCheck', () => {
    test('should return health status', () => {
      const { controller } = createControllerWithMock();
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      controller.healthCheck(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'ok',
        service: 'stellar-generator-api',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      jest.restoreAllMocks();
    });
  });
});