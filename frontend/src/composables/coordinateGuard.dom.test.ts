// Decision 4's table, and Decision 5's timing.
//
// The table is easy to state and easy to get subtly wrong, so each row is
// pinned by where the app ends up rather than by which branch ran:
//
//   C  system absent      -> /<sid>, "coordinates"
//   A  planet absent      -> stay, ?planet gone, "planet"
//   B  the two disagree   -> /<sid>, "coordinates"
//
// The timing is the half that cannot be checked by reading the code: the guard
// must say nothing at all while the sector the link names is still being built,
// or every valid shared link is reported broken for the length of a generation.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import axios from 'axios';
import { useSectorStore } from '../stores/sectorStore';
import { useCoordinateGuard } from './useCoordinateGuard';
import { useSectorLink } from './useSectorLink';
import type { Planet, Sector, SectorZone, Star, System } from '../types';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn(() => false) }
}));

const post = vi.mocked(axios.post);

const system = (systemId: number, name: string): System => ({
    systemId, name, hasProperName: false, age: 4.2, xPos: 1, yPos: 2, zPos: 3
});

const star = (starId: number, systemId: number): Star => ({
    starId, systemId, name: `UG-${starId}`, spectralClass: 'K', subclass: 1
});

const planet = (starId: number, orbitalNumber: number): Planet => ({
    starId, orbitalNumber, planetType: 'S', diameter: 12000, moonCount: 0, mass: 6e24,
    gravity: 9.8, semiMajorAxis: 1, temperature: 280, habitableZone: true,
    lifeProbability: 0, lifeComplexity: 0, hasLife: false
});

/**
 * Two systems, and the star that makes case B possible: star 87 sits in system
 * 12, so `/system/66?planet=87-3` is a URL whose two halves contradict.
 */
const SECTOR: Sector = {
    systems: [system(66, 'UG-0066'), system(12, 'UG-0012')],
    stars: [star(87, 12), star(41, 66)],
    planets: [planet(87, 3), planet(41, 1)]
};

const SEED = '766207';
const PARAMS = { seed: SEED, zone: 'medium' as SectorZone, systemCount: 100, sectorVolume: 1000 };
const SID = `${SEED}-m-100-1000`;

let mounted: VueWrapper[] = [];

const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/:sid', name: 'sector', component: { template: '<div />' } },
        { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: { template: '<div />' } }
    ]
});

/** The two composables App.vue mounts side by side, over one URL. */
const Harness = {
    setup() {
        useSectorLink();
        useCoordinateGuard();
        return () => h(RouterView);
    }
};

