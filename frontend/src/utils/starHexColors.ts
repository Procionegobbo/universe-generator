export const getStarHexColor = (spectralClass: string): number => {
    const colors: Record<string, number> = {
        // Main sequence
        'O': 0x9bb0ff,
        'B': 0xaabfff,
        'A': 0xcad7ff,
        'F': 0xf8f7ff,
        'G': 0xfff4e8,
        'K': 0xffd2a1,
        'M': 0xffcc6f,

        // White dwarfs
        'DA': 0xe8eeff,
        'DB': 0xd0dcff,
        'DF': 0xddc8ff,
        'DG': 0xc8ffdc,
        'DK': 0xfff0b0,

        // Giants
        'gF': 0xfff0a0,
        'gG': 0xffe080,
        'gK': 0xffb060,
        'gM': 0xff7040,

        // Supergiants
        'cB': 0x88aaff,
        'cA': 0xffffff,
        'cF': 0xffee88,
        'cG': 0xffdd66,
        'cK': 0xff9944,
        'cM': 0xff5522,

        // Exotic
        'NS': 0xcc88ff,
        'BH': 0xff2200,
    };
    return colors[spectralClass] ?? 0x888888;
};
