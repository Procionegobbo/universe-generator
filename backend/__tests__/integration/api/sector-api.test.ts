import request from 'supertest';
import express from 'express';
import { createSectorRoutes } from '../../../src/routes/sector.routes';

// Use real controller (which uses real service and generator)
// This is a full integration test

describe('Sector API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sector', createSectorRoutes());
  });

  describe('GET /api/sector/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/sector/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'stellar-generator-api',
        version: '1.0.0',
        timestamp: expect.any(String)
      });

      // Timestamp should be valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('POST /api/sector/generate', () => {
    test('should generate sector with valid parameters', async () => {
      const requestBody = {
        systemCount: 10,
        sectorVolume: 1000,
        seed: 'integration-test',
        zone: 'medium'
      };

      const response = await request(app)
        .post('/api/sector/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.stats).toBeDefined();

      const { data, stats } = response.body;

      // Verify data structure
      expect(data.systems).toHaveLength(10);
      expect(data.stars.length).toBeGreaterThanOrEqual(10); // at least one star per system
      expect(Array.isArray(data.planets)).toBe(true);

      // Verify stats match data
      expect(stats.systemCount).toBe(data.systems.length);
      expect(stats.starCount).toBe(data.stars.length);
      expect(stats.planetCount).toBe(data.planets.length);
      expect(stats.generationTimeMs).toBeGreaterThanOrEqual(0);

      // Verify each system
      data.systems.forEach((system: any) => {
        expect(system.systemId).toBeGreaterThan(0);
        expect(typeof system.xPos).toBe('number');
        expect(typeof system.yPos).toBe('number');
        expect(typeof system.zPos).toBe('number');
      });

      // Verify each star
      data.stars.forEach((star: any) => {
        expect(star.starId).toBeGreaterThan(0);
        expect(star.systemId).toBeGreaterThan(0);
        expect(star.name).toMatch(/^\d+-\d+$/);
        expect(star.spectralClass).toBeDefined();
      });

      // Verify each planet (if any)
      data.planets.forEach((planet: any) => {
        expect(planet.starId).toBeGreaterThan(0);
        expect(planet.orbitalNumber).toBeGreaterThan(0);
        expect(planet.planetType).toBeDefined();
        expect(typeof planet.diameter).toBe('number');
        expect(typeof planet.moonCount).toBe('number');
      });
    });

    test('should generate deterministic sector with same seed', async () => {
      const requestBody = {
        systemCount: 5,
        sectorVolume: 500,
        seed: 'deterministic-seed',
        zone: 'medium'
      };

      // First request
      const response1 = await request(app)
        .post('/api/sector/generate')
        .send(requestBody)
        .expect(200);

      // Second request with same seed
      const response2 = await request(app)
        .post('/api/sector/generate')
        .send(requestBody)
        .expect(200);

      // Data should be identical
      expect(response1.body.data).toEqual(response2.body.data);
    });

    test('should return 400 for invalid systemCount', async () => {
      const testCases = [
        { systemCount: 0, sectorVolume: 1000 },
        { systemCount: 10001, sectorVolume: 1000 },
        { systemCount: 'not-a-number', sectorVolume: 1000 },
        { systemCount: -5, sectorVolume: 1000 }
      ];

      for (const body of testCases) {
        const response = await request(app)
          .post('/api/sector/generate')
          .send(body)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('systemCount');
      }
    });

    test('should return 400 for invalid sectorVolume', async () => {
      const testCases = [
        { systemCount: 10, sectorVolume: 0 },
        { systemCount: 10, sectorVolume: 10000001 },
        { systemCount: 10, sectorVolume: 'invalid' },
        { systemCount: 10, sectorVolume: -1000 }
      ];

      for (const body of testCases) {
        const response = await request(app)
          .post('/api/sector/generate')
          .send(body)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('sectorVolume');
      }
    });

    test('should handle missing optional parameters', async () => {
      const requestBody = {
        systemCount: 3,
        sectorVolume: 200
        // No seed, no zone
      };

      const response = await request(app)
        .post('/api/sector/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.systems).toHaveLength(3);
    });

    test('should handle different zone values', async () => {
      const zones = ['extragalactic', 'galactic edge', 'medium', 'central zone', 'core'];

      for (const zone of zones) {
        const requestBody = {
          systemCount: 2,
          sectorVolume: 100,
          zone
        };

        const response = await request(app)
          .post('/api/sector/generate')
          .send(requestBody)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Ensure generation succeeded
        expect(response.body.data.stars.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});