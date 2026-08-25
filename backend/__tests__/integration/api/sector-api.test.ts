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
        version: '1.1.0',
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
        expect(typeof system.name).toBe('string');
        expect(system.name.length).toBeGreaterThan(0);
        expect(typeof system.hasProperName).toBe('boolean');
        // Life: the API exposes a system age (test 44)
        expect(typeof system.age).toBe('number');
        expect(system.age).toBeGreaterThanOrEqual(0.5);
      });

      // Verify each star
      data.stars.forEach((star: any) => {
        expect(star.starId).toBeGreaterThan(0);
        expect(star.systemId).toBeGreaterThan(0);
        expect(typeof star.name).toBe('string');
        expect(star.name.length).toBeGreaterThan(0);
        expect(star.spectralClass).toBeDefined();
      });

      // Star names are unique sector-wide
      const starNames = data.stars.map((star: any) => star.name);
      expect(new Set(starNames).size).toBe(starNames.length);

      // Verify each planet (if any)
      data.planets.forEach((planet: any) => {
        expect(planet.starId).toBeGreaterThan(0);
        expect(planet.orbitalNumber).toBeGreaterThan(0);
        expect(planet.planetType).toBeDefined();
        expect(typeof planet.diameter).toBe('number');
        expect(typeof planet.moonCount).toBe('number');
        // Life: the API exposes the three life fields (test 45)
        expect(typeof planet.lifeProbability).toBe('number');
        expect(typeof planet.lifeComplexity).toBe('number');
        expect(typeof planet.hasLife).toBe('boolean');
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

      // Names in particular must be reproducible across HTTP calls
      const systemNames = (body: any) => body.data.systems.map((s: any) => s.name);
      const starNames = (body: any) => body.data.stars.map((s: any) => s.name);
      expect(systemNames(response1.body)).toEqual(systemNames(response2.body));
      expect(starNames(response1.body)).toEqual(starNames(response2.body));
    });

    test('should produce different names for a different seed', async () => {
      const base = { systemCount: 50, sectorVolume: 1000, zone: 'medium' };

      const response1 = await request(app)
        .post('/api/sector/generate')
        .send({ ...base, seed: 'http-name-seed-a' })
        .expect(200);

      const response2 = await request(app)
        .post('/api/sector/generate')
        .send({ ...base, seed: 'http-name-seed-b' })
        .expect(200);

      const names1 = response1.body.data.systems.map((s: any) => s.name);
      const names2 = response2.body.data.systems.map((s: any) => s.name);

      expect(names1.some((name: string, i: number) => name !== names2[i])).toBe(true);
    });

    test('should name every system even when the proper-name pool is exhausted', async () => {
      // 1000 systems far exceeds the ~450-name pool, so this exercises the
      // designation fallback all the way through the HTTP layer.
      const response = await request(app)
        .post('/api/sector/generate')
        .send({ systemCount: 1000, sectorVolume: 1000000, seed: 'exhaustion', zone: 'medium' })
        .expect(200);

      expect(response.body.success).toBe(true);

      const systems = response.body.data.systems;
      expect(systems).toHaveLength(1000);
      systems.forEach((system: any) => {
        expect(typeof system.name).toBe('string');
        expect(system.name.length).toBeGreaterThan(0);
      });

      // Names stay unique even past exhaustion
      const names = systems.map((s: any) => s.name);
      expect(new Set(names).size).toBe(names.length);
    });

    test('should return identical life data for the same seed (test 46)', async () => {
      const requestBody = {
        systemCount: 25,
        sectorVolume: 1000,
        seed: 'life-determinism',
        zone: 'medium'
      };

      const first = await request(app).post('/api/sector/generate').send(requestBody).expect(200);
      const second = await request(app).post('/api/sector/generate').send(requestBody).expect(200);

      const lifeOf = (body: any) => ({
        ages: body.data.systems.map((s: any) => s.age),
        probabilities: body.data.planets.map((p: any) => p.lifeProbability),
        presence: body.data.planets.map((p: any) => p.hasLife),
        names: body.data.planets.map((p: any) => p.name)
      });

      expect(lifeOf(second.body)).toEqual(lifeOf(first.body));
    });

    test('should return different life data for a different seed (test 47)', async () => {
      const base = {
        systemCount: 25,
        sectorVolume: 1000,
        zone: 'medium'
      };

      const first = await request(app)
        .post('/api/sector/generate')
        .send({ ...base, seed: 'life-seed-one' })
        .expect(200);
      const second = await request(app)
        .post('/api/sector/generate')
        .send({ ...base, seed: 'life-seed-two' })
        .expect(200);

      const presenceOne = first.body.data.planets.map((p: any) => p.hasLife);
      const presenceTwo = second.body.data.planets.map((p: any) => p.hasLife);
      const agesOne = first.body.data.systems.map((s: any) => s.age);
      const agesTwo = second.body.data.systems.map((s: any) => s.age);

      const differs =
        JSON.stringify(presenceOne) !== JSON.stringify(presenceTwo) ||
        JSON.stringify(agesOne) !== JSON.stringify(agesTwo);
      expect(differs).toBe(true);
    });

    test('should score every planet and keep planet names unique at scale (test 48)', async () => {
      // 1000 systems drives the 288-name planet pool towards exhaustion, so this
      // exercises the designation fallback all the way through the HTTP layer.
      const response = await request(app)
        .post('/api/sector/generate')
        .send({ systemCount: 1000, sectorVolume: 1000000, seed: 'life-exhaustion', zone: 'medium' })
        .expect(200);

      expect(response.body.success).toBe(true);

      const planets = response.body.data.planets;
      expect(planets.length).toBeGreaterThan(0);

      planets.forEach((planet: any) => {
        expect(typeof planet.lifeProbability).toBe('number');
        expect(typeof planet.lifeComplexity).toBe('number');
        expect(typeof planet.hasLife).toBe('boolean');
      });

      // Every named (inhabited) planet is unique sector-wide, past exhaustion too
      const names = planets
        .filter((planet: any) => planet.name !== undefined)
        .map((planet: any) => planet.name);
      expect(names.length).toBeGreaterThan(0);
      expect(new Set(names).size).toBe(names.length);
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