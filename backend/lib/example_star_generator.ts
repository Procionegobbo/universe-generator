import seedrandom from 'seedrandom';

// Globale.ts

// Global constants
export const STAR_DENSITY = 600;
export const BLOCK_SIZE = 10000;
export const ZONE_A = 1;
export const ZONE_B = 2;
export const ZONE_C = 3;

// Interface for star types
export interface StarType {
    spectralClass: string;
    hasSubclass?: boolean;
    planetCountFormula?: string;
    [key: string]: any;
}

// Interface for planet types
export interface PlanetType {
    shortType: string;
    diameterFormula: string;
    diameterMultiplier: number;
    [key: string]: any;
}

// Interface for a Star
export interface Star {
    starId: number;
    systemId: number;
    name: string;
    spectralClass: string;
    subclass?: number;
}

// Interface for a Planet
export interface Planet {
    starId: number;
    orbitalNumber: number;
    planetType: string;
    diameter: number;
    moonCount: number;
}

// Interface for a System
export interface System {
    systemId: number;
    xPos: number;
    yPos: number;
    zPos: number;
}

// Class for dice notation parsing
export class DiceParser {
    /**
     * Parses dice notation like "2d6+3" or "1d100"
     * @param formula Dice notation formula
     * @param random Optional random function to use
     * @returns Result of dice roll
     */
    static parse(formula: string, random: () => number = Math.random): number {
        // Simple dice parser - can be expanded for more complex formulas
        const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);

        if (!match) {
            // If not dice notation, try to parse as number
            const num = parseInt(formula);
            return isNaN(num) ? 0 : num;
        }

        const diceCount = parseInt(match[1]);
        const diceSides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[3]) : 0;

        let total = 0;
        for (let i = 0; i < diceCount; i++) {
            total += Math.floor(random() * diceSides) + 1;
        }

        return total + modifier;
    }
}

// Main class for stellar generation
export class StellarGenerator {
    private lastStarId = 0;
    private lastSystemId = 0;
    private prng: seedrandom.PRNG;

    constructor(seed?: string | number) {
        const seedStr = seed !== undefined ? seed.toString() : Math.random().toString();
        this.prng = seedrandom(seedStr);
    }

    // Star types table (simulated - normally from database)
    private starTypes: Record<string, StarType> = {
        'O': { spectralClass: 'O', hasSubclass: true, planetCountFormula: '2d6' },
        'B': { spectralClass: 'B', hasSubclass: true, planetCountFormula: '2d6' },
        'A': { spectralClass: 'A', hasSubclass: true, planetCountFormula: '2d6' },
        'F': { spectralClass: 'F', hasSubclass: true, planetCountFormula: '2d6' },
        'G': { spectralClass: 'G', hasSubclass: true, planetCountFormula: '2d6' },
        'K': { spectralClass: 'K', hasSubclass: true, planetCountFormula: '2d6' },
        'M': { spectralClass: 'M', hasSubclass: true, planetCountFormula: '2d6' },
        'DB': { spectralClass: 'DB', hasSubclass: false, planetCountFormula: '1d6' },
        'DA': { spectralClass: 'DA', hasSubclass: false, planetCountFormula: '1d6' },
        'DF': { spectralClass: 'DF', hasSubclass: false, planetCountFormula: '1d6' },
        'DG': { spectralClass: 'DG', hasSubclass: false, planetCountFormula: '1d6' },
        'DK': { spectralClass: 'DK', hasSubclass: false, planetCountFormula: '1d6' },
        'gF': { spectralClass: 'gF', hasSubclass: true, planetCountFormula: '3d6' },
        'gG': { spectralClass: 'gG', hasSubclass: true, planetCountFormula: '3d6' },
        'gK': { spectralClass: 'gK', hasSubclass: true, planetCountFormula: '3d6' },
        'gM': { spectralClass: 'gM', hasSubclass: true, planetCountFormula: '3d6' },
        'NS': { spectralClass: 'NS', hasSubclass: false, planetCountFormula: '0' },
        'cB': { spectralClass: 'cB', hasSubclass: true, planetCountFormula: '1d3' },
        'cA': { spectralClass: 'cA', hasSubclass: true, planetCountFormula: '1d3' },
        'cF': { spectralClass: 'cF', hasSubclass: true, planetCountFormula: '1d3' },
        'cG': { spectralClass: 'cG', hasSubclass: true, planetCountFormula: '1d3' },
        'cK': { spectralClass: 'cK', hasSubclass: true, planetCountFormula: '1d3' },
        'cM': { spectralClass: 'cM', hasSubclass: true, planetCountFormula: '1d3' },
        'BH': { spectralClass: 'BH', hasSubclass: false, planetCountFormula: '0' }
    };

