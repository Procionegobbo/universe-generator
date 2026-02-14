// Shared type definitions matching backend

export type SectorZone = 'extragalactic' | 'galactic edge' | 'medium' | 'central zone' | 'core';

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

// Planet type descriptions
export const PLANET_TYPE_DESCRIPTIONS: Record<string, string> = {
    'A': 'Asteroid Belt',
    'G': 'Gas Giant',
    'Q': 'Hot Gas Giant',
    'U': 'Uranian/Ice Giant',
    'S': 'Super-Earth',
    'R': 'Rocky Planet',
    'E': 'Earth-like Planet',
    'O': 'Ocean Planet',
    'I': 'Ice Planet',
    'D': 'Desert Planet',
    'C': 'Carbon Planet',
    'L': 'Silicate Planet',
    'F': 'Iron Planet',
    'T': 'Toxic Planet',
    'N': 'Ammonia Planet',
    'B': 'Methane Planet',
    'J': 'Jungle Planet',
    'W': 'Dwarf Planet',
    'H': 'Hell Planet',
    'M': 'Molten Planet',
    'X': 'Cold Desert Planet',
    '#': 'Unknown Planet Type'
};

// Star type descriptions
export const STAR_TYPE_DESCRIPTIONS: Record<string, string> = {
    'O': 'Blue Supergiant',
    'B': 'Blue Giant',
    'A': 'White Star',
    'F': 'Yellow-White Star',
    'G': 'Yellow Dwarf (like our Sun)',
    'K': 'Orange Dwarf',
    'M': 'Red Dwarf',
    'DB': 'White Dwarf (Helium)',
    'DA': 'White Dwarf (Hydrogen)',
    'DF': 'White Dwarf (Fluorine)',
    'DG': 'White Dwarf (Carbon/Oxygen)',
    'DK': 'White Dwarf (Potassium)',
    'gF': 'Yellow-White Giant',
    'gG': 'Yellow Giant',
    'gK': 'Orange Giant',
    'gM': 'Red Giant',
    'NS': 'Neutron Star',
    'cB': 'Blue Supergiant',
    'cA': 'White Supergiant',
    'cF': 'Yellow-White Supergiant',
    'cG': 'Yellow Supergiant',
    'cK': 'Orange Supergiant',
    'cM': 'Red Supergiant',
    'BH': 'Black Hole'
};