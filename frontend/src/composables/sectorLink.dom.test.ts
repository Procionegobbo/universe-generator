// The rule this pins: a link may build the sector it names, but only into an
// empty room. Anything already in memory belongs to the reader — their
// parameters, possibly a sector they are halfway through reading — and a link
// arriving afterwards must not throw it away and regenerate over the top.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import axios from 'axios';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorLink } from './useSectorLink';
import type { Sector } from '../types';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn(() => false) }
}));

const post = vi.mocked(axios.post);

const SECTOR: Sector = {
    systems: [{
        systemId: 52, name: 'UG-0052', hasProperName: false,
        age: 4.2, xPos: 6, yPos: 9, zPos: 8
    }],
    stars: [{ starId: 87, systemId: 52, name: 'UG-0052-A', spectralClass: 'K', subclass: 1 }],
    planets: [{
        starId: 87, orbitalNumber: 3, planetType: 'S', diameter: 16000, moonCount: 1,
        mass: 6e24, gravity: 9.8, semiMajorAxis: 0.72, temperature: 280,
        habitableZone: true, lifeProbability: 0, lifeComplexity: 0, hasLife: false
    }]
};

const LINK = '/system/52?planet=87-3&seed=644212&zone=medium&systems=100&volume=1000';

const Harness = { setup: () => { useSectorLink(); return () => null; } };

let mounted: VueWrapper[] = [];

async function mountAt(url: string, prime?: (store: ReturnType<typeof useSectorStore>) => void) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    prime?.(store);

    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { template: '<div />' } },
            { path: '/system/:id', component: { template: '<div />' } }
        ]
    });
    // Resolved before mounting, because a memory history discards a push made
    // before the router installs — the query would read empty whatever the
    // composable did. So the ordering here cannot reproduce the browser's, where
    // main.ts mounts without awaiting the router and the query is empty on the
    // first paint; that the composable waits for `router.isReady()` before
    // reading it was verified against the running app instead.
    router.push(url);
    await router.isReady();

    const wrapper = mount(Harness, { global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
    // Twice: once to let the composable past its own `await router.isReady()`,
    // once to settle the generation it then starts.
    await flushPromises();
    await flushPromises();
    return { store, wrapper, router };
}

beforeEach(() => {
    localStorage.clear();
    post.mockReset();
    post.mockResolvedValue({ data: { success: true, data: SECTOR, stats: null } });
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('useSectorLink — reading a sector out of the URL', () => {
    it('builds the sector a link names when nothing is loaded', async () => {
        const { store } = await mountAt(LINK);

        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][1]).toMatchObject({
            seed: '644212', zone: 'medium', systemCount: 100, sectorVolume: 1000
        });
        expect(store.sectorData).toEqual(SECTOR);
        // Recorded as the loaded sector, so the planet key can be checked
        // against it rather than against whatever the reader had set.
        expect(store.loadedParams).toMatchObject({ seed: '644212', zone: 'medium' });
    });

    it('leaves a sector already in memory alone', async () => {
        const { store } = await mountAt(LINK, s => {
            s.sectorData = SECTOR;
            s.loadedParams = {
                seed: '1', zone: 'core', systemCount: 100, sectorVolume: 1000
            };
        });

        expect(post).not.toHaveBeenCalled();
        // Not even to correct it: the mismatch is the deep link's business, and
        // it answers by refusing the planet, not by rebuilding the sector.
        expect(store.loadedParams).toMatchObject({ seed: '1', zone: 'core' });
    });

    it('does not race a generation already under way', async () => {
        await mountAt(LINK, s => { s.isLoading = true; });

        expect(post).not.toHaveBeenCalled();
    });

    it.each([
        ['names no sector at all', '/system/52?planet=87-3'],
        ['names it only in part', '/system/52?planet=87-3&seed=644212'],
        ['carries an unknown zone', '/system/52?seed=1&zone=nowhere&systems=100&volume=1000'],
        ['is a plain route', '/system/52']
    ])('generates nothing when the URL %s', async (_label, url) => {
        const { store } = await mountAt(url);

        expect(post).not.toHaveBeenCalled();
        expect(store.sectorData).toBeNull();
    });

    it("surfaces a failure as the store's own error state", async () => {
        post.mockRejectedValue(new Error('network down'));
        const { store } = await mountAt(LINK);

        expect(store.sectorData).toBeNull();
        expect(store.error).toBe('network down');
        expect(store.generationStatus).toBe('error');
    });
});


describe('useSectorLink — publishing the sector into the URL', () => {
    const PARAMS = {
        seed: '644212', zone: 'medium' as const, systemCount: 100, sectorVolume: 1000
    };

    it('names the loaded sector on a URL that carries none', async () => {
        const { router } = await mountAt('/system/52', s => {
            s.sectorData = SECTOR;
            s.loadedParams = PARAMS;
        });
        await flushPromises();

        expect(router.currentRoute.value.query).toMatchObject({
            seed: '644212', zone: 'medium', systems: '100', volume: '1000'
        });
    });

    // Otherwise closing the panel, or landing on a stale link, leaves a URL that
    // advertises a sector nobody is looking at — and that reloads into it.
    it('corrects a URL that names some other sector', async () => {
        const { router } = await mountAt(
            '/system/52?seed=999&zone=core&systems=50&volume=4000',
            s => { s.sectorData = SECTOR; s.loadedParams = PARAMS; }
        );
        await flushPromises();

        expect(router.currentRoute.value.query).toMatchObject({
            seed: '644212', zone: 'medium', systems: '100', volume: '1000'
        });
    });

    it('writes nothing when the URL already agrees', async () => {
        const { router } = await mountAt(
            '/system/52?seed=644212&zone=medium&systems=100&volume=1000',
            s => { s.sectorData = SECTOR; s.loadedParams = PARAMS; }
        );
        const replace = vi.spyOn(router, 'replace');
        await flushPromises();

        expect(replace).not.toHaveBeenCalled();
    });

    it('says nothing while no sector is loaded', async () => {
        const { router } = await mountAt('/system/52');
        await flushPromises();

        expect(router.currentRoute.value.query.seed).toBeUndefined();
    });
});
