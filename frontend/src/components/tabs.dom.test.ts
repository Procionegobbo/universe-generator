// Interaction coverage for the tab shell and the Overview / Statistics bodies.
//
// The spec wrote D-34 ("no component tests") before this project had a DOM test
// harness; story 004b added jsdom and @vue/test-utils scoped to *.dom.test.ts,
// so the behavioural criteria of this story — switching tabs, the "+N" chip
// threshold, the mobile disclosure, and the three surfaces agreeing on the same
// numbers — are asserted here instead of being left to a manual checklist.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import type { Planet, Sector, Star, System } from '../types';
import ResultsDisplay from './ResultsDisplay.vue';
import SectorTabs from './SectorTabs.vue';
import OverviewPanel from './OverviewPanel.vue';
import SectorStatistics from './SectorStatistics.vue';
import KpiStrip from './KpiStrip.vue';
import SpectralDistribution from './SpectralDistribution.vue';
import PlanetTypeDistribution from './PlanetTypeDistribution.vue';
import StarTable from './StarTable.vue';
import PlanetTable from './PlanetTable.vue';
import SystemsTable from './SystemsTable.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

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

/**
 * 3 systems · 4 stars (M, K, G, BH) · 6 planets (6 distinct types, 2 in the
 * habitable zone, 1 with life). Every count stays under 1 000 so no thin-space
 * grouping gets in the way of the string assertions.
 */
const FIXTURE: Sector = {
    systems: [system(1, 'UG-0001'), system(2, 'Necklace', true), system(3, 'UG-0003')],
    stars: [star(1, 1, 'M', 6), star(2, 1, 'K', 4), star(3, 2, 'G', 2), star(4, 3, 'BH')],
    planets: [
        planet(1, 1, 'E', { habitableZone: true, hasLife: true, lifeComplexity: 4.2, name: 'Thalassa' }),
        planet(1, 2, 'R', { temperature: 400, moonCount: 0 }),
        planet(1, 3, 'G', { temperature: 90, moonCount: 12, semiMajorAxis: 6 }),
        planet(2, 1, 'I', { temperature: 120, moonCount: 2 }),
        planet(3, 1, 'O', { habitableZone: true, moonCount: 0 }),
        planet(3, 2, 'D', { temperature: 320, moonCount: 3, semiMajorAxis: 0.2 })
    ]
};

/** Same shape, but with nine planet types present so the "+N" chip has work to do. */
const NINE_TYPES: Sector = {
    systems: [system(1, 'UG-0001')],
    stars: [star(1, 1, 'G', 2)],
    planets: ['R', 'G', 'I', 'D', 'U', 'A', 'O', 'E', 'S']
        .map((type, index) => planet(1, index + 1, type))
};

/** The sector the links carry, since every internal link now names its sector. */
const SID = '766207-m-100-1000';
const PARAMS = { seed: '766207', zone: 'medium' as const, systemCount: 100, sectorVolume: 1000 };

let mounted: VueWrapper[] = [];

function mountWith(component: Parameters<typeof mount>[0], props: Record<string, unknown> = {}, pinia?: Pinia) {
    const activePinia = pinia ?? createPinia();
    setActivePinia(activePinia);
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', name: 'home', component: { template: '<div />' } },
            { path: '/:sid', name: 'sector', component: { template: '<div />' } },
            { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } }
        ]
    });
    const wrapper = mount(component, { props, global: { plugins: [activePinia, router] } });
    mounted.push(wrapper);
    return wrapper;
}

/** Mounts the tab host over a sector, with the store already holding it. */
function mountResults(sector: Sector = FIXTURE) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.loadedParams = { ...PARAMS };
    store.generationStatus = 'done';
    const wrapper = mountWith(ResultsDisplay, {}, pinia);
    return { store, wrapper };
}

/**
 * Readable text of an element: every text node it contains, whitespace
 * collapsed, joined with a single space. Vue's template compiler condenses the
 * whitespace *between* elements away entirely, so plain `textContent` would run
 * a label straight into its value ("SYSTEMS3").
 */
