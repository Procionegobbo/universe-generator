import { describe, it, expect } from 'vitest';
import { toSlider, fromSlider, SYSTEMS_RANGE, VOLUME_RANGE } from './logScale';

describe('fromSlider bounds (T-F13)', () => {
    it('returns the ends of the systems range', () => {
        expect(fromSlider(0, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max, SYSTEMS_RANGE.step)).toBe(1);
        expect(fromSlider(1, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max, SYSTEMS_RANGE.step)).toBe(5000);
    });

    it('returns the ends of the volume range', () => {
        expect(fromSlider(0, VOLUME_RANGE.min, VOLUME_RANGE.max, VOLUME_RANGE.step)).toBe(10);
        expect(fromSlider(1, VOLUME_RANGE.min, VOLUME_RANGE.max, VOLUME_RANGE.step)).toBe(100000);
    });
});

describe('toSlider / fromSlider round-trip (T-F14)', () => {
    // fromSlider rounds to whole units, so the round-trip error is bounded by
    // half a step spread over the log span — largest at the bottom of the
    // systems range, where a single unit is a big relative jump.
    const TOLERANCE = 0.01;

    it.each([0, 0.25, 0.5, 0.75, 1])('recovers t = %p on the systems range', t => {
        const { min, max, step } = SYSTEMS_RANGE;
        expect(Math.abs(toSlider(fromSlider(t, min, max, step), min, max) - t))
            .toBeLessThanOrEqual(TOLERANCE);
    });

    it.each([0, 0.25, 0.5, 0.75, 1])('recovers t = %p on the volume range', t => {
        const { min, max, step } = VOLUME_RANGE;
        expect(Math.abs(toSlider(fromSlider(t, min, max, step), min, max) - t))
            .toBeLessThanOrEqual(TOLERANCE);
    });
});

describe('the volume scale snaps (T-F15)', () => {
    it('always returns a multiple of 10, never below 10', () => {
        const { min, max, step } = VOLUME_RANGE;
        for (let t = 0; t <= 1.0000001; t += 0.001) {
            const value = fromSlider(t, min, max, step);
            expect(value % 10).toBe(0);
            expect(value).toBeGreaterThanOrEqual(10);
            expect(value).toBeLessThanOrEqual(max);
        }
    });
});

describe('fromSlider is monotonic (T-F16)', () => {
    it.each([
        ['systems', SYSTEMS_RANGE],
        ['volume', VOLUME_RANGE]
    ])('never decreases as t increases across the %s range', (_label, range) => {
        let previous = -Infinity;
        for (let t = 0; t <= 1.0000001; t += 0.001) {
            const value = fromSlider(t, range.min, range.max, range.step);
            expect(value).toBeGreaterThanOrEqual(previous);
            previous = value;
        }
    });
});
