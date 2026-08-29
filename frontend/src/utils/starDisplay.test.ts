import { describe, it, expect } from 'vitest';
import {
    STAR_SHORT_LABEL,
    starShortLabel,
    getStarClassGradient,
    getStarRingColor
} from './starDisplay';
import { STAR_TYPE_DESCRIPTIONS } from '../types';

describe('STAR_SHORT_LABEL (D-21)', () => {
    it('holds the design copy for the dense surfaces', () => {
        expect(STAR_SHORT_LABEL).toEqual({
            'M': 'Red dwarf',
            'K': 'Orange dwarf',
            'G': 'Yellow dwarf',
            'F': 'Yellow-white',
            'DA': 'White dwarf',
            'A': 'White',
            'BH': 'Black hole',
            'NS': 'Neutron star'
        });
    });

    it('falls through to the untouched long map for every other class', () => {
        expect(starShortLabel('G')).toBe('Yellow dwarf');
        expect(starShortLabel('gM')).toBe(STAR_TYPE_DESCRIPTIONS['gM']);
        expect(starShortLabel('cB')).toBe(STAR_TYPE_DESCRIPTIONS['cB']);
    });
});

describe('getStarClassGradient', () => {
    it("transcribes the handoff's spectral-class bar colours", () => {
        expect(getStarClassGradient('M')).toBe('linear-gradient(90deg,#ef4444,#f97316)');
        expect(getStarClassGradient('K')).toBe('linear-gradient(90deg,#f97316,#fbbf24)');
        expect(getStarClassGradient('G')).toBe('linear-gradient(90deg,#fbbf24,#fde68a)');
        expect(getStarClassGradient('F')).toBe('linear-gradient(90deg,#fde68a,#fef9c3)');
        expect(getStarClassGradient('DA')).toBe('linear-gradient(90deg,#bfdbfe,#e0e7ff)');
        expect(getStarClassGradient('A')).toBe('linear-gradient(90deg,#e2e8f0,#f8fafc)');
    });

    it('reuses a documented gradient for same-colour classes', () => {
        expect(getStarClassGradient('DK')).toBe(getStarClassGradient('DA'));
        expect(getStarClassGradient('gM')).toBe(getStarClassGradient('M'));
        expect(getStarClassGradient('cK')).toBe(getStarClassGradient('K'));
        expect(getStarClassGradient('cA')).toBe(getStarClassGradient('A'));
    });

    it('returns a non-empty CSS background for every one of the 24 classes', () => {
        for (const cls of Object.keys(STAR_TYPE_DESCRIPTIONS)) {
            expect(getStarClassGradient(cls)).toMatch(/^linear-gradient\(/);
        }
    });

    it('falls back to a neutral rail for an unknown class', () => {
        expect(getStarClassGradient('not-a-class')).toBe('linear-gradient(90deg,#475569,#94a3b8)');
    });
});

describe('getStarRingColor', () => {
    it('returns a ring class for every one of the 24 classes', () => {
        for (const cls of Object.keys(STAR_TYPE_DESCRIPTIONS)) {
            expect(getStarRingColor(cls)).toMatch(/^ring-/);
        }
    });

    it('keeps the values the replaced components used', () => {
        expect(getStarRingColor('G')).toBe('ring-yellow-500/50');
        expect(getStarRingColor('BH')).toBe('ring-gray-950/50');
        expect(getStarRingColor('not-a-class')).toBe('ring-gray-500/50');
    });
});
