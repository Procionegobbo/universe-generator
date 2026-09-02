// Interaction coverage for the System detail screen (1d) — SystemDetailView's
// rewrite and the new OrbitalMap, per story 009's Gherkin.
//
// The spec wrote D-34 ("no component tests") before this project had a DOM test
// harness; story 004b added jsdom and @vue/test-utils scoped to *.dom.test.ts,
// and stories 006-008 established the precedent of asserting a screen's
// behavioural criteria here rather than leaving them to a manual checklist.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import type { Planet, Sector, Star, System } from '../types';
import { orbitalProjection } from '../utils/orbitalScale';
import { habitableZoneBounds } from '../utils/starPhysical';
import { planetShortLabel } from '../utils/planetDisplay';
import SystemDetailView from '../views/SystemDetailView.vue';
import OrbitalMap from './OrbitalMap.vue';
import CelestialThumb from './CelestialThumb.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

const system = (systemId: number, name: string, hasProperName = false): System => ({
    systemId, name, hasProperName, age: 4.2, xPos: 12.402, yPos: -4.118, zPos: 33.907
});

const star = (
    starId: number,
    systemId: number,
    name: string,
    spectralClass = 'G',
    subclass: number | undefined = 2
): Star => (subclass === undefined
    ? { starId, systemId, name, spectralClass }
    : { starId, systemId, name, spectralClass, subclass });

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
 * System 1 "Kepler-442": a G primary with four bodies and an M secondary with
 * one, so "the map shows only the primary's planets" is falsifiable.
 *
 *   1-1  0.400 AU   9 000 km  R  hot
 *   1-2  1.000 AU  13 402 km  E  habitable, life
 *   1-3  2.500 AU       0 km  A  asteroid belt
 *   1-4  8.130 AU 140 000 km  G  the largest, and the domain's outer edge
 *   2-1  0.200 AU   6 000 km  I  on the secondary — never on the map
 */
const KEPLER: Sector = {
    systems: [system(1, 'Kepler-442', true)],
    stars: [star(1, 1, 'Kepler-442 A', 'G', 2), star(2, 1, 'Kepler-442 B', 'M', 4)],
    planets: [
        planet(1, 1, 'R', { semiMajorAxis: 0.4, diameter: 9000, temperature: 420, moonCount: 0 }),
        planet(1, 2, 'E', {
            name: 'Thalassa', semiMajorAxis: 1.0, diameter: 13402, temperature: 288,
            habitableZone: true, hasLife: true, lifeComplexity: 4.2, lifeProbability: 0.42,
            moonCount: 2
        }),
        planet(1, 3, 'A', { semiMajorAxis: 2.5, diameter: 0, temperature: 180, moonCount: 0 }),
        planet(1, 4, 'G', { semiMajorAxis: 8.13, diameter: 140000, temperature: 90, moonCount: 12 }),
        planet(2, 1, 'I', { semiMajorAxis: 0.2, diameter: 6000, temperature: 120 })
    ]
};

/** An NS primary with nothing orbiting it; the M secondary carries the planets. */
const EXOTIC: Sector = {
    systems: [system(7, 'UG-0007')],
    stars: [star(9, 7, 'UG-0007-A', 'NS', undefined), star(10, 7, 'UG-0007-B', 'M', 3)],
    planets: [planet(10, 1, 'I', { semiMajorAxis: 0.1, diameter: 6000, temperature: 110 })]
};

const G_ZONE = habitableZoneBounds('G');

let mounted: VueWrapper[] = [];

/** The sector these systems belong to, and the sid naming it in every URL. */
const PARAMS = { seed: '482913', zone: 'medium' as const, systemCount: 100, sectorVolume: 1000 };
const SID = '482913-m-100-1000';

const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/:sid', name: 'sector', component: { template: '<div />' } },
        { path: '/:sid/system/:id', name: 'system-detail', component: SystemDetailView }
    ]
});