async function mountAt(url: string, prime?: (store: ReturnType<typeof useSectorStore>) => void) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    // The ordinary case: the sector the sid names is the one on screen.
    store.sectorData = SECTOR;
    store.loadedParams = { ...PARAMS };
    store.generationStatus = 'done';
    prime?.(store);

    const router = makeRouter();
    router.push(url);
    await router.isReady();

    const wrapper = mount(Harness, { global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
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

describe('useCoordinateGuard — Decision 4, the three outcomes', () => {
    it('case A: an absent planet leaves the system standing', async () => {
        const { store, router } = await mountAt(
            `/${SID}/system/66?planet=87-999`, s => s.selectPlanet('87-999'));

        // The system is real; only the planet was not, so the rest of the URL
        // still holds and the user stays where the link pointed.
        expect(router.currentRoute.value.path).toBe(`/${SID}/system/66`);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(store.linkNotice).toEqual({ kind: 'planet', path: `/${SID}/system/66` });
        expect(store.selectedPlanetKey).toBeNull();
    });

    it('case B: a star that exists in another system opens the sector instead', async () => {
        // Star 87 is in system 12, so this address contradicts itself. The
        // surviving half is no more trustworthy than the half that failed.
        const { store, router } = await mountAt(`/${SID}/system/66?planet=87-3`);

        expect(router.currentRoute.value.path).toBe(`/${SID}`);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(store.linkNotice).toEqual({ kind: 'coordinates', path: `/${SID}` });
    });

    it('case C: an absent system opens the sector, and nothing below it is read', async () => {
        const { store, router } = await mountAt(`/${SID}/system/999?planet=87-3`);

        expect(router.currentRoute.value.path).toBe(`/${SID}`);
        expect(store.linkNotice).toEqual({ kind: 'coordinates', path: `/${SID}` });
    });

    it('treats a non-numeric system id as case C', async () => {
        const { store, router } = await mountAt(`/${SID}/system/abc`);

        expect(router.currentRoute.value.path).toBe(`/${SID}`);
        expect(store.linkNotice).toEqual({ kind: 'coordinates', path: `/${SID}` });
    });

    it('corrects with replace, so back does not walk into the bad URL again', async () => {
        for (const url of [
            `/${SID}/system/66?planet=87-999`,
            `/${SID}/system/66?planet=87-3`,
            `/${SID}/system/999`
        ]) {
            const { router } = await mountAt(url);

            // Nothing behind the corrected address: it replaced the bad one
            // rather than stacking on it, so there is no entry to go back to.
            expect(router.options.history.state.back).toBeUndefined();

            router.back();
            await flushPromises();
            expect(router.currentRoute.value.fullPath).not.toBe(url);
        }
    });

    it('leaves a fully valid link entirely alone', async () => {
        // System 12 does hold star 87, whose third planet exists.
        const { store, router } = await mountAt(`/${SID}/system/12?planet=87-3`);

        expect(router.currentRoute.value.fullPath).toBe(`/${SID}/system/12?planet=87-3`);
        expect(store.linkNotice).toBeNull();
    });

    it('strips a malformed key without saying anything', async () => {
        // "not-a-key" names no coordinate that could ever have existed, so there
        // is nothing to report — only something to remove.
        const { store, router } = await mountAt(`/${SID}/system/66?tab=planets&planet=not-a-key`);

        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(router.currentRoute.value.query.tab).toBe('planets');
        expect(store.linkNotice).toBeNull();
    });

    it('checks a planet key on the sector home without inventing a system', async () => {
        const { store, router } = await mountAt(`/${SID}?planet=87-999`);

        expect(router.currentRoute.value.path).toBe(`/${SID}`);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(store.linkNotice).toEqual({ kind: 'planet', path: `/${SID}` });
    });

    it('accepts a planet key on the sector home whatever system it belongs to', async () => {
        // No system in the path, so there is nothing for the star to contradict.
        const { store, router } = await mountAt(`/${SID}?planet=87-3`);

        expect(router.currentRoute.value.fullPath).toBe(`/${SID}?planet=87-3`);
        expect(store.linkNotice).toBeNull();
    });

    it('re-checks when the sector changes under an unchanged URL', async () => {
        const { store, router } = await mountAt(`/${SID}/system/12?planet=87-3`);
        expect(store.linkNotice).toBeNull();

        store.sectorData = { systems: [system(12, 'UG-0012')], stars: [star(87, 12)], planets: [] };
        await flushPromises();

        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(store.linkNotice?.kind).toBe('planet');
    });
});

describe('useCoordinateGuard — Decision 5, never before the sector lands', () => {
    it('says nothing while the sector the link names is still being generated', async () => {
        // The cold load a shared link actually meets. The generation is left in
        // flight so the in-between state can be read at all.
        let release: (value: unknown) => void = () => {};
        post.mockReturnValue(new Promise(resolve => { release = resolve; }));

        const { store, router } = await mountAt(`/${SID}/system/999?planet=87-999`, s => {
            s.sectorData = null;
            s.loadedParams = null;
            s.generationStatus = 'idle';
        });

        expect(store.generationStatus).toBe('running');
        // Both coordinates are wrong, and the guard has no business knowing that
        // yet: it has nothing to check them against.
        expect(router.currentRoute.value.fullPath).toBe(`/${SID}/system/999?planet=87-999`);
        expect(store.linkNotice).toBeNull();

        release({ data: { success: true, data: SECTOR, stats: null } });
        await flushPromises();
        await nextTick();

        // And now, once, against the sector the URL named all along.
        expect(router.currentRoute.value.path).toBe(`/${SID}`);
        expect(store.linkNotice).toEqual({ kind: 'coordinates', path: `/${SID}` });
    });

    it('leaves a generation failure to the store\'s own error surface', async () => {
        post.mockRejectedValue(new Error('network down'));

        const { store, router } = await mountAt(`/${SID}/system/999?planet=87-999`, s => {
            s.sectorData = null;
            s.loadedParams = null;
            s.generationStatus = 'idle';
        });

        expect(store.generationStatus).toBe('error');
        expect(store.error).toBe('network down');
        // Two messages about one failure would be one too many, and the
        // coordinates were never actually checked against anything.
        expect(store.linkNotice).toBeNull();
        expect(router.currentRoute.value.fullPath).toBe(`/${SID}/system/999?planet=87-999`);
    });

    it('says nothing while the sector on screen is a different one', async () => {
        // The dangerous shape: a sector *is* loaded, so `sectorData` is not null
        // and the guard could check the URL's coordinates against a sky the URL
        // never named. It must not — the rebuild is still in flight.
        post.mockReturnValue(new Promise(() => {}));

        const { store, router } = await mountAt(`/${SID}/system/999`, s => {
            s.loadedParams = { ...PARAMS, seed: '999' };
        });

        expect(store.sectorData).not.toBeNull();
        expect(store.linkNotice).toBeNull();
        expect(router.currentRoute.value.path).toBe(`/${SID}/system/999`);
    });
});
