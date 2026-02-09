import { Router } from 'express';
import { SectorController } from '../controllers/sector.controller';

export const createSectorRoutes = (): Router => {
    const router = Router();
    const sectorController = new SectorController();

    // Health check
    router.get('/health', sectorController.healthCheck);

    // Generate sector
    router.post('/generate', sectorController.generateSector);

    return router;
};