async function mountDetail(sector: Sector, systemId: number) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.loadedParams = { ...PARAMS };
    store.generationStatus = 'done';
    store.currentSeed = 482913;

    const router = makeRouter();
    router.push(`/${SID}/system/${systemId}`);
    await router.isReady();

    const wrapper = mount(SystemDetailView, { global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
    return { store, wrapper, router };
}

/** The `left: N%` a map node is positioned at. */
const nodeLeft = (wrapper: VueWrapper, key: string): number => {
    const style = wrapper.get(`[data-map-planet="${key}"]`).attributes('style') as string;
    return Number(/left:\s*([\d.]+)%/.exec(style)![1]);
};

/** The star ids of the rendered groups, in document order. */
const groupIds = (wrapper: VueWrapper): string[] =>
    wrapper.findAll('[data-star-group]')
        .map(group => group.attributes('data-star-group') as string);

/** The planet-row keys nested inside one star's group, in document order. */
const rowKeysIn = (wrapper: VueWrapper, starId: string): string[] =>
    wrapper.get(`[data-star-group="${starId}"]`).findAll('[data-planet-row]')
        .map(row => row.attributes('data-planet-row') as string);

const nodePx = (wrapper: VueWrapper, key: string): number =>
    wrapper.get(`[data-map-planet="${key}"]`).findComponent(CelestialThumb).props('px') as number;

/** The one OrbitalMap mounted inside a given star's group (story 003). */
const mapIn = (wrapper: VueWrapper, starId: string) => {
    const inGroup = wrapper.findAllComponents(OrbitalMap).filter(map =>
        map.element.closest('[data-star-group]')?.getAttribute('data-star-group') === starId);
    expect(inGroup).toHaveLength(1);
    return inGroup[0];
};

/** The [data-map-planet] keys drawn by one group's map, in document order. */
const mapKeysIn = (wrapper: VueWrapper, starId: string): string[] =>
    mapIn(wrapper, starId).findAll('[data-map-planet]')
        .map(node => node.attributes('data-map-planet') as string);

/** The primary's own planets, for the direct OrbitalMap mounts below. */
const KEPLER_PRIMARY_PLANETS = KEPLER.planets.filter(entry => entry.starId === 1);

/**
 * A bare OrbitalMap, outside the view. Nothing in the app renders `variant:
 * 'full'` any more (story 003, S-4) — these mounts are what keeps it pinned.
 */
const mountMap = (props: { star: Star; planets: Planet[]; variant?: 'full' | 'compact' }) => {
    const wrapper = mount(OrbitalMap, { props });
    mounted.push(wrapper);
    return wrapper;
};

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('OrbitalMap — one compact map per star, inside its own group header', () => {
    // S-10a. The map takes whatever the identity block leaves — 105px at a 375px
    // viewport — and in that space a nine-planet star overlaps by 5.7px, measured
    // on UG-0052 of seed 644212. jsdom applies no media queries, so the class list
    // is the only honest thing to assert: it is what actually decides this.
    it('hides the map below sm:, and hides nothing else in the header', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        const wrapperDiv = mapIn(wrapper, '1').element.parentElement as HTMLElement;
        expect([...wrapperDiv.classList]).toEqual(
            expect.arrayContaining(['hidden', 'sm:block'])
        );

        // The star stays named at every width: only the map steps aside.
        const header = wrapper.get('[data-star-entry="1"]');
        const hidden = header.findAll('.hidden');
        expect(hidden).toHaveLength(1);
        expect(hidden[0].element).toBe(wrapperDiv);
        expect(header.get('h2').text()).toBe('Kepler-442 A');
        expect(header.get('[data-star-facts]').isVisible()).toBe(true);
    });

    it('renders one map per non-empty group, in the compact variant', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        expect(wrapper.findAllComponents(OrbitalMap)).toHaveLength(2);

        const primary = mapIn(wrapper, '1');
        expect((primary.props('star') as Star).starId).toBe(1);
        expect(primary.props('planets') as Planet[]).toHaveLength(4);
        expect(primary.props('variant')).toBe('compact');

        const secondary = mapIn(wrapper, '2');
        expect((secondary.props('star') as Star).starId).toBe(2);
        expect(secondary.props('planets') as Planet[]).toHaveLength(1);
        expect(secondary.props('variant')).toBe('compact');
    });

    it('sits in its own group\'s header, never outside a star block', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const maps = wrapper.findAllComponents(OrbitalMap);

        expect(maps).toHaveLength(2);
        for (const map of maps) {
            expect(map.element.closest('[data-star-group]')).not.toBeNull();
            expect(map.element.closest('[data-star-entry]')).not.toBeNull();
        }
        // The old top-level, primary-only block above the listing is gone: the
        // only maps on the page are the two inside the two group headers.
        expect(wrapper.findAll('[data-orbital-map]')).toHaveLength(2);
    });

    it('is handed its star\'s raw planets, not the table\'s display rows', async () => {
        // Passing groups[].planets here fails silently: with no semiMajorAxis
        // there is no domain, every body collapses to left: 50% and both axis
        // captions read "—", with nothing thrown. So it is asserted, not trusted.
        const { wrapper } = await mountDetail(KEPLER, 1);
        const passed = mapIn(wrapper, '1').props('planets') as Planet[];

        for (const entry of passed) {
            expect(entry.starId).toBe(1);
            expect(typeof entry.semiMajorAxis).toBe('number');
            // The table's view-model fields, which the raw planets never carry.
            expect(entry).not.toHaveProperty('key');
            expect(entry).not.toHaveProperty('zone');
        }
        expect(passed.map(entry => entry.semiMajorAxis)).toEqual([0.4, 1.0, 2.5, 8.13]);

        const lefts = ['1-1', '1-2', '1-3', '1-4'].map(key => nodeLeft(wrapper, key));
        expect(new Set(lefts).size).toBe(4);
        expect(lefts).not.toContain(50);
        expect(mapIn(wrapper, '1').get('[data-map-axis]').text()).not.toContain('—');
    });

    it('draws only its own star\'s planets', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        expect(mapKeysIn(wrapper, '1')).toEqual(['1-1', '1-2', '1-3', '1-4']);
        expect(mapKeysIn(wrapper, '2')).toEqual(['2-1']);
    });

    it('carries no header, no legend and no per-planet orbit letters', async () => {
        // Once story 003 lands this file is the only place in the suite that
        // exercises any of compact's suppressions, so they are pinned here.
        const { wrapper } = await mountDetail(KEPLER, 1);
        const primary = mapIn(wrapper, '1');

        expect(wrapper.find('[data-map-header]').exists()).toBe(false);
        // The legend swatches share the header's v-if="!isCompact"; the only
        // other aria-hidden node inside a map is CelestialThumb's <img>.
        expect(primary.findAll('span[aria-hidden="true"]')).toHaveLength(0);
        // No visible letter beside the thumbnail: the node holds nothing else.
        for (const key of ['1-1', '1-2', '1-3', '1-4']) {
            expect(wrapper.get(`[data-map-planet="${key}"]`).text()).toBe('');
        }
        // compact prints one merged HZ caption in its axis row instead of the
        // two per-rule captions the full variant hangs off its rules.
        expect(primary.findAll('[data-hz-caption]')).toHaveLength(0);
        const hzAxis = primary.get('[data-axis="hz"]').text();
        expect(hzAxis).toMatch(/^HZ /);
        expect(hzAxis).toContain(G_ZONE.inner.toFixed(3));
        expect(hzAxis).toContain(G_ZONE.outer.toFixed(3));
    });

    it('leaves the star\'s identity to the group header and its own summary', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const group = wrapper.get('[data-star-group="2"]');

        expect(group.get('[data-star-entry] h2').text()).toBe('Kepler-442 B');
        expect(group.get('[data-map-summary] p').text())
            .toBe('Orbital map of Kepler-442 B: 1 body.');
    });
});

