// Logarithmic projection of a system's orbits onto the orbital map's width.
//
//   domainMin = max(0.05, min(min(a_i), hzInner) * 0.8)
//   domainMax = max(max(a_i), hzOuter) * 1.1
//   x(a)      = 4% + 92% * (ln a - ln domainMin) / (ln domainMax - ln domainMin)
//
// Positions are percentages of the map width, always inside [4, 96].

const LEFT_MARGIN = 4;
const SPAN = 92;
const MIN_DOMAIN = 0.05;

export interface OrbitalProjection {
    positions: number[];
    hzRules: { inner: number; outer: number } | null;
}

/** The AU range the map spans, and what its two axis captions print. */
export interface OrbitalDomain {
    min: number;
    max: number;
}

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

/**
 * The projection's domain, exposed separately so the map's axis captions read
 * the same two numbers the positions were computed from rather than recomputing
 * the formula. `null` when there is nothing to project.
 */
export function orbitalDomain(
    distances: number[],
    hzInner: number,
    hzOuter: number
): OrbitalDomain | null {
    if (distances.length === 0) return null;

    const hasZone = hzInner > 0 && hzOuter > 0;
    const smallest = Math.min(...distances);
    const largest = Math.max(...distances);

    return {
        min: Math.max(MIN_DOMAIN, Math.min(smallest, hasZone ? hzInner : smallest) * 0.8),
        max: Math.max(largest, hasZone ? hzOuter : largest) * 1.1
    };
}

/** An axis caption: the domain edge to two significant digits. */
export function axisCaption(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return String(Number(value.toPrecision(2)));
}

export function orbitalProjection(
    distances: number[],
    hzInner: number,
    hzOuter: number
): OrbitalProjection {
    const domain = orbitalDomain(distances, hzInner, hzOuter);
    if (!domain) return { positions: [], hzRules: null };

    const hasZone = hzInner > 0 && hzOuter > 0;
    const { min: domainMin, max: domainMax } = domain;

    const logMin = Math.log(domainMin);
    const logSpan = Math.log(domainMax) - logMin;

    // A degenerate domain (a single planet sitting exactly on the domain edge,
    // or a non-positive distance) has no scale to speak of: everything sits in
    // the middle of the map rather than dividing by zero.
    const project = (a: number): number => {
        if (!(a > 0) || !(logSpan > 0)) return LEFT_MARGIN + SPAN / 2;
        return clamp(LEFT_MARGIN + SPAN * ((Math.log(a) - logMin) / logSpan), LEFT_MARGIN, LEFT_MARGIN + SPAN);
    };

    return {
        positions: distances.map(project),
        hzRules: hasZone ? { inner: project(hzInner), outer: project(hzOuter) } : null
    };
}
