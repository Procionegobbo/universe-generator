// Every internal link carries the sector.
//
// The bug this closes: OPEN SYSTEM pushed `/system/${id}`, Vue Router dropped
// everything the push did not name, and the address bar lost the sector. The
// loss was invisible until a reload, at which point the page said "System not
// found in the current sector" — true, and useless, because the sector the link
// named had never been generated on that machine.
//
// So the assertions here are of two kinds: what `useSectorNav` returns, and
// what every site that builds a link actually renders or pushes. The second
// kind is the one that keeps the bug closed, since the helper being right is no
// use if a call site still writes the path by hand.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import axios from 'axios';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorLink } from './useSectorLink';
import { useSectorNav } from './useSectorNav';
import type { Planet, Sector, SectorZone, Star, System } from '../types';
import AppTopBar from '../components/AppTopBar.vue';
import PlanetDetailPanel from '../components/PlanetDetailPanel.vue';
import ResultsDisplay from '../components/ResultsDisplay.vue';
import StarTable from '../components/StarTable.vue';
import SystemsTable from '../components/SystemsTable.vue';
import OverviewPanel from '../components/OverviewPanel.vue';
import SystemDetailView from '../views/SystemDetailView.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn(() => false) }
}));

const post = vi.mocked(axios.post);

const system = (systemId: number, name: string, hasProperName = false): System => ({
    systemId, name, hasProperName, age: 4.6, xPos: systemId, yPos: -systemId, zPos: systemId * 2
});

const star = (starId: number, systemId: number, spectralClass: string, subclass?: number): Star => ({
    starId, systemId, name: `Star-${starId}`, spectralClass, subclass
});

const planet = (
    starId: number,
    orbitalNumber: number,
    planetType: string,
    extra: Partial<Planet> = {}
): Planet => ({
    starId,
    orbitalNumber,
    planetType,
    diameter: 12000,
    moonCount: 1,
    mass: 6e24,
    gravity: 9.8,
    semiMajorAxis: 1,
    temperature: 250,
    habitableZone: false,
    lifeProbability: 0,
    lifeComplexity: 0,
    hasLife: false,
    ...extra
});

/** 3 systems · 3 stars · 4 planets. System 2 carries the life-bearing planet. */
const FIXTURE: Sector = {
    systems: [system(1, 'UG-0001'), system(2, 'Necklace', true), system(3, 'UG-0003')],
    stars: [star(1, 1, 'M', 6), star(2, 2, 'G', 2), star(3, 3, 'K', 4)],
    planets: [
        planet(1, 1, 'R'),
        planet(2, 1, 'E', { habitableZone: true, hasLife: true, lifeComplexity: 4.2 }),
        planet(2, 2, 'G', { temperature: 90, semiMajorAxis: 6 }),
        planet(3, 1, 'I', { temperature: 120 })
    ]
};

const SEED = '766207';
const PARAMS = { seed: SEED, zone: 'medium' as SectorZone, systemCount: 100, sectorVolume: 1000 };
const SID = `${SEED}-m-100-1000`;

let mounted: VueWrapper[] = [];

// The app's own table. There is deliberately no bare `/system/:id`: an address
// of that shape is what the bug used to produce, and it now matches nothing but
// the catch-all.
const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/documentation', name: 'documentation', component: { template: '<div />' } },
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/:sid', name: 'sector', component: { template: '<div />' } },
        { path: '/:sid/system/:id', name: 'system-detail', component: SystemDetailView },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: { template: '<div />' } }
    ]
});

/**
 * A component under the router and a store, at one URL. `loaded` is the sector
 * the store is already holding — the ordinary case, since every one of these
 * link sites is only rendered once a sector is on screen.
 */
