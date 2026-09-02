// Interaction coverage for the Planets index (4a) — PlanetTable, the shared
// TablePager built in story 006, and the type-card cross-filter that lands on
// this tab from Overview and Statistics (spec §11 Slice 5).
//
// The spec wrote D-34 ("no component tests") before this project had a DOM test
// harness; story 004b added jsdom and @vue/test-utils scoped to *.dom.test.ts
// precisely to serve stories 005-008, and stories 006 and 007 established the
// precedent of asserting a table's behavioural criteria here rather than leaving
// them to a manual checklist.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { PLANET_TYPE_DESCRIPTIONS, type Planet, type Sector, type Star, type System } from '../types';
import { planetShortLabel } from '../utils/planetDisplay';
import { thinThousands } from '../utils/format';
import PlanetTable from './PlanetTable.vue';
import PlanetTypeDistribution from './PlanetTypeDistribution.vue';
import ResultsDisplay from './ResultsDisplay.vue';
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
    spectralClass = 'G',
    subclass = 2
): Star => ({ starId, systemId, name, spectralClass, subclass });

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
 * Two systems, three stars, seven planets — between them every display case the
 * story names. Key = `<starId>-<orbitalNumber>`.
 *
 *  1-1  Thalassa (named)    E  habitable, life, 2 moons, 13 402 km
 *  1-2  Kepler-442 c        G  cold giant, 12 moons, 140 000 km  (the largest)
 *  1-3  Kepler-442 d        R  hot, no moons
 *  2-1  UG-0002-A b         I  cold
 *  2-2  UG-0002-A c         O  habitable
 *  2-3  UG-0002-A d         D  temperate
 *  3-1  UG-0002-B b         U  cold ice giant
 */
const FIXTURE: Sector = {
    systems: [system(1, 'Kepler-442', true), system(2, 'UG-0002')],
    stars: [
        star(1, 1, 'Kepler-442', 'K', 4),
        star(2, 2, 'UG-0002-A'),
        // No subclass at all, so the SYSTEM / STAR cell prints the bare class.
        { starId: 3, systemId: 2, name: 'UG-0002-B', spectralClass: 'M' }
    ],
    planets: [
        planet(1, 1, 'E', {
            name: 'Thalassa', habitableZone: true, hasLife: true, lifeComplexity: 4.2,
            moonCount: 2, diameter: 13402, temperature: 288
        }),
        planet(1, 2, 'G', { diameter: 140000, moonCount: 12, temperature: 90 }),
        planet(1, 3, 'R', { diameter: 9000, moonCount: 0, temperature: 400 }),
        planet(2, 1, 'I', { diameter: 6000, temperature: 120 }),
        planet(2, 2, 'O', { diameter: 14000, habitableZone: true, temperature: 280 }),
        planet(2, 3, 'D', { diameter: 8000, temperature: 250 }),
        planet(3, 1, 'U', { diameter: 50000, temperature: 60 })
    ]
};

/** Twelve planets on one star, so the 10-row page size actually paginates. */
const TWELVE: Sector = {
    systems: [system(1, 'Kepler-442', true)],
    stars: [star(1, 1, 'Kepler-442', 'K', 4)],
    planets: Array.from({ length: 12 }, (_, index) =>
        planet(1, index + 1, 'R', { diameter: 20000 - index * 100 }))
};

/**
 * Nine present types, so the pill strip's "+N" chip has work to do. The counts
 * are deliberately uneven: the strip is count-descending, so 'S' — the rarest,
 * and the one type here with no D-21 short label — is the one left outside the
 * top 8. It is the last planet in the list, hence key "1-24".
 */
const NINE_TYPES: Sector = {
    systems: [system(1, 'UG-0001')],
    stars: [star(1, 1, 'UG-0001-A')],
    planets: [
        'R', 'R', 'R', 'R', 'R',
        'G', 'G', 'G', 'G',
        'D', 'D', 'D',
        'I', 'I', 'I',
        'A', 'A',
        'E', 'E',
        'O', 'O',
        'U', 'U',
        'S'
    ].map((type, index) => planet(1, index + 1, type))
};

