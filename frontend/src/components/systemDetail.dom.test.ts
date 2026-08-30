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
import { mount, type VueWrapper } from '@vue/test-utils';
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

const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/system/:id', name: 'system-detail', component: SystemDetailView }
    ]
});

async function mountDetail(sector: Sector, systemId: number) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.generationStatus = 'done';
    store.currentSeed = 482913;

    const router = makeRouter();
    router.push(`/system/${systemId}`);
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

const nodePx = (wrapper: VueWrapper, key: string): number =>
    wrapper.get(`[data-map-planet="${key}"]`).findComponent(CelestialThumb).props('px') as number;

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
});

describe('OrbitalMap — the primary star only', () => {
    it('heads the map with ORBITAL MAP · <primary star name>', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        expect(wrapper.get('[data-map-header]').text()).toBe('ORBITAL MAP · KEPLER-442 A');
    });

    it('draws only the primary star\'s planets', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const keys = wrapper.findAll('[data-map-planet]')
            .map(node => node.attributes('data-map-planet') as string);

        expect(keys).toEqual(['1-1', '1-2', '1-3', '1-4']);
        // The secondary's planet is on the screen, but never on the map.
        expect(wrapper.find('[data-map-planet="2-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-planet-row="2-1"]').exists()).toBe(true);
    });

    it('lists every star in the rail with its own planet count', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const entries = wrapper.findAll('[data-star-entry]');

        expect(entries).toHaveLength(2);
        expect(entries[0].text()).toContain('Kepler-442 A');
        expect(entries[0].get('[data-star-facts]').text()).toContain('4 planets');
        // A secondary is not hidden just because the map leaves it out.
        expect(entries[1].text()).toContain('Kepler-442 B');
        expect(entries[1].get('[data-star-facts]').text()).toContain('1 planets');
    });
});

describe('OrbitalMap — the documented projection', () => {
    it('positions every body where orbitalProjection puts it', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
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
            const style = wrapper.get(`[data-hz-rule="${id}"]`).attributes('style') as string;
            return Number(/left:\s*([\d.]+)%/.exec(style)![1]);
        };
        expect(ruleLeft('inner')).toBeCloseTo(hzRules!.inner, 4);
        expect(ruleLeft('outer')).toBeCloseTo(hzRules!.outer, 4);
    });

    it('sizes a body 20 + 24 × (d / dMax) px, and an asteroid belt at 14px', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const size = (d: number) => Math.round(20 + 24 * (d / 140000));

        expect(nodePx(wrapper, '1-1')).toBe(size(9000));
        expect(nodePx(wrapper, '1-2')).toBe(size(13402));
        expect(nodePx(wrapper, '1-4')).toBe(size(140000));
        expect(nodePx(wrapper, '1-4')).toBe(44);
        // diameter === 0: a belt is drawn at a flat 14px, not at 20px.
        expect(nodePx(wrapper, '1-3')).toBe(14);
    });

    it('prints the axis captions to two significant digits', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);

        // domainMin = min(0.4, hzInner) * 0.8 = 0.32; domainMax = 8.13 * 1.1 = 8.943
        expect(wrapper.get('[data-axis="min"]').text()).toBe('0.32 AU');
        expect(wrapper.get('[data-axis="max"]').text()).toBe('8.9 AU');
    });
});

describe('OrbitalMap — the empty state and the text summary', () => {
    it('shows "no planetary bodies" in #334155 and omits the HZ rules for an NS primary', async () => {
        const { wrapper } = await mountDetail(EXOTIC, 7);
        const empty = wrapper.get('[data-map-empty]');

        expect(empty.text()).toBe('no planetary bodies');
        // jsdom normalises the hex the component sets to its rgb() equivalent.
        expect(empty.attributes('style')).toContain('color: rgb(51, 65, 85)');

        expect(wrapper.find('[data-hz-rule="inner"]').exists()).toBe(false);
        expect(wrapper.find('[data-hz-rule="outer"]').exists()).toBe(false);
        expect(wrapper.find('[data-map-planet]').exists()).toBe(false);
        // No bodies, so no domain and no axis captions either.
        expect(wrapper.find('[data-map-axis]').exists()).toBe(false);

        // The secondary's planet is still reachable in the rail and the table.
        expect(wrapper.findAll('[data-star-entry]')).toHaveLength(2);
        expect(wrapper.find('[data-planet-row="10-1"]').exists()).toBe(true);
    });

    it('carries a visually-hidden summary naming each body, its type, distance and zone', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const summary = wrapper.get('[data-map-summary]');

        expect(summary.classes()).toContain('sr-only');
        expect(summary.get('p').text()).toBe('Orbital map of Kepler-442 A: 4 bodies.');

        const lines = summary.findAll('li').map(item => item.text());
        expect(lines).toHaveLength(4);
        expect(lines[0]).toBe(`Kepler-442 A b — ${planetShortLabel('R')}, 0.400 AU, hot zone`);
        expect(lines[1]).toBe(`Thalassa — ${planetShortLabel('E')}, 1.000 AU, goldilocks zone`);
        expect(lines[2]).toBe(`Kepler-442 A d — ${planetShortLabel('A')}, 2.500 AU, cold zone`);
        expect(lines[3]).toBe(`Kepler-442 A e — ${planetShortLabel('G')}, 8.130 AU, cold zone`);
    });

    it('says so in the summary when the primary has nothing orbiting it', async () => {
        const { wrapper } = await mountDetail(EXOTIC, 7);

        expect(wrapper.get('[data-map-summary] p').text())
            .toBe('Orbital map of UG-0007-A: no planetary bodies.');
    });
});

describe('SystemDetailView — the 1d shell', () => {
    it('shows the breadcrumb bar, the 5-up KPI strip and the system planet table', async () => {
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

        expect(wrapper.get('[data-planets-header]').text()).toBe('PLANETS · 5');
        const rows = wrapper.findAll('[data-planet-row]')
            .map(row => row.attributes('data-planet-row') as string);
        expect(rows).toEqual(['1-1', '2-1', '1-2', '1-3', '1-4']);
    });

    it('renders one OrbitalMap, for the system primary', async () => {
        const { wrapper } = await mountDetail(KEPLER, 1);
        const maps = wrapper.findAllComponents(OrbitalMap);

        expect(maps).toHaveLength(1);
        expect((maps[0].props('star') as Star).starId).toBe(1);
    });

    it('degrades to a not-found message for a system outside the sector', async () => {
        const { wrapper } = await mountDetail(KEPLER, 404);

        expect(wrapper.get('[data-system-missing]').text())
            .toContain('System not found in the current sector.');
        expect(wrapper.find('[data-orbital-map]').exists()).toBe(false);
    });
});

describe('PlanetDetailModal.vue', () => {
    it('no longer exists', () => {
        const path = resolve(__dirname, 'PlanetDetailModal.vue');
        expect(existsSync(path)).toBe(false);
    });
});