function flat(element: Element): string {
    const walk = (node: Node): string[] => {
        if (node.nodeType === 3) {
            const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
            return text ? [text] : [];
        }
        return [...node.childNodes].flatMap(walk);
    };
    return walk(element).join(' ');
}

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('SectorTabs — the five-tab bar (D-30)', () => {
    it('shows OVERVIEW · STATISTICS · SYSTEMS · n · STARS · n · PLANETS · n', () => {
        const { wrapper } = mountResults();
        const tabs = wrapper.findComponent(SectorTabs).findAll('button');

        expect(tabs.map(tab => flat(tab.element))).toEqual([
            'OVERVIEW', 'STATISTICS', 'SYSTEMS · 3', 'STARS · 4', 'PLANETS · 6'
        ]);
    });

    it('drives store.activeTab rather than the route', async () => {
        const { store, wrapper } = mountResults();
        const router = wrapper.vm.$router;
        const before = router.currentRoute.value.fullPath;

        expect(store.activeTab).toBe('overview');
        await wrapper.get('[data-tab="statistics"]').trigger('click');

        expect(store.activeTab).toBe('statistics');
        expect(router.currentRoute.value.fullPath).toBe(before);
        expect(wrapper.get('[data-tab="statistics"]').attributes('aria-current')).toBe('page');
        expect(wrapper.get('[data-tab="overview"]').attributes('aria-current')).toBeUndefined();
    });
});

