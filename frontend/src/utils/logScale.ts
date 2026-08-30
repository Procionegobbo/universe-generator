// Logarithmic slider mapping (D-18). Both parameter sliders are logarithmic:
// `value(t) = round(exp(ln min + t * (ln max - ln min)))` with `t` in [0, 1]
// coming from an <input type="range" min="0" max="1000" step="1">.
//
// The store's and the backend's wider bounds (volume up to 10 000 000) are
// unchanged — this scale simply does not reach them.

export interface SliderRange {
    min: number;
    max: number;
    step: number;
}

/** Systems slider: 1 … 5 000, integer steps. */
export const SYSTEMS_RANGE: SliderRange = { min: 1, max: 5000, step: 1 };

/** Volume slider: 10 … 100 000 pc³, snapped to 10 as today's control does. */
export const VOLUME_RANGE: SliderRange = { min: 10, max: 100000, step: 10 };

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

/** Slider position in [0, 1] for a value, the inverse of `fromSlider`. */
export function toSlider(value: number, min: number, max: number): number {
    const span = Math.log(max) - Math.log(min);
    if (span <= 0) return 0;
    return clamp((Math.log(value) - Math.log(min)) / span, 0, 1);
}

/**
 * Value for a slider position in [0, 1], rounded to `step` and never leaving
 * [min, max]. Monotonic in `t`.
 */
export function fromSlider(t: number, min: number, max: number, step = 1): number {
    const position = clamp(t, 0, 1);
    const raw = Math.exp(Math.log(min) + position * (Math.log(max) - Math.log(min)));
    const snapped = step > 1 ? Math.round(raw / step) * step : Math.round(raw);
    return clamp(snapped, min, max);
}