describe('OrbitalMap — the documented projection, per group', () => {
    it('positions every body where orbitalProjection puts it', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const map = mapIn(wrapper, '1');
        const distances = [0.4, 1.0, 2.5, 8.13];
        const { positions, hzRules } = orbitalProjection(distances, G_ZONE.inner, G_ZONE.outer);

        expect(nodeLeft(wrapper, '1-1')).toBeCloseTo(positions[0], 4);
        expect(nodeLeft(wrapper, '1-2')).toBeCloseTo(positions[1], 4);
        expect(nodeLeft(wrapper, '1-3')).toBeCloseTo(positions[2], 4);
        expect(nodeLeft(wrapper, '1-4')).toBeCloseTo(positions[3], 4);

        // Every body sits inside the [4%, 96%] band, in orbital order. The
        // outermost stops short of 96% because domainMax reaches 1.1x past it.
        expect(positions[0]).toBeGreaterThanOrEqual(4);
        expect(positions[3]).toBeLessThan(96);
        for (let i = 1; i < positions.length; i++) {
            expect(positions[i]).toBeGreaterThan(positions[i - 1]);
        }

        const ruleLeft = (id: string) => {
            const style = map.get(`[data-hz-rule="${id}"]`).attributes('style') as string;
            return Number(/left:\s*([\d.]+)%/.exec(style)![1]);
        };
        expect(ruleLeft('inner')).toBeCloseTo(hzRules!.inner, 4);
        expect(ruleLeft('outer')).toBeCloseTo(hzRules!.outer, 4);
    });

    it('sizes a body 8 + 8 × (d / dMax) px, and an asteroid belt at 8px', async () => {
        // compact's formula, not the full variant's 20 + 24 / 14px belt.
        const { wrapper } = await mountDetail(KEPLER, 1);
        const size = (d: number) => Math.round(8 + 8 * (d / 140000));

        expect(nodePx(wrapper, '1-1')).toBe(size(9000));
        expect(nodePx(wrapper, '1-2')).toBe(size(13402));
        expect(nodePx(wrapper, '1-4')).toBe(size(140000));
        expect(nodePx(wrapper, '1-4')).toBe(16);
        // diameter === 0: a belt is drawn at a flat 8px, not at 9px.
        expect(nodePx(wrapper, '1-3')).toBe(8);
    });

    it('prints the axis captions to two significant digits', async () => {
        // The axis domain and its captions are variant-independent.
        const { wrapper } = await mountDetail(KEPLER, 1);
        const map = mapIn(wrapper, '1');

        // domainMin = min(0.4, hzInner) * 0.8 = 0.32; domainMax = 8.13 * 1.1 = 8.943
        expect(map.get('[data-axis="min"]').text()).toBe('0.32 AU');
        expect(map.get('[data-axis="max"]').text()).toBe('8.9 AU');
    });
});

