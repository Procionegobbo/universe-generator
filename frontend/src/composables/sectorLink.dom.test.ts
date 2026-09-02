// The sector is named by the path, so this composable has exactly two jobs and
// the rules below are the whole contract:
//
//   reading    the address names a sector -> build it, unless it is already the
//              one on screen. An address that names none, or names one that
//              cannot be read, lands on "/" rather than a blank page.
//   publishing the loaded sector changed -> make the path name it, keeping
//              whatever followed the sid. Only two things reach that rule: the
//              first generation from "/", and a regeneration with new
//              parameters while a sid route is on screen.
//
// What the old query-based version had to guard — an ordering flag stopping the
// write side from publishing over the parameters the read side was still
// reading — is gone with it: the publish watch is not immediate, and on a cold
// link-follow `loadedParams` never changes until the link's own sector lands.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import axios from 'axios';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorLink } from './useSectorLink';
import HomeView from '../views/HomeView.vue';
import type { GenerationRequest, Sector } from '../types';

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

const SID = '644212-m-100-1000';
const LOADED = {
    seed: '644212', zone: 'medium' as const, systemCount: 100, sectorVolume: 1000
};
/** A link to one planet of one system inside that sector. */
const LINK = `/${SID}/system/52?planet=87-3`;

const Harness = { setup: () => { useSectorLink(); return () => h(RouterView); } };

let mounted: VueWrapper[] = [];

// The app's own table, near enough for a composable that only reads the sid and
// the route name: HomeView is real so that "the catch-all renders something"
// can be asserted, and the detail view is stubbed because nothing here reads it.
const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/documentation', name: 'documentation', component: { template: '<div />' } },
        { path: '/', name: 'home', component: HomeView },
        { path: '/:sid', name: 'sector', component: HomeView },
        { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: HomeView }
    ]
});