/** The rarest type in NINE_TYPES, and its row key. */
const RARE_TYPE = 'S';
const RARE_KEY = '1-24';

/** One planet of every frozen code, in the canonical map's order (D-36). */
const ALL_TYPES: Sector = {
    systems: [system(1, 'UG-0001')],
    stars: [star(1, 1, 'UG-0001-A')],
    planets: Object.keys(PLANET_TYPE_DESCRIPTIONS).map((type, index) =>
        planet(1, index + 1, type, { diameter: 30000 - index * 100 }))
};

let mounted: VueWrapper[] = [];

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/:sid', name: 'sector', component: { template: '<div />' } },
        { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } }
    ]
});

function mountTable(sector: Sector = FIXTURE, pinia?: Pinia) {
    const activePinia = pinia ?? createPinia();
    setActivePinia(activePinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.generationStatus = 'done';
    store.activeTab = 'planets';

    const wrapper = mount(PlanetTable, { global: { plugins: [activePinia, makeRouter()] } });
    mounted.push(wrapper);
    return { store, wrapper };
}

/** The whole tab host, so the cross-filter can be driven end to end. */
function mountResults(sector: Sector = FIXTURE) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.generationStatus = 'done';

    const wrapper = mount(ResultsDisplay, { global: { plugins: [pinia, makeRouter()] } });
    mounted.push(wrapper);
    return { store, wrapper };
}

const rowKeys = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('[data-planet-row]').map(row => row.attributes('data-planet-row') as string);

/** The inline style of one row's relative-size bar. */
const barStyle = (wrapper: VueWrapper, key: string): string =>
    wrapper.get(`[data-planet-row="${key}"] [data-size-bar]`).attributes('style') as string;

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('PlanetTable — rows and pagination', () => {
    it('shows 10 rows per page, driven by TablePager and store.page.planets', async () => {
        const { store, wrapper } = mountTable(TWELVE);
        const pager = wrapper.findComponent(TablePager);

        expect(pager.exists()).toBe(true);
        expect(wrapper.findAll('[data-planet-row]')).toHaveLength(10);
        expect(wrapper.get('[data-pager-caption]').text()).toBe('SHOWING 1–10 OF 12');
        expect(store.page.planets).toBe(1);

        await pager.get('[data-page="next"]').trigger('click');

        expect(store.page.planets).toBe(2);
        expect(wrapper.findAll('[data-planet-row]')).toHaveLength(2);
        expect(wrapper.get('[data-pager-caption]').text()).toBe('SHOWING 11–12 OF 12');

        await pager.get('[data-page="prev"]').trigger('click');
        expect(store.page.planets).toBe(1);
        expect(wrapper.findAll('[data-planet-row]')).toHaveLength(10);
    });

    it('lays the columns out at the documented widths', () => {
        const { wrapper } = mountTable();
        const track = 'lg:grid-cols-[180px_132px_150px_96px_84px_74px_64px_1fr_104px]';

        const header = wrapper.findAll('.border-b.border-line-strong')
            .find(node => node.classes().includes(track));
        expect(header, 'the column header carries the documented track list').toBeTruthy();
        expect(header!.findAll('span').map(cell => cell.text()))
            .toEqual(['PLANET', 'TYPE', 'SYSTEM / STAR', 'Ø KM', 'TEMP', 'MOONS', 'ORBIT',
                'RELATIVE SIZE', 'ZONE']);

        expect(wrapper.get('[data-planet-row="1-1"]').classes()).toContain(track);
    });

    it('reads each row\'s system, star class, diameter, temperature, moons and orbit', () => {
        const { wrapper } = mountTable();
        const row = wrapper.get('[data-planet-row="1-2"]');

        expect(row.get('[data-cell="system"]').text()).toBe('Kepler-442 · K-4');
        // thinThousands groups with a thin space, not an ordinary one.
        expect(row.text()).toContain(thinThousands(140000));
        expect(row.get('[data-cell="temp"]').text()).toBe('90');
        expect(row.text()).toContain('#2');
        // A star with no subclass prints the bare class.
        expect(wrapper.get('[data-planet-row="3-1"] [data-cell="system"]').text())
            .toBe('UG-0002 · M');
    });
});

