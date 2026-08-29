// Interaction coverage for the click paths story 004 shipped with manual-only
// verification (T-F50 - T-F54).
//
// These run under jsdom with `@vue/test-utils`, so a component is really
// mounted and a real click is dispatched. The SSR-markup tests in
// `railAndStates.test.ts` stay as they are — they cover copy and structure,
// which is a different question from "does the button do anything".

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick, toRaw } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import axios from 'axios';
import { useSectorStore } from '../stores/sectorStore';
import { SYSTEMS_RANGE, fromSlider } from '../utils/logScale';
import type { Sector } from '../types';
import HomeView from '../views/HomeView.vue';
import SectorControls from './SectorControls.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

const STORAGE_KEY = 'universe-generator-sector-params';

const post = vi.mocked(axios.post);
const isCancel = vi.mocked(axios.isCancel);

const sector = (systemId: number): Sector => ({
    systems: [{
        systemId, name: `UG-${systemId}`, hasProperName: false, age: 4.5,
        xPos: 1, yPos: 2, zPos: 3
    }],
    stars: [{ starId: systemId, systemId, name: 'A', spectralClass: 'G', subclass: 2 }],
    planets: [{
        starId: systemId, orbitalNumber: 1, planetType: 'E', diameter: 12000,
        mass: 1, gravity: 1, moonCount: 1, semiMajorAxis: 1, temperature: 288,
        habitableZone: true, lifeProbability: 0.3, lifeComplexity: 2, hasLife: true
    }]
} as unknown as Sector);

/**
 * jsdom's own `matchMedia` never matches, so the rail tier would always resolve
 * to the mobile sheet. This stub answers the `(min-width: Npx)` queries that
 * `useRailTier` asks against a chosen viewport width.
 */
function setViewport(width: number) {
    window.matchMedia = ((query: string) => {
        const min = /\(min-width:\s*(\d+)px\)/.exec(query);
        return {
            matches: !min || width >= Number(min[1]),
            media: query,
            onchange: null,
            addEventListener() { /* the width is fixed for the test */ },
            removeEventListener() { /* idem */ },
            addListener() { /* deprecated alias */ },
            removeListener() { /* deprecated alias */ },
            dispatchEvent: () => false
        } as unknown as MediaQueryList;
    }) as typeof window.matchMedia;
}

/** The single button whose label contains `text`; fails loudly if it is not unique. */
function buttonWith(wrapper: VueWrapper, text: string) {
    const found = wrapper.findAll('button').filter(button => button.text().includes(text));
    expect(found, `buttons labelled "${text}"`).toHaveLength(1);
    return found[0];
}

const valueOf = (wrapper: VueWrapper, selector: string) =>
    (wrapper.get(selector).element as HTMLInputElement).value;

/** Mounts the console shell. `localStorage` must already hold whatever the store should read. */
function mountHome() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { template: '<div />' } },
            { path: '/documentation', component: { template: '<div />' } }
        ]
    });
    const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } });
    return { store, wrapper };
}

function mountControls() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    const wrapper = mount(SectorControls, { global: { plugins: [pinia] } });
    return { store, wrapper };
}

let mounted: VueWrapper[] = [];

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    post.mockResolvedValue({ data: { success: true, data: sector(1) } } as never);
    isCancel.mockReturnValue(false);
    setViewport(1280);
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('T-F50 — RESTORE LAST SECTOR regenerates from the saved parameters', () => {
    it('posts exactly the four saved parameters and reads no cached sector', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 771, systemCount: 140, sectorVolume: 4000, zone: 'core'
        }));

        const { wrapper, store } = mountHome();
        mounted.push(wrapper);
        post.mockResolvedValue({ data: { success: true, data: sector(42) } } as never);

        await buttonWith(wrapper, 'RESTORE LAST SECTOR').trigger('click');
        await flushPromises();

        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][0]).toBe('/api/sector/generate');
        expect(post.mock.calls[0][1]).toEqual({
            systemCount: 140, sectorVolume: 4000, seed: 771, zone: 'core'
        });

        // D-15: "restore" means regenerate. Nothing but the four parameters is
        // persisted, so there is no cached sector it could have read instead,
        // and what lands on screen came back from the request.
        expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).sort())
            .toEqual(['currentSeed', 'sectorVolume', 'systemCount', 'zone']);
        expect(store.sectorData?.systems[0].systemId).toBe(42);
    });
});

