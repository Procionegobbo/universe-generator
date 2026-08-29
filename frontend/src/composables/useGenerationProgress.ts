import { computed, onUnmounted, watch } from 'vue';
import { useSectorStore } from '../stores/sectorStore';
import type { GenerationStage } from '../stores/sectorStore';

export type StageStatus = 'done' | 'current' | 'pending';

export interface ProgressStage {
    id: GenerationStage;
    label: string;
    status: StageStatus;
    /** Known up-front only for the first stage; never back-filled for the others (D-19). */
    count: number | null;
}

const STAGE_IDS: GenerationStage[] = ['coordinates', 'stars', 'planets', 'moons', 'habitability'];

const STAGE_LABELS: Record<GenerationStage, string> = {
    coordinates: 'system coordinates',
    stars: 'stellar classes',
    planets: 'planetary bodies',
    moons: 'moons',
    habitability: 'habitability & life'
};

const STAGE_INTERVAL_MS = 250;
const ELAPSED_INTERVAL_MS = 100;
/** The bar never claims more than 95% until the response actually lands (D-19). */
const MAX_ANIMATED_PROGRESS = 0.95;

/**
 * Drives the generation progress panel. The API exposes no progress channel, so the stages
 * are animated on a timer and the elapsed counter is measured from the request — no counts
 * are ever fabricated (D-19).
 */
export const useGenerationProgress = () => {
    const store = useSectorStore();

    let stageInterval: ReturnType<typeof setInterval> | undefined;
    let elapsedInterval: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
        if (stageInterval) {
            clearInterval(stageInterval);
            stageInterval = undefined;
        }
        if (elapsedInterval) {
            clearInterval(elapsedInterval);
            elapsedInterval = undefined;
        }
    };

    const start = () => {
        stop();
        const startedAt = Date.now();
        let index = 0;

        store.generationStage = STAGE_IDS[index];
        store.generationProgress = Math.min(MAX_ANIMATED_PROGRESS, 1 / STAGE_IDS.length);
        store.generationElapsedMs = 0;

        stageInterval = setInterval(() => {
            if (index >= STAGE_IDS.length - 1) return;
            index++;
            store.generationStage = STAGE_IDS[index];
            store.generationProgress = Math.min(MAX_ANIMATED_PROGRESS, (index + 1) / STAGE_IDS.length);
        }, STAGE_INTERVAL_MS);

        elapsedInterval = setInterval(() => {
            store.generationElapsedMs = Date.now() - startedAt;
        }, ELAPSED_INTERVAL_MS);
    };

    watch(
        () => store.generationStatus,
        (status) => {
            if (status === 'running') {
                start();
                return;
            }
            stop();
        },
        { immediate: true }
    );

    onUnmounted(stop);

    const stages = computed<ProgressStage[]>(() => {
        const currentIndex = STAGE_IDS.indexOf(store.generationStage);
        return STAGE_IDS.map((id, i) => ({
            id,
            label: STAGE_LABELS[id],
            status: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending',
            // Only the requested system count is a known value.
            count: i === 0 ? store.systemCount : null
        }));
    });

    const progress = computed(() => store.generationProgress);
    const elapsedMs = computed(() => store.generationElapsedMs);

    return { stages, progress, elapsedMs };
};