describe('PlanetTable — the relative-size bar', () => {
    it('sets the bar width to diameter / maxPlanetDiameter', () => {
        const { wrapper } = mountTable();
        const width = (key: string) => {
            const match = /width:\s*([\d.]+)%/.exec(barStyle(wrapper, key));
            return Number(match![1]) / 100;
        };

        // The sector's largest planet is 1-2 at 140 000 km.
        expect(width('1-2')).toBeCloseTo(1, 10);
        expect(width('1-1')).toBeCloseTo(13402 / 140000, 10);
        expect(width('2-1')).toBeCloseTo(6000 / 140000, 10);
        expect(width('3-1')).toBeCloseTo(50000 / 140000, 10);
    });

    it('applies the documented fill precedence: habitable, then giant, then zone', () => {
        const { wrapper } = mountTable();

        // habitableZone wins, including over a giant type (see below).
        expect(barStyle(wrapper, '1-1')).toContain('rgb(52, 211, 153)');
        expect(barStyle(wrapper, '2-2')).toContain('rgb(52, 211, 153)');

        // A giant that is not habitable takes the violet -> blue gradient.
        for (const key of ['1-2', '3-1']) {
            expect(barStyle(wrapper, key))
                .toContain('linear-gradient(90deg, rgb(139, 92, 246), rgb(59, 130, 246))');
        }

        // Everything else falls through to its thermal zone: red / amber / blue.
        expect(barStyle(wrapper, '1-3')).toContain('rgb(239, 68, 68)');   // 400 K, hot
        expect(barStyle(wrapper, '2-3')).toContain('rgb(245, 158, 11)');  // 250 K, temperate
        expect(barStyle(wrapper, '2-1')).toContain('rgb(59, 130, 246)');  // 120 K, cold
    });

    it('lets habitableZone outrank a giant type', () => {
        // A habitable gas giant is impossible in the payload but trivially
        // expressible, and it is the only case that separates the first two
        // rules from each other.
        const { wrapper } = mountTable({
            systems: [system(1, 'UG-0001')],
            stars: [star(1, 1, 'UG-0001-A')],
            planets: [planet(1, 1, 'G', { habitableZone: true, diameter: 100000 })]
        });

        expect(barStyle(wrapper, '1-1')).toContain('rgb(52, 211, 153)');
        expect(barStyle(wrapper, '1-1')).not.toContain('linear-gradient');
    });

    it('renders a 0% bar rather than NaN when the sector is empty', () => {
        const { wrapper } = mountTable({ systems: [], stars: [], planets: [] });

        expect(wrapper.text()).not.toMatch(/NaN|undefined|Infinity/);
        expect(wrapper.get('[data-empty]').text()).toBe('No planets match the current filters.');
    });
});

