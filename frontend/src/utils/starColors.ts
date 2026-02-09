
export const getStarClassColor = (spectralClass: string): string => {
    const colors: Record<string, string> = {
        // Main sequence
        'O': 'bg-blue-900/40 text-blue-200 border border-blue-700/50',
        'B': 'bg-blue-700/40 text-blue-100 border border-blue-500/50',
        'A': 'bg-white/20 text-white border border-white/30',
        'F': 'bg-yellow-100/20 text-yellow-100 border border-yellow-100/30',
        'G': 'bg-yellow-400/20 text-yellow-200 border border-yellow-400/30',
        'K': 'bg-orange-500/20 text-orange-200 border border-orange-500/30',
        'M': 'bg-red-600/20 text-red-200 border border-red-600/30',

        // White dwarfs
        'DB': 'bg-blue-200/20 text-blue-100 border border-blue-200/30',
        'DA': 'bg-blue-100/20 text-blue-50 border border-blue-100/30',
        'DF': 'bg-purple-200/20 text-purple-100 border border-purple-200/30',
        'DG': 'bg-green-200/20 text-green-100 border border-green-200/30',
        'DK': 'bg-yellow-200/20 text-yellow-100 border border-yellow-200/30',

        // Giants
        'gF': 'bg-yellow-200/30 text-yellow-100 border border-yellow-200/40',
        'gG': 'bg-yellow-400/30 text-yellow-200 border border-yellow-400/40',
        'gK': 'bg-orange-500/30 text-orange-200 border border-orange-500/40',
        'gM': 'bg-red-600/30 text-red-200 border border-red-600/40',

        // Supergiants
        'cB': 'bg-blue-500/40 text-blue-100 border border-blue-400/50',
        'cA': 'bg-white/40 text-white border border-white/50',
        'cF': 'bg-yellow-200/40 text-yellow-100 border border-yellow-200/50',
        'cG': 'bg-yellow-400/40 text-yellow-200 border border-yellow-400/50',
        'cK': 'bg-orange-500/40 text-orange-200 border border-orange-500/50',
        'cM': 'bg-red-600/40 text-red-200 border border-red-600/50',

        // Exotics
        'NS': 'bg-purple-900/60 text-purple-200 border border-purple-500/50',
        'BH': 'bg-gray-950 text-red-500 border border-red-900/50 shadow-inner'
    };
    return colors[spectralClass] || 'bg-gray-800 text-gray-400 border border-gray-700';
};

export const getStarBarColor = (spectralClass: string): string => {
    const colors: Record<string, string> = {
        'O': 'bg-blue-600',
        'B': 'bg-blue-500',
        'A': 'bg-slate-200',
        'F': 'bg-yellow-100',
        'G': 'bg-yellow-400',
        'K': 'bg-orange-500',
        'M': 'bg-red-600',

        'DB': 'bg-blue-300',
        'DA': 'bg-blue-200',
        'DF': 'bg-purple-300',
        'DG': 'bg-green-300',
        'DK': 'bg-yellow-300',

        'gF': 'bg-yellow-200',
        'gG': 'bg-yellow-500',
        'gK': 'bg-orange-600',
        'gM': 'bg-red-700',

        'cB': 'bg-blue-400',
        'cA': 'bg-white',
        'cF': 'bg-yellow-300',
        'cG': 'bg-yellow-600',
        'cK': 'bg-orange-700',
        'cM': 'bg-red-800',

        'NS': 'bg-purple-600',
        'BH': 'bg-red-900'
    };
    // Default gradient if not matched, though we usually just use a solid color for stats
    return colors[spectralClass] || 'bg-gray-600';
};
