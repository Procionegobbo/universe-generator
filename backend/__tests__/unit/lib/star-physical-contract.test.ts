// Contract test (T-B1) for the generator's stellar physics table.
//
// The luminosity and radius columns below are mirrored in
// frontend/src/utils/starPhysical.ts — change both together.
//
// The frontend redraws habitable zones and orbit bands from its own copy of
// these numbers (sqrt(L/1.78) .. sqrt(L/0.32)). If the generator's table is
// edited on its own, the drawn zones stop agreeing with the `habitableZone`
// flags in the payload, so this test pins the backend half of the pair and
// frontend/src/utils/starPhysical.test.ts (T-F1) pins the other.

import { StellarGenerator } from '../../../src/lib/example_star_generator';

// [spectralClass, luminosity (L_sun), radius (R_sun)]
const EXPECTED: Array<[string, number, number]> = [
    ['O', 50000, 10],
    ['B', 20000, 5],
    ['A', 80, 1.8],
    ['F', 6, 1.3],
    ['G', 1, 1],
    ['K', 0.4, 0.8],
    ['M', 0.04, 0.3],
    ['DA', 0.001, 0.013],
    ['DB', 0.001, 0.013],
    ['DF', 0.001, 0.013],
    ['DG', 0.001, 0.013],
    ['DK', 0.001, 0.013],
    ['gF', 45, 5],
    ['gG', 65, 10],
    ['gK', 150, 20],
    ['gM', 380, 50],
    ['cB', 90000, 25],
    ['cA', 21000, 60],
    ['cF', 21000, 100],
    ['cG', 21000, 180],
    ['cK', 22000, 280],
    ['cM', 66000, 700],
    ['NS', 0, 0.00002],
    ['BH', 0, 0]
];

interface StarTypeRow {
    luminosity?: number;
    radius?: number;
}

// starTypes is private on the class; the contract it encodes is public, so the
// test reads it through a structural cast rather than widening the class API.
const starTypesOf = (generator: StellarGenerator): Record<string, StarTypeRow> =>
    (generator as unknown as { starTypes: Record<string, StarTypeRow> }).starTypes;

describe('StellarGenerator starTypes physical contract (T-B1)', () => {
    test.each(EXPECTED)('%s has luminosity %p and radius %p', (spectralClass, luminosity, radius) => {
        const starTypes = starTypesOf(new StellarGenerator());
        const row = starTypes[spectralClass];

        expect(row).toBeDefined();
        expect(row.luminosity).toBe(luminosity);
        expect(row.radius).toBe(radius);
    });

    test('contains exactly the 24 documented spectral classes and no others', () => {
        const starTypes = starTypesOf(new StellarGenerator());
        const expectedClasses = EXPECTED.map(([cls]) => cls).sort();

        expect(Object.keys(starTypes).sort()).toEqual(expectedClasses);
        expect(expectedClasses).toHaveLength(24);
    });

    test('the M-class row is the documented unknown-class fallback', () => {
        // example_star_generator.ts:537 — `this.starTypes[spectralClass] || this.starTypes['M']`
        const starTypes = starTypesOf(new StellarGenerator());

        expect(starTypes['M'].luminosity).toBe(0.04);
        expect(starTypes['M'].radius).toBe(0.3);
    });
});