describe('OrbitalMap — the HZ captions at narrow widths (direct full-variant mount)', () => {
    // Both captions hang to the right of their own rule, so a band narrower than
    // one caption made the second print through the first — at 500px the pair
    // overlapped by 6px and the join was unreadable. jsdom lays nothing out, so
    // the map's width is stated outright and the resize the component listens
    // for is dispatched by hand.
    //
    // Story 003 (S-4) made this unreachable through SystemDetailView: every map
    // that view mounts is compact, and compact renders no per-rule caption at
    // all. The coverage is relocated here rather than dropped, so the
    // caption-collision fix stays pinned even with no consumer in the app.
    const mountFull = () => mountMap({
        star: KEPLER.stars[0],
        planets: KEPLER_PRIMARY_PLANETS,
        variant: 'full'
    });

    const setMapWidth = async (wrapper: VueWrapper, width: number) => {
        const box = wrapper.get('[data-map-box]').element;
        Object.defineProperty(box, 'clientWidth', { value: width, configurable: true });
        window.dispatchEvent(new Event('resize'));
        await wrapper.vm.$nextTick();
    };

    const captions = (wrapper: VueWrapper) =>
        wrapper.findAll('[data-hz-caption]')
            .map(el => ({ id: el.attributes('data-hz-caption'), text: el.text() }));

    it('keeps the two captions apart when the band has room', async () => {
        const wrapper = mountFull();
        await setMapWidth(wrapper, 1400);

        expect(captions(wrapper).map(c => c.id)).toEqual(['inner', 'outer']);
        expect(captions(wrapper)[0].text).toMatch(/^HZ INNER /);
        expect(captions(wrapper)[1].text).toMatch(/^HZ OUTER /);
    });

    it('merges them into one when the band is too narrow to hold both', async () => {
        const wrapper = mountFull();
        await setMapWidth(wrapper, 200);

        const shown = captions(wrapper);
        expect(shown).toHaveLength(1);
        expect(shown[0].id).toBe('merged');
        // Collapsing must not cost a number: both bounds survive the merge.
        const { inner, outer } = habitableZoneBounds('G');
        expect(shown[0].text).toContain(inner.toFixed(3));
        expect(shown[0].text).toContain(outer.toFixed(3));
        expect(shown[0].text).not.toMatch(/INNER|OUTER/);
    });

    it('re-splits them when the map grows again', async () => {
        const wrapper = mountFull();
        await setMapWidth(wrapper, 200);
        expect(captions(wrapper)).toHaveLength(1);

        await setMapWidth(wrapper, 1400);
        expect(captions(wrapper).map(c => c.id)).toEqual(['inner', 'outer']);
    });

    it('keeps the pair while the width is still unmeasured', () => {
        // Never collapse on a guess: with no measurement the split stands.
        const wrapper = mountFull();
        expect(captions(wrapper).map(c => c.id)).toEqual(['inner', 'outer']);
    });

    it('still renders the header, the legend and the per-planet letters', () => {
        // The other half of the compact assertions above: what full keeps is
        // exactly what compact drops, and nothing in the app renders it now.
        const wrapper = mountFull();

        expect(wrapper.get('[data-map-header]').text()).toBe('ORBITAL MAP · KEPLER-442 A');
        expect(wrapper.findAll('span[aria-hidden="true"]')).toHaveLength(3);
        expect(wrapper.get('[data-map-planet="1-1"]').text()).toBe('b');
    });
});

