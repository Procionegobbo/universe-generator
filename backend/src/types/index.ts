// Shared type definitions for the stellar generation system

export interface StarType {
    spectralClass: string;
    hasSubclass?: boolean;
    planetCountFormula?: string;
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
}

export interface System {
    systemId: number;
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
    sectorSize: number;
    seed?: string | number;
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