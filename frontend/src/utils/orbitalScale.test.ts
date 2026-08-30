import { describe, it, expect } from 'vitest';
import { axisCaption, orbitalDomain, orbitalProjection } from './orbitalScale';
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

describe('orbitalDomain', () => {
    it('is the same domain the projection places its positions in', () => {
        const distances = [0.4, 1.0, 2.5, 8.13];
        const domain = orbitalDomain(distances, G_ZONE.inner, G_ZONE.outer)!;

        // domainMin = max(0.05, min(min(a_i), hzInner) * 0.8)
        expect(domain.min).toBeCloseTo(Math.min(0.4, G_ZONE.inner) * 0.8, 10);
        // domainMax = max(max(a_i), hzOuter) * 1.1
        expect(domain.max).toBeCloseTo(8.13 * 1.1, 10);

        // The domain returned is exactly the one the positions were scaled in:
        // x(a) = 4% + 92% * (ln a - ln domainMin) / (ln domainMax - ln domainMin).
        const { positions } = orbitalProjection(distances, G_ZONE.inner, G_ZONE.outer);
        const logMin = Math.log(domain.min);
        const logSpan = Math.log(domain.max) - logMin;

        distances.forEach((a, index) => {
            expect(positions[index])
                .toBeCloseTo(4 + 92 * ((Math.log(a) - logMin) / logSpan), 10);
        });
    });

    it('floors the domain at 0.05 AU', () => {
        const domain = orbitalDomain([0.01], 0, 0)!;
        expect(domain.min).toBe(0.05);
    });

    it('widens the domain to hold a habitable zone the planets do not reach', () => {
        const domain = orbitalDomain([0.1, 0.2], G_ZONE.inner, G_ZONE.outer)!;

        expect(domain.min).toBeCloseTo(0.1 * 0.8, 10);
        expect(domain.max).toBeCloseTo(G_ZONE.outer * 1.1, 10);
    });

    it('returns null when there is nothing to project', () => {
        expect(orbitalDomain([], G_ZONE.inner, G_ZONE.outer)).toBeNull();
    });
});

describe('axisCaption', () => {
    it('prints a domain edge to two significant digits', () => {
        expect(axisCaption(0.32)).toBe('0.32');
        expect(axisCaption(8.943)).toBe('8.9');
        expect(axisCaption(0.05)).toBe('0.05');
        expect(axisCaption(19.448)).toBe('19');
        expect(axisCaption(1234)).toBe('1200');
    });

    it('never prints NaN or Infinity', () => {
        expect(axisCaption(NaN)).toBe('—');
        expect(axisCaption(Infinity)).toBe('—');
    });
});
