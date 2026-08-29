// Interaction coverage for the Stars index (D-23) — StarTable and the shared
// TablePager built in story 006.
//
// The spec wrote D-34 ("no component tests") before this project had a DOM test
// harness; story 004b added jsdom and @vue/test-utils scoped to *.dom.test.ts
// precisely to serve stories 005-008, and story 006 established the precedent of
// asserting a table's behavioural criteria here rather than leaving them to a
// manual checklist. Everything this story specifies — the shell, the documented
// column widths, the presets, the mini-counters, verbatim names, search, the
// pagination reset, the 24 classes and the skeleton state — is asserted below.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { STAR_TYPE_DESCRIPTIONS, type Planet, type Sector, type Star, type System } from '../types';
import { starShortLabel } from '../utils/starDisplay';
import StarTable from './StarTable.vue';
import SystemsTable from './SystemsTable.vue';
import TablePager from './TablePager.vue';
import CelestialThumb from './CelestialThumb.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

const system = (systemId: number, name: string, hasProperName = false): System => ({
    systemId, name, hasProperName, age: 4.6, xPos: 12.402, yPos: -4.118, zPos: 33.907
});

const star = (
    starId: number,
    systemId: number,
    name: string,
    spectralClass: string,
    subclass?: number
): Star => ({ starId, systemId, name, spectralClass, subclass });

const planet = (
    starId: number,
    orbitalNumber: number,
    extra: Partial<Planet> = {}
): Planet => ({
    starId,
    orbitalNumber,
    planetType: 'R',
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
 * Five stars across three systems, between them covering every display case:
 *  1  UG-0001-A   K-4  system UG-0001   3 planets, 1 HZ, 5 moons
 *  2  UG-0001-B   M    system UG-0001   no planets
 *  3  Kepler-442-A G-2 system Necklace  2 planets, 0 HZ, 3 moons
 *  4  Necklace-B  BH   system Necklace  exotic, no planets
 *  5  UG-1204     NS   system UG-1204   exotic, 1 planet
 */
const FIXTURE: Sector = {
    systems: [system(1, 'UG-0001'), system(2, 'Necklace', true), system(1204, 'UG-1204')],
    stars: [
        star(1, 1, 'UG-0001-A', 'K', 4),
        star(2, 1, 'UG-0001-B', 'M'),
        star(3, 2, 'Kepler-442-A', 'G', 2),
        star(4, 2, 'Necklace-B', 'BH'),
        star(5, 1204, 'UG-1204', 'NS')
    ],
    planets: [
        planet(1, 1, { moonCount: 0 }),
        planet(1, 2, { habitableZone: true, moonCount: 2 }),
        planet(1, 3, { moonCount: 3 }),
        planet(3, 1, { moonCount: 1 }),
        planet(3, 2, { moonCount: 2 }),
        planet(5, 1, { moonCount: 0 })
    ]
};

/** Fourteen bare stars, so the 12-row page size actually paginates. */
const FOURTEEN: Sector = {
    systems: [system(1, 'UG-0001')],
    stars: Array.from({ length: 14 }, (_, index) => star(index + 1, 1, `UG-0001-${index + 1}`, 'G', 2)),
    planets: []
};

/** One star of every frozen class, in the canonical map's order (D-36). */
const ALL_CLASSES: Sector = {
    systems: [system(1, 'UG-0001')],
    stars: Object.keys(STAR_TYPE_DESCRIPTIONS).map((cls, index) =>
        star(index + 1, 1, `UG-0001-${index + 1}`, cls)),
    planets: []
};

let mounted: VueWrapper[] = [];

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/system/:id', component: { template: '<div />' } }
    ]
});

