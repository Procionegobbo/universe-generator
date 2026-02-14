// Utility to get the image path for a planet type
export const getPlanetImage = (code: string, size?: 'thumbs' | 'medium'): string => {
    const imageMap: Record<string, string> = {
        'A': 'asteroid.png',
        'G': 'gasgiant.png',
        'R': 'rocky.png',
        'C': 'carbon.png',
        'D': 'desert.png',
        'H': 'hell.png',
        'M': 'molten.png',
        'E': 'earthlike.png',
        '#': 'unknown.png'
    };
    const imageName = imageMap[code];
    const base = size ? `/images/planets/${size}` : '/images/planets';
    if (imageName) {
        return `${base}/${imageName}`;
    }
    return `${base}/unknown.png`;
};
