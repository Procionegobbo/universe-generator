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

// Long planet type descriptions
export const PLANET_TYPE_LONG_DESCRIPTIONS: Record<string, string> = {
    'A': 'A vast region of space filled with countless rocky bodies, ranging from tiny pebbles to large asteroids. Asteroid belts often form between planets and are remnants of planetary formation, rich in metals and minerals but inhospitable to life.',
    'G': 'A massive planet composed primarily of hydrogen and helium, with no solid surface. Gas giants have thick, swirling atmospheres, powerful storms, and many moons. Their colorful cloud bands and immense size dominate their planetary systems.',
    'Q': 'A gas giant orbiting very close to its star, resulting in extremely high temperatures. Hot gas giants often have bloated atmospheres, intense winds, and may appear bright due to their proximity to stellar radiation.',
    'U': 'An ice giant, similar to Uranus or Neptune, with a thick atmosphere of hydrogen, helium, and ices such as water, ammonia, and methane. These planets are cold, blue-tinted, and often have faint rings and many moons.',
    'S': 'A rocky planet larger than Earth but smaller than Neptune. Super-Earths can have diverse environments, from barren rocky worlds to those with thick atmospheres and oceans. Their higher gravity can affect surface conditions and atmospheric retention.',
    'R': 'A terrestrial planet with a solid, rocky surface. Rocky planets may have mountains, valleys, craters, and little or no atmosphere. They are common in the galaxy and can vary greatly in temperature and composition.',
    'E': 'A planet with conditions similar to Earth: a breathable atmosphere, liquid water, and a temperate climate. Earth-like planets are prime candidates for life and often feature continents, oceans, and clouds.',
    'O': 'A world almost entirely covered by deep oceans, with little or no landmass. Ocean planets may have perpetual storms, high humidity, and unique forms of aquatic life, if any.',
    'I': 'A frozen planet with a surface dominated by ice and snow. Ice planets are extremely cold, with possible subsurface oceans beneath thick ice crusts. Their atmospheres are thin or absent.',
    'D': 'A dry, arid planet with vast deserts, rocky plateaus, and little water. Desert planets may have extreme temperature variations and frequent dust storms, with life limited to hardy extremophiles.',
    'C': 'A rare type of planet with a surface rich in carbon compounds, such as graphite and diamond. Carbon planets are dark, dense, and may have exotic mineral formations.',
    'L': 'A planet with a surface dominated by silicate rocks and minerals. Silicate planets are similar to rocky planets but may have unique geological features and mineral compositions.',
    'F': 'A dense planet with a core and crust rich in iron and other metals. Iron planets are heavy, with strong magnetic fields and little to no atmosphere.',
    'T': 'A hostile world with a thick, toxic atmosphere composed of poisonous gases. Toxic planets are uninhabitable, with corrosive clouds and extreme surface conditions.',
    'N': 'A cold planet with an atmosphere rich in ammonia. Ammonia planets may have ammonia clouds, seas, or ice, and are extremely hostile to Earth-like life.',
    'B': 'A planet with a methane-rich atmosphere, often appearing blue or turquoise. Methane planets may have lakes or seas of liquid methane and are extremely cold.',
    'J': 'A lush, verdant planet covered in dense jungles and forests. Jungle planets have high humidity, abundant rainfall, and a rich diversity of plant life.',
    'W': 'A small planetary body, often icy or rocky, that does not dominate its orbital zone. Dwarf planets are found in the outer reaches of systems and may have thin atmospheres or none at all.',
    'H': 'An extremely hot and hostile planet with a scorched surface, frequent volcanic activity, and a thick, toxic atmosphere. Hell planets are inhospitable to all known forms of life.',
    'M': 'A young planet with a surface covered in molten rock and active volcanism. Molten planets glow with heat and are in the early stages of planetary evolution.',
    'X': 'A barren, rocky planet with a cold, desert-like environment. Cold desert planets have thin atmospheres, low temperatures, and little to no surface water.',
    '#': 'A mysterious or unknown type of planet, with properties that do not fit any known classification. These worlds may be rare, exotic, or poorly understood.'
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