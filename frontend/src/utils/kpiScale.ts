// D-27: the KPI strip's progress rails use a log-of-value scale against the
// strip maximum, `width = ln(1 + value) / ln(1 + max(all values in the strip))`.
// A linear share would render the small counts invisible next to the moon total;
// the log scale keeps them readable and matches the design's bar widths.

/** Rail width in [0, 1]. A non-positive value or maximum yields 0, never NaN. */
export function railWidth(value: number, max: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(max)) return 0;
    if (value <= 0 || max <= 0) return 0;
    const denominator = Math.log(1 + max);
    if (denominator <= 0) return 0;
    return Math.min(1, Math.log(1 + value) / denominator);
}