async function mountAt(url: string, prime?: (store: ReturnType<typeof useSectorStore>) => void) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    prime?.(store);

    const router = makeRouter();
    // Resolved before mounting, because a memory history discards a push made
    // before the router installs — the path would read "/" whatever the
    // composable did. So the ordering here cannot reproduce the browser's, where
    // main.ts mounts without awaiting the router; that the composable waits for
    // `router.isReady()` before reading it was verified against the running app.
    router.push(url);
    await router.isReady();

    const wrapper = mount(Harness, { global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
    // Twice: once to let the composable past its own `await router.isReady()`,
    // once to settle the generation or the replace it then starts.
    await flushPromises();
    await flushPromises();
    return { store, wrapper, router };
}

/** A generation the user asked for, rather than one a link asked for. */
const generate = (
    store: ReturnType<typeof useSectorStore>,
    request: Partial<GenerationRequest> = {}
) => store.generateSector({
    systemCount: 100, sectorVolume: 1000, seed: '644212', zone: 'medium', ...request
});

beforeEach(() => {
    localStorage.clear();
    post.mockReset();
    post.mockResolvedValue({ data: { success: true, data: SECTOR, stats: null } });
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('useSectorLink — reading the sector out of the path', () => {
    it('builds the sector the sid names when nothing is loaded', async () => {
        const { store } = await mountAt(LINK);

        expect(post).toHaveBeenCalledTimes(1);
        // Exactly the four the sid decodes to — never completed from whatever
        // the reader happens to have set, since a seed applied to another zone
        // yields different worlds under the same name.
        expect(post.mock.calls[0][1]).toMatchObject({
            seed: '644212', zone: 'medium', systemCount: 100, sectorVolume: 1000
        });
        expect(store.sectorData).toEqual(SECTOR);
    });

    it('records the result in loadedParams, so the sid can be checked against it', async () => {
        const { store } = await mountAt(LINK);

        expect(store.loadedParams).toEqual(LOADED);
    });

    it('leaves the sector alone when the sid is the one already loaded', async () => {
        await mountAt(LINK, s => {
            s.sectorData = SECTOR;
            s.loadedParams = LOADED;
        });

        expect(post).not.toHaveBeenCalled();
    });

    // The whole sid, not the seed/zone pair that decides what a body *is*: count
    // and volume decide which bodies *exist*, and a link to a system the reader
    // has not got must rebuild rather than report it missing.
    it.each([
        ['systemCount', { ...LOADED, systemCount: 400 }],
        ['sectorVolume', { ...LOADED, sectorVolume: 9000 }],
        ['seed', { ...LOADED, seed: '999' }],
        ['zone', { ...LOADED, zone: 'core' as const }]
    ])('regenerates when the loaded sector differs by %s alone', async (_field, loaded) => {
        await mountAt(LINK, s => {
            s.sectorData = SECTOR;
            s.loadedParams = loaded;
        });

        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][1]).toMatchObject({
            seed: '644212', zone: 'medium', systemCount: 100, sectorVolume: 1000
        });
    });

    it('does not race a generation already under way', async () => {
        await mountAt(LINK, s => { s.isLoading = true; });

        expect(post).not.toHaveBeenCalled();
    });

    it('generates nothing on "/", which names no sector', async () => {
        const { store } = await mountAt('/');

        expect(post).not.toHaveBeenCalled();
        expect(store.sectorData).toBeNull();
    });

    it('sends a malformed sid to "/", generates nothing, and says so', async () => {
        const { store, router } = await mountAt('/not-a-sector');

        expect(router.currentRoute.value.path).toBe('/');
        expect(post).not.toHaveBeenCalled();
        expect(store.sectorData).toBeNull();
        // Landing somewhere else in silence would be its own failure.
        expect(store.linkNotice).toEqual({ kind: 'sid', path: '/' });
    });

    // An address matching no route at all is treated exactly as an unreadable
    // sid is — one path, and a page rather than an empty <router-view>. Both of
    // these are what an old shared link now looks like.
    it.each(['/system/66', '/a/b/c'])(
        'sends the unmatched address %s to "/", generates nothing, and says so',
        async (url) => {
            const { store, wrapper, router } = await mountAt(url);

            expect(router.currentRoute.value.path).toBe('/');
            expect(post).not.toHaveBeenCalled();
            expect(store.sectorData).toBeNull();
            expect(wrapper.findComponent(HomeView).exists()).toBe(true);
            expect(store.linkNotice).toEqual({ kind: 'sid', path: '/' });
        }
    );

    it("surfaces a generation failure as the store's own error state", async () => {
        post.mockRejectedValue(new Error('network down'));
        const { store } = await mountAt(`/${SID}`);

        expect(store.sectorData).toBeNull();
        expect(store.error).toBe('network down');
        expect(store.generationStatus).toBe('error');
        // The full-page generation error owns that message; the link strip is
        // for a link that was wrong, which this one was not.
        expect(store.linkNotice).toBeNull();
    });

    // A planet key on the true empty state names nothing: there is no sector for
    // it to belong to, and no sid for one to arrive under.
    it('strips a stray planet key from "/" and generates nothing', async () => {
        const { store, router } = await mountAt('/?planet=1-1');

        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(router.currentRoute.value.path).toBe('/');
        expect(post).not.toHaveBeenCalled();
        expect(store.sectorData).toBeNull();
    });
});

describe('useSectorLink — publishing the sector into the path', () => {
    it('names the sector in the path after the first generation from "/"', async () => {
        const { store, router } = await mountAt('/');

        await generate(store);
        await flushPromises();

        expect(router.currentRoute.value.path).toBe(`/${SID}`);
    });

    // Otherwise the URL goes on naming a sector nobody is looking at, and would
    // reload into it. What follows the sid is the user's place inside the
    // sector, and survives the sector being rebuilt under them.
    it('replaces the sid on a regeneration and keeps the tail', async () => {
        const { store, router } = await mountAt(`/${SID}/system/66`, s => {
            s.sectorData = SECTOR;
            s.loadedParams = LOADED;
        });

        await generate(store, { systemCount: 400 });
        await flushPromises();

        expect(router.currentRoute.value.path).toBe('/644212-m-400-1000/system/66');
    });

    it('publishes nothing when answering a link, so the two sides cannot loop', async () => {
        const { router } = await mountAt(`/${SID}`, s => {
            s.sectorData = SECTOR;
            s.loadedParams = LOADED;
        });
        const replace = vi.spyOn(router, 'replace');
        await flushPromises();

        expect(replace).not.toHaveBeenCalled();
    });

    // A hand-shortened link works, and immediately becomes a complete one:
    // the missing trailing fields decode to their defaults, and what the
    // generation records is the full sector.
    it('canonicalises a short sid once its sector lands', async () => {
        const { router } = await mountAt('/766207');
        await flushPromises();

        expect(post).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe('/766207-m-100-1000');
    });

    it('publishes nothing while no sector is loaded', async () => {
        const { router } = await mountAt('/');
        const replace = vi.spyOn(router, 'replace');
        await flushPromises();

        expect(replace).not.toHaveBeenCalled();
        expect(router.currentRoute.value.path).toBe('/');
    });
});

describe('useSectorLink — a link followed mid-session', () => {
    // The whole point of watching the route rather than only the first paint: a
    // link opened while the app is already running is the same request as one
    // pasted into an empty tab, and deserves the same answer.
    it('rebuilds when a navigation names another sector', async () => {
        const { router } = await mountAt(`/${SID}`);
        expect(post).toHaveBeenCalledTimes(1);

        await router.push('/999-c-100-1000/system/9');
        await flushPromises();
        await flushPromises();

        expect(post).toHaveBeenCalledTimes(2);
        expect(post.mock.calls[1][1]).toMatchObject({ seed: '999', zone: 'core' });
    });

    it('stays put when the navigation stays inside the same sid', async () => {
        const { router } = await mountAt(`/${SID}`);
        expect(post).toHaveBeenCalledTimes(1);

        // Ordinary navigation inside the sector, which must not throw it away
        // and build it again.
        await router.push(`/${SID}/system/7?planet=1-1`);
        await flushPromises();
        await flushPromises();

        expect(post).toHaveBeenCalledTimes(1);
    });
});
