import { StellarGenerator } from '../lib/example_star_generator';
import { Sector, SectorZone } from '../types';

export class StellarService {

    constructor() {
        // generator is now created per request to ensure correct seeding
    }

    /**
     * Generate a sector with the given parameters
     */
    generateSector(systemCount: number, sectorSize: number, seed?: string | number, zone?: SectorZone): Sector {
        const generator = new StellarGenerator(seed, zone);
        return generator.generateSector(systemCount, sectorSize);
    }

    /**
     * Get statistics about a generated sector
     */
    getSectorStats(sector: Sector) {
        const starTypeDistribution: Record<string, number> = {};
        const planetTypeDistribution: Record<string, number> = {};

        // Count star types
        sector.stars.forEach(star => {
            starTypeDistribution[star.spectralClass] = (starTypeDistribution[star.spectralClass] || 0) + 1;
        });

        // Count planet types
        sector.planets.forEach(planet => {
            planetTypeDistribution[planet.planetType] = (planetTypeDistribution[planet.planetType] || 0) + 1;
        });

        // Calculate average planets per star
        const avgPlanetsPerStar = sector.stars.length > 0 ? sector.planets.length / sector.stars.length : 0;

        // Calculate average stars per system
        const avgStarsPerSystem = sector.systems.length > 0 ? sector.stars.length / sector.systems.length : 0;

        return {
            systemCount: sector.systems.length,
            starCount: sector.stars.length,
            planetCount: sector.planets.length,
            starTypeDistribution,
            planetTypeDistribution,
            avgPlanetsPerStar: parseFloat(avgPlanetsPerStar.toFixed(2)),
            avgStarsPerSystem: parseFloat(avgStarsPerSystem.toFixed(2))
        };
    }
}