describe('OrbitalMap — the empty state (direct mount)', () => {
    // Relocated by story 003: a barren star mounts no map in the view any more
    // (S-3), so this state has no route through SystemDetailView to reach it.
    it('shows "no planetary bodies" in #334155 and omits the rules, bodies and axis', () => {
        const wrapper = mountMap({ star: EXOTIC.stars[0], planets: [] });
        const empty = wrapper.get('[data-map-empty]');

        expect(empty.text()).toBe('no planetary bodies');
        // jsdom normalises the hex the component sets to its rgb() equivalent.
        expect(empty.attributes('style')).toContain('color: rgb(51, 65, 85)');

        expect(wrapper.find('[data-hz-rule="inner"]').exists()).toBe(false);
        expect(wrapper.find('[data-hz-rule="outer"]').exists()).toBe(false);
        expect(wrapper.find('[data-map-planet]').exists()).toBe(false);
        // No bodies, so no domain and no axis captions either.
        expect(wrapper.find('[data-map-axis]').exists()).toBe(false);

        expect(wrapper.get('[data-map-summary] p').text())
            .toBe('Orbital map of UG-0007-A: no planetary bodies.');
    });
});

describe('OrbitalMap — the text summary', () => {
    it('carries a visually-hidden summary naming each body, its type, distance and zone', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const summary = mapIn(wrapper, '1').get('[data-map-summary]');

        expect(summary.classes()).toContain('sr-only');
        expect(summary.get('p').text()).toBe('Orbital map of Kepler-442 A: 4 bodies.');

        const lines = summary.findAll('li').map(item => item.text());
        expect(lines).toHaveLength(4);
        expect(lines[0]).toBe(`Kepler-442 A b — ${planetShortLabel('R')}, 0.400 AU, hot zone`);
        expect(lines[1]).toBe(`Thalassa — ${planetShortLabel('E')}, 1.000 AU, goldilocks zone`);
        expect(lines[2]).toBe(`Kepler-442 A d — ${planetShortLabel('A')}, 2.500 AU, cold zone`);
        expect(lines[3]).toBe(`Kepler-442 A e — ${planetShortLabel('G')}, 8.130 AU, cold zone`);
    });
});

