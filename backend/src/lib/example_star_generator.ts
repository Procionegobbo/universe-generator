import seedrandom from 'seedrandom';
import { SectorZone, StarType, PlanetType, Star, Planet, System } from '../types';
import { SectorNamer } from './naming';
import { loadStarProperNames } from './star-name-pool';

// Shared domain interfaces live in ../types (single source of truth); re-export
// them here so existing importers of this module keep working.
export type { StarType, PlanetType, Star, Planet, System } from '../types';

// Globale.ts

// Global constants
export const STAR_DENSITY = 600;
export const BLOCK_SIZE = 10000;
export const ZONE_A = 1;
export const ZONE_B = 2;
export const ZONE_C = 3;

// One solar radius expressed in AU, used to keep orbits outside the star itself.
export const SOLAR_RADIUS_AU = 0.00465;
// Innermost orbit allowed, as a multiple of the stellar radius (roughly the
// tidal/sublimation limit for a surviving planet).
export const MIN_ORBIT_STELLAR_RADII = 4;
// Per-orbit random spread applied to the Titius-Bode ladder (±15%), so systems
// differ from one another instead of every star sharing an identical layout.
// Small enough that orbits keep their ordering (the tightest ladder ratio is 1.49).
export const ORBIT_JITTER = 0.15;

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
    // Naming draws from its own stream, derived from the same seed but never
    // advancing `prng` — so adding names leaves the geometry, spectral classes
    // and planets of every pre-existing seed bit-identical.
    private namePrng: seedrandom.PRNG;
    private namer: SectorNamer;
    private zone: SectorZone;

    constructor(seed?: string | number, zone: SectorZone = 'medium') {
        const seedStr = seed !== undefined ? seed.toString() : Math.random().toString();
        this.prng = seedrandom(seedStr);
        this.namePrng = seedrandom(`${seedStr}::names`);
        this.namer = new SectorNamer(this.namePrng, loadStarProperNames());
        this.zone = zone;
    }

    // Star types table (simulated - normally from database).
    // `radius` is in solar radii and only sets a floor for the innermost orbit
    // (a planet cannot orbit inside its star's envelope) — see orbitalDistance.
    private starTypes: Record<string, StarType> = {
        'O': { spectralClass: 'O', hasSubclass: true, planetCountFormula: '2d6', luminosity: 50000, radius: 10 },
        'B': { spectralClass: 'B', hasSubclass: true, planetCountFormula: '2d6', luminosity: 20000, radius: 5 },
        'A': { spectralClass: 'A', hasSubclass: true, planetCountFormula: '2d6', luminosity: 80, radius: 1.8 },
        'F': { spectralClass: 'F', hasSubclass: true, planetCountFormula: '2d6', luminosity: 6, radius: 1.3 },
        'G': { spectralClass: 'G', hasSubclass: true, planetCountFormula: '2d6', luminosity: 1, radius: 1 },
        'K': { spectralClass: 'K', hasSubclass: true, planetCountFormula: '2d6', luminosity: 0.4, radius: 0.8 },
        'M': { spectralClass: 'M', hasSubclass: true, planetCountFormula: '2d6', luminosity: 0.04, radius: 0.3 },
        'DB': { spectralClass: 'DB', hasSubclass: false, planetCountFormula: '1d6', luminosity: 0.001, radius: 0.013 },
        'DA': { spectralClass: 'DA', hasSubclass: false, planetCountFormula: '1d6', luminosity: 0.001, radius: 0.013 },
        'DF': { spectralClass: 'DF', hasSubclass: false, planetCountFormula: '1d6', luminosity: 0.001, radius: 0.013 },
        'DG': { spectralClass: 'DG', hasSubclass: false, planetCountFormula: '1d6', luminosity: 0.001, radius: 0.013 },
        'DK': { spectralClass: 'DK', hasSubclass: false, planetCountFormula: '1d6', luminosity: 0.001, radius: 0.013 },
        // Giants (class III): evolved, so far brighter than the main-sequence star
        // of the same spectral class. L follows Stefan-Boltzmann from the radius
        // and effective temperature: L = R^2 * (T/5772)^4.
        'gF': { spectralClass: 'gF', hasSubclass: true, planetCountFormula: '3d6', luminosity: 45, radius: 5 },      // T~6700K
        'gG': { spectralClass: 'gG', hasSubclass: true, planetCountFormula: '3d6', luminosity: 65, radius: 10 },     // T~5200K
        'gK': { spectralClass: 'gK', hasSubclass: true, planetCountFormula: '3d6', luminosity: 150, radius: 20 },    // T~4500K
        'gM': { spectralClass: 'gM', hasSubclass: true, planetCountFormula: '3d6', luminosity: 380, radius: 50 },    // T~3600K
        'NS': { spectralClass: 'NS', hasSubclass: false, planetCountFormula: '0', luminosity: 0, radius: 0.00002 },
        // Supergiants (class I): the most luminous stars, a roughly horizontal
        // band near 10^4-10^5 L_sun regardless of colour.
        'cB': { spectralClass: 'cB', hasSubclass: true, planetCountFormula: '1d3', luminosity: 90000, radius: 25 },  // T~20000K
        'cA': { spectralClass: 'cA', hasSubclass: true, planetCountFormula: '1d3', luminosity: 21000, radius: 60 },  // T~9000K
        'cF': { spectralClass: 'cF', hasSubclass: true, planetCountFormula: '1d3', luminosity: 21000, radius: 100 }, // T~7000K
        'cG': { spectralClass: 'cG', hasSubclass: true, planetCountFormula: '1d3', luminosity: 21000, radius: 180 }, // T~5200K
        'cK': { spectralClass: 'cK', hasSubclass: true, planetCountFormula: '1d3', luminosity: 22000, radius: 280 }, // T~4200K
        'cM': { spectralClass: 'cM', hasSubclass: true, planetCountFormula: '1d3', luminosity: 66000, radius: 700 }, // T~3500K
        'BH': { spectralClass: 'BH', hasSubclass: false, planetCountFormula: '0', luminosity: 0, radius: 0 }
    };

    // Planet types table (simulated)
    private planetTypes: Record<string, PlanetType> = {
        'A': { shortType: 'A', diameterFormula: '0', diameterMultiplier: 1, moonFormula: '0', density: 2000 }, // Asteroid
        'G': { shortType: 'G', diameterFormula: '2d6+8', diameterMultiplier: 10000, moonFormula: '1d6+4', density: 1300 }, // Gas Giant
        'Q': { shortType: 'Q', diameterFormula: '2d6+8', diameterMultiplier: 9000, moonFormula: '1d6+4', density: 900 }, // Hot Gas Giant
        'U': { shortType: 'U', diameterFormula: '2d6+6', diameterMultiplier: 7000, moonFormula: '1d6+4', density: 1400 }, // Ice Giant
        'S': { shortType: 'S', diameterFormula: '1d8+6', diameterMultiplier: 2000, moonFormula: '1d2-1', density: 5500 }, // Super-Earth
        'R': { shortType: 'R', diameterFormula: '1d8+4', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 5500 }, // Rocky
        'E': { shortType: 'E', diameterFormula: '1d6+6', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 5514 }, // Earth-like
        'O': { shortType: 'O', diameterFormula: '1d6+6', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 4000 }, // Ocean
        'I': { shortType: 'I', diameterFormula: '1d6+4', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 3000 }, // Ice
        'D': { shortType: 'D', diameterFormula: '1d6+4', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 3500 }, // Desert
        'C': { shortType: 'C', diameterFormula: '1d6+4', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 3500 }, // Carbon
        'L': { shortType: 'L', diameterFormula: '1d7+2', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 4000 }, // Silicate
        'F': { shortType: 'F', diameterFormula: '1d5+2', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 7000 }, // Iron
        'T': { shortType: 'T', diameterFormula: '1d12+3', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 5000 }, // Toxic
        'N': { shortType: 'N', diameterFormula: '1d10+5', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 3500 }, // Ammonia
        'B': { shortType: 'B', diameterFormula: '1d10+5', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 3500 }, // Methane
        'J': { shortType: 'J', diameterFormula: '1d4+5', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 4000 }, // Jungle
        'W': { shortType: 'W', diameterFormula: '1d20+5', diameterMultiplier: 100, moonFormula: '1d2-1', density: 2000 }, // Dwarf
        'H': { shortType: 'H', diameterFormula: '1d7+2', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 5000 }, // Hell
        'M': { shortType: 'M', diameterFormula: '1d7+2', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 5000 }, // Molten
        'X': { shortType: 'X', diameterFormula: '1d7+2', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 3500 }, // Cold Desert
        '#': { shortType: '#', diameterFormula: '1d7+2', diameterMultiplier: 1000, moonFormula: '1d2-1', density: 4000 } // Unknown
    };

    // Weighted probability distribution for planet types (sum to 100)
    private planetTypeWeights: { code: string, weight: number }[] = [
        { code: 'G', weight: 15 }, // Gas Giant
        { code: 'U', weight: 10 }, // Uranian/Ice Giant
        { code: 'S', weight: 15 }, // Super-Earth
        { code: 'R', weight: 10 }, // Rocky
        { code: 'E', weight: 5 },  // Earth-like
        { code: 'O', weight: 5 },  // Ocean
        { code: 'I', weight: 7 },  // Ice
        { code: 'D', weight: 7 },  // Desert
        { code: 'C', weight: 3 },  // Carbon
        { code: 'L', weight: 3 },  // Silicate
        { code: 'F', weight: 3 },  // Iron
        { code: 'T', weight: 3 },  // Toxic
        { code: 'N', weight: 2 },  // Ammonia
        { code: 'B', weight: 2 },  // Methane
        { code: 'J', weight: 2 },  // Jungle
        { code: 'Q', weight: 2 },  // Hot Gas Giant
        { code: 'W', weight: 5 },  // Dwarf
        { code: 'A', weight: 3 },  // Asteroid Belt
        { code: 'H', weight: 2 },  // Hell
        { code: 'M', weight: 2 },  // Molten
        { code: 'X', weight: 2 }   // Cold Desert
    ];

    // Thermal affinity multipliers per orbital zone (ZONE_A hot/inner,
    // ZONE_B temperate/habitable, ZONE_C cold/outer). Applied on top of the base
    // weight so hot planet types cluster near the star and cold ones far from it,
    // while still allowing rare exceptions (soft bias).
    private planetZoneAffinity: Record<string, [number, number, number]> = {
        // code: [ZONE_A, ZONE_B, ZONE_C]
        'M': [1, 0.05, 0],    // Molten
        'H': [1, 0.05, 0],    // Hell
        'Q': [1, 0.1, 0],     // Hot Gas Giant
        'L': [1, 0.3, 0],     // Silicate
        'F': [1, 0.5, 0.2],   // Iron
        'C': [1, 0.5, 0.2],   // Carbon
        'D': [1, 1, 0.1],     // Desert
        'T': [1, 1, 0.2],     // Toxic
        'E': [0, 1, 0.05],    // Earth-like
        'O': [0, 1, 0.2],     // Ocean
        'J': [0, 1, 0],       // Jungle
        'I': [0, 0.15, 1],    // Ice
        'X': [0, 0.3, 1],     // Cold Desert
        'N': [0, 0.2, 1],     // Ammonia
        'B': [0, 0.1, 1],     // Methane
        'G': [0.2, 0.5, 1],   // Gas Giant
        'U': [0, 0.3, 1],     // Ice Giant
        'S': [1, 1, 1],       // Super-Earth
        'R': [1, 1, 0.7],     // Rocky
        'W': [0.5, 1, 1],     // Dwarf
        'A': [1, 1, 1]        // Asteroid Belt
    };

    /**
     * Selects a planet type using weighted random selection. Base weights are
     * multiplied by the per-type affinity for the given orbital thermal zone
     * (soft bias).
     * @param zone Orbital thermal zone (ZONE_A, ZONE_B, or ZONE_C)
     */
    private selectPlanetTypeWeighted(zone: number): string {
        const zoneIndex = zone === ZONE_A ? 0 : zone === ZONE_B ? 1 : 2;

        const weighted = this.planetTypeWeights.map(t => {
            const affinity = this.planetZoneAffinity[t.code];
            const multiplier = affinity ? affinity[zoneIndex] : 1;
            return { code: t.code, weight: t.weight * multiplier };
        });

        const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
        let r = this.prng() * totalWeight;
        for (const t of weighted) {
            if (r < t.weight) return t.code;
            r -= t.weight;
        }
        return '#'; // fallback
    }

    // Thermal properties per planet type used to turn incident stellar flux into a
    // surface temperature: Bond albedo (fraction of light reflected, cools the
    // planet) and greenhouse warming (extra Kelvin added by the atmosphere).
    // Giants use greenhouse 0: their internal heat is not modelled here.
    private planetThermal: Record<string, { albedo: number; greenhouse: number }> = {
        'A': { albedo: 0.10, greenhouse: 0 },     // Asteroid (bare rock)
        'G': { albedo: 0.30, greenhouse: 0 },     // Gas Giant (no surface)
        'Q': { albedo: 0.10, greenhouse: 0 },     // Hot Gas Giant
        'U': { albedo: 0.30, greenhouse: 0 },     // Ice Giant
        'S': { albedo: 0.30, greenhouse: 40 },    // Super-Earth (thick atmosphere)
        'R': { albedo: 0.12, greenhouse: 5 },     // Rocky (thin atmosphere, Moon/Mercury-like albedo)
        'E': { albedo: 0.30, greenhouse: 33 },    // Earth-like (calibrated: 255K -> 288K)
        'O': { albedo: 0.10, greenhouse: 30 },    // Ocean (dark water)
        'I': { albedo: 0.60, greenhouse: 0 },     // Ice (highly reflective)
        'D': { albedo: 0.30, greenhouse: 10 },    // Desert
        'C': { albedo: 0.15, greenhouse: 20 },    // Carbon
        'L': { albedo: 0.10, greenhouse: 0 },     // Silicate (bare)
        'F': { albedo: 0.10, greenhouse: 0 },     // Iron (bare)
        'T': { albedo: 0.40, greenhouse: 150 },   // Toxic (thick atmosphere)
        'N': { albedo: 0.30, greenhouse: 20 },    // Ammonia
        'B': { albedo: 0.30, greenhouse: 10 },    // Methane (Titan-like)
        'J': { albedo: 0.20, greenhouse: 40 },    // Jungle (humid)
        'W': { albedo: 0.40, greenhouse: 0 },     // Dwarf
        'H': { albedo: 0.70, greenhouse: 500 },   // Hell (Venus-like runaway greenhouse)
        'M': { albedo: 0.10, greenhouse: 100 },   // Molten
        'X': { albedo: 0.35, greenhouse: 5 },     // Cold Desert
        '#': { albedo: 0.30, greenhouse: 0 }      // Unknown
    };

    /**
     * Estimates the surface temperature of a planet from stellar flux, correcting
     * for the planet's albedo (reflection) and greenhouse warming.
     * T_eq = 278.3 * ((1 - albedo) * L)^0.25 * a^-0.5, then + greenhouse.
     * @param luminosity Stellar luminosity in solar units
     * @param semiMajorAxis Orbital distance in AU
     * @param planetType Planet type code (selects albedo/greenhouse)
     * @returns Surface temperature in Kelvin
     */
    surfaceTemperature(luminosity: number, semiMajorAxis: number, planetType: string): number {
        const thermal = this.planetThermal[planetType] || this.planetThermal['#'];
        const equilibrium =
            278.3 * Math.pow((1 - thermal.albedo) * luminosity, 0.25) / Math.sqrt(semiMajorAxis);
        return equilibrium + thermal.greenhouse;
    }

    /**
     * Determines the orbital thermal zone of a planet from its distance relative
     * to the star's habitable (Goldilocks) bounds. This single classification
     * drives both planet-type selection and the habitableZone flag.
     * @param semiMajorAxis Orbital distance in AU
     * @param aInner Inner edge of the habitable zone in AU (the caller owns the bounds)
     * @param aOuter Outer edge of the habitable zone in AU
     * @returns Zone number: ZONE_A (inner/hot), ZONE_B (habitable), ZONE_C (outer/cold)
     */
    determineHabitableZone(semiMajorAxis: number, aInner: number, aOuter: number): number {
        if (semiMajorAxis < aInner) return ZONE_A;
        if (semiMajorAxis > aOuter) return ZONE_C;
        return ZONE_B;
    }

    /**
     * Orbital distance for a given orbit number, in AU (Titius-Bode).
     * The first orbit uses the special Mercury term (0.4 AU). The classic law
     * doubles the "excess" each orbit and fits the Solar System superbly out to
     * Uranus, but then overshoots (it predicts ~38.8 AU for the 9th orbit while
     * Neptune sits at ~30 AU). We therefore damp the growth ratio from 2 to 1.5
     * once the excess passes ~19 AU (beyond Uranus), matching the gentler real
     * spacing of the outer planets.
     *
     * The whole ladder is then scaled by sqrt(luminosity): stellar flux goes as
     * L/a^2, so scaling distances by sqrt(L) keeps the flux (and thus the thermal
     * zones and habitable band, which themselves scale as sqrt(L)) at the same
     * orbit index for every star class. Without this a red dwarf's planets would
     * all sit far outside its habitable zone. For the Sun (L=1) the ladder is
     * unchanged.
     *
     * Finally the ladder is pushed out if the star is physically large, so that
     * no orbit falls inside the stellar envelope (bloated giants would otherwise
     * swallow their innermost planets).
     * @param orbit Orbit number (1-based)
     * @param luminosity Stellar luminosity in solar units (default 1)
     * @param stellarRadius Stellar radius in solar radii (default 1)
     * @returns Semi-major axis in AU
     */
    orbitalDistance(orbit: number, luminosity = 1, stellarRadius = 1): number {
        // Flux-equivalent scale, floored so orbit 1 clears the stellar surface.
        const minInnerOrbit = MIN_ORBIT_STELLAR_RADII * stellarRadius * SOLAR_RADIUS_AU;
        const scale = Math.max(Math.sqrt(luminosity), minInnerOrbit / 0.4);
        if (orbit === 1) return 0.4 * scale; // Mercury term
        let excess = 0.3; // orbit 2 -> 0.7 AU (solar reference)
        for (let p = 3; p <= orbit; p++) {
            excess *= excess < 19 ? 2 : 1.5;
        }
        return (0.4 + excess) * scale;
    }

    /**
     * Creates a planet
     * @param zone Orbital thermal zone (ZONE_A/B/C), biases the planet type
     * @param orbit Orbit number
     * @param starId Parent star ID
     * @returns Generated planet
     */
    createPlanet(zone: number, orbit: number, starId: number): Planet {
        // Use weighted random for planet type, biased by the orbital thermal zone
        const planetType = this.selectPlanetTypeWeighted(zone);
        const type = this.planetTypes[planetType] || this.planetTypes['#'];
        let diameter;
        let moonCount;
        let mass;
        let gravity;
        // Usa la formula per le lune dal planetType
        if (planetType === 'A') {
            diameter = 0;
            moonCount = 0;
            mass = 0;
            gravity = 0;
        } else {
            diameter = DiceParser.parse(type.diameterFormula, this.prng) * type.diameterMultiplier;
            moonCount = Math.max(0, DiceParser.parse(type.moonFormula, this.prng));
            // Calcolo massa e gravità
            const radius = (diameter * 1000) / 2; // m
            const volume = (4 / 3) * Math.PI * Math.pow(radius, 3); // m^3
            mass = type.density * volume; // kg
            gravity = (6.67430e-11 * mass) / (radius * radius); // m/s^2
        }

        return {
            starId,
            orbitalNumber: orbit,
            planetType,
            diameter,
            moonCount,
            mass,
            gravity,
            semiMajorAxis: 0, // Default value, will be updated in the system generation
            temperature: 0, // Default value, will be updated in the system generation
            habitableZone: false // Default value, will be updated in the system generation
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
     * Generates the primary star type based on location zone
     * @returns Spectral class string
     */
    generateStarType(): string {
        const roll = this.prng() * 100;

        if (this.zone === 'extragalactic') {
            // Halo Population: Old, low-mass stars
            if (roll < 0.01) return this.generateStarType2(); // Very rare giants
            if (roll < 0.1) return "G";
            if (roll < 5.0) return "K";
            if (roll < 92.0) return "M"; // 87% Red Dwarfs
            if (roll < 98.0) return "DA"; // 6% White Dwarfs
            return "DF";
        } else if (this.zone === 'galactic edge') {
            // Thin/Thick Disk transition
            if (roll < 0.1) return this.generateStarType2();
            if (roll < 0.5) return "F";
            if (roll < 4.0) return "G";
            if (roll < 15.0) return "K";
            if (roll < 90.0) return "M";
            if (roll < 97.0) return "DA";
            return "DF";
        } else if (this.zone === 'central zone') {
            // Population I: More young, massive stars
            if (roll < 2.0) return this.generateStarType2(); // 2% Giants/Exotic
            if (roll < 2.5) return "B";
            if (roll < 4.0) return "A";
            if (roll < 10.0) return "F";
            if (roll < 20.0) return "G";
            if (roll < 35.0) return "K";
            if (roll < 90.0) return "M";
            return "DA";
        } else if (this.zone === 'core') {
            // Galactic Bulge: High density, many old stars and remnants
            if (roll < 15.0) return this.generateStarType2(); // 15% Giants/Exotic
            if (roll < 16.0) return "B";
            if (roll < 18.0) return "A";
            if (roll < 25.0) return "F";
            if (roll < 35.0) return "G";
            if (roll < 50.0) return "K";
            if (roll < 85.0) return "M";
            if (roll < 95.0) return "DA";
            return "BH"; // 5% Black Holes (high density in core)
        } else {
            // Default "medium" zone (Solar Neighborhood / Disk)
            // Based on: M(76%), K(12%), G(7.6%), F(3.0%), A(0.6%), B(0.13%), WD(10%)
            // Adjusted to fit 100%
            if (roll < 1.0) return this.generateStarType2(); // 1% Giants/Exotic
            if (roll < 1.1) return "B"; // 0.1%
            if (roll < 1.7) return "A"; // 0.6%
            if (roll < 4.7) return "F"; // 3.0%
            if (roll < 12.3) return "G"; // 7.6%
            if (roll < 24.3) return "K"; // 12.0%
            if (roll < 92.0) return "M"; // 67.7% (adjusted)
            if (roll < 95.0) return "DA"; // 3% White Dwarfs
            if (roll < 97.0) return "DB";
            if (roll < 98.0) return "DF";
            if (roll < 99.0) return "DG";
            return "DK";
        }
    }

    /**
     * Generates the secondary star type
     * @returns Spectral class string
     */
    generateStarType2(): string {
        const roll = this.prng() * 100;

        if (roll < 1.0) return this.generateStarType3(1);
        if (roll < 5.0) return "gF";
        if (roll < 10.0) return "gG";
        if (roll < 55.0) return "gK";
        if (roll < 95.0) return "gM";
        if (roll < 99.0) return "NS";
        return this.generateStarType3(100);
    }

    /**
     * Generates the tertiary star type
     * @param previous Previous value that called this function (1 or 100)
     * @returns Spectral class string
     */
    generateStarType3(previous: number): string {
        const roll = this.prng() * 100;

        if (previous === 1) {
            if (roll < 10.0) return "cB";
            if (roll < 20.0) return "cA";
            if (roll < 40.0) return "cF";
            if (roll < 60.0) return "cG";
            if (roll < 80.0) return "cK";
            return "cM";
        } else if (previous === 100) {
            if (roll < 5.0) return "BH";
            return "O"; // Still rare as it requires roll 100 in generateStarType2
        }

        return "M";
    }

    /**
     * Generates a stellar sector
     * @param systemCount Number of systems to generate
     * @param sectorVolume Volume of the sector in cubic parsecs
     * @returns Object containing generated systems, stars, and planets
     */
    generateSector(systemCount: number, sectorVolume: number): {
        systems: System[],
        stars: Star[],
        planets: Planet[]
    } {
        const systems: System[] = [];
        const stars: Star[] = [];
        const planets: Planet[] = [];

        // Calculate the side length of the cube from the volume
        const sectorSide = Math.cbrt(sectorVolume);

        for (let i = 1; i <= systemCount; i++) {
            // Create system. The three position draws followed by
            // determineStarCount() must stay the first main-stream draws for the
            // system: the naming below needs starCount, so the values are drawn
            // before the literal is built rather than reordering the stream.
            const systemId = ++this.lastSystemId;
            const xPos = this.prng() * sectorSide;
            const yPos = this.prng() * sectorSide;
            const zPos = this.prng() * sectorSide;

            // Determine number of stars in the system
            const starCount = this.determineStarCount();

            // Naming draws from namePrng only, leaving the main stream untouched.
            const naming = this.namer.nameSystem(systemId, starCount);

            const system: System = {
                systemId,
                name: naming.systemName,
                hasProperName: naming.hasProperName,
                xPos,
                yPos,
                zPos
            };
            systems.push(system);

            for (let s = 1; s <= starCount; s++) {
                // Create star
                const spectralClass = this.generateStarType();
                const starType = this.starTypes[spectralClass] || this.starTypes['M'];

                const star: Star = {
                    starId: ++this.lastStarId,
                    systemId: system.systemId,
                    name: naming.starNames[s - 1],
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

                // Zona abitabile (Goldilocks) — versione ottimistica: bordo interno
                // "recent Venus" (flusso 1.78 S_terra) e bordo esterno "early Mars"
                // (0.32 S_terra), cioè a_inner = sqrt(L/1.78), a_outer = sqrt(L/0.32).
                // Per il Sole ≈ 0.75–1.77 AU, così coprono le orbite 3 e 4
                // (equivalenti a Terra e Marte).
                const L = starType.luminosity ?? 1;
                const a_inner = Math.sqrt(L / 1.78);
                const a_outer = Math.sqrt(L / 0.32);
                const stellarRadius = starType.radius ?? 1;

                // Stellar remnants (L = 0: neutron stars, black holes) radiate
                // nothing, so the flux-based orbital and thermal model does not
                // apply — they simply get no planets.
                if (L > 0 && actualPlanetCount > 0) {
                    for (let p = 1; p <= actualPlanetCount; p++) {
                        // Distanza orbitale (Titius-Bode con termine di Mercurio,
                        // crescita smorzata oltre Urano, scala sqrt(L) e floor sul
                        // raggio stellare; vedi orbitalDistance), più uno scarto
                        // casuale per orbita così i sistemi non sono tutti identici.
                        const jitter = 1 + (this.prng() * 2 - 1) * ORBIT_JITTER;
                        const semiMajorAxis = this.orbitalDistance(p, L, stellarRadius) * jitter; // AU
                        // Zona termica dai limiti Goldilocks: guida sia il tipo sia l'abitabilità
                        const zone = this.determineHabitableZone(semiMajorAxis, a_inner, a_outer);
                        const planet = this.createPlanet(zone, p, star.starId);
                        // Temperatura di superficie [K]: flusso stellare corretto per
                        // albedo ed effetto serra del tipo di pianeta scelto.
                        const temperature = this.surfaceTemperature(L, semiMajorAxis, planet.planetType);
                        planet.semiMajorAxis = semiMajorAxis;
                        planet.temperature = temperature;
                        planet.habitableZone = zone === ZONE_B;
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