    // Planet types table (simulated)
    private planetTypes: Record<string, PlanetType> = {
        'A': { shortType: 'A', diameterFormula: '0', diameterMultiplier: 0 },
        'G': { shortType: 'G', diameterFormula: '2d6', diameterMultiplier: 1000 },
        'R': { shortType: 'R', diameterFormula: '2d6', diameterMultiplier: 1000 },
        'C': { shortType: 'C', diameterFormula: '2d6', diameterMultiplier: 1000 },
        'D': { shortType: 'D', diameterFormula: '2d6', diameterMultiplier: 1000 },
        'H': { shortType: 'H', diameterFormula: '2d6', diameterMultiplier: 1000 },
        'M': { shortType: 'M', diameterFormula: '2d6', diameterMultiplier: 1000 },
        'E': { shortType: 'E', diameterFormula: '2d6', diameterMultiplier: 1000 },
        '#': { shortType: '#', diameterFormula: '2d6', diameterMultiplier: 1000 }
    };

    /**
     * Determines the habitable zone of a planet
     * @param totalPlanets Total number of planets in the system
     * @param planetNumber Position of the planet in the system
     * @returns Zone number (A, B, or C)
     */
    determineHabitableZone(totalPlanets: number, planetNumber: number): number {
        if (totalPlanets >= 1 && totalPlanets <= 3) {
            return planetNumber === 1 ? ZONE_B : ZONE_C;
        } else if (totalPlanets >= 4 && totalPlanets <= 5) {
            switch (planetNumber) {
                case 1: return ZONE_A;
                case 2: return ZONE_B;
                default: return ZONE_C;
            }
        } else if (totalPlanets >= 6 && totalPlanets <= 7) {
            switch (planetNumber) {
                case 1: return ZONE_A;
                case 2:
                case 3: return ZONE_B;
                default: return ZONE_C;
            }
        } else {
            switch (planetNumber) {
                case 1:
                case 2: return ZONE_A;
                case 3:
                case 4: return ZONE_B;
                default: return ZONE_C;
            }
        }
    }

    /**
     * Creates a planet
     * @param zone Habitable zone
     * @param orbit Orbit number
     * @param starId Parent star ID
     * @returns Generated planet
     */
    createPlanet(zone: number, orbit: number, starId: number): Planet {
        const diceRoll = Math.floor(this.prng() * 100) + 1;
        let planetType = '#';
        let diameter = 0;
        let moonCount = 0;

        // Determine planet type based on zone and dice roll
        if (diceRoll <= 5) {
            planetType = 'A';
            diameter = 0;
            moonCount = 0;
        } else if ((zone === ZONE_B && diceRoll <= 8) || (zone === ZONE_C && diceRoll <= 75)) {
            planetType = 'G';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = DiceParser.parse('2d10', this.prng);
        } else if ((zone === ZONE_A && diceRoll <= 60) ||
            (zone === ZONE_B && diceRoll <= 40) ||
            (zone === ZONE_C && diceRoll <= 80)) {
            planetType = 'R';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        } else if (zone === ZONE_C && diceRoll <= 80) {
            planetType = 'C';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        } else if ((zone === ZONE_A && diceRoll <= 70) ||
            (zone === ZONE_B && diceRoll <= 60) ||
            (zone === ZONE_C && diceRoll <= 95)) {
            planetType = 'D';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        } else if ((zone === ZONE_A && diceRoll <= 100) ||
            (zone === ZONE_B && diceRoll <= 80) ||
            (zone === ZONE_C && diceRoll <= 100)) {
            planetType = 'H';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        } else if (zone === ZONE_B && diceRoll <= 90) {
            planetType = 'M';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        } else if (zone === ZONE_B && diceRoll <= 100) {
            planetType = 'E';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        } else {
            planetType = '#';
            const type = this.planetTypes[planetType];
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.floor(DiceParser.parse('1d6', this.prng) * DiceParser.parse('1d6', this.prng) / 10);
        }

        return {
            starId,
            orbitalNumber: orbit,
            planetType,
            diameter,
            moonCount
        };
    }

    /**
     * Determines the number of stars in a system
     * @returns Number of stars (1-4)
     */
    determineStarCount(): number {
        const roll = Math.floor(this.prng() * 100) + 1;
        if (roll <= 40) return 1;
        if (roll <= 90) return 2;
        if (roll <= 99) return 3;
        return 4;
    }

    /**
     * Generates the primary star type
     * @returns Spectral class string
     */
    generateStarType(): string {
        const diceRoll = Math.floor(this.prng() * 100) + 1;

        switch (true) {
            case diceRoll === 1:
                return this.generateStarType2();
            case diceRoll === 2:
                return "B";
            case diceRoll >= 3 && diceRoll <= 4:
                return "A";
            case diceRoll >= 5 && diceRoll <= 8:
                return "F";
            case diceRoll >= 9 && diceRoll <= 15:
                return "G";
            case diceRoll >= 16 && diceRoll <= 30:
                return "K";
            case diceRoll >= 31 && diceRoll <= 93:
                return "M";
            case diceRoll === 94:
                return "DB";
            case diceRoll >= 95 && diceRoll <= 96:
                return "DA";
            case diceRoll >= 97 && diceRoll <= 98:
                return "DF";
            case diceRoll === 99:
                return "DG";
            case diceRoll === 100:
                return "DK";
            default:
                return "??";
        }
    }

