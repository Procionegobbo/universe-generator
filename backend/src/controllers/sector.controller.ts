import { Request, Response } from 'express';
import { StellarService } from '../services/stellar.service';
import { GenerationRequest, GenerationResponse } from '../types';

export class SectorController {
    private stellarService: StellarService;

    constructor() {
        this.stellarService = new StellarService();
    }

    /**
     * Generate a new sector
     */
    generateSector = (req: Request, res: Response) => {
        try {
            const { systemCount, sectorSize, seed } = req.body as GenerationRequest;

            // Validate input
            if (typeof systemCount !== 'number' || systemCount <= 0 || systemCount > 1000) {
                res.status(400).json({
                    success: false,
                    error: 'systemCount must be a positive number between 1 and 1000'
                } as GenerationResponse);
                return;
            }

            if (typeof sectorSize !== 'number' || sectorSize <= 0 || sectorSize > 100000) {
                res.status(400).json({
                    success: false,
                    error: 'sectorSize must be a positive number between 1 and 100000'
                } as GenerationResponse);
                return;
            }

            const startTime = Date.now();

            // Generate the sector
            const sector = this.stellarService.generateSector(systemCount, sectorSize, seed);

            const generationTimeMs = Date.now() - startTime;

            const response: GenerationResponse = {
                success: true,
                data: sector,
                stats: {
                    systemCount: sector.systems.length,
                    starCount: sector.stars.length,
                    planetCount: sector.planets.length,
                    generationTimeMs
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Error generating sector:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating sector'
            } as GenerationResponse);
        }
    };

    /**
     * Health check endpoint
     */
    healthCheck = (_req: Request, res: Response) => {
        res.json({
            status: 'ok',
            service: 'stellar-generator-api',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    };
}