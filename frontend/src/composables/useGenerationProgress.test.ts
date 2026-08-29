import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createRenderer, defineComponent, nextTick, type App } from 'vue';
import { useSectorStore } from '../stores/sectorStore';
import { useGenerationProgress } from './useGenerationProgress';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn() }
}));

// localStorage stub for the Node test environment, matching sectorStore.test.ts.
if (typeof globalThis.localStorage === 'undefined') {
    let bag: Record<string, string> = {};
    globalThis.localStorage = {
        getItem: (key: string) => (key in bag ? bag[key] : null),
        setItem: (key: string, value: string) => { bag[key] = value; },
        removeItem: (key: string) => { delete bag[key]; },
        clear: () => { bag = {}; },
        key: (i: number) => Object.keys(bag)[i] || null,
        get length() { return Object.keys(bag).length; }
    };
}

// The composable registers onUnmounted, so its cleanup can only be exercised
// from a real component instance. There is no DOM in this suite (and no
// @vue/test-utils), so the instance is driven by a custom renderer over inert
// nodes — Vue's own lifecycle runs, nothing is painted.
const nodeOps = {
    insert: () => {},
    remove: () => {},
    createElement: (tag: string) => ({ tag }),
    createText: (text: string) => ({ text }),
    createComment: (text: string) => ({ text }),
    setText: () => {},
    setElementText: () => {},
    parentNode: () => null,
    nextSibling: () => null,
    querySelector: () => null,
    setScopeId: () => {},
    patchProp: () => {}
};

const { createApp } = createRenderer(nodeOps as never);

type Progress = ReturnType<typeof useGenerationProgress>;

function mountProgress(): { progress: Progress; app: App } {
    let progress!: Progress;
    const Harness = defineComponent({
        setup() {
            progress = useGenerationProgress();
            return () => null;
        }
    });
    const app = createApp(Harness);
    app.use(createPinia());
    app.mount({} as never);
    return { progress, app };
}

const labels = (progress: Progress) => progress.stages.value.map(stage => stage.label);
const statuses = (progress: Progress) => progress.stages.value.map(stage => stage.status);

describe('useGenerationProgress stage sequencing (D-19)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('names the five stages in order', () => {
        const { progress, app } = mountProgress();
        expect(labels(progress)).toEqual([
            'system coordinates',
            'stellar classes',
            'planetary bodies',
            'moons',
            'habitability & life'
        ]);
        app.unmount();
    });

    it('advances one stage every 250 ms and stops on the last one', async () => {
        const { progress, app } = mountProgress();
        const store = useSectorStore();

        store.generationStatus = 'running';
        await nextTick();

        expect(statuses(progress)).toEqual(['current', 'pending', 'pending', 'pending', 'pending']);
        expect(progress.progress.value).toBeCloseTo(0.2, 6);

        vi.advanceTimersByTime(250);
        expect(statuses(progress)).toEqual(['done', 'current', 'pending', 'pending', 'pending']);
        expect(progress.progress.value).toBeCloseTo(0.4, 6);

        vi.advanceTimersByTime(500);
        expect(statuses(progress)).toEqual(['done', 'done', 'done', 'current', 'pending']);
        expect(progress.progress.value).toBeCloseTo(0.8, 6);

        // The fifth stage is the last: the bar caps at 95% and never wraps
        // round, however long the request takes.
        vi.advanceTimersByTime(250);
        expect(statuses(progress)).toEqual(['done', 'done', 'done', 'done', 'current']);
        expect(progress.progress.value).toBeCloseTo(0.95, 6);

        vi.advanceTimersByTime(5000);
        expect(statuses(progress)).toEqual(['done', 'done', 'done', 'done', 'current']);
        expect(progress.progress.value).toBeCloseTo(0.95, 6);

        app.unmount();
    });

    it('reports the requested system count for stage one only, never a fabricated one', async () => {
        const { progress, app } = mountProgress();
        const store = useSectorStore();
        store.systemCount = 312;

        store.generationStatus = 'running';
        await nextTick();
        vi.advanceTimersByTime(1000);

        expect(progress.stages.value.map(stage => stage.count)).toEqual([312, null, null, null, null]);
        app.unmount();
    });

    it('ticks the elapsed counter every 100 ms', async () => {
        const { progress, app } = mountProgress();
        const store = useSectorStore();

        store.generationStatus = 'running';
        await nextTick();
        expect(progress.elapsedMs.value).toBe(0);

        vi.advanceTimersByTime(100);
        expect(progress.elapsedMs.value).toBe(100);

        vi.advanceTimersByTime(164);
        expect(progress.elapsedMs.value).toBe(200);

        app.unmount();
    });
});

describe('useGenerationProgress timer cleanup', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('clears both intervals when the generation leaves the running state', async () => {
        const { progress, app } = mountProgress();
        const store = useSectorStore();

        store.generationStatus = 'running';
        await nextTick();
        expect(vi.getTimerCount()).toBe(2);

        store.generationStatus = 'done';
        await nextTick();
        expect(vi.getTimerCount()).toBe(0);

        // Nothing moves once the timers are gone.
        const stageBefore = store.generationStage;
        const elapsedBefore = progress.elapsedMs.value;
        vi.advanceTimersByTime(2000);
        expect(store.generationStage).toBe(stageBefore);
        expect(progress.elapsedMs.value).toBe(elapsedBefore);

        app.unmount();
    });

    it('clears both intervals when the component unmounts mid-generation', async () => {
        const { app } = mountProgress();
        const store = useSectorStore();

        store.generationStatus = 'running';
        await nextTick();
        expect(vi.getTimerCount()).toBe(2);

        app.unmount();
        expect(vi.getTimerCount()).toBe(0);

        // A leaked interval would keep writing to the store after unmount.
        const stageAfterUnmount = store.generationStage;
        vi.advanceTimersByTime(2000);
        expect(store.generationStage).toBe(stageAfterUnmount);
    });

    it('restarts cleanly when a second generation follows the first', async () => {
        const { progress, app } = mountProgress();
        const store = useSectorStore();

        store.generationStatus = 'running';
        await nextTick();
        vi.advanceTimersByTime(750);
        expect(statuses(progress)).toEqual(['done', 'done', 'done', 'current', 'pending']);

        store.generationStatus = 'done';
        await nextTick();
        store.generationStatus = 'running';
        await nextTick();

        expect(vi.getTimerCount()).toBe(2);
        expect(statuses(progress)).toEqual(['current', 'pending', 'pending', 'pending', 'pending']);
        expect(progress.elapsedMs.value).toBe(0);

        app.unmount();
    });
});
