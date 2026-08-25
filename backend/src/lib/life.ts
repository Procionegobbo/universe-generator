// Habitability probability, life-complexity index and per-planet life assignment.
//
// Implements the model in docs/exoplanet-habitability-model.md. Pure module:
// the PRNG and the proper-name pool are injected, so nothing here touches the
// filesystem or the generator's main random stream.

import { SectorZone } from '../types';

// --- Model constants --------------------------------------------------------

/** Centre of the temperature Gaussian (Earth's mean surface temperature). */
export const EARTH_REFERENCE_TEMPERATURE_K = 288;
/** Tolerance band of the temperature Gaussian. */
export const TEMPERATURE_SIGMA_K = 30;
/** Divisor converting a planet diameter in km to Earth radii. */
export const EARTH_DIAMETER_KM = 12742;
/** `t_0` — minimum time for prebiotic chemistry to start. */
export const LIFE_START_DELAY_GYR = 0.5;
/**
 * Probability that life ever gets started on a world the model rates as
 * habitable. The model scores whether a planet *could* host life; this is the
 * odds that it actually did. Only the realisation draw is scaled by it, so
 * `lifeProbability` and `lifeComplexity` keep their model meaning and life is
 * made rarer without being made simpler.
 */
export const ABIOGENESIS_FACTOR = 0.1;
/** `k` in the age sigmoid. */
export const AGE_SIGMOID_K = 2;
/** Coefficient in `L = 10 x M^-2.5`. */
export const MAIN_SEQUENCE_LIFETIME_COEFF_GYR = 10;
/** Exponent in `L = 10 x M^-2.5`. */
export const MAIN_SEQUENCE_LIFETIME_EXPONENT = -2.5;
/** `k_c` in the complexity logistic. */
export const COMPLEXITY_K = 1.3;
/** Midpoint of the complexity logistic. */
export const COMPLEXITY_MIDPOINT_GYR = 3.2;
/** Ceiling of the complexity curve (intelligent life). */
export const MAX_COMPLEXITY = 6;
/** Rounding of `lifeProbability`. */
export const PROBABILITY_DECIMALS = 4;
/** Rounding of `lifeComplexity`. */
export const COMPLEXITY_DECIMALS = 3;
/** Rounding of `System.age`. */
export const AGE_DECIMALS = 2;

/** Star type factor `S`. Any class absent from this table scores DEFAULT_STAR_FACTOR. */
export const STAR_FACTOR: Readonly<Record<string, number | undefined>> = {
    G: 1.0,
    K: 0.9,
    F: 0.7,
    M: 0.5
};

/** `S` for every class outside STAR_FACTOR (O, B, A, D*, g*, c*, NS, BH). */
export const DEFAULT_STAR_FACTOR = 0.1;

/**
 * Main-sequence mass in solar masses, used only by `ageFactor`. A class absent
 * from this table is off the main sequence and yields `A_age = 0`.
 */
export const STELLAR_MASS_SOLAR: Readonly<Record<string, number | undefined>> = {
    O: 25,
    B: 10,
    A: 2.0,
    F: 1.3,
    G: 1.0,
    K: 0.8,
    M: 0.3
};

/** Atmosphere factor `A`, one entry per planet type code. */
export const ATMOSPHERE_FACTOR: Readonly<Record<string, number | undefined>> = {
    // Stable, compatible.
    E: 1.0,  // Earth-like
    O: 1.0,  // Ocean
    J: 1.0,  // Jungle
    // Absent / unstable.
    A: 0.3,  // Asteroid
    G: 0.3,  // Gas Giant
    Q: 0.3,  // Hot Gas Giant
    U: 0.3,  // Ice Giant
    I: 0.3,  // Ice
    L: 0.3,  // Silicate
    F: 0.3,  // Iron
    W: 0.3,  // Dwarf
    // Unknown (neutral default).
    S: 0.6,  // Super-Earth
    R: 0.6,  // Rocky
    D: 0.6,  // Desert
    C: 0.6,  // Carbon
    T: 0.6,  // Toxic
    N: 0.6,  // Ammonia
    B: 0.6,  // Methane
    M: 0.6,  // Molten
    H: 0.6,  // Hell
    X: 0.6,  // Cold Desert
    '#': 0.6 // Unknown
};