describe('PlanetTable — the type pills', () => {
    it('shows the top 8 present types with a trailing "+N" chip', () => {
        const { wrapper } = mountTable(NINE_TYPES);
        const pills = wrapper.findAll('[data-type-pill]')
            .map(pill => pill.attributes('data-type-pill') as string);

        // The ALL pill plus eight type pills; the ninth type is behind the chip.
        expect(pills).toHaveLength(9);
        expect(pills[0]).toBe('all');
        expect(pills).not.toContain(RARE_TYPE);
        expect(wrapper.get('[data-type-overflow]').text()).toBe('+1');

        // Seven present types, so no chip at all.
        expect(mountTable().wrapper.find('[data-type-overflow]').exists()).toBe(false);
    });

    it('names each pill through PLANET_SHORT_LABEL and draws it with CelestialThumb', () => {
        const { wrapper } = mountTable();
        const pill = wrapper.get('[data-type-pill="E"]');

        expect(pill.text()).toContain('Earth-like');
        const thumb = pill.findComponent(CelestialThumb);
        expect(thumb.props('kind')).toBe('planet');
        expect(thumb.props('code')).toBe('E');
        expect(thumb.props('px')).toBe(18);
    });

    it('toggles the type in store.planetFilters.types when a pill is clicked', async () => {
        const { store, wrapper } = mountTable();

        expect(store.planetFilters.types).toEqual([]);
        expect(wrapper.get('[data-type-pill="all"]').attributes('aria-pressed')).toBe('true');

        await wrapper.get('[data-type-pill="G"]').trigger('click');
        expect(store.planetFilters.types).toEqual(['G']);
        expect(rowKeys(wrapper)).toEqual(['1-2']);
        expect(wrapper.get('[data-type-pill="G"]').attributes('aria-pressed')).toBe('true');
        expect(wrapper.get('[data-type-pill="all"]').attributes('aria-pressed')).toBe('false');

        // A second type is added, not swapped in.
        await wrapper.get('[data-type-pill="U"]').trigger('click');
        expect(store.planetFilters.types).toEqual(['G', 'U']);
        expect(rowKeys(wrapper)).toEqual(['1-2', '3-1']);

        // Clicking an active pill removes it.
        await wrapper.get('[data-type-pill="G"]').trigger('click');
        expect(store.planetFilters.types).toEqual(['U']);
        expect(rowKeys(wrapper)).toEqual(['3-1']);

        // ALL clears the selection.
        await wrapper.get('[data-type-pill="all"]').trigger('click');
        expect(store.planetFilters.types).toEqual([]);
        expect(rowKeys(wrapper)).toHaveLength(7);
    });

    it('resets pagination to page 1 when the type filter changes', async () => {
        const { store, wrapper } = mountTable(TWELVE);

        await wrapper.findComponent(TablePager).get('[data-page="next"]').trigger('click');
        expect(store.page.planets).toBe(2);

        await wrapper.get('[data-type-pill="R"]').trigger('click');
        expect(store.page.planets).toBe(1);
    });
});

describe('PlanetTable — the cross-filter from Overview and Statistics (Slice 5)', () => {
    it('opens a filtered Planets tab when an Overview type card is clicked', async () => {
        const { store, wrapper } = mountResults();
        const router = wrapper.vm.$router;
        const before = router.currentRoute.value.fullPath;

        expect(store.activeTab).toBe('overview');
        await wrapper.findComponent(PlanetTypeDistribution).get('[data-type-card="G"]')
            .trigger('click');

        expect(store.planetFilters.types).toEqual(['G']);
        expect(store.activeTab).toBe('planets');
        // A cross-filter, not a navigation.
        expect(router.currentRoute.value.fullPath).toBe(before);

        const table = wrapper.findComponent(PlanetTable);
        expect(table.exists()).toBe(true);
        expect(rowKeys(table)).toEqual(['1-2']);
        // The tab's own pill strip agrees with the card that opened it.
        expect(table.get('[data-type-pill="G"]').attributes('aria-pressed')).toBe('true');
        expect(table.get('[data-type-pill="all"]').attributes('aria-pressed')).toBe('false');
    });

    it('replaces any previous type selection rather than adding to it', async () => {
        const { store, wrapper } = mountResults();

        store.planetFilters.types = ['E', 'R'];
        await wrapper.findComponent(PlanetTypeDistribution).get('[data-type-card="I"]')
            .trigger('click');

        expect(store.planetFilters.types).toEqual(['I']);
    });

    it('pins a type card chosen on Statistics into the strip even outside the top 8', async () => {
        const { store, wrapper } = mountResults(NINE_TYPES);

        await wrapper.get('[data-tab="statistics"]').trigger('click');
        // 2a lists every present type, so the rarest one is clickable there.
        await wrapper.findComponent(PlanetTypeDistribution).get(`[data-type-card="${RARE_TYPE}"]`)
            .trigger('click');

        expect(store.planetFilters.types).toEqual([RARE_TYPE]);
        expect(store.activeTab).toBe('planets');

        const table = wrapper.findComponent(PlanetTable);
        expect(table.get(`[data-type-pill="${RARE_TYPE}"]`).attributes('aria-pressed')).toBe('true');
        // Pinning it leaves nothing hidden, so the chip has nothing left to count.
        expect(table.find('[data-type-overflow]').exists()).toBe(false);
        expect(rowKeys(table)).toEqual([RARE_KEY]);
    });

    it('leaves the "+N" chip inert — it is a count, not a control', () => {
        const { wrapper } = mountTable(NINE_TYPES);
        expect(wrapper.get('[data-type-overflow]').element.tagName).not.toBe('BUTTON');
    });
});