function mountTable(sector: Sector = FIXTURE, pinia?: Pinia) {
    const activePinia = pinia ?? createPinia();
    setActivePinia(activePinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.generationStatus = 'done';
    store.activeTab = 'stars';

    const wrapper = mount(StarTable, { global: { plugins: [activePinia, makeRouter()] } });
    mounted.push(wrapper);
    return { store, wrapper };
}

/** 3a itself, mounted so the two shells can be compared rather than transcribed. */
function mountSystemsTable(sector: Sector = FIXTURE) {
    const activePinia = createPinia();
    setActivePinia(activePinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.generationStatus = 'done';
    store.activeTab = 'systems';

    const wrapper = mount(SystemsTable, { global: { plugins: [activePinia, makeRouter()] } });
    mounted.push(wrapper);
    return wrapper;
}

const rowIds = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('[data-star-row]').map(row => row.attributes('data-star-row') as string);

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('StarTable — 3a\'s shell, built by analogy (D-23)', () => {
    it('uses the same filter-bar grammar as SystemsTable: search, preset, sort, counters', () => {
        const { wrapper } = mountTable();
        const bar = wrapper.get('[data-filter-bar]');

        expect(bar.find('[data-filter="query"]').exists()).toBe(true);
        expect(bar.findAll('[data-preset]').map(button => button.text()))
            .toEqual(['ALL', 'WITH PLANETS', 'HZ > 0', 'EXOTIC']);
        expect(bar.find('[data-filter="sort"]').exists()).toBe(true);
        expect(bar.findAll('[data-counter]').map(counter => counter.attributes('data-counter')))
            .toEqual(['SHOWN', 'CLASSES', 'EXOTIC']);
    });

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

    it('lays the columns out at the documented widths, thumbnail included', () => {
        const { wrapper } = mountTable();
        const track = 'grid-cols-[40px_190px_112px_1fr_52px_46px_52px]';

        const header = wrapper.findAll('.border-b.border-line-strong')
            .find(node => node.classes().includes(track));
        expect(header, 'the column header carries the documented track list').toBeTruthy();
        expect(header!.findAll('span').map(cell => cell.text()))
            .toEqual(['ID', 'STAR', 'CLASS', 'SYSTEM', 'PLANETS', 'HZ', 'MOONS']);

        const row = wrapper.get('[data-star-row="1"]');
        expect(row.classes()).toContain(track);
        // The CLASS cell carries a 20px thumbnail.
        expect(row.findComponent(CelestialThumb).props('px')).toBe(20);
    });

    it('keeps the same row rhythm and the same shared footer pager as 3a', () => {
        const { wrapper } = mountTable(FOURTEEN);

        expect(wrapper.findAll('[data-star-row]')).toHaveLength(12);
        expect(wrapper.get('[data-pager-caption]').text()).toBe('SHOWING 1–12 OF 14');
        expect(wrapper.findComponent(TablePager).exists()).toBe(true);

        // Both indexes mount the same TablePager, and their rows carry the same
        // classes once each table's own column track is set aside.
        const systems = mountSystemsTable();
        expect(systems.findComponent(TablePager).exists()).toBe(true);

        const rhythm = (classes: string[]) =>
            classes.filter(name => !name.includes('grid-cols-')).sort();

        expect(rhythm(wrapper.get('[data-star-row="1"]').classes()))
            .toEqual(rhythm(systems.get('[data-system-row="1"]').classes()));
    });

    it('drives pagination through store.page.stars', async () => {
        const { store, wrapper } = mountTable(FOURTEEN);
        const pager = wrapper.findComponent(TablePager);

        expect(store.page.stars).toBe(1);

        await pager.get('[data-page="next"]').trigger('click');

        expect(store.page.stars).toBe(2);
        expect(wrapper.findAll('[data-star-row]')).toHaveLength(2);
        expect(wrapper.get('[data-pager-caption]').text()).toBe('SHOWING 13–14 OF 14');

        await pager.get('[data-page="prev"]').trigger('click');
        expect(store.page.stars).toBe(1);
        expect(wrapper.findAll('[data-star-row]')).toHaveLength(12);
    });

    it('reports each star\'s own planet, HZ and moon counts', () => {
        const { wrapper } = mountTable();
        const cells = (starId: number) =>
            wrapper.get(`[data-star-row="${starId}"]`).findAll('span.text-right').map(cell => cell.text());

        expect(cells(1)).toEqual(['3', '1', '5']);
        // A companion in a multi-star system reports only what orbits it.
        expect(cells(2)).toEqual(['0', '0', '0']);
        expect(cells(3)).toEqual(['2', '0', '3']);
    });
});

describe('StarTable — presets and mini-counters', () => {
    it('filters to every star under ALL', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-preset="all"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['1', '2', '3', '4', '5']);
    });

    it('filters to stars with at least one planet under WITH PLANETS', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-preset="planets"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['1', '3', '5']);
    });

    it('filters to stars with a habitable-zone planet under HZ > 0', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-preset="hz"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['1']);
    });

    it('filters to BH and NS under EXOTIC', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-preset="exotic"]').trigger('click');
        expect(rowIds(wrapper)).toEqual(['4', '5']);
    });

    it('counts SHOWN, CLASSES and EXOTIC over the filtered set, not the sector', async () => {
        const { wrapper } = mountTable();
        const counter = (label: string) => wrapper.get(`[data-counter="${label}"]`).text();

        // All five: K, M, G, BH, NS — five distinct classes, two exotic.
        expect(counter('SHOWN')).toContain('5');
        expect(counter('CLASSES')).toContain('5');
        expect(counter('EXOTIC')).toContain('2');

        await wrapper.get('[data-preset="exotic"]').trigger('click');
        expect(counter('SHOWN')).toContain('2');
        expect(counter('CLASSES')).toContain('2');
        expect(counter('EXOTIC')).toContain('2');

        await wrapper.get('[data-preset="hz"]').trigger('click');
        expect(counter('SHOWN')).toContain('1');
        expect(counter('CLASSES')).toContain('1');
        expect(counter('EXOTIC')).toContain('0');
    });

    it('paints CLASSES violet and EXOTIC red', () => {
        const { wrapper } = mountTable();
        const value = (label: string) => wrapper.get(`[data-counter="${label}"] span`).attributes('style');

        // jsdom normalises the hex: #c4b5fd and #fca5a5.
        expect(value('CLASSES')).toContain('rgb(196, 181, 253)');
        expect(value('EXOTIC')).toContain('rgb(252, 165, 165)');
    });
});

