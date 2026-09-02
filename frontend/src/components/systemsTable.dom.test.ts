// Interaction coverage for the Systems index (3a) — SystemsTable, OrbitProfile
// and the shared TablePager.
//
// The spec wrote D-34 ("no component tests") before this project had a DOM test
// harness; story 004b added jsdom and @vue/test-utils scoped to *.dom.test.ts,
// and story 005 established the precedent of asserting a screen's behavioural
// criteria here rather than leaving them to a manual checklist. Everything this
// story specifies — pagination, the padded ID, verbatim names, the orbit-profile
// geometry, the filter bar, search, the pagination reset and the skeleton state
// — is asserted below.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import type { Planet, Sector, Star, System } from '../types';
import SystemsTable from './SystemsTable.vue';
import OrbitProfile from './OrbitProfile.vue';
import TablePager from './TablePager.vue';
import CelestialThumb from './CelestialThumb.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

const system = (systemId: number, name: string, hasProperName = false): System => ({
    systemId, name, hasProperName, age: 4.6, xPos: 12.402, yPos: -4.118, zPos: 33.907
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

/**
 * Four systems that between them carry every display case of 3a:
 *  1  UG-0001      K-4, 2 stars, 3 planets (one habitable, one alive) -> LIFE row
 *  140 Kepler-442-A G-2, 1 star, 9 planets  -> the wide-gap orbit profile
 *  1204 UG-1204     M-6, 1 star, no planets -> the empty profile caption
 *  2  Necklace     BH,  3 stars, 1 planet   -> IAU + BH badges, multi-star
 */
const FIXTURE: Sector = {
    systems: [
        system(1, 'UG-0001'),
        system(140, 'Kepler-442-A'),
        system(1204, 'UG-1204'),
        system(2, 'Necklace', true)
    ],
    stars: [
        star(1, 1, 'K', 4), star(2, 1, 'M', 3),
        star(3, 140, 'G', 2),
        star(4, 1204, 'M', 6),
        star(5, 2, 'BH'), star(6, 2, 'NS'), star(7, 2, 'G', 5)
    ],
    planets: [
        // dMax = 20 000 -> 28px, 19px, 15px
        planet(1, 1, 'R', { diameter: 5000, moonCount: 0 }),
        planet(1, 2, 'E', { diameter: 10000, habitableZone: true, hasLife: true, name: 'Thalassa' }),
        planet(1, 3, 'G', { diameter: 20000, moonCount: 4 }),
        ...Array.from({ length: 9 }, (_, index) =>
            planet(3, index + 1, 'R', { diameter: 8000, moonCount: 0 })),
        planet(7, 1, 'I', { diameter: 6000, moonCount: 2 })
    ]
};

/** Fourteen bare systems, so the 12-row page size actually paginates. */
const FOURTEEN: Sector = {
    systems: Array.from({ length: 14 }, (_, index) => system(index + 1, `UG-${index + 1}`)),
    stars: Array.from({ length: 14 }, (_, index) => star(index + 1, index + 1, 'G', 2)),
    planets: []
};

let mounted: VueWrapper[] = [];

function mountTable(sector: Sector = FIXTURE, pinia?: Pinia) {
    const activePinia = pinia ?? createPinia();
    setActivePinia(activePinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.generationStatus = 'done';
    store.activeTab = 'systems';

    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', name: 'home', component: { template: '<div />' } },
            { path: '/:sid', name: 'sector', component: { template: '<div />' } },
            { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } }
        ]
    });

    const wrapper = mount(SystemsTable, { global: { plugins: [activePinia, router] } });
    mounted.push(wrapper);
    return { store, wrapper };
}