describe('PlanetTable — names (D-10) and labels (D-21)', () => {
    it('shows planet.name when the payload carries one', () => {
        const { wrapper } = mountTable();
        expect(wrapper.get('[data-planet-row="1-1"] [data-cell="name"]').text()).toBe('Thalassa');
    });

    it('designates an unnamed planet from its star and orbit letter', () => {
        const { wrapper } = mountTable();
        const name = (key: string) =>
            wrapper.get(`[data-planet-row="${key}"] [data-cell="name"]`).text();

        expect(name('1-2')).toBe('Kepler-442 c');
        expect(name('1-3')).toBe('Kepler-442 d');
        expect(name('2-1')).toBe('UG-0002-A b');
    });

    it('runs the orbit letters b .. h across a seven-planet star', () => {
        const seven: Sector = {
            systems: [system(1, 'Kepler-442', true)],
            stars: [star(1, 1, 'Kepler-442', 'K', 4)],
            planets: Array.from({ length: 7 }, (_, index) => planet(1, index + 1, 'R'))
        };

        const { wrapper } = mountTable(seven);
        expect(wrapper.findAll('[data-cell="name"]').map(cell => cell.text()))
            .toEqual([
                'Kepler-442 b', 'Kepler-442 c', 'Kepler-442 d', 'Kepler-442 e',
                'Kepler-442 f', 'Kepler-442 g', 'Kepler-442 h'
            ]);
    });

    it('labels the type through PLANET_SHORT_LABEL, falling through to the long map', () => {
        const { wrapper } = mountTable({
            systems: [system(1, 'UG-0001')],
            stars: [star(1, 1, 'UG-0001-A')],
            planets: [planet(1, 1, 'U'), planet(1, 2, 'S')]
        });

        // 'U' has a D-21 short label; 'S' has none, so PLANET_TYPE_DESCRIPTIONS wins.
        expect(wrapper.findAll('[data-cell="type"]').map(cell => cell.text()))
            .toEqual(['Ice giant', 'Super-Earth']);
    });

    it('flags a life-bearing planet with the LIFE badge', () => {
        const { wrapper } = mountTable();

        expect(wrapper.get('[data-planet-row="1-1"]').find('.ug-badge-life').exists()).toBe(true);
        expect(wrapper.get('[data-planet-row="1-2"]').find('.ug-badge-life').exists()).toBe(false);
    });

    it('names the thermal zone in a text badge, never colour alone', () => {
        const { wrapper } = mountTable();
        const badge = (key: string) =>
            wrapper.get(`[data-planet-row="${key}"] [data-cell="zone"]`).text();

        expect(badge('1-1')).toBe('GOLDILOCKS');
        expect(badge('1-3')).toBe('HOT');
        expect(badge('2-3')).toBe('TEMPERATE');
        expect(badge('2-1')).toBe('COLD');
    });
});

describe('PlanetTable — opening a planet', () => {
    it('calls store.selectPlanet with the composite key and does not navigate', async () => {
        const { store, wrapper } = mountTable(TWELVE);
        const router = wrapper.vm.$router;
        const before = router.currentRoute.value.fullPath;
        const spy = vi.spyOn(store, 'selectPlanet');

        await wrapper.findComponent(TablePager).get('[data-page="next"]').trigger('click');
        const keysBefore = rowKeys(wrapper);

        await wrapper.get('[data-planet-row="1-11"]').trigger('click');

        expect(spy).toHaveBeenCalledWith('1-11');
        expect(store.selectedPlanetKey).toBe('1-11');
        expect(router.currentRoute.value.fullPath).toBe(before);
        // The table does not move: same page, same rows.
        expect(store.page.planets).toBe(2);
        expect(rowKeys(wrapper)).toEqual(keysBefore);
    });

    it('renders no link out of a planet row', () => {
        const { wrapper } = mountTable();
        expect(wrapper.get('[data-planet-row="1-1"]').findAll('a')).toHaveLength(0);
    });
});