describe('T-F51 — CANCEL aborts the in-flight generation', () => {
    it('runs the store abort path and restores the previously displayed sector', async () => {
        const { wrapper, store } = mountHome();
        mounted.push(wrapper);

        const previous = sector(7);
        store.sectorData = previous;
        store.generationStatus = 'done';
        await nextTick();

        // The request hangs until the AbortController fires, which is the only
        // way CANCEL can be observed doing anything.
        const aborted = { message: 'canceled' };
        post.mockImplementation((_url, _body, config) =>
            new Promise((_resolve, reject) => {
                (config as { signal: AbortSignal }).signal
                    .addEventListener('abort', () => reject(aborted));
            }));
        isCancel.mockImplementation(error => error === aborted);

        await wrapper.get('form').trigger('submit');
        await nextTick();
        // The generating state has taken the results area over.
        expect(store.generationStatus).toBe('running');
        expect(wrapper.text()).toContain('Building sector');

        await buttonWith(wrapper, 'CANCEL').trigger('click');
        await flushPromises();

        // Back on the previous sector — the request never resolved, so this is
        // the store's snapshot restore (D-20), not a response landing.
        expect(store.generationStatus).toBe('done');
        expect(toRaw(store.sectorData)).toBe(previous);
        expect(store.error).toBeNull();
        expect(wrapper.text()).not.toContain('Building sector');
    });
});

describe('T-F52 — RETRY re-runs the last request', () => {
    it('re-issues the same parameters after an error', async () => {
        const { wrapper, store } = mountHome();
        mounted.push(wrapper);

        store.currentSeed = 4242;
        store.systemCount = 140;
        store.sectorVolume = 4000;
        store.zone = 'core';
        await nextTick();

        post.mockRejectedValue(new Error('Network Error'));

        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(store.error).toBe('Network Error');

        await buttonWith(wrapper, 'RETRY').trigger('click');
        await flushPromises();

        expect(post).toHaveBeenCalledTimes(2);
        expect(post.mock.calls[1][1]).toEqual({
            systemCount: 140, sectorVolume: 4000, seed: 4242, zone: 'core'
        });
        expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
    });
});

describe('T-F53 — CLEAR MEMORY empties the saved parameters', () => {
    it('removes the storage key and resets the rail to 100 / 1000 / medium', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 771, systemCount: 777, sectorVolume: 4000, zone: 'core'
        }));

        const { wrapper, store } = mountControls();
        mounted.push(wrapper);

        expect(valueOf(wrapper, '#systemCount')).toBe('777');
        expect(wrapper.get('[aria-checked="true"]').text()).toBe('GALACTIC CORE');

        await buttonWith(wrapper, 'CLEAR MEMORY').trigger('click');
        await flushPromises();

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(store.hasSavedParams).toBe(false);
        expect(valueOf(wrapper, '#systemCount')).toBe('100');
        expect(valueOf(wrapper, '#sectorVolume')).toBe('1000');
        expect(wrapper.get('[aria-checked="true"]').text()).toBe('MEDIUM');
    });
});

describe('T-F54 — the sliders map through the logarithmic scale', () => {
    it('shows fromSlider(0.5) at the systems slider midpoint, not the linear midpoint', async () => {
        const { wrapper, store } = mountControls();
        mounted.push(wrapper);

        const slider = wrapper.get('input[aria-label="Systems"]');
        (slider.element as HTMLInputElement).value = '500';
        await slider.trigger('input');
        await flushPromises();

        // sqrt(1 * 5000) rounded — a linear control would read 2 500 here.
        const expected = fromSlider(0.5, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max, SYSTEMS_RANGE.step);
        expect(expected).toBe(71);
        expect(store.systemCount).toBe(expected);
        expect(valueOf(wrapper, '#systemCount')).toBe(String(expected));
    });
});