/** `A` for a planet type code absent from ATMOSPHERE_FACTOR. */
export const DEFAULT_ATMOSPHERE_FACTOR = 0.6;

/** Type overrides checked before the radius bands. */
export const ASTEROID_BELT_TYPE = 'A';
export const GIANT_PLANET_TYPES: readonly string[] = ['G', 'Q', 'U'];
export const GIANT_RADIUS_FACTOR = 0.05;

/** System age range in Gyr per sector zone; an unknown zone falls back to `medium`. */
export const SYSTEM_AGE_RANGE_GYR: Readonly<Record<SectorZone, readonly [number, number]>> = {
    // Halo - old, low-mass stars.
    extragalactic: [8.0, 13.5],
    // Thick disk.
    'galactic edge': [5.0, 12.0],
    // Solar neighbourhood / thin disk.
    medium: [0.5, 10.0],
    // Population I - young, massive stars.
    'central zone': [0.5, 6.0],
    // Galactic bulge - old stars and remnants.
    core: [6.0, 13.0]
};

// --- Interfaces -------------------------------------------------------------

export interface LifeInput {
    spectralClass: string;
    systemAgeGyr: number;
    planetType: string;
    diameterKm: number;
    temperatureK: number;
    habitableZone: boolean;
    starName: string;
    orbitalNumber: number;
}

export interface LifeOutcome {
    lifeProbability: number;
    lifeComplexity: number;
    hasLife: boolean;
    name?: string;
}

// --- Helpers ----------------------------------------------------------------

function round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

// --- Pure factors -----------------------------------------------------------

/** `S` — star type factor. */
export function starFactor(spectralClass: string): number {
    return STAR_FACTOR[spectralClass] ?? DEFAULT_STAR_FACTOR;
}

/** `T` — Gaussian centred on Earth's mean surface temperature. */
export function temperatureFactor(temperatureK: number): number {
    const delta = temperatureK - EARTH_REFERENCE_TEMPERATURE_K;
    return Math.exp(-(delta * delta) / (2 * TEMPERATURE_SIGMA_K * TEMPERATURE_SIGMA_K));
}

/** `R` — radius factor. Type overrides are checked first, then the bands in order. */
export function radiusFactor(planetType: string, diameterKm: number): number {
    // A belt is not a body: hard exclusion.
    if (planetType === ASTEROID_BELT_TYPE) {
        return 0;
    }
    if (GIANT_PLANET_TYPES.includes(planetType)) {
        return GIANT_RADIUS_FACTOR;
    }

    const radiusEarths = diameterKm / EARTH_DIAMETER_KM;
    if (radiusEarths < 0.3) {
        return 0.1;
    }
    if (radiusEarths < 0.5) {
        return 0.5;
    }
    if (radiusEarths <= 1.5) {
        return 1.0;
    }
    if (radiusEarths <= 2.0) {
        return 0.7;
    }
    return 0.4;
}

/** `A` — atmosphere factor; an unknown type code takes the neutral default. */
export function atmosphereFactor(planetType: string): number {
    return ATMOSPHERE_FACTOR[planetType] ?? DEFAULT_ATMOSPHERE_FACTOR;
}

/** `L = 10 x M^-2.5` — estimated main-sequence lifetime in Gyr. */
export function mainSequenceLifetimeGyr(massSolar: number): number {
    return MAIN_SEQUENCE_LIFETIME_COEFF_GYR * Math.pow(massSolar, MAIN_SEQUENCE_LIFETIME_EXPONENT);
}

/** `A_age` — sigmoid in system age, gated by the step function `H(L - t)`. */
export function ageFactor(spectralClass: string, systemAgeGyr: number): number {
    const massSolar = STELLAR_MASS_SOLAR[spectralClass];
    // A star observed off the main sequence has by definition exceeded its
    // usable lifetime, whatever the sector-level age draw says.
    if (massSolar === undefined) {
        return 0;
    }
    if (systemAgeGyr > mainSequenceLifetimeGyr(massSolar)) {
        return 0;
    }
    return 1 / (1 + Math.exp(-AGE_SIGMOID_K * (systemAgeGyr - LIFE_START_DELAY_GYR)));
}