describe('PlanetTable — the zone and sort bar', () => {
    it('filters to habitable-zone planets under GOLDILOCKS and back under ANY', async () => {
        const { store, wrapper } = mountTable();

        expect(wrapper.get('[data-zone="goldilocks"]').text()).toBe('GOLDILOCKS 2');

        await wrapper.get('[data-zone="goldilocks"]').trigger('click');
        expect(store.planetFilters.zone).toBe('goldilocks');
        expect(rowKeys(wrapper)).toEqual(['2-2', '1-1']);

        await wrapper.get('[data-zone="any"]').trigger('click');
        expect(rowKeys(wrapper)).toHaveLength(7);
    });

    it('filters on life and on moons with the two toggles', async () => {
        const { store, wrapper } = mountTable();

        expect(wrapper.get('[data-toggle="life"]').text()).toBe('WITH LIFE 1');
        expect(wrapper.get('[data-toggle="moons"]').text()).toBe('WITH MOONS 6');

        await wrapper.get('[data-toggle="life"]').trigger('click');
        expect(store.planetFilters.hasLife).toBe(true);
        expect(rowKeys(wrapper)).toEqual(['1-1']);

        await wrapper.get('[data-toggle="life"]').trigger('click');
        await wrapper.get('[data-toggle="moons"]').trigger('click');
        expect(store.planetFilters.hasMoons).toBe(true);
        // 1-3 is the only planet with no moons.
        expect(rowKeys(wrapper)).not.toContain('1-3');
        expect(rowKeys(wrapper)).toHaveLength(6);
    });

    it('counts the zone toggles over the type-filtered set', async () => {
        const { wrapper } = mountTable();

        await wrapper.get('[data-type-pill="E"]').trigger('click');

        expect(wrapper.get('[data-zone="goldilocks"]').text()).toBe('GOLDILOCKS 1');
        expect(wrapper.get('[data-toggle="life"]').text()).toBe('WITH LIFE 1');
        expect(wrapper.get('[data-counter="SHOWN"]').text()).toContain('1');
    });

    it('reorders the rows when the sort changes', async () => {
        const { wrapper } = mountTable();
        const sort = wrapper.get('[data-filter="sort"]');

        // Default: diameter descending.
        expect(rowKeys(wrapper)).toEqual(['1-2', '3-1', '2-2', '1-1', '1-3', '2-3', '2-1']);

        await sort.setValue('diameter-asc');
        expect(rowKeys(wrapper)).toEqual(['2-1', '2-3', '1-3', '1-1', '2-2', '3-1', '1-2']);

        await sort.setValue('temp-desc');
        expect(rowKeys(wrapper)).toEqual(['1-3', '1-1', '2-2', '2-3', '2-1', '1-2', '3-1']);

        await sort.setValue('temp-asc');
        expect(rowKeys(wrapper)).toEqual(['3-1', '1-2', '2-1', '2-3', '2-2', '1-1', '1-3']);

        await sort.setValue('moons-desc');
        expect(rowKeys(wrapper)).toEqual(['1-2', '1-1', '2-1', '2-2', '2-3', '3-1', '1-3']);

        await sort.setValue('orbit-asc');
        expect(rowKeys(wrapper)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1']);

        await sort.setValue('name-asc');
        expect(rowKeys(wrapper)).toEqual(['1-2', '1-3', '1-1', '2-1', '2-2', '2-3', '3-1']);
    });

    it('resets pagination to page 1 on any zone, toggle or sort change', async () => {
        const { store, wrapper } = mountTable(TWELVE);

        const goToPageTwo = async () => {
            await wrapper.findComponent(TablePager).get('[data-page="next"]').trigger('click');
            expect(store.page.planets).toBe(2);
        };

        await goToPageTwo();
        await wrapper.get('[data-zone="goldilocks"]').trigger('click');
        expect(store.page.planets).toBe(1);

        await wrapper.get('[data-zone="any"]').trigger('click');
        await goToPageTwo();
        await wrapper.get('[data-toggle="moons"]').trigger('click');
        expect(store.page.planets).toBe(1);

        await wrapper.get('[data-toggle="moons"]').trigger('click');
        await goToPageTwo();
        await wrapper.get('[data-filter="sort"]').setValue('temp-asc');
        expect(store.page.planets).toBe(1);
    });
});

describe('PlanetTable — artwork and the loading state', () => {
    it('renders every one of the 22 frozen codes with a thumbnail and a label (D-36, D-37)', async () => {
        const codes = Object.keys(PLANET_TYPE_DESCRIPTIONS);
        expect(codes).toHaveLength(22);

        const { wrapper } = mountTable(ALL_TYPES);
        const seen = new Map<string, string>();

        const collect = () => {
            for (const row of wrapper.findAll('[data-planet-row]')) {
                const thumb = row.findComponent(CelestialThumb);
                const code = thumb.props('code') as string;
                seen.set(code, thumb.get('img').attributes('src') as string);
                expect(row.get('[data-cell="type"]').text()).toBe(planetShortLabel(code));
            }
        };

        collect();
        const pager = wrapper.findComponent(TablePager);
        await pager.get('[data-page="next"]').trigger('click');
        collect();
        await pager.get('[data-page="next"]').trigger('click');
        collect();

        expect([...seen.keys()].sort()).toEqual([...codes].sort());
        for (const [code, src] of seen) {
            // Thumbs size at 22px, and never a broken or empty source.
            expect(src, `${code} resolves a thumb`).toMatch(/^\/images\/planets\/thumbs\/.+\.png$/);
            expect(src).not.toContain('undefined');
        }
    });

    it('rings a habitable planet\'s thumbnail green', () => {
        const { wrapper } = mountTable();
        const ring = (key: string) =>
            wrapper.get(`[data-planet-row="${key}"]`).findComponent(CelestialThumb).props('ring');

        expect(ring('1-1')).toBe('#34d399');
        expect(ring('1-2')).toBeUndefined();
    });

    it('renders 8 .ug-skeleton rows while a generation is in flight, never a spinner', async () => {
        const { store, wrapper } = mountTable(TWELVE);

        expect(wrapper.findAll('.ug-skeleton')).toHaveLength(0);

        store.generationStatus = 'running';
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('.ug-skeleton')).toHaveLength(8);
        expect(wrapper.findAll('[data-planet-row]')).toHaveLength(0);
        expect(wrapper.find('.loading').exists()).toBe(false);
        // Both filter bars and the column header stay, so the layout never collapses.
        expect(wrapper.find('[data-type-strip]').exists()).toBe(true);
        expect(wrapper.find('[data-zone-bar]').exists()).toBe(true);
    });

    it('never lets a filter-bar child wrap', () => {
        const { wrapper } = mountTable();

        // Handoff 4a: "All children flex:none; white-space:nowrap." The type
        // strip's own children are the pills; the zone bar nests its controls one
        // level deeper inside the left and right groups, so both levels are
        // checked there. A pill's inner thumbnail is not a bar child — it is
        // `shrink-0` inside a pill that already refuses to shrink.
        const cases: Array<[string, string[]]> = [
            ['[data-type-strip]', [':scope > *']],
            ['[data-zone-bar]', [':scope > *', ':scope > * > *']]
        ];

        for (const [selector, scopes] of cases) {
            const bar = wrapper.get(selector).element;
            const children = scopes.flatMap(scope => [...bar.querySelectorAll(scope)]);

            expect(children.length).toBeGreaterThan(0);
            expect(bar.className).not.toContain('flex-wrap');
            for (const child of children) {
                expect(child.className, `${selector} > ${child.tagName}`).toContain('flex-none');
                expect(child.className).toContain('whitespace-nowrap');
            }
        }
    });
});
