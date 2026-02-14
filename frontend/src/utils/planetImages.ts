// Utility to get the image path for a planet type
export const getPlanetImage = (code: string, size?: 'thumbs' | 'medium'): string => {
    const imageMap: Record<string, string> = {
        'A': 'asteroid.png',
        'G': 'gasgiant.png',
        'Q': 'hotgasgiant.png',
        'U': 'icegiant.png',
        'S': 'super_earth.png',
        'R': 'rocky.png',
        'E': 'earthlike.png',
        'O': 'ocean.png',
        'I': 'ice.png',
        'D': 'desert.png',
        'C': 'carbon.png',
        'L': 'silicate.png',
        'F': 'iron.png',
        'T': 'toxic.png',
        'N': 'ammonia.png',
        'B': 'methane.png',
        'J': 'jungle.png',
        'W': 'dwarf.png',
        'H': 'hell.png',
        'M': 'molten.png',
        'X': 'cold_desert.png',
        '#': 'unknown.png'
    };
    const imageName = imageMap[code];
    const base = size ? `/images/planets/${size}` : '/images/planets';
    if (imageName) {
        return `${base}/${imageName}`;
    }
    return `${base}/unknown.png`;
};
