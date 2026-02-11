import request from 'supertest';
import express from 'express';
import { createSectorRoutes } from '../../../src/routes/sector.routes';

// Create mock functions
const mockHealthCheck = jest.fn((_req, res) => res.json({ status: 'ok' }));
const mockGenerateSector = jest.fn((_req, res) => res.json({ success: true }));

// Mock the controller
jest.mock('../../../src/controllers/sector.controller', () => {
  return {
    SectorController: jest.fn().mockImplementation(() => ({
      healthCheck: mockHealthCheck,
      generateSector: mockGenerateSector
    }))
  };
});

describe('Sector Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/sector', createSectorRoutes());
  });

  test('GET /api/sector/health should call controller.healthCheck', async () => {
    const response = await request(app).get('/api/sector/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });

    // Verify controller method was called
    expect(mockHealthCheck).toHaveBeenCalled();
  });

  test('POST /api/sector/generate should call controller.generateSector', async () => {
    const requestBody = {
      systemCount: 10,
      sectorVolume: 1000,
      seed: 'test',
      zone: 'medium'
    };

    const response = await request(app)
      .post('/api/sector/generate')
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    expect(mockGenerateSector).toHaveBeenCalled();
    const call = mockGenerateSector.mock.calls[0];
    expect(call[0].body).toEqual(requestBody);
    expect(call[1]).toBeDefined();
  });

  test('POST /api/sector/generate should parse JSON body', async () => {
    const requestBody = { systemCount: 5, sectorVolume: 500 };

    await request(app)
      .post('/api/sector/generate')
      .send(requestBody)
      .expect(200);

    expect(mockGenerateSector).toHaveBeenCalled();
    const call = mockGenerateSector.mock.calls[0];
    expect(call[0].body).toEqual(requestBody);
  });
});