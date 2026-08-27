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
    mass: number;
    gravity: number;
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

// Long planet type descriptions. These are the physical cores: what the world is
// made of and what its weather does. Every claim about the presence or absence of
// a biosphere lives in BIOSPHERE_CLAUSES instead, so the two can never contradict
// each other. See utils/planetDescription.ts for how the two are composed.
export const PLANET_TYPE_LONG_DESCRIPTIONS: Record<string, string> = {
    'A': 'A vast region of space filled with countless rocky bodies, ranging from tiny pebbles to large asteroids. Asteroid belts often form between planets and are remnants of planetary formation, rich in metals and minerals.',
    'G': 'A massive planet composed primarily of hydrogen and helium, with no solid surface. Gas giants have thick, swirling atmospheres, powerful storms, and many moons. Their colorful cloud bands and immense size dominate their planetary systems.',
    'Q': 'A gas giant orbiting very close to its star, resulting in extremely high temperatures. Hot gas giants often have bloated atmospheres, intense winds, and may appear bright due to their proximity to stellar radiation.',
    'U': 'An ice giant, similar to Uranus or Neptune, with a thick atmosphere of hydrogen, helium, and ices such as water, ammonia, and methane. These planets are cold, blue-tinted, and often have faint rings and many moons.',
    'S': 'A rocky planet larger than Earth but smaller than Neptune. Super-Earths can have diverse environments, from barren rocky worlds to those with thick atmospheres and oceans. Their higher gravity can affect surface conditions and atmospheric retention.',
    'R': 'A terrestrial planet with a solid, rocky surface. Rocky planets may have mountains, valleys, craters, and little or no atmosphere. They are common in the galaxy and can vary greatly in temperature and composition.',
    'E': "A planet with conditions similar to Earth: a breathable atmosphere, liquid water, and a temperate climate. Earth-like planets sit squarely inside their star's habitable band and feature continents, oceans, weather systems and clouds.",
    'O': 'A world almost entirely covered by deep oceans, with little or no landmass. Ocean planets may have perpetual storms, high humidity, and tides that sweep unbroken around the globe.',
    'I': 'A frozen planet with a surface dominated by ice and snow. Ice planets are extremely cold, with possible subsurface oceans beneath thick ice crusts. Their atmospheres are thin or absent.',
    'D': 'A dry, arid planet with vast deserts, rocky plateaus, and little water. Desert planets may have extreme temperature variations and frequent dust storms.',
    'C': 'A rare type of planet with a surface rich in carbon compounds, such as graphite and diamond. Carbon planets are dark, dense, and may have exotic mineral formations.',
    'L': 'A planet with a surface dominated by silicate rocks and minerals. Silicate planets are similar to rocky planets but may have unique geological features and mineral compositions.',
    'F': 'A dense planet with a core and crust rich in iron and other metals. Iron planets are heavy, with strong magnetic fields and little to no atmosphere.',
    'T': 'A hostile world wrapped in a thick, toxic atmosphere of poisonous gases, with corrosive clouds and crushing surface pressures.',
    'N': "A cold planet with an atmosphere rich in ammonia. Ammonia planets may have ammonia clouds, seas, or ice, and a surface chemistry utterly unlike Earth's.",
    'B': 'A planet with a methane-rich atmosphere, often appearing blue or turquoise. Methane planets may have lakes or seas of liquid methane and are extremely cold.',
    'J': 'A warm, cloud-wrapped world under permanent overcast and near-continuous rainfall. High humidity, standing water across most of the surface and a dense, heat-trapping atmosphere make it one of the wettest surfaces a rocky planet can have.',
    'W': 'A small planetary body, often icy or rocky, that does not dominate its orbital zone. Dwarf planets are found in the outer reaches of systems and may have thin atmospheres or none at all.',
    'H': 'An extremely hot and hostile planet with a scorched surface, frequent volcanic activity, and a thick, toxic atmosphere that traps heat in a runaway greenhouse.',
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

// Evolutionary milestones from docs/exoplanet-habitability-model.md, Part 2.
export const LIFE_STAGE_LABELS: Record<number, string> = {
    1: 'Microbial life',
    2: 'Oxygenic photosynthesis',
    3: 'Eukaryotic life',
    4: 'Multicellular life',
    5: 'Complex animals',
    6: 'Intelligent life'
};

/**
 * Display life state of one planet: 0 = no life, 1-6 = the milestone stage from
 * LIFE_STAGE_LABELS. Derived, never transmitted by the API.
 */
export type LifeState = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Where a biosphere would physically have to live on a planet of this type. */
export type HabitatGroup = 'belt' | 'giant' | 'temperate' | 'rocky' | 'frozen' | 'infernal';

// Habitat group per planet type code. The groups are cut by where a biosphere
// would physically have to live: no body at all, no solid surface, standing
// surface water, sparse surface water, under the ice, or in refuges from heat.
export const PLANET_HABITAT_GROUP: Record<string, HabitatGroup> = {
    'A': 'belt',                                            // no body, no surface
    'G': 'giant', 'Q': 'giant', 'U': 'giant',               // no solid surface
    'E': 'temperate', 'O': 'temperate', 'J': 'temperate',   // standing surface water
    'R': 'rocky', 'S': 'rocky', 'L': 'rocky', 'F': 'rocky',
    'W': 'rocky', 'C': 'rocky', 'D': 'rocky', 'X': 'rocky',
    '#': 'rocky',                                           // sparse or no surface water
    'I': 'frozen', 'N': 'frozen', 'B': 'frozen',            // habitat is under the ice
    'H': 'infernal', 'M': 'infernal', 'T': 'infernal'       // habitat is a refuge from the surface
};

/** Group for a code absent from the table. Matches '#' (Unknown). */
export const DEFAULT_HABITAT_GROUP: HabitatGroup = 'rocky';

// The biology half of a planet's long description, keyed by habitat group then
// life state. Appended after the physical core from PLANET_TYPE_LONG_DESCRIPTIONS.
// The belt states 1-6 are unreachable while the model gives asteroid belts a zero
// life probability; they are authored so the table stays rectangular and a future
// model change cannot produce a blank caption.
export const BIOSPHERE_CLAUSES: Record<HabitatGroup, Record<LifeState, string>> = {
    'belt': {
        0: 'Nothing here holds an atmosphere or a stable surface, and the survey records no biosphere.',
        1: 'Survey probes report microbial colonies sheltering inside the larger bodies, feeding on ice and mineral chemistry.',
        2: 'Photosynthetic films coat the sunward faces of the larger bodies, releasing faint traces of free oxygen.',
        3: 'Complex single-celled organisms occupy meltwater pockets deep inside the larger bodies.',
        4: 'Multicellular growths spread through the fractured interiors of the larger bodies, visible in every core sample.',
        5: 'Animal life has taken hold inside the largest bodies, moving through cavities kept liquid by tidal heating.',
        6: 'Coherent artificial signals originate from somewhere in the rubble — something out here is looking back.'
    },
    'giant': {
        0: 'The cloud decks are chemically active but sterile; nothing lives in them.',
        1: 'Microbial cells drift through the temperate cloud layers, riding convection currents between the warm and cold bands.',
        2: 'Photosynthetic microbes tint the upper cloud bands and leave a persistent oxygen signature in the atmosphere.',
        3: 'Complex single-celled organisms populate the temperate cloud layer, grazing on the airborne microbial haze.',
        4: 'Multicellular colonies drift in the cloud decks, held aloft in gas-filled envelopes.',
        5: 'Large aerial animals migrate between the cloud bands — an entire ecosystem that never touches a solid surface.',
        6: 'An intelligent civilisation lives among the cloud decks, and its signals carry clearly across the system.'
    },
    'temperate': {
        0: 'Despite conditions that could support a biosphere, nothing ever took hold here: the surface is chemically rich and completely sterile.',
        1: 'The surface is covered in a thick layer of bacteria and archaea — mats, films and slicks wherever there is standing water.',
        2: 'Photosynthetic mats have spread across the shallows and are slowly filling the atmosphere with free oxygen, tinting the water green.',
        3: 'Complex single-celled organisms fill the water column, an entire microscopic food web beneath a still-empty landscape.',
        4: 'Multicellular growth is visible from orbit: weed beds, mats and reefs colouring the shallows and the wet margins of the land.',
        5: 'A full ecosystem of animals and large plants covers the world, from canopy to seabed.',
        6: 'An intelligent species has emerged here: settlements, cleared land and artificial light are visible on the night side.'
    },
    'rocky': {
        0: 'The surface is barren and chemically inert, with no trace of a biosphere.',
        1: 'Microbial colonies survive in the few damp niches the surface offers — crevices, subsurface brine, and the shade of rock overhangs.',
        2: 'Photosynthetic crusts have spread over the damper ground, releasing the first traces of free oxygen into a thin atmosphere.',
        3: 'Complex single-celled organisms have colonised the subsurface water table, well out of reach of the surface conditions.',
        4: 'Multicellular growth clings to the wetter lowlands: low mats and cushions that darken visibly between dry seasons.',
        5: 'Animal life has spread across the habitable belts, hardy ecosystems clustered around whatever water the surface retains.',
        6: "An intelligent species has taken hold, and its settlements cluster along the world's few reliable water sources."
    },
    'frozen': {
        0: 'The ice is old, still and sterile from crust to core.',
        1: 'Microbial colonies persist in brine pockets within the ice and along the floor of the ocean beneath it.',
        2: 'Photosynthetic microbes crowd the thin, translucent ice near the surface, where enough light still reaches them.',
        3: 'Complex single-celled organisms drift through the subsurface ocean, sustained by chemistry venting from the sea floor.',
        4: 'Multicellular colonies anchor to the underside of the ice sheet and around the warm vents below.',
        5: 'Animal life fills the subsurface ocean — an ecosystem sealed under kilometres of ice and entirely independent of starlight.',
        6: 'An intelligent species lives beneath the ice, and its activity registers as heat and structure under the frozen crust.'
    },
    'infernal': {
        0: 'Nothing survives the heat, the pressure or the chemistry: the world is sterile.',
        1: 'Heat- and acid-tolerant microbes cling on where conditions ease — deep in the crust, or high in the cooler haze layers.',
        2: 'Photosynthetic extremophiles colour the upper haze, working the narrow altitude where light and survivable temperature briefly overlap.',
        3: 'Complex single-celled organisms occupy the deep crustal aquifers, insulated from the surface by kilometres of rock.',
        4: 'Multicellular colonies have formed in the crustal refuges, the first structures here larger than a single cell.',
        5: 'Animal life persists in isolated refuges, an ecosystem confined to the few places the world does not try to kill.',
        6: 'Against every expectation an intelligent species arose here, sheltered from a surface that would destroy it in seconds.'
    }
};

/**
 * Per-planet label overrides, keyed by planet type then life state. Only types
 * whose catalogue name asserts a biological state need an entry; every other
 * type falls through to PLANET_TYPE_DESCRIPTIONS at every state.
 */
export const PLANET_TYPE_LIFE_LABELS: Record<string, Partial<Record<LifeState, string>>> = {
    // "Jungle" claims vegetation. Below multicellular life (stage 4) there is
    // nothing macroscopic to form one, so the world is named for its weather.
    'J': { 0: 'Rain World', 1: 'Rain World', 2: 'Rain World', 3: 'Rain World' }
};