async function mountAt(
    component: Parameters<typeof mount>[0],
    url: string,
    options: { loaded?: boolean; pinia?: Pinia } = {}
) {
    const activePinia = options.pinia ?? createPinia();
    setActivePinia(activePinia);
    const store = useSectorStore();
    if (options.loaded !== false) {
        store.sectorData = FIXTURE;
        store.loadedParams = { ...PARAMS };
        store.generationStatus = 'done';
    }

    const router = makeRouter();
    router.push(url);
    await router.isReady();

    const wrapper = mount(component, {
        global: { plugins: [activePinia, router] },
        attachTo: document.body
    });
    mounted.push(wrapper);
    await nextTick();
    return { store, wrapper, router };
}

/** Exposes what `useSectorNav` returns, so the composable can be read directly. */
const NavProbe = {
    setup() {
        const nav = useSectorNav();
        return { nav };
    },
    render() { return h('div'); }
};

type NavProbeVm = { nav: ReturnType<typeof useSectorNav> };

const navAt = async (url: string, options: { loaded?: boolean } = {}) => {
    const { wrapper, store } = await mountAt(NavProbe, url, options);
    return { nav: (wrapper.vm as unknown as NavProbeVm).nav, store, wrapper };
};

/** Lets the panel's opening rAF fire so its transform reaches its end state. */
const settle = async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await nextTick();
};

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    post.mockReset();
    post.mockResolvedValue({ data: { success: true, data: FIXTURE, stats: null } });
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
    document.body.innerHTML = '';
});

describe('useSectorNav — the link targets', () => {
    it('builds a system link inside the sid the path names', async () => {
        const { nav } = await navAt(`/${SID}`);

        expect(nav.systemTo(66)).toBe(`/${SID}/system/66`);
    });

    it('points home at the sid the path names', async () => {
        const { nav } = await navAt(`/${SID}`);

        expect(nav.homeTo.value).toBe(`/${SID}`);
        expect(nav.sid.value).toBe(SID);
    });

    it('points home at "/" when no sector is named and none is loaded', async () => {
        const { nav } = await navAt('/', { loaded: false });

        expect(nav.homeTo.value).toBe('/');
        expect(nav.sid.value).toBeNull();
        // A system link with no sector to name would point at a route that no
        // longer exists, so it degrades to the same place.
        expect(nav.systemTo(66)).toBe('/');
    });

    it('falls back to the loaded sector on a route that carries no sid', async () => {
        const { nav } = await navAt('/documentation');

        expect(nav.homeTo.value).toBe(`/${SID}`);
        expect(nav.systemTo(2)).toBe(`/${SID}/system/2`);
    });

    it('prefers the path over the loaded sector, which may still be the previous one', async () => {
        // Mid-regeneration: the URL already names the sector being built, and a
        // link built from what is loaded would point out of the one on screen.
        const other = '512000-c-400-9000';
        const { nav } = await navAt(`/${other}`);

        expect(nav.homeTo.value).toBe(`/${other}`);
        expect(nav.systemTo(66)).toBe(`/${other}/system/66`);
    });

    it('ignores a sid that cannot be read and falls back to the loaded sector', async () => {
        const { nav } = await navAt('/not-a-sector');

        expect(nav.homeTo.value).toBe(`/${SID}`);
    });
});

describe('PlanetDetailPanel — OPEN SYSTEM, the reported bug', () => {
    it('navigates to /<sid>/system/<id> rather than dropping the sector', async () => {
        const { wrapper, router, store } = await mountAt(PlanetDetailPanel, `/${SID}`);
        store.selectPlanet('2-1');
        await nextTick();
        await settle();

        await wrapper.get('[data-action="open-system"]').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe(`/${SID}/system/2`);
        expect(router.currentRoute.value.name).toBe('system-detail');
    });

    it('produces a URL that survives a reload', async () => {
        // A fresh tab: nothing in the store, only the address the previous case
        // produced. useSectorLink builds the sector it names, and the system
        // renders instead of "System not found in the current sector."
        const pinia = createPinia();
        setActivePinia(pinia);
        const store = useSectorStore();
        store.sectorData = null;
        store.loadedParams = null;

        const router = makeRouter();
        router.push(`/${SID}/system/2`);
        await router.isReady();

        const Harness = { setup: () => { useSectorLink(); return () => h(RouterView); } };
        const wrapper = mount(Harness, { global: { plugins: [pinia, router] } });
        mounted.push(wrapper);
        await flushPromises();
        await flushPromises();

        expect(post).toHaveBeenCalledTimes(1);
        expect(store.loadedParams).toEqual(PARAMS);
        expect(wrapper.find('[data-system-missing]').exists()).toBe(false);
        expect(wrapper.get('[data-system-name]').text()).toBe('Necklace');
    });
});