const rowIds = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('[data-system-row]').map(row => row.attributes('data-system-row') as string);

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('SystemsTable — rows and pagination', () => {
    it('shows 12 rows per page under a SHOWING 1–12 OF 14 caption', () => {
        const { wrapper } = mountTable(FOURTEEN);

        expect(wrapper.findAll('[data-system-row]')).toHaveLength(12);
        expect(wrapper.get('[data-pager-caption]').text()).toBe('SHOWING 1–12 OF 14');
    });

    it('lets TablePager drive the page, storing it in store.page.systems', async () => {
        const { store, wrapper } = mountTable(FOURTEEN);
        const pager = wrapper.findComponent(TablePager);

        expect(pager.exists()).toBe(true);
        expect(store.page.systems).toBe(1);

        await pager.get('[data-page="next"]').trigger('click');

        expect(store.page.systems).toBe(2);
        expect(wrapper.findAll('[data-system-row]')).toHaveLength(2);
        expect(wrapper.get('[data-pager-caption]').text()).toBe('SHOWING 13–14 OF 14');
        expect(pager.get('[data-page="2"]').attributes('aria-current')).toBe('page');

        await pager.get('[data-page="prev"]').trigger('click');
        expect(store.page.systems).toBe(1);
        expect(wrapper.findAll('[data-system-row]')).toHaveLength(12);
    });

    it('zero-pads the ID column to at least three digits and never truncates (D-12)', () => {
        const { wrapper } = mountTable();
        const ids = wrapper.findAll('[data-cell="id"]').map(cell => cell.text());

        // Default sort is planets-desc: 140 (9) · 1 (3) · 2 (1) · 1204 (0).
        expect(ids).toEqual(['140', '001', '002', '1204']);
    });

    it('renders names verbatim from the payload (D-11)', () => {
        const { wrapper } = mountTable();
        const names = wrapper.findAll('[data-system-row] a').map(link => link.text());

        expect(names).toContain('Kepler-442-A');
        expect(names).toContain('UG-0001');
        expect(names).toContain('UG-1204');
    });

    it('marks life-bearing systems with .ug-row-life', () => {
        const { wrapper } = mountTable();

        expect(wrapper.get('[data-system-row="1"]').classes()).toContain('ug-row-life');
        expect(wrapper.get('[data-system-row="2"]').classes()).not.toContain('ug-row-life');
    });
});

describe('OrbitProfile — the per-row planetary layout', () => {
    it('sizes each planet 10 + 18 × (d / dMax_row), rounded, in orbital order', () => {
        const { wrapper } = mountTable();
        const profile = wrapper.get('[data-system-row="1"]').findComponent(OrbitProfile);
        const widths = profile.findAll('img').map(img => img.attributes('width'));

        // dMax = 20 000: 5 000 -> 14.5 -> 15, 10 000 -> 19, 20 000 -> 28.
        expect(widths).toEqual(['15', '19', '28']);
    });

    it('uses a 7px gap up to eight planets and 14px beyond', () => {
        const { wrapper } = mountTable();

        expect(wrapper.get('[data-system-row="1"]').findComponent(OrbitProfile)
            .get('div').attributes('style')).toContain('gap: 7px');
        expect(wrapper.get('[data-system-row="140"]').findComponent(OrbitProfile)
            .get('div').attributes('style')).toContain('gap: 14px');
    });

    it('rings a habitable-zone planet in green, and only that one', () => {
        const { wrapper } = mountTable();
        const thumbs = wrapper.get('[data-system-row="1"]').findComponent(OrbitProfile)
            .findAllComponents(CelestialThumb);

        expect(thumbs.map(thumb => thumb.props('ring')))
            .toEqual([undefined, '#34d399', undefined]);
        expect(thumbs[1].get('span').attributes('style')).toContain('0 0 0 2px #34d399');
    });

    it('shows the empty caption for a system with no planets', () => {
        const { wrapper } = mountTable();
        const profile = wrapper.get('[data-system-row="1204"]').findComponent(OrbitProfile);

        expect(profile.text()).toBe('no planetary bodies');
        // jsdom normalises the hex to rgb(): #334155.
        expect(profile.get('div').attributes('style')).toContain('rgb(51, 65, 85)');
        expect(profile.findAllComponents(CelestialThumb)).toHaveLength(0);
    });
});