    /**
     * Generates the secondary star type
     * @returns Spectral class string
     */
    generateStarType2(): string {
        const diceRoll = Math.floor(this.prng() * 100) + 1;

        switch (true) {
            case diceRoll === 1:
                return this.generateStarType3(1);
            case diceRoll >= 2 && diceRoll <= 5:
                return "gF";
            case diceRoll >= 6 && diceRoll <= 10:
                return "gG";
            case diceRoll >= 11 && diceRoll <= 55:
                return "gK";
            case diceRoll >= 56 && diceRoll <= 95:
                return "gM";
            case diceRoll >= 96 && diceRoll <= 99:
                return "NS";
            case diceRoll === 100:
                return this.generateStarType3(100);
            default:
                return "??";
        }
    }

    /**
     * Generates the tertiary star type
     * @param previous Previous value that called this function (1 or 100)
     * @returns Spectral class string
     */
    generateStarType3(previous: number): string {
        const diceRoll = Math.floor(this.prng() * 100) + 1;

        if (previous === 1) {
            if (diceRoll >= 1 && diceRoll <= 10) return "cB";
            if (diceRoll >= 11 && diceRoll <= 20) return "cA";
            if (diceRoll >= 21 && diceRoll <= 40) return "cF";
            if (diceRoll >= 41 && diceRoll <= 60) return "cG";
            if (diceRoll >= 61 && diceRoll <= 80) return "cK";
            if (diceRoll >= 81 && diceRoll <= 100) return "cM";
        } else if (previous === 100) {
            if (diceRoll >= 1 && diceRoll <= 20) return "BH";
            if (diceRoll >= 21 && diceRoll <= 100) return "O";
        }

        return "??";
    }

    /**
     * Generates a stellar sector
     * @param systemCount Number of systems to generate
     * @param sectorSize Size of the sector cube
     * @returns Object containing generated systems, stars, and planets
     */
    generateSector(systemCount: number, sectorSize: number): {
        systems: System[],
        stars: Star[],
        planets: Planet[]
    } {
        const systems: System[] = [];
        const stars: Star[] = [];
        const planets: Planet[] = [];

        for (let i = 1; i <= systemCount; i++) {
            // Create system
            const system: System = {
                systemId: ++this.lastSystemId,
                xPos: Math.floor(this.prng() * sectorSize),
                yPos: Math.floor(this.prng() * sectorSize),
                zPos: Math.floor(this.prng() * sectorSize)
            };
            systems.push(system);

            // Determine number of stars in the system
            const starCount = this.determineStarCount();

            for (let s = 1; s <= starCount; s++) {
                // Create star
                const spectralClass = this.generateStarType();
                const starType = this.starTypes[spectralClass] || this.starTypes['M'];

                const star: Star = {
                    starId: ++this.lastStarId,
                    systemId: system.systemId,
                    name: `${system.systemId}-${s}`,
                    spectralClass,
                    subclass: undefined
                };

                // Add subclass if needed
                if (starType.hasSubclass) {
                    if (spectralClass === 'O') {
                        star.subclass = 5 + Math.floor(this.prng() * 5);
                    } else {
                        star.subclass = 1 + Math.floor(this.prng() * 10);
                    }
                }

                stars.push(star);

                // Create planets
                const planetCountFormula = starType.planetCountFormula || '0';
                const totalPlanets = DiceParser.parse(planetCountFormula, this.prng);
                const excess = starCount > 1 ? DiceParser.parse('1d6+1', this.prng) : 0;
                const actualPlanetCount = Math.max(0, totalPlanets - excess);

                if (actualPlanetCount > 0) {
                    for (let p = 1; p <= actualPlanetCount; p++) {
                        const zone = this.determineHabitableZone(totalPlanets, p);
                        const planet = this.createPlanet(zone, p, star.starId);
                        planets.push(planet);
                    }
                }
            }
        }

        return { systems, stars, planets };
    }
}

// Example usage
/*
const generator = new StellarGenerator();

// Generate a sector with 100 systems in a 1000x1000x1000 unit cube
const sector = generator.generateSector(100, 1000);

console.log(`Generated systems: ${sector.systems.length}`);
console.log(`Generated stars: ${sector.stars.length}`);
console.log(`Generated planets: ${sector.planets.length}`);

// Star type statistics
const starTypeDistribution: Record<string, number> = {};
sector.stars.forEach(star => {
    starTypeDistribution[star.spectralClass] = (starTypeDistribution[star.spectralClass] || 0) + 1;
});
console.log('Star type distribution:', starTypeDistribution);
*/