describe('SystemDetailView — the grouped star/planet listing', () => {
    it('renders one group per star, in payload order', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        expect(groupIds(wrapper)).toEqual(['1', '2']);
    });

    it('heads every group with its star, its class and its facts', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const headers = wrapper.findAll('[data-star-entry]');

        expect(headers).toHaveLength(2);
        expect(headers[0].text()).toContain('Kepler-442 A');
        expect(headers[0].text()).toContain('G-2 · Yellow dwarf');
        expect(headers[0].get('[data-star-facts]').text()).toContain('4 planets');
        // A secondary is not hidden just because the top-level map leaves it out.
        expect(headers[1].text()).toContain('Kepler-442 B');
        expect(headers[1].get('[data-star-facts]').text()).toContain('1 planets');
    });

    it('nests each star\'s planets under that star, in orbital order', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        expect(rowKeysIn(wrapper, '1')).toEqual(['1-1', '1-2', '1-3', '1-4']);
        expect(rowKeysIn(wrapper, '2')).toEqual(['2-1']);
    });

    it('leaves no planet row outside the group of the star it orbits', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const rows = wrapper.findAll('[data-planet-row]');

        expect(rows).toHaveLength(5);
        for (const row of rows) {
            const key = row.attributes('data-planet-row') as string;
            const group = row.element.closest('[data-star-group]');
            expect(group).not.toBeNull();
            expect(group!.getAttribute('data-star-group')).toBe(key.split('-')[0]);
        }
    });

    it('replaces the old interleaved flat list with the grouped order', async () => {
        // The defect this feature exists to fix: the flat table sorted every
        // star's planets into one orbital-number sequence.
        const { wrapper } = await mountDetail(KEPLER, 1);
        const keys = wrapper.findAll('[data-planet-row]')
            .map(row => row.attributes('data-planet-row') as string);

        expect(keys).toEqual(['1-1', '1-2', '1-3', '1-4', '2-1']);
        expect(keys).not.toEqual(['1-1', '2-1', '1-2', '1-3', '1-4']);
    });

    it('gives a star with no planets its own empty line, and no map', async () => {
        const { wrapper } = await mountDetail(EXOTIC, 7);
        const barren = wrapper.get('[data-star-group="9"]');

        expect(barren.get('[data-star-empty="9"]').text()).toBe('No planets orbit this star.');
        expect(barren.findAll('[data-planet-row]')).toHaveLength(0);
        // S-3: no 56px box whose only content is "no planetary bodies", under a
        // header that already says 0 planets.
        expect(barren.find('[data-orbital-map]').exists()).toBe(false);

        const populated = wrapper.get('[data-star-group="10"]');
        expect(populated.find('[data-star-empty]').exists()).toBe(false);
        expect(populated.find('[data-orbital-map]').exists()).toBe(true);
        expect(rowKeysIn(wrapper, '10')).toEqual(['10-1']);
        expect(mapKeysIn(wrapper, '10')).toEqual(['10-1']);
    });

    it('states the section once, and drops the rail and the PLANETS header', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        expect(wrapper.get('[data-contents-header]').text()).toBe('STARS & PLANETS');
        expect(wrapper.find('[data-stars-rail]').exists()).toBe(false);
        expect(wrapper.find('[data-planets-header]').exists()).toBe(false);
        // Every star states its own emptiness now; the system-level one is gone.
        expect(wrapper.find('[data-empty]').exists()).toBe(false);
    });
});

