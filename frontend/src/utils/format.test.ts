import { describe, it, expect } from 'vitest';
import { thinThousands, trueMinus, formatCoord, formatAu, formatPercent } from './format';

const THIN_SPACE = ' ';
const MINUS_SIGN = '−';
const HYPHEN_MINUS = '-';

describe('thinThousands (T-F17)', () => {
    it('groups thousands with a thin space', () => {
        expect(thinThousands(1204)).toBe(`1${THIN_SPACE}204`);
        expect(thinThousands(142880)).toBe(`142${THIN_SPACE}880`);
    });

    it('leaves values below 1000 ungrouped', () => {
        expect(thinThousands(812)).toBe('812');
        expect(thinThousands(0)).toBe('0');
    });

    it('never uses a regular space or a comma as the separator', () => {
        const grouped = thinThousands(142880);
        expect(grouped).toContain(THIN_SPACE);
        expect(grouped).not.toContain(' ');
        expect(grouped).not.toContain(',');
    });

    it('groups every three-digit block of a larger number', () => {
        expect(thinThousands(1234567)).toBe(`1${THIN_SPACE}234${THIN_SPACE}567`);
    });
});

describe('formatCoord (T-F18)', () => {
    it('renders a true minus sign, not a hyphen-minus', () => {
        const formatted = formatCoord(-4.118);
        expect(formatted).toBe(`${MINUS_SIGN}4.118`);
        expect(formatted).toContain(MINUS_SIGN);
        expect(formatted).not.toContain(HYPHEN_MINUS);
    });

    it('always renders 3 decimals', () => {
        expect(formatCoord(12.4)).toBe('12.400');
        expect(formatCoord(33)).toBe('33.000');
        expect(formatCoord(-0.00049)).toBe(`${MINUS_SIGN}0.000`);
    });
});

describe('trueMinus', () => {
    it('replaces the ASCII hyphen-minus with U+2212', () => {
        expect(trueMinus('-4.118')).toBe(`${MINUS_SIGN}4.118`);
        expect(trueMinus('4.118')).toBe('4.118');
    });
});

describe('formatAu', () => {
    it('uses a true minus and keeps close orbits precise', () => {
        expect(formatAu(0.387)).toBe('0.387');
        expect(formatAu(30.07)).toBe('30.07');
        expect(formatAu(-1.5)).toBe(`${MINUS_SIGN}1.500`);
    });
});

describe('formatPercent (T-F19)', () => {
    it('renders a one-decimal share', () => {
        expect(formatPercent(27, 812)).toBe('3.3%');
        expect(formatPercent(0, 812)).toBe('0.0%');
    });

    it('never produces NaN', () => {
        expect(formatPercent(27, 0)).toBe('0.0%');
        expect(formatPercent(0, 0)).toBe('0.0%');
        expect(formatPercent(0, 0)).not.toContain('NaN');
        expect(formatPercent(Number.NaN, 10)).toBe('0.0%');
    });
});
