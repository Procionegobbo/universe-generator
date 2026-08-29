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

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

export function orbitalProjection(
    distances: number[],
    hzInner: number,
    hzOuter: number
): OrbitalProjection {
    if (distances.length === 0) return { positions: [], hzRules: null };

    const hasZone = hzInner > 0 && hzOuter > 0;
    const smallest = Math.min(...distances);
    const largest = Math.max(...distances);

    const domainMin = Math.max(MIN_DOMAIN, Math.min(smallest, hasZone ? hzInner : smallest) * 0.8);
    const domainMax = Math.max(largest, hasZone ? hzOuter : largest) * 1.1;

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
