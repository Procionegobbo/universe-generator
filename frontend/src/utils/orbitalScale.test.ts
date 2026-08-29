import { describe, it, expect } from 'vitest';
import { orbitalProjection } from './orbitalScale';
import { habitableZoneBounds } from './starPhysical';

const G_ZONE = habitableZoneBounds('G'); // ~0.7495 .. 1.7678 AU

describe('orbitalProjection', () => {
    it('produces strictly increasing, in-range positions (T-F28)', () => {
        const distances = [0.39, 0.72, 1.0, 1.52, 5.2, 9.5, 19.2, 30.1];
        const { positions } = orbitalProjection(distances, G_ZONE.inner, G_ZONE.outer);

        expect(positions).toHaveLength(distances.length);
        for (let i = 0; i < positions.length; i++) {
            expect(Number.isFinite(positions[i])).toBe(true);
            expect(positions[i]).toBeGreaterThanOrEqual(4);
            expect(positions[i]).toBeLessThanOrEqual(96);
            if (i > 0) expect(positions[i]).toBeGreaterThan(positions[i - 1]);
        }
    });

    it('places the HZ rules inside the planet span for a straddling system (T-F29)', () => {
        const distances = [0.4, 0.9, 1.4, 2.6, 6.0];
        const { positions, hzRules } = orbitalProjection(distances, G_ZONE.inner, G_ZONE.outer);

        expect(hzRules).not.toBeNull();
        const innermost = positions[0];
        const outermost = positions[positions.length - 1];

        expect(hzRules!.inner).toBeGreaterThan(innermost);
        expect(hzRules!.inner).toBeLessThan(hzRules!.outer);
        expect(hzRules!.outer).toBeLessThan(outermost);
    });

    it('handles a single-planet system without dividing by zero (T-F30)', () => {
        const { positions, hzRules } = orbitalProjection([1.0], G_ZONE.inner, G_ZONE.outer);

        expect(positions).toHaveLength(1);
        expect(Number.isFinite(positions[0])).toBe(true);
        expect(positions[0]).toBeGreaterThanOrEqual(4);
        expect(positions[0]).toBeLessThanOrEqual(96);
        expect(Number.isFinite(hzRules!.inner)).toBe(true);
        expect(Number.isFinite(hzRules!.outer)).toBe(true);
    });

    it('stays finite for a single very close planet', () => {
        const { positions } = orbitalProjection([0.01], G_ZONE.inner, G_ZONE.outer);

        expect(Number.isFinite(positions[0])).toBe(true);
        expect(positions[0]).toBeGreaterThanOrEqual(4);
        expect(positions[0]).toBeLessThanOrEqual(96);
    });

    it('returns nothing for an empty planet list (T-F31)', () => {
        expect(orbitalProjection([], G_ZONE.inner, G_ZONE.outer))
            .toEqual({ positions: [], hzRules: null });
    });

    it('draws no HZ rules for a star with no habitable zone', () => {
        const { positions, hzRules } = orbitalProjection([1.0, 2.0], 0, 0);

        expect(hzRules).toBeNull();
        for (const position of positions) {
            expect(Number.isFinite(position)).toBe(true);
        }
    });
});