describe('ResultsDisplay — the thin tab host', () => {
    it('renders exactly one body per tab, and the tables unchanged', async () => {
        const { wrapper } = mountResults();

        expect(wrapper.findComponent(OverviewPanel).exists()).toBe(true);
        expect(wrapper.findComponent(SectorStatistics).exists()).toBe(false);

        await wrapper.get('[data-tab="statistics"]').trigger('click');
        expect(wrapper.findComponent(OverviewPanel).exists()).toBe(false);
        expect(wrapper.findComponent(SectorStatistics).exists()).toBe(true);

        await wrapper.get('[data-tab="stars"]').trigger('click');
        expect(wrapper.findComponent(StarTable).exists()).toBe(true);
        expect(wrapper.findComponent(SectorStatistics).exists()).toBe(false);

        await wrapper.get('[data-tab="planets"]').trigger('click');
        expect(wrapper.findComponent(PlanetTable).exists()).toBe(true);
        expect(wrapper.findComponent(StarTable).exists()).toBe(false);
    });

    it('renders SystemsTable for the systems tab, with the story-005 stopgap gone', async () => {
        const { wrapper } = mountResults();

        await wrapper.get('[data-tab="systems"]').trigger('click');

        expect(wrapper.findComponent(SystemsTable).exists()).toBe(true);
        expect(wrapper.findComponent(OverviewPanel).exists()).toBe(false);
        // The carried-over life select and its counter are gone with the stopgap.
        expect(wrapper.find('#systemLifeFilter').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Showing 3 of 3 systems');
    });

    it('no longer offers the 3D view (D-24)', () => {
        const { wrapper } = mountResults();
        expect(wrapper.text()).not.toContain('3D View');
    });
});

describe('OverviewPanel — 1a right column', () => {
    it('shows every present spectral class, count descending', () => {
        const { wrapper } = mountResults();
        const rows = wrapper.findComponent(SpectralDistribution).findAll('li');

        // 4 classes present, one star each, so the tie-break is class ascending.
        expect(rows.map(row => flat(row.element))).toEqual([
            'BH · Black hole 1', 'G · Yellow dwarf 1', 'K · Orange dwarf 1', 'M · Red dwarf 1'
        ]);
    });

    it('falls through to the canonical long maps for classes with no short label (D-21)', () => {
        const giants: Sector = {
            systems: [system(1, 'UG-0001')],
            stars: [star(1, 1, 'gM'), star(2, 1, 'M', 6)],
            planets: []
        };

        const rows = mountResults(giants).wrapper.findComponent(SpectralDistribution).findAll('li');

        // 'M' has a D-21 short label; 'gM' has none, so STAR_TYPE_DESCRIPTIONS wins.
        expect(rows.map(row => flat(row.element)))
            .toEqual(['gM · Red Giant 1', 'M · Red dwarf 1']);
    });

    it('ranks notable systems by D-28 and caps the list at four', () => {
        const { wrapper } = mountResults();
        const entries = wrapper.findComponent(OverviewPanel).findAll('a[href*="/system/"]');

        // 1 has the life-bearing planet; 2 has a habitable planet; 3 has neither.
        expect(entries.map(entry => entry.attributes('href')))
            .toEqual([1, 2, 3].map(id => `/${SID}/system/${id}`));
        expect(entries.length).toBeLessThanOrEqual(4);

        expect(flat(entries[0].element)).toContain('UG-0001 LIFE');
        expect(flat(entries[0].element)).toContain('M-6 · 2 stars · 4 planets');
        expect(flat(entries[1].element)).toContain('Necklace IAU');
    });

    it('applies D-28\'s tie-breaks in order, not the system id', () => {
        // 5 -> life; 4 -> a habitable planet; 3 -> most planets; then 1 before 2
        // on systemId. Deliberately the reverse of the natural id order, and one
        // system too many so the cap is visible.
        const ranked: Sector = {
            systems: [1, 2, 3, 4, 5].map(id => system(id, `UG-000${id}`)),
            stars: [1, 2, 3, 4, 5].map(id => star(id, id, 'G', 2)),
            planets: [
                planet(1, 1, 'R'),
                planet(2, 1, 'R'),
                planet(3, 1, 'R'), planet(3, 2, 'R'), planet(3, 3, 'R'),
                planet(4, 1, 'O', { habitableZone: true }),
                planet(5, 1, 'E', { hasLife: true, lifeComplexity: 3 })
            ]
        };

        const { wrapper } = mountResults(ranked);
        const entries = wrapper.findComponent(OverviewPanel).findAll('a[href*="/system/"]');

        expect(entries.map(entry => entry.attributes('href')))
            .toEqual([5, 4, 3, 1].map(id => `/${SID}/system/${id}`));
    });

    it('conveys every occupied thermal zone with a text badge, never colour alone', () => {
        const { wrapper } = mountResults();
        const bar = wrapper.findComponent(OverviewPanel).get('.h-\\[26px\\]');

        // thermalZone(): 2 habitable -> HZ, 400 K and 320 K -> HOT, 120 K and
        // 90 K -> COLD. No planet is temperate, so no TEMP segment is drawn.
        expect(flat(bar.element)).toBe('HOT 2 HZ 2 COLD 2');
    });

    it('shows the top 8 planet types with no chip, and a "+N" chip beyond that', () => {
        const eight = mountResults().wrapper.findComponent(PlanetTypeDistribution);
        expect(eight.findAll('.rounded-card')).toHaveLength(6);
        expect(eight.text()).not.toContain('more types');

        const nine = mountResults(NINE_TYPES).wrapper.findComponent(PlanetTypeDistribution);
        expect(nine.findAll('.rounded-card')).toHaveLength(9); // 8 cards + the chip
        expect(nine.text()).toContain('+1');
        expect(nine.text()).toContain('more types');
    });
});

describe('SpectralDistribution — the mobile disclosure (D-29, §7.7 4d)', () => {
    const SIX_CLASSES: Sector = {
        systems: [system(1, 'UG-0001')],
        stars: ['M', 'K', 'G', 'F', 'DA', 'A'].map((cls, index) => star(index + 1, 1, cls)),
        planets: []
    };

    it('hides everything past the fifth row on mobile only, until it is opened', async () => {
        const { wrapper } = mountResults(SIX_CLASSES);
        const distribution = wrapper.findComponent(SpectralDistribution);
        const rows = distribution.findAll('li');

        expect(rows).toHaveLength(6);
        for (const row of rows.slice(0, 5)) {
            expect(row.classes()).not.toContain('hidden');
        }
        // The sixth row is present at every width from md up, and only hidden below.
        expect(rows[5].classes()).toContain('hidden');
        expect(rows[5].classes()).toContain('md:grid');

        const disclosure = distribution.get('button');
        expect(flat(disclosure.element)).toBe('Show all 6 classes');
        expect(disclosure.classes()).toContain('md:hidden');

        await disclosure.trigger('click');

        expect(distribution.findAll('li')[5].classes()).not.toContain('hidden');
        expect(distribution.find('button').exists()).toBe(false);
    });

    it('offers no disclosure when five or fewer classes are present', () => {
        const { wrapper } = mountResults();
        expect(wrapper.findComponent(SpectralDistribution).find('button').exists()).toBe(false);
    });
});

describe('SectorStatistics — 2a KPI cells, tick legend and generation run', () => {
    function mountStatistics(sector: Sector = FIXTURE) {
        const pinia = createPinia();
        setActivePinia(pinia);
        const store = useSectorStore();
        store.sectorData = sector;
        store.generationStatus = 'done';
        store.activeTab = 'statistics';
        store.currentSeed = 482913;
        store.sectorVolume = 1000;
        store.lastStats = { systemCount: 3, starCount: 4, planetCount: 6, generationTimeMs: 412 };
        const wrapper = mountWith(SectorStatistics, {}, pinia);
        return { store, wrapper };
    }

    it('shows six KPI cells carrying the design\'s sub-captions', () => {
        const { wrapper } = mountStatistics();
        const cells = wrapper.findAll('[data-kpi]').map(cell => flat(cell.element));

        expect(cells).toEqual([
            'SYSTEMS 3 1.33 stars each',
            'STARS 4 4 classes present',
            'PLANETS 6 1.50 per star',
            'MOONS 18 3.00 per planet',
            'IN HABITABLE ZONE 2 33.3% of planets',
            'WITH LIFE 1 across 1 systems'
        ]);
    });

    it('carries the expected-share tick and its zone legend', () => {
        const { wrapper } = mountStatistics();
        const distribution = wrapper.findComponent(SpectralDistribution);

        // One tick per row, positioned by expectedShare(zone, cls).
        expect(distribution.findAll('.absolute.inset-y-0.w-px')).toHaveLength(4);
        expect(wrapper.text()).toContain('tick = share expected for a Medium zone');
        expect(wrapper.text()).toContain('vs. expected IMF');
    });

    it('shows all present planet types under the "N OF 22 TYPES PRESENT" heading', () => {
        const { wrapper } = mountStatistics(NINE_TYPES);
        const distribution = wrapper.findComponent(PlanetTypeDistribution);

        expect(distribution.text()).toContain('PLANET TYPE DISTRIBUTION · 9 OF 22 TYPES PRESENT');
        // 'U' carries a D-21 short label; 'S' has none and falls through to
        // PLANET_TYPE_DESCRIPTIONS.
        expect(distribution.text()).toContain('Ice giant');
        expect(distribution.text()).toContain('Super-Earth');
        expect(distribution.findAll('.rounded-card')).toHaveLength(9);
        expect(distribution.text()).not.toContain('more types');
    });

    it('reads TIME from store.lastStats and carries the reproducibility note', () => {
        const { wrapper } = mountStatistics();

        expect(wrapper.text()).toContain('412 ms');
        expect(wrapper.text()).toContain('Medium');
        expect(flat(wrapper.element)).toContain('1 000 pc³');
        expect(wrapper.text()).toContain(
            'Re-running with the same seed, volume and zone reproduces this sector exactly.');
    });

    it('shows an em dash for TIME when no run has been recorded', async () => {
        const { store, wrapper } = mountStatistics();
        store.lastStats = null;
        await wrapper.vm.$nextTick();

        const time = wrapper.findAll('.rounded-card').find(card => flat(card.element).startsWith('TIME'));
        expect(flat(time!.element)).toBe('TIME —');
    });
});

describe('The KPI strip, Overview and Statistics agree on every shared number', () => {
    it('renders one aggregate source across the three surfaces', () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const store = useSectorStore();
        store.sectorData = FIXTURE;
        store.generationStatus = 'done';

        const strip = mountWith(KpiStrip, {}, pinia);
        const overview = mountWith(OverviewPanel, {}, pinia);
        const statistics = mountWith(SectorStatistics, {}, pinia);

        const stripCells = [...strip.element.children].map(flat);
        const statCells = statistics.findAll('[data-kpi]').map(cell => flat(cell.element));

        expect(stripCells[0]).toBe('SYSTEMS 3');
        expect(stripCells[1]).toBe('STARS 4');
        expect(stripCells[2]).toBe('PLANETS 6');
        expect(stripCells[3]).toBe('MOONS 18');
        expect(stripCells[4]).toBe('WORLDS WITH LIFE 1 16.7%');

        expect(statCells[0]).toContain('SYSTEMS 3');
        expect(statCells[1]).toContain('STARS 4');
        expect(statCells[2]).toContain('PLANETS 6');
        expect(statCells[3]).toContain('MOONS 18');
        expect(statCells[5]).toContain('WITH LIFE 1');

        // The same totals drive the Overview headers and its ratio block.
        expect(overview.text()).toContain('n = 4');
        expect(overview.text()).toContain('6 planets');
        expect(overview.findComponent(SectorTabs).exists()).toBe(false);
        const ratios = flat(overview.element);
        expect(ratios).toContain('STARS / SYSTEM 1.33');
        expect(ratios).toContain('PLANETS / STAR 1.50');
        expect(ratios).toContain('MOONS / PLANET 3.00');

        // Nothing anywhere renders NaN, undefined or Infinity (success criterion 3).
        for (const text of [strip.text(), overview.text(), statistics.text()]) {
            expect(text).not.toMatch(/NaN|undefined|Infinity/);
        }
    });

    it('renders the empty sector without NaN, undefined or Infinity', () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const store = useSectorStore();
        store.sectorData = { systems: [], stars: [], planets: [] };
        store.generationStatus = 'done';

        const overview = mountWith(OverviewPanel, {}, pinia);
        const statistics = mountWith(SectorStatistics, {}, pinia);

        for (const text of [overview.text(), statistics.text()]) {
            expect(text).not.toMatch(/NaN|undefined|Infinity/);
        }
        expect(statistics.text()).toContain('0 OF 22 TYPES PRESENT');
    });
});