describe('StarTable — names, IDs, search and sort', () => {
    it('renders star names verbatim from the payload (D-11)', () => {
        const { wrapper } = mountTable();
        const names = wrapper.findAll('[data-cell="name"]').map(cell => cell.text());

        expect(names).toEqual([
            'UG-0001-A', 'UG-0001-B', 'Kepler-442-A', 'Necklace-B', 'UG-1204'
        ]);
    });

    it('zero-pads the ID column to at least three digits', () => {
        const { wrapper } = mountTable();

        expect(wrapper.findAll('[data-cell="id"]').map(cell => cell.text()))
            .toEqual(['001', '002', '003', '004', '005']);
    });

    it('links each row\'s SYSTEM cell to its system', () => {
        const { wrapper } = mountTable();
        const cell = wrapper.get('[data-star-row="3"] [data-cell="system"]');

        expect(cell.text()).toBe('Necklace');
        expect(cell.attributes('href')).toBe('/system/2');
    });

    it('matches the search on the star name, trimmed and case-insensitive', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-filter="query"]').setValue('  kepler-442  ');
        expect(rowIds(wrapper)).toEqual(['3']);
    });

    it('matches the search on the containing system\'s name or id', async () => {
        const { wrapper } = mountTable();
        const query = wrapper.get('[data-filter="query"]');

        // Both of Necklace's stars, one of which is not itself named "Necklace".
        await query.setValue('necklace');
        expect(rowIds(wrapper)).toEqual(['3', '4']);

        await query.setValue('1204');
        expect(rowIds(wrapper)).toEqual(['5']);
    });

    it('shows the no-match message in #475569 when nothing matches', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-filter="query"]').setValue('no-such-star');

        const empty = wrapper.get('[data-empty]');
        expect(empty.text()).toBe('No stars match the current filters.');
        // jsdom normalises the hex to rgb(): #475569.
        expect(empty.attributes('style')).toContain('rgb(71, 85, 105)');
        expect(wrapper.findAll('[data-star-row]')).toHaveLength(0);
    });

    it('reorders the rows when the sort changes', async () => {
        const { wrapper } = mountTable();
        const sort = wrapper.get('[data-filter="sort"]');

        expect(rowIds(wrapper)).toEqual(['1', '2', '3', '4', '5']);

        await sort.setValue('id-desc');
        expect(rowIds(wrapper)).toEqual(['5', '4', '3', '2', '1']);

        await sort.setValue('planets-desc');
        expect(rowIds(wrapper)).toEqual(['1', '3', '5', '2', '4']);

        await sort.setValue('hz-desc');
        expect(rowIds(wrapper)).toEqual(['1', '2', '3', '4', '5']);

        await sort.setValue('moons-desc');
        expect(rowIds(wrapper)).toEqual(['1', '3', '2', '4', '5']);

        await sort.setValue('name-asc');
        expect(rowIds(wrapper)).toEqual(['3', '4', '1', '2', '5']);

        // BH · G-2 · K-4 · M · NS
        await sort.setValue('class-asc');
        expect(rowIds(wrapper)).toEqual(['4', '3', '1', '2', '5']);
    });

    it('resets pagination to page 1 on any filter, preset or sort change', async () => {
        const { store, wrapper } = mountTable(FOURTEEN);

        const goToPageTwo = async () => {
            await wrapper.findComponent(TablePager).get('[data-page="next"]').trigger('click');
            expect(store.page.stars).toBe(2);
        };

        await goToPageTwo();
        await wrapper.get('[data-filter="query"]').setValue('UG');
        expect(store.page.stars).toBe(1);

        await goToPageTwo();
        await wrapper.get('[data-preset="planets"]').trigger('click');
        expect(store.page.stars).toBe(1);

        await wrapper.get('[data-preset="all"]').trigger('click');
        await goToPageTwo();
        await wrapper.get('[data-filter="sort"]').setValue('id-desc');
        expect(store.page.stars).toBe(1);
    });
});

