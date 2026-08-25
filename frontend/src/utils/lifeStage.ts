// Display-only rule for turning the model's raw life complexity into a 1-6 stage.
// The presence of life implies at least milestone level 1 (prokaryotes), so a
// realised biosphere is never shown as "level 0". Call this only for planets
// with hasLife === true; the API's raw lifeComplexity is never itself clamped.
export function lifeStageLevel(complexity: number): number {
    return Math.min(6, Math.max(1, Math.round(complexity)));
}