describe('SystemDetailView — opening a planet from its star\'s group', () => {
    it('selects the planet by its composite key and opens the panel', async () => {
        const { store, wrapper } = await mountDetail(KEPLER, 1);
        expect(wrapper.find('[data-planet-panel]').exists()).toBe(false);

        await wrapper.get('[data-planet-row="2-1"]').trigger('click');

        expect(store.selectedPlanetKey).toBe('2-1');
        expect(wrapper.find('[data-planet-panel]').exists()).toBe(true);
    });

    it('opens the planet the clicked row names, not the primary\'s first', async () => {
        // The two rows are no longer adjacent in the DOM: this pins that the
        // key travelled with the row into its own group.
        const { store, wrapper } = await mountDetail(KEPLER, 1);

        await wrapper.get('[data-planet-row="2-1"]').trigger('click');

        expect(store.selectedPlanetKey).toBe('2-1');
        expect(store.selectedPlanetKey).not.toBe('1-1');
    });

    it('carries the row\'s button semantics, and answers Enter and Space', async () => {
        const { store, wrapper } = await mountDetail(KEPLER, 1);
        const row = wrapper.get('[data-planet-row="1-1"]');

        expect(row.attributes('role')).toBe('button');
        expect(row.attributes('tabindex')).toBe('0');
        expect(row.attributes('aria-label')).toBe('Open detail for Kepler-442 A b');

        await row.trigger('keydown.enter');
        expect(store.selectedPlanetKey).toBe('1-1');
        expect(wrapper.find('[data-planet-panel]').exists()).toBe(true);

        store.selectPlanet(null);
        await wrapper.vm.$nextTick();
        await row.trigger('keydown.space');
        expect(store.selectedPlanetKey).toBe('1-1');
        expect(wrapper.find('[data-planet-panel]').exists()).toBe(true);
    });

    it('does not navigate: the panel opens over the system\'s own path', async () => {
        const { wrapper, router } = await mountDetail(KEPLER, 1);

        await wrapper.get('[data-planet-row="1-2"]').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe(`/${SID}/system/1`);
    });

    it('keeps the row decoration the move could have lost', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const row = wrapper.get('[data-planet-row="1-2"]');

        expect(row.classes()).toContain('ug-row-habitable');
        expect(row.text()).toContain('LIFE');
        expect(row.get('[data-cell="zone"]').text()).toBe('GOLDILOCKS');
    });
});

describe('SystemDetailView — the grouped listing\'s a11y and narrow widths', () => {
    it('labels every group by its own star', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const group = wrapper.get('[data-star-group="1"]');

        expect(group.attributes('role')).toBe('group');
        const labelId = group.attributes('aria-labelledby') as string;
        const label = wrapper.get(`#${labelId}`);
        expect(label.element.tagName).toBe('H2');
        expect(label.text()).toBe('Kepler-442 A');
    });

    it('scrolls the planet grid sideways, never the star header', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const grid = wrapper.get('[data-star-group="1"] [class*="min-w-[620px]"]');
        const scroller = grid.element.closest('.overflow-x-auto');

        expect(scroller).not.toBeNull();
        expect(scroller!.querySelector('[data-star-entry]')).toBeNull();
        // The map moved into the header, so it must not scroll away either.
        expect(scroller!.querySelector('[data-orbital-map]')).toBeNull();
        expect(scroller!.querySelector('[data-planet-row]')).not.toBeNull();
    });
});

describe('SystemDetailView — a change of the :id param', () => {
    // Nothing in the UI navigates from one system straight to another today, so
    // this path has no user yet; the moment one is added — a "next system" link,
    // a jump from search — a view that read the id once at setup would show the
    // previous system under the new URL. Pinned here so it cannot regress
    // unnoticed into the story that adds the link.
    const BOTH: Sector = {
        systems: [...KEPLER.systems, ...EXOTIC.systems],
        stars: [...KEPLER.stars, ...EXOTIC.stars],
        planets: [...KEPLER.planets, ...EXOTIC.planets]
    };

    it('re-renders for the system the new id names', async () => {
        const { wrapper, router } = await mountDetail(BOTH, 1);
        expect(wrapper.text()).toContain('Kepler-442');

        // A change of :id inside one sid — the sector does not change under it.
        await router.push(`/${SID}/system/7`);
        await flushPromises();
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('UG-0007');
        expect(wrapper.text()).not.toContain('Kepler-442');
    });
});

