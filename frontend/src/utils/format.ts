// Pure display formatters for the mission-console UI (spec 7.1 / D-34).
// Numbers a user might compare are rendered in mono with a thin-space thousands
// separator; coordinates use a true minus sign.

const THIN_SPACE = ' ';
const MINUS_SIGN = '−';

/**
 * Groups the integer part with a thin space: 142880 -> "142 880".
 * Any fractional part is kept as-is.
 */
export const thinThousands = (value: number): string => {
    if (!Number.isFinite(value)) return '—';

    const negative = value < 0;
    const [integer, fraction] = Math.abs(value).toString().split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
    const body = fraction ? `${grouped}.${fraction}` : grouped;

    return negative ? `${MINUS_SIGN}${body}` : body;
};

/** Replaces every ASCII hyphen-minus with the typographic minus sign U+2212. */
export const trueMinus = (text: string): string => text.replace(/-/g, MINUS_SIGN);

/** Coordinates: always 3 decimals, true minus sign. */
export const formatCoord = (value: number): string => {
    if (!Number.isFinite(value)) return '—';
    return trueMinus(value.toFixed(3));
};

/** Orbital distances in AU: 3 decimals below 10 AU, 2 above, true minus sign. */
export const formatAu = (value: number): string => {
    if (!Number.isFinite(value)) return '—';
    const decimals = Math.abs(value) < 10 ? 3 : 2;
    return trueMinus(value.toFixed(decimals));
};

/** Share of a total, one decimal. A zero or invalid denominator yields "0.0%", never NaN. */
export const formatPercent = (part: number, total: number): string => {
    if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return '0.0%';
    return `${((part / total) * 100).toFixed(1)}%`;
};
