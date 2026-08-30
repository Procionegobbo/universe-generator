import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlanetImage } from './planetImages';
import { getStarImage } from './starColors';
import { PLANET_TYPE_DESCRIPTIONS, STAR_TYPE_DESCRIPTIONS } from '../types';

// Vite serves `public/` at the site root, so a returned "/images/..." path maps
// one-to-one onto a file under frontend/public.
const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../public');

const publicFileFor = (webPath: string) => resolve(PUBLIC_DIR, `.${webPath}`);
const publicFileExists = (webPath: string) => existsSync(publicFileFor(webPath));

const SIZES = ['thumbs', 'medium'] as const;

describe('planet type renders (T-F2)', () => {
    const codes = Object.keys(PLANET_TYPE_DESCRIPTIONS);

    it('covers the frozen set of 22 planet codes', () => {
        expect(codes.length).toBe(22);
    });

    it.each(codes)('code "%s" resolves to an existing file in both sizes', (code) => {
        for (const size of SIZES) {
            const path = getPlanetImage(code, size);
            expect(path.startsWith(`/images/planets/${size}/`)).toBe(true);
            expect(publicFileExists(path), `${path} is missing`).toBe(true);
        }
    });
});

describe('star class renders (T-F3)', () => {
    const classes = Object.keys(STAR_TYPE_DESCRIPTIONS);

    it('covers the frozen set of 24 spectral classes', () => {
        expect(classes.length).toBe(24);
    });

    it.each(classes)('class "%s" resolves to an existing file in both sizes', (spectralClass) => {
        for (const size of SIZES) {
            const path = getStarImage(spectralClass, size);
            expect(path.startsWith(`/images/stars/${size}/`)).toBe(true);
            expect(publicFileExists(path), `${path} is missing`).toBe(true);
        }
    });

    it.each(['DB', 'DF', 'DG', 'DK'])(
        'white dwarf "%s" is aliased to star-DA.png in both sizes (D-37)',
        (spectralClass) => {
            for (const size of SIZES) {
                expect(getStarImage(spectralClass, size)).toBe(`/images/stars/${size}/star-DA.png`);
            }
        }
    );
});

describe('fallbacks for unrecognised codes (T-F9)', () => {
    it('an unknown planet code falls back to unknown.png', () => {
        expect(PLANET_TYPE_DESCRIPTIONS['ZZ']).toBeUndefined();
        for (const size of SIZES) {
            const path = getPlanetImage('ZZ', size);
            expect(path).toBe(`/images/planets/${size}/unknown.png`);
            expect(publicFileExists(path), `${path} is missing`).toBe(true);
        }
    });

    it('an unknown spectral class falls back to star-default.png', () => {
        expect(STAR_TYPE_DESCRIPTIONS['ZZ']).toBeUndefined();
        for (const size of SIZES) {
            const path = getStarImage('ZZ', size);
            expect(path).toBe(`/images/stars/${size}/star-default.png`);
            expect(publicFileExists(path), `${path} is missing`).toBe(true);
        }
    });
});