describe('SystemsTable — links and row clicks carry the sid', () => {
    it('links each row name at /<sid>/system/<id>', async () => {
        const { wrapper } = await mountAt(SystemsTable, `/${SID}`);

        expect(wrapper.get('[data-system-row="2"] a').attributes('href'))
            .toBe(`/${SID}/system/2`);
    });

    it('navigates a row click into the sector', async () => {
        const { wrapper, router } = await mountAt(SystemsTable, `/${SID}`);

        await wrapper.get('[data-system-row="2"]').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe(`/${SID}/system/2`);
    });

    it('does not navigate twice when the click landed on the link itself', async () => {
        const { wrapper, router } = await mountAt(SystemsTable, `/${SID}`);
        const push = vi.spyOn(router, 'push');

        const link = wrapper.get('[data-system-row="2"] a');
        await link.trigger('click');
        await flushPromises();

        // Once, by the RouterLink itself. The row handler sees the click landed
        // on an anchor and stands down; without that guard this is two.
        expect(push).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe(`/${SID}/system/2`);
    });
});

describe('StarTable — links and row clicks carry the sid', () => {
    it('links each row\'s SYSTEM cell at /<sid>/system/<id>', async () => {
        const { wrapper } = await mountAt(StarTable, `/${SID}`);

        expect(wrapper.get('[data-star-row="2"] [data-cell="system"]').attributes('href'))
            .toBe(`/${SID}/system/2`);
    });

    it('navigates a row click into the sector', async () => {
        const { wrapper, router } = await mountAt(StarTable, `/${SID}`);

        await wrapper.get('[data-star-row="2"]').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe(`/${SID}/system/2`);
    });
});

describe('NotableSystems — the overview entries carry the sid', () => {
    it('links every entry inside the sector', async () => {
        const { wrapper } = await mountAt(ResultsDisplay, `/${SID}`);
        const entries = wrapper.findComponent(OverviewPanel).findAll('a[href*="/system/"]');

        expect(entries.length).toBeGreaterThan(0);
        for (const entry of entries) {
            expect(entry.attributes('href')).toMatch(new RegExp(`^/${SID}/system/\\d+$`));
        }
    });
});

describe('AppTopBar — the logo stays inside the sector', () => {
    it('goes to /<sid>, not to "/"', async () => {
        const { wrapper, router } = await mountAt(AppTopBar, `/${SID}/system/2`);

        const logo = wrapper.findAll('button').find(button => button.find('img').exists());
        await logo!.trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe(`/${SID}`);
    });

    it('still goes to "/" with no sector anywhere', async () => {
        const { wrapper, router } = await mountAt(AppTopBar, '/', { loaded: false });

        const logo = wrapper.findAll('button').find(button => button.find('img').exists());
        await logo!.trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe('/');
    });
});

describe('SystemDetailView — its own two links carry the sid', () => {
    it('points the breadcrumb back at the sector', async () => {
        const { wrapper } = await mountAt(SystemDetailView, `/${SID}/system/2`);

        expect(wrapper.get('[data-breadcrumb-back]').attributes('href')).toBe(`/${SID}`);
    });

    it('points BACK TO SECTOR at the sector when the system is not in it', async () => {
        const { wrapper } = await mountAt(SystemDetailView, `/${SID}/system/999`);

        const missing = wrapper.get('[data-system-missing]');
        expect(missing.get('a').attributes('href')).toBe(`/${SID}`);
    });
});
