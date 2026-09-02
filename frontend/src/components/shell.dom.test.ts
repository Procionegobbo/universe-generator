// The console shell's responsive rail tiers (T-F55, spec §4d) and the way back
// into the two legacy pages.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import appRouter from '../router';
import HomeView from '../views/HomeView.vue';
import AppTopBar from './AppTopBar.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

const ROUTES = [
    { path: '/documentation', component: { template: '<div />' } },
    { path: '/api-reference', component: { template: '<div />' } },
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/:sid', name: 'sector', component: { template: '<div />' } },
    { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } }
];

/** See railAndStates.dom.test.ts — jsdom's matchMedia never matches anything. */
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

function mountWithRouter(component: Parameters<typeof mount>[0]) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({ history: createMemoryHistory(), routes: ROUTES });
    return mount(component, { global: { plugins: [pinia, router] } });
}

/** Clicks every affordance that could put the parameter rail on screen. */
async function openEveryRailAffordance(wrapper: VueWrapper) {
    const drawerToggle = wrapper.find('[data-rail-toggle="drawer"]');
    if (drawerToggle.exists()) await drawerToggle.trigger('click');

    const sheetToggle = wrapper.findAll('button')
        .find(button => button.text().includes('PARAMETERS ▲'));
    if (sheetToggle) await sheetToggle.trigger('click');

    await nextTick();
}

let mounted: VueWrapper[] = [];

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('T-F55 — the three responsive rail tiers hand over cleanly (spec §4d)', () => {
    const CASES = [
        { width: 390, tier: 'sheet' },
        { width: 800, tier: 'drawer' },
        { width: 1100, tier: 'inline' }
    ] as const;

    it.each(CASES)('at $width px the rail is the $tier and nothing else', async ({ width, tier }) => {
        setViewport(width);
        const wrapper = mountWithRouter(HomeView);
        mounted.push(wrapper);

        await openEveryRailAffordance(wrapper);

        const hosts = wrapper.findAll('[data-rail]');
        expect(hosts).toHaveLength(1);
        expect(hosts[0].attributes('data-rail')).toBe(tier);
        // The one host really carries the controls, opened or inline.
        expect(hosts[0].text()).toContain('GENERATION PARAMETERS');
    });

    it.each(CASES)('at $width px no element is wider than the viewport', ({ width }) => {
        setViewport(width);
        const wrapper = mountWithRouter(HomeView);
        mounted.push(wrapper);

        // jsdom performs no layout, so the page's real scrollWidth is always 0
        // and horizontal scroll cannot be measured here — the visual pass in the
        // story's manual checklist covers that. What is checkable is the usual
        // structural cause: a fixed pixel width wider than the viewport.
        const fixedWidths = [...wrapper.html().matchAll(/(?:^|\s)(?:min-)?w-\[(\d+)px\]/g)]
            .map(match => Number(match[1]));

        for (const fixed of fixedWidths) {
            expect(fixed).toBeLessThanOrEqual(width);
        }
    });
});

describe('the legacy pages are reachable from the console', () => {
    it('the top bar menu links to both of them', async () => {
        const wrapper = mountWithRouter(AppTopBar);
        mounted.push(wrapper);

        // Closed by default, then two clicks from anywhere: menu, then link.
        expect(wrapper.findAll('a')).toHaveLength(0);

        await wrapper.get('[data-testid="app-menu"]').trigger('click');

        const links = wrapper.findAll('a');
        expect(links.map(link => link.attributes('href')))
            .toEqual(['/documentation', '/api-reference']);
        expect(links.map(link => link.text())).toEqual(['Documentation', 'API Reference']);
    });

    it('both link targets resolve to a real route rather than 404ing', () => {
        for (const path of ['/documentation', '/api-reference']) {
            expect(appRouter.resolve(path).matched).toHaveLength(1);
        }
    });
});
