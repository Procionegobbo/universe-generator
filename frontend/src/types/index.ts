// Shared type definitions matching backend

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

// Planet type descriptions
export const PLANET_TYPE_DESCRIPTIONS: Record<string, string> = {
    'A': 'Asteroid Belt',
    'G': 'Gas Giant',
    'R': 'Rocky Planet',
    'C': 'Carbon Planet',
    'D': 'Desert Planet',
    'H': 'Hell Planet',
    'M': 'Molten Planet',
    'E': 'Earth-like Planet',
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