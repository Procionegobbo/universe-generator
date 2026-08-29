// Star display helpers (D-21).

import { STAR_TYPE_DESCRIPTIONS } from '../types';

/**
 * D-21 short labels for the dense surfaces (`M · Red dwarf`). Sentence case,
 * shorter than STAR_TYPE_DESCRIPTIONS, which is left untouched and still drives
 * DocumentationView and the tooltips. A class with no entry here falls through
 * to the long map.
 */
export const STAR_SHORT_LABEL: Record<string, string> = {
    'M': 'Red dwarf',
    'K': 'Orange dwarf',
    'G': 'Yellow dwarf',
    'F': 'Yellow-white',
    'DA': 'White dwarf',
    'A': 'White',
    'BH': 'Black hole',
    'NS': 'Neutron star'
};

/** Short label for a spectral class, falling back to the canonical long map. */
export function starShortLabel(spectralClass: string): string {
    return STAR_SHORT_LABEL[spectralClass]
        || STAR_TYPE_DESCRIPTIONS[spectralClass]
        || spectralClass;
}

// Spectral-class bar fills, transcribed from the handoff ("Spectral-class bar
// colours"): M, K, G, F, DA, A, BH, NS. The handoff gives BH and NS as flat
// colours; they are written as single-colour gradients so every entry can be
// dropped into the same `background` slot.
const CLASS_GRADIENT: Record<string, string> = {
    'M': 'linear-gradient(90deg,#ef4444,#f97316)',
    'K': 'linear-gradient(90deg,#f97316,#fbbf24)',
    'G': 'linear-gradient(90deg,#fbbf24,#fde68a)',
    'F': 'linear-gradient(90deg,#fde68a,#fef9c3)',
    'DA': 'linear-gradient(90deg,#bfdbfe,#e0e7ff)',
    'A': 'linear-gradient(90deg,#e2e8f0,#f8fafc)',
    'BH': 'linear-gradient(90deg,#7f1d1d,#7f1d1d)',
    'NS': 'linear-gradient(90deg,#a855f7,#a855f7)'
};

// The handoff documents eight gradients but the sector can contain any of the
// 24 classes, so classes of the same colour reuse the same gradient string
// rather than introducing colours the design never specified: the other white
// dwarfs follow DA (they already share its artwork), and the giants and
// supergiants follow their main-sequence colour letter.
const GRADIENT_ALIAS: Record<string, string> = {
    'DB': 'DA', 'DF': 'DA', 'DG': 'DA', 'DK': 'DA',
    'gF': 'F', 'gG': 'G', 'gK': 'K', 'gM': 'M',
    'cF': 'F', 'cG': 'G', 'cK': 'K', 'cM': 'M', 'cA': 'A'
};

// Classes the handoff leaves uncoloured (the blue end: O, B, cB) fall back to a
// neutral slate rail rather than an invented colour.
const DEFAULT_GRADIENT = 'linear-gradient(90deg,#475569,#94a3b8)';

/** CSS background for a spectral class's distribution bar. */
export function getStarClassGradient(spectralClass: string): string {
    const key = GRADIENT_ALIAS[spectralClass] || spectralClass;
    return CLASS_GRADIENT[key] || DEFAULT_GRADIENT;
}

/**
 * Ring colour for a star thumbnail. Consolidates the copies previously carried
 * by ResultsDisplay.vue, StarTable.vue and SystemDetailView.vue (identical
 * tables; the two table components' neutral default is kept).
 */
export function getStarRingColor(spectralClass: string): string {
    const colors: Record<string, string> = {
        // Main sequence
        'O': 'ring-blue-500/50',
        'B': 'ring-blue-300/50',
        'A': 'ring-white/50',
        'F': 'ring-yellow-100/50',
        'G': 'ring-yellow-500/50',
        'K': 'ring-orange-500/50',
        'M': 'ring-red-500/50',
        // White dwarfs
        'DB': 'ring-blue-200/50',
        'DA': 'ring-blue-100/50',
        'DF': 'ring-purple-200/50',
        'DG': 'ring-green-200/50',
        'DK': 'ring-yellow-200/50',
        // Giants
        'gF': 'ring-yellow-200/50',
        'gG': 'ring-yellow-400/50',
        'gK': 'ring-orange-400/50',
        'gM': 'ring-red-500/50',
        // Supergiants
        'cB': 'ring-blue-400/50',
        'cA': 'ring-white/50',
        'cF': 'ring-yellow-200/50',
        'cG': 'ring-yellow-500/50',
        'cK': 'ring-orange-500/50',
        'cM': 'ring-red-600/50',
        // Exotics
        'NS': 'ring-purple-500/50',
        'BH': 'ring-gray-950/50'
    };
    return colors[spectralClass] || 'ring-gray-500/50';
}