describe('SystemDetailView — the 1d shell', () => {
    it('shows the breadcrumb bar and the 5-up KPI strip', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        const breadcrumb = wrapper.get('[data-breadcrumb]');
        expect(breadcrumb.get('[data-breadcrumb-back]').text()).toBe('← SECTOR 482913');
        expect(breadcrumb.get('[data-system-name]').text()).toBe('Kepler-442');
        expect(breadcrumb.text()).toContain('IAU');
        expect(breadcrumb.text()).toContain('LIFE DETECTED');
        expect(wrapper.get('[data-system-readout]').text()).toContain('4.2 Gyr');

        const cells = wrapper.findAll('[data-kpi]')
            .map(cell => cell.attributes('data-kpi') as string);
        expect(cells).toEqual(['STARS', 'PLANETS', 'MOONS', 'IN HABITABLE ZONE', 'TOTAL MASS']);
        expect(wrapper.get('[data-kpi="STARS"]').text()).toContain('2');
        expect(wrapper.get('[data-kpi="PLANETS"]').text()).toContain('5');
        expect(wrapper.get('[data-kpi="MOONS"]').text()).toContain('15');
        expect(wrapper.get('[data-kpi="IN HABITABLE ZONE"]').text()).toContain('1');
        // G (1.0 M☉) + M (0.3 M☉)
        expect(wrapper.get('[data-kpi="TOTAL MASS"]').text()).toContain('1.30');
    });

    // Kept verbatim: this is the one tick between the coordinate guard deciding
    // the system is not there and its corrective replace landing.
    it('degrades to a not-found message for a system outside the sector', async () => {
        const { wrapper } = await mountDetail(KEPLER, 404);

        expect(wrapper.get('[data-system-missing]').text())
            .toContain('System not found in the current sector.');
        expect(wrapper.find('[data-orbital-map]').exists()).toBe(false);
    });

    // "Not found" while the sector the link names is still being built is a lie
    // about a perfectly good link, for as long as the generation takes.
    it('waits rather than reporting not-found while the named sector is building', async () => {
        const { store, wrapper } = await mountDetail(KEPLER, 1);
        store.generationStatus = 'running';
        store.sectorData = null;
        await nextTick();

        expect(wrapper.get('[data-system-waiting]').text())
            .toContain('Rebuilding the sector this link names…');
        expect(wrapper.find('[data-system-missing]').exists()).toBe(false);
    });

    it('waits when the sid names a sector other than the loaded one', async () => {
        const { store, wrapper } = await mountDetail(KEPLER, 1);
        // The URL still names 482913; the sector under it is another one, so
        // useSectorLink is about to rebuild.
        store.loadedParams = { ...PARAMS, seed: '999' };
        store.sectorData = null;
        await nextTick();

        expect(wrapper.find('[data-system-waiting]').exists()).toBe(true);
        expect(wrapper.find('[data-system-missing]').exists()).toBe(false);
    });

    it('reports the generation failure rather than a missing system', async () => {
        const { store, wrapper } = await mountDetail(KEPLER, 1);
        store.sectorData = null;
        store.generationStatus = 'error';
        store.error = 'network down';
        await nextTick();

        const failed = wrapper.get('[data-system-error]');
        expect(failed.text()).toContain('network down');
        expect(failed.get('a').attributes('href')).toBe(`/${SID}`);
        expect(wrapper.find('[data-system-missing]').exists()).toBe(false);
        expect(wrapper.find('[data-system-waiting]').exists()).toBe(false);
    });
});

describe('PlanetDetailModal.vue', () => {
    it('no longer exists', () => {
        const path = resolve(__dirname, 'PlanetDetailModal.vue');
        expect(existsSync(path)).toBe(false);
    });
});
