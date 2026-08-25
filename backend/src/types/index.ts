// Shared type definitions for the stellar generation system

export type SectorZone = 'extragalactic' | 'galactic edge' | 'medium' | 'central zone' | 'core';

export interface StarType {
    spectralClass: string;
    hasSubclass?: boolean;
    planetCountFormula?: string;
    luminosity?: number; // in solar units (L_sun = 1)
    radius?: number; // in solar radii (R_sun = 1)
    [key: string]: any;
}

export interface PlanetType {
    shortType: string;
    diameterFormula: string;
    diameterMultiplier: number;
    [key: string]: any;
}

export interface Star {
    starId: number;
    systemId: number;
    name: string;
    spectralClass: string;
    subclass?: number;
}

export interface Planet {
    starId: number;
    orbitalNumber: number;
    planetType: string;
    diameter: number;
    moonCount: number;
    mass: number; // kg
    gravity: number; // m/s^2
    semiMajorAxis: number; // AU
    temperature: number; // surface temperature in Kelvin (albedo + greenhouse)
    habitableZone: boolean;
    lifeProbability: number; // model P in [0, 1], 4 decimals; 0 when ineligible
    lifeComplexity: number; // model C_index = P * C(t_bio) in [0, 6], 3 decimals
    hasLife: boolean; // realised presence of life
    name?: string; // proper name, present only when hasLife is true
}

export interface System {
    systemId: number;
    name: string; // proper name ("Necklace") or catalogue designation ("UG-0006")
    hasProperName: boolean; // true when `name` came from the IAU proper-name pool
    age: number; // system age in Gyr, rounded to 2 decimals
    xPos: number;
    yPos: number;
    zPos: number;
}

export interface Sector {
    systems: System[];
    stars: Star[];
    planets: Planet[];
}

export interface GenerationRequest {
    systemCount: number;
    sectorVolume: number;
    seed?: string | number;
    zone?: SectorZone;
}

export interface GenerationResponse {
    success: boolean;
    data?: Sector;
    error?: string;
    stats?: {
        systemCount: number;
        starCount: number;
        planetCount: number;
        generationTimeMs: number;
    };
}