describe('StarTable — labels, artwork and the loading state', () => {
    it('names the class through STAR_SHORT_LABEL and draws it with CelestialThumb', () => {
        const { wrapper } = mountTable();
        const row = wrapper.get('[data-star-row="1"]');

        // K has a D-21 short label; the visible code stays the design's "K-4".
        expect(row.text()).toContain('K-4');
        expect(row.text()).toContain('Orange dwarf');

        const thumb = row.findComponent(CelestialThumb);
        expect(thumb.props('code')).toBe('K');
        expect(thumb.props('kind')).toBe('star');
    });

    it('falls through to STAR_TYPE_DESCRIPTIONS for a class with no short label (D-21)', () => {
        const giants: Sector = {
            systems: [system(1, 'UG-0001')],
            stars: [star(1, 1, 'UG-0001', 'gM')],
            planets: []
        };

        expect(mountTable(giants).wrapper.get('[data-star-row="1"]').text())
            .toContain('Red Giant');
    });

    it('renders every one of the 24 frozen classes with a thumbnail and a label (D-36, D-37)', async () => {
        const classes = Object.keys(STAR_TYPE_DESCRIPTIONS);
        expect(classes).toHaveLength(24);

        const { wrapper } = mountTable(ALL_CLASSES);
        const seen = new Map<string, string>();

        const collect = () => {
            for (const row of wrapper.findAll('[data-star-row]')) {
                const thumb = row.findComponent(CelestialThumb);
                const src = thumb.get('img').attributes('src') as string;
                seen.set(thumb.props('code') as string, src);
                expect(row.text()).toContain(starShortLabel(thumb.props('code') as string));
            }
        };

        collect();
        await wrapper.findComponent(TablePager).get('[data-page="next"]').trigger('click');
        collect();

        expect([...seen.keys()].sort()).toEqual([...classes].sort());
        for (const [cls, src] of seen) {
            // Thumbs size at 20px, and never a broken/empty source.
            expect(src, `${cls} resolves a thumb`).toMatch(/^\/images\/stars\/thumbs\/star-.+\.png$/);
            expect(src).not.toContain('undefined');
        }

        // D-37: the four aliased white dwarfs keep sharing star-DA.png.
        for (const cls of ['DB', 'DF', 'DG', 'DK']) {
            expect(seen.get(cls)).toBe('/images/stars/thumbs/star-DA.png');
        }
    });

    it('renders 8 .ug-skeleton rows while a generation is in flight, never a spinner', async () => {
        const { store, wrapper } = mountTable(FOURTEEN);

        expect(wrapper.findAll('.ug-skeleton')).toHaveLength(0);

        store.generationStatus = 'running';
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('.ug-skeleton')).toHaveLength(8);
        expect(wrapper.findAll('[data-star-row]')).toHaveLength(0);
        expect(wrapper.find('.loading').exists()).toBe(false);
        // The filter bar and the column header stay, so the layout never collapses.
        expect(wrapper.find('[data-filter-bar]').exists()).toBe(true);
    });

    it('renders an empty sector without NaN, undefined or Infinity', () => {
        const { wrapper } = mountTable({ systems: [], stars: [], planets: [] });

        expect(wrapper.text()).not.toMatch(/NaN|undefined|Infinity/);
        expect(wrapper.get('[data-empty]').text()).toBe('No stars match the current filters.');
    });
});