describe('SystemsTable — the filter bar', () => {
    it('never lets a filter-bar child wrap', () => {
        const { wrapper } = mountTable();
        const bar = wrapper.get('[data-filter-bar]').element;

        const children = [
            ...bar.querySelectorAll(':scope > *'),
            ...bar.querySelectorAll(':scope > * > *')
        ];

        expect(children.length).toBeGreaterThan(0);
        expect(bar.className).not.toContain('flex-wrap');
        for (const child of children) {
            expect(child.className).toContain('flex-none');
            expect(child.className).toContain('whitespace-nowrap');
        }
    });

    it('matches the search on name or systemId, trimmed and case-insensitive (§8)', async () => {
        const { wrapper } = mountTable();
        const query = wrapper.get('[data-filter="query"]');

        await query.setValue('  kepler-442  ');
        expect(rowIds(wrapper)).toEqual(['140']);

        await query.setValue('1204');
        expect(rowIds(wrapper)).toEqual(['1204']);

        // The padded id the ID column shows is searchable too.
        await query.setValue('002');
        expect(rowIds(wrapper)).toEqual(['2']);
    });

    it('shows the no-match message in #475569 when nothing matches', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-filter="query"]').setValue('no-such-system');

        const empty = wrapper.get('[data-empty]');
        expect(empty.text()).toBe('No systems match the current filters.');
        // jsdom normalises the hex to rgb(): #475569.
        expect(empty.attributes('style')).toContain('rgb(71, 85, 105)');
        expect(wrapper.findAll('[data-system-row]')).toHaveLength(0);
    });

    it('filters by preset and counts the filtered set, not the sector', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-preset="life"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['1']);
        expect(wrapper.get('[data-counter="SHOWN"]').text()).toContain('1');

        await wrapper.get('[data-preset="multi"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['1', '2']);
        expect(wrapper.get('[data-counter="MULTI-STAR"]').text()).toContain('2');

        await wrapper.get('[data-preset="hz"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['1']);

        await wrapper.get('[data-preset="all"]').trigger('click');
        expect(rowIds(wrapper)).toHaveLength(4);
    });

    it('reorders the rows when the sort changes', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-filter="sort"]').setValue('id-asc');
        expect(rowIds(wrapper)).toEqual(['1', '2', '140', '1204']);

        await wrapper.get('[data-filter="sort"]').setValue('planets-asc');
        expect(rowIds(wrapper)).toEqual(['1204', '2', '1', '140']);
    });

    it('resets pagination to page 1 on any filter, preset or sort change', async () => {
        const { store, wrapper } = mountTable(FOURTEEN);

        const goToPageTwo = async () => {
            await wrapper.findComponent(TablePager).get('[data-page="next"]').trigger('click');
            expect(store.page.systems).toBe(2);
        };

        await goToPageTwo();
        await wrapper.get('[data-filter="query"]').setValue('UG');
        expect(store.page.systems).toBe(1);

        await goToPageTwo();
        await wrapper.get('[data-preset="multi"]').trigger('click');
        expect(store.page.systems).toBe(1);

        await wrapper.get('[data-preset="all"]').trigger('click');
        await goToPageTwo();
        await wrapper.get('[data-filter="sort"]').setValue('id-desc');
        expect(store.page.systems).toBe(1);

        await goToPageTwo();
        await wrapper.get('[data-filter="primary-class"]').setValue('G');
        expect(store.page.systems).toBe(1);
    });
});

describe('SystemsTable — labels, artwork and the loading state', () => {
    it('names the primary class through STAR_SHORT_LABEL and draws it with CelestialThumb', () => {
        const { wrapper } = mountTable();
        const cell = wrapper.get('[data-system-row="1"]');

        // K has a D-21 short label; the visible code stays the design's "K-4".
        expect(cell.text()).toContain('K-4');
        expect(cell.text()).toContain('Orange dwarf');

        const thumb = cell.findComponent(CelestialThumb);
        expect(thumb.props('code')).toBe('K');
        expect(thumb.props('kind')).toBe('star');
    });

    it('falls through to STAR_TYPE_DESCRIPTIONS for a class with no short label (D-21)', () => {
        const giants: Sector = {
            systems: [system(1, 'UG-0001')],
            stars: [star(1, 1, 'gM')],
            planets: []
        };

        expect(mountTable(giants).wrapper.get('[data-system-row="1"]').text())
            .toContain('Red Giant');
    });

    it('renders 8 .ug-skeleton rows while a generation is in flight, never a spinner', async () => {
        const { store, wrapper } = mountTable(FOURTEEN);

        expect(wrapper.findAll('.ug-skeleton')).toHaveLength(0);

        store.generationStatus = 'running';
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('.ug-skeleton')).toHaveLength(8);
        expect(wrapper.findAll('[data-system-row]')).toHaveLength(0);
        expect(wrapper.find('.loading').exists()).toBe(false);
        // The filter bar and the column header stay, so the layout never collapses.
        expect(wrapper.find('[data-filter-bar]').exists()).toBe(true);
    });

    it('renders an empty sector without NaN, undefined or Infinity', () => {
        const { wrapper } = mountTable({ systems: [], stars: [], planets: [] });

        expect(wrapper.text()).not.toMatch(/NaN|undefined|Infinity/);
        expect(wrapper.get('[data-empty]').text()).toBe('No systems match the current filters.');
    });
});
