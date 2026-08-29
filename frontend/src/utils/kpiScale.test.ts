import { describe, it, expect } from 'vitest';
import { railWidth } from './kpiScale';

describe('KPI progress rails use a log-of-value scale (D-27)', () => {
    it('reproduces the design widths for the sample strip', () => {
        const values = [140, 239, 812, 1204, 27];
        const max = Math.max(...values);
        const percentages = values.map(value => Math.round(railWidth(value, max) * 100));
        expect(percentages).toEqual([70, 77, 94, 100, 47]);
    });

    it('fills the rail of the strip maximum', () => {
        expect(railWidth(1204, 1204)).toBe(1);
    });

    it('never exceeds the rail or returns NaN for degenerate input', () => {
        expect(railWidth(0, 0)).toBe(0);
        expect(railWidth(140, 0)).toBe(0);
        expect(railWidth(0, 140)).toBe(0);
        expect(railWidth(-5, 140)).toBe(0);
        expect(railWidth(Number.NaN, 140)).toBe(0);
        expect(railWidth(500, 140)).toBe(1);
    });
});