/** `P = S x T x R x A x A_age`, rounded to PROBABILITY_DECIMALS. 0 outside the habitable zone. */
export function habitabilityProbability(
    input: Omit<LifeInput, 'starName' | 'orbitalNumber'>
): number {
    if (!input.habitableZone) {
        return 0;
    }

    const probability =
        starFactor(input.spectralClass) *
        temperatureFactor(input.temperatureK) *
        radiusFactor(input.planetType, input.diameterKm) *
        atmosphereFactor(input.planetType) *
        ageFactor(input.spectralClass, input.systemAgeGyr);

    return round(probability, PROBABILITY_DECIMALS);
}

/** `C(t_bio)` — logistic curve fitted to Earth's evolutionary milestones. */
export function complexityCurve(tBioGyr: number): number {
    return MAX_COMPLEXITY / (1 + Math.exp(-COMPLEXITY_K * (tBioGyr - COMPLEXITY_MIDPOINT_GYR)));
}

/** `C_index = P x C(t_bio)`, rounded to COMPLEXITY_DECIMALS. */
export function lifeComplexityIndex(probability: number, tBioGyr: number): number {
    return round(probability * complexityCurve(Math.max(0, tBioGyr)), COMPLEXITY_DECIMALS);
}

const ROMAN_NUMERALS: readonly (readonly [number, string])[] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
];

/** 1 -> "I", 4 -> "IV", 18 -> "XVIII". Supports 1-39 (orbit numbers max out far below). */
export function romanNumeral(value: number): string {
    let remaining = Math.floor(value);
    let roman = '';
    for (const [amount, numeral] of ROMAN_NUMERALS) {
        while (remaining >= amount) {
            roman += numeral;
            remaining -= amount;
        }
    }
    return roman;
}

// --- Assigner ---------------------------------------------------------------

export class LifeAssigner {
    private readonly names: string[];
    private cursor = 0;

    constructor(private readonly prng: () => number, namePool: readonly string[]) {
        this.names = [...namePool];        // per-instance mutable copy
    }

    private hasNext(): boolean {
        return this.cursor < this.names.length;
    }

    /** Partial Fisher-Yates: one PRNG draw, no repeats. Same algorithm as SectorNamer. */
    private take(): string {
        const i = this.cursor + Math.floor(this.prng() * (this.names.length - this.cursor));
        const picked = this.names[i];
        this.names[i] = this.names[this.cursor];
        this.names[this.cursor] = picked;
        this.cursor++;
        return picked;
    }

    /** One PRNG draw. Uniform in the zone's range, rounded to AGE_DECIMALS. */
    drawSystemAge(zone: SectorZone): number {
        const range: readonly [number, number] | undefined = SYSTEM_AGE_RANGE_GYR[zone];
        const [minGyr, maxGyr] = range ?? SYSTEM_AGE_RANGE_GYR.medium;
        return round(minGyr + this.prng() * (maxGyr - minGyr), AGE_DECIMALS);
    }

    /** One PRNG draw, plus one more only when a pool name is taken. */
    assignLife(input: LifeInput): LifeOutcome {
        const lifeProbability = habitabilityProbability(input);
        const tBioGyr = input.systemAgeGyr - LIFE_START_DELAY_GYR;
        const lifeComplexity = lifeComplexityIndex(lifeProbability, tBioGyr);

        // Always draw, then decide: keeps the stream independent of eligibility
        // and of pool state.
        const roll = this.prng();
        const hasLife = lifeProbability > 0 && roll < lifeProbability * ABIOGENESIS_FACTOR;
        if (!hasLife) {
            return { lifeProbability, lifeComplexity, hasLife: false };
        }

        const name = this.hasNext()
            ? this.take()
            : `${input.starName} ${romanNumeral(input.orbitalNumber)}`;
        return { lifeProbability, lifeComplexity, hasLife: true, name };
    }
}
