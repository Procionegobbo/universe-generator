// Interaction coverage for the planet detail panel (4b) and its `?planet=`
// deep link (D-32), per story 009's Gherkin. The panel is the surface story 008
// left pointed at: PlanetTable's row click already called store.selectPlanet(),
// and this is where that selection becomes visible.
//
// Same harness rationale as the other *.dom.test.ts files (see story 004b).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { LIFE_STAGE_LABELS, type Planet, type Sector, type Star, type System } from '../types';
import { planetLongDescription, planetTypeLabel } from '../utils/planetDescription';
import ResultsDisplay from './ResultsDisplay.vue';
import PlanetDetailPanel from './PlanetDetailPanel.vue';
import PlanetTable from './PlanetTable.vue';
import SystemDetailView from '../views/SystemDetailView.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn() }
}));

const system = (systemId: number, name: string): System => ({
    systemId, name, hasProperName: true, age: 4.2, xPos: 12.402, yPos: -4.118, zPos: 33.907
});

const star = (starId: number, systemId: number, name: string): Star =>
    ({ starId, systemId, name, spectralClass: 'G', subclass: 2 });

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
 *  1-1  Thalassa — E, habitable, life (C 4.2, P 0.42), 2 moons
 *  1-2  a lifeless rocky world with a real, non-zero life probability
 *  1-3  an asteroid belt: mass 0, diameter 0 — the degenerate "—" case
 */
/** The seed that produced FIXTURE; the deep link is scoped to it. */
const SEED = 504752;

const FIXTURE: Sector = {
    systems: [system(1, 'Kepler-442')],
    stars: [star(1, 1, 'Kepler-442 A')],
    planets: [
        planet(1, 1, 'E', {
            name: 'Thalassa', semiMajorAxis: 1.0, diameter: 13402, temperature: 288,
            mass: 7.05e24, gravity: 10.49, habitableZone: true, hasLife: true,
            lifeProbability: 0.42, lifeComplexity: 4.2, moonCount: 2
        }),
        planet(1, 2, 'R', {
            semiMajorAxis: 0.4, diameter: 9000, temperature: 420, mass: 4e24, gravity: 8.1,
            lifeProbability: 0.13, lifeComplexity: 0, hasLife: false, moonCount: 0
        }),
        planet(1, 3, 'A', {
            semiMajorAxis: 2.5, diameter: 0, mass: 0, gravity: 0, temperature: 180, moonCount: 0
        })
    ]
};

const LIFE_KEY = '1-1';
const LIFELESS_KEY = '1-2';
const BELT_KEY = '1-3';

let mounted: VueWrapper[] = [];

const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/system/:id', name: 'system-detail', component: SystemDetailView }
    ]
});

/** Lets the panel's opening rAF fire so the transform reaches its end state. */
const settle = async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await nextTick();
};

/** The whole Planets-tab host, which is where 4a opens the panel. */
async function mountResults(url = '/', sector: Sector = FIXTURE) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = sector;
    store.loadedSeed = SEED;
    store.generationStatus = 'done';
    store.activeTab = 'planets';

    const router = makeRouter();
    router.push(url);
    await router.isReady();

    const wrapper = mount(ResultsDisplay, {
        global: { plugins: [pinia, router] },
        attachTo: document.body
    });
    mounted.push(wrapper);
    await flushPromises();
    await settle();
    return { store, wrapper, router };
}

/**
 * A cold load: the page comes up with a link in the URL but no sector yet, which
 * is what a shared link actually meets — nothing is generated until the user
 * asks for it. The sector is handed over later by the caller.
 */
async function mountCold(url: string) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = null;
    store.loadedSeed = null;
    store.activeTab = 'planets';

    const router = makeRouter();
    router.push(url);
    await router.isReady();

    const wrapper = mount(ResultsDisplay, {
        global: { plugins: [pinia, router] },
        attachTo: document.body
    });
    mounted.push(wrapper);
    await flushPromises();
    return { store, wrapper, router };
}

/** 1d, whose planet rows are keyboard-focusable and so can take focus back. */
async function mountDetail() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    store.sectorData = FIXTURE;
    store.loadedSeed = SEED;
    store.generationStatus = 'done';

    const router = makeRouter();
    router.push('/system/1');
    await router.isReady();

    const wrapper = mount(SystemDetailView, {
        global: { plugins: [pinia, router] },
        attachTo: document.body
    });
    mounted.push(wrapper);
    return { store, wrapper, router };
}

const panelOf = (wrapper: VueWrapper) => wrapper.findComponent(PlanetDetailPanel);

beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
    document.body.innerHTML = '';
});

describe('PlanetDetailPanel — mounting from the Planets tab (story 008\'s intent)', () => {
    it('is not mounted until a row is clicked, then opens for that planet', async () => {
        const { store, wrapper } = await mountResults();

        expect(wrapper.findComponent(PlanetTable).exists()).toBe(true);
        expect(panelOf(wrapper).exists()).toBe(false);

        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        expect(store.selectedPlanetKey).toBe(LIFE_KEY);
        expect(panelOf(wrapper).exists()).toBe(true);
        expect(wrapper.get('[data-panel-name]').text()).toBe('Thalassa');
    });

    it('leaves the table mounted underneath, so it keeps its scroll position', async () => {
        const { store, wrapper, router } = await mountResults();
        const tableElement = wrapper.findComponent(PlanetTable).element;
        const rowsBefore = wrapper.findComponent(PlanetTable).findAll('[data-planet-row]').length;

        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        // The very same DOM node, still carrying the same rows on the same page,
        // and no navigation: the browser has no reason to reset its scroll
        // offset. (Compared as a boolean — a failed toBe on two DOM nodes would
        // print the whole subtree.)
        const sameNode = wrapper.findComponent(PlanetTable).element === tableElement;
        expect(sameNode).toBe(true);
        expect(wrapper.findComponent(PlanetTable).findAll('[data-planet-row]'))
            .toHaveLength(rowsBefore);
        expect(store.page.planets).toBe(1);
        expect(store.activeTab).toBe('planets');
        expect(router.currentRoute.value.path).toBe('/');
    });

    it('is 520px, right-anchored, and translateX-animates in over 200ms', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');

        const panel = wrapper.get('[data-planet-panel]');
        expect(panel.classes()).toContain('w-[520px]');
        expect(panel.classes()).toContain('right-0');
        expect(panel.classes()).toContain('absolute');

        // Off-canvas on the frame it mounts, then travelling in.
        expect(panel.attributes('style')).toContain('translateX(100%)');
        await settle();
        expect(wrapper.get('[data-planet-panel]').attributes('style')).toContain('translateX(0');

        const style = wrapper.get('[data-planet-panel]').element.getAttribute('style') as string;
        expect(style.replace(/\s+/g, '')).toContain('200ms');
        expect(style.replace(/\s+/g, '')).toContain('cubic-bezier(.2,.8,.2,1)');
    });
});

describe('PlanetDetailPanel — focus and the close triggers', () => {
    it('moves focus into the panel when it opens', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        expect(document.activeElement).toBe(wrapper.get('[data-planet-panel]').element);
    });

    it('closes on ✕, on Esc and on a backdrop click', async () => {
        const { store, wrapper } = await mountResults();

        for (const closeIt of [
            async () => { await wrapper.get('[data-panel-close]').trigger('click'); },
            async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); },
            async () => { await wrapper.get('[data-panel-backdrop]').trigger('click'); }
        ]) {
            await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
            await settle();
            expect(panelOf(wrapper).exists()).toBe(true);

            await closeIt();
            await nextTick();

            expect(store.selectedPlanetKey).toBeNull();
            expect(panelOf(wrapper).exists()).toBe(false);
        }
    });

    it('returns focus to the row that opened it', async () => {
        const { wrapper } = await mountDetail();
        const row = wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).element as HTMLElement;

        row.focus();
        expect(document.activeElement).toBe(row);

        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();
        expect(document.activeElement).toBe(wrapper.get('[data-planet-panel]').element);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        await nextTick();

        expect(panelOf(wrapper).exists()).toBe(false);
        expect(document.activeElement).toBe(row);
    });

    it('opens a keyboard-focused row with Enter as well as with a click', async () => {
        const { store, wrapper } = await mountDetail();

        await wrapper.get(`[data-planet-row="${LIFELESS_KEY}"]`).trigger('keydown.enter');
        await settle();

        expect(store.selectedPlanetKey).toBe(LIFELESS_KEY);
        expect(panelOf(wrapper).exists()).toBe(true);
    });
});

describe('PlanetDetailPanel — D-7 content, with no fabricated facts', () => {
    const rowValue = (wrapper: VueWrapper, label: string): string =>
        wrapper.get(`[data-profile-row="${label}"] [data-profile-value]`).text();

    const rowFill = (wrapper: VueWrapper, label: string): string =>
        wrapper.get(`[data-profile-row="${label}"] [data-profile-bar]`).attributes('style') as string;

    it('shows Mass, Gravity, Density and a green life-probability bar', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        const labels = wrapper.findAll('[data-profile-row]')
            .map(row => row.attributes('data-profile-row') as string);
        expect(labels).toEqual(['Mass', 'Gravity', 'Density', 'Life probability']);

        // mass / 5.972e24, gravity / 9.807, mass / ((4/3)pi r^3) / 1000
        expect(rowValue(wrapper, 'Mass')).toBe('1.18 M⊕');
        expect(rowValue(wrapper, 'Gravity')).toBe('1.07 g');
        expect(rowValue(wrapper, 'Density')).toBe('5.59 g/cm³');
        // lifeProbability * 100
        expect(rowValue(wrapper, 'Life probability')).toBe('42.0 %');
        expect(rowFill(wrapper, 'Life probability')).toContain('rgb(16, 185, 129)');
        expect(rowFill(wrapper, 'Life probability')).toContain('width: 42%');
    });

    it('prints an em dash rather than NaN for a degenerate body', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${BELT_KEY}"]`).trigger('click');
        await settle();

        expect(rowValue(wrapper, 'Mass')).toBe('— M⊕');
        expect(rowValue(wrapper, 'Gravity')).toBe('— g');
        expect(rowValue(wrapper, 'Density')).toBe('— g/cm³');
        expect(wrapper.get('[data-planet-panel]').text()).not.toMatch(/NaN|Infinity|undefined/);
    });

    it('never shows a fact the model does not carry', async () => {
        const { wrapper } = await mountResults();

        for (const key of [LIFE_KEY, LIFELESS_KEY, BELT_KEY]) {
            await wrapper.get(`[data-planet-row="${key}"]`).trigger('click');
            await settle();
            const text = wrapper.get('[data-planet-panel]').text();

            // None of these exists anywhere in the model, so none may appear
            // anywhere in the panel.
            expect(text).not.toContain('Water cover');
            expect(text).not.toContain('O₂');
            expect(text).not.toContain('magnetosphere');

            // "liquid water" is legitimate inside the repo's own canonical prose
            // for an Earth-like world (PLANET_TYPE_LONG_DESCRIPTIONS), so what
            // D-7 forbids is it appearing as a *claim* — a pill or a stat row.
            const claims = [
                ...wrapper.findAll('[data-life-pill]'),
                ...wrapper.findAll('[data-profile-row]').map(row => row.get('span'))
            ].map(node => node.text());
            expect(claims.join('|')).not.toContain('liquid water');
            expect(claims.join('|')).not.toContain('Water cover');
        }
    });

    it('shows the four real pills in place of the design\'s illustrative ones', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        const pills = wrapper.findAll('[data-life-pill]').map(pill => pill.text());
        expect(pills).toEqual(['P 0.42', 'C 4.2 / 6', 'GOLDILOCKS', '4.2 Gyr']);
    });

    it('names the planet, its type and its provenance in the hero', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        expect(wrapper.get('[data-panel-name]').text()).toBe('Thalassa');
        expect(wrapper.get('[data-panel-type]').text())
            .toBe(`${planetTypeLabel(FIXTURE.planets[0])} · type E`);
        expect(wrapper.get('[data-panel-provenance]').text())
            .toBe('Kepler-442 A · orbit #1 of 3');
        expect(wrapper.get('[data-stat="DIAMETER"]').text()).toContain('R⊕');
        expect(wrapper.get('[data-stat="TEMPERATURE"]').text()).toContain('288 K');
        expect(wrapper.get('[data-stat="MOONS"]').text()).toContain('2');
    });
});

describe('PlanetDetailPanel — the life block (D-8, D-9)', () => {
    it('reuses planetLongDescription and uppercases the repo stage label', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        expect(wrapper.get('[data-life-description]').text())
            .toBe(planetLongDescription(FIXTURE.planets[0]));
        // LIFE_STAGE_LABELS[lifeStageLevel(4.2)] = LIFE_STAGE_LABELS[4]
        expect(wrapper.get('[data-life-stage]').text())
            .toBe(LIFE_STAGE_LABELS[4].toUpperCase());
    });

    it('omits the description for a lifeless planet but keeps the probability bar', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFELESS_KEY}"]`).trigger('click');
        await settle();

        expect(wrapper.find('[data-life-description]').exists()).toBe(false);
        expect(wrapper.find('[data-life-stage]').exists()).toBe(false);

        // lifeProbability is a real number for any eligible planet.
        expect(wrapper.get('[data-profile-row="Life probability"]').text()).toContain('13.0');
        expect(wrapper.get('[data-profile-row="Life probability"] [data-profile-bar]')
            .attributes('style')).toContain('width: 13%');
    });

    it('shows all six repo stages on the documented teal ramp', async () => {
        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        const rows = wrapper.findAll('[data-life-stage-row]');
        expect(rows).toHaveLength(6);
        expect(rows.map(row => row.find('span').text())).toEqual([
            'Microbial life', 'Oxygenic photosynthesis', 'Eukaryotic life',
            'Multicellular life', 'Complex animals', 'Intelligent life'
        ]);

        const RAMP = [
            'rgb(6, 78, 59)', 'rgb(6, 95, 70)', 'rgb(15, 118, 110)',
            'rgb(13, 148, 136)', 'rgb(16, 185, 129)', 'rgb(52, 211, 153)'
        ];
        rows.forEach((row, index) => {
            expect(row.get('[data-stage-bar]').attributes('style')).toContain(RAMP[index]);
        });
    });
});

describe('PlanetDetailPanel — the actions', () => {
    it('routes to /system/<systemId> on OPEN SYSTEM', async () => {
        const { wrapper, router } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        await wrapper.get('[data-action="open-system"]').trigger('click');
        await flushPromises();

        expect(router.currentRoute.value.path).toBe('/system/1');
    });

    it('copies the planet as JSON through the clipboard and flashes COPIED for 1.2s', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

        const { wrapper } = await mountResults();
        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await settle();

        const button = () => wrapper.get('[data-action="copy-json"]');
        expect(button().text()).toBe('COPY JSON');

        vi.useFakeTimers();
        await button().trigger('click');
        await flushPromises();

        expect(writeText).toHaveBeenCalledWith(JSON.stringify(FIXTURE.planets[0], null, 2));
        expect(button().text()).toBe('COPIED');

        vi.advanceTimersByTime(1199);
        await nextTick();
        expect(button().text()).toBe('COPIED');

        vi.advanceTimersByTime(1);
        await nextTick();
        expect(button().text()).toBe('COPY JSON');
        vi.useRealTimers();
    });

    it('falls back to a hidden textarea and execCommand when the clipboard is unavailable',
        async () => {
            Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
            let copiedText: string | undefined;
            const execCommand = vi.fn((command: string) => {
                if (command === 'copy') {
                    copiedText = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
                }
                return true;
            });
            Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

            const { wrapper } = await mountResults();
            await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
            await settle();

            await wrapper.get('[data-action="copy-json"]').trigger('click');
            await flushPromises();

            expect(execCommand).toHaveBeenCalledWith('copy');
            expect(copiedText).toBe(JSON.stringify(FIXTURE.planets[0], null, 2));
            expect(wrapper.get('[data-action="copy-json"]').text()).toBe('COPIED');
            // The textarea is removed again — it is a copy buffer, not UI.
            expect(document.querySelector('textarea')).toBeNull();
        });
});

describe('The ?planet= deep link (D-32, success criterion 17)', () => {
    it('reopens the exact planet a shared link names', async () => {
        const { store, wrapper } = await mountResults(`/?seed=${SEED}&planet=${LIFE_KEY}`);

        expect(store.selectedPlanetKey).toBe(LIFE_KEY);
        expect(panelOf(wrapper).exists()).toBe(true);
        expect(wrapper.get('[data-panel-name]').text()).toBe('Thalassa');
    });

    it('round-trips: opening writes the param, closing removes it', async () => {
        const { store, wrapper, router } = await mountResults();
        expect(router.currentRoute.value.query.planet).toBeUndefined();

        await wrapper.get(`[data-planet-row="${LIFELESS_KEY}"]`).trigger('click');
        await flushPromises();
        expect(router.currentRoute.value.query.planet).toBe(LIFELESS_KEY);
        // The seed rides along, so the link names one planet rather than one
        // coordinate that any sector could answer.
        expect(router.currentRoute.value.query.seed).toBe(String(SEED));

        // A reload of that very URL comes back to the same planet.
        const reloaded = await mountResults(router.currentRoute.value.fullPath);
        expect(reloaded.store.selectedPlanetKey).toBe(LIFELESS_KEY);

        await wrapper.get('[data-panel-backdrop]').trigger('click');
        await flushPromises();
        expect(store.selectedPlanetKey).toBeNull();
        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(router.currentRoute.value.query.seed).toBeUndefined();
    });

    it.each(['not-a-key', '7', '999999-1'])(
        'ignores the invalid value %s, strips the param and opens no panel',
        async (value) => {
            const { store, wrapper, router } = await mountResults(`/?seed=${SEED}&planet=${value}`);

            expect(store.selectedPlanetKey).toBeNull();
            expect(panelOf(wrapper).exists()).toBe(false);
            expect(router.currentRoute.value.query.planet).toBeUndefined();
        }
    );

    it('leaves the rest of the query string alone', async () => {
        const { router } = await mountResults(`/?tab=planets&seed=${SEED}&planet=not-a-key`);

        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(router.currentRoute.value.query.tab).toBe('planets');
    });

    it('does not throw when the sector is regenerated under an open panel', async () => {
        const { store, wrapper } = await mountResults(`/?seed=${SEED}&planet=${LIFE_KEY}`);
        expect(panelOf(wrapper).exists()).toBe(true);

        // A different sector in which that key no longer resolves.
        store.sectorData = {
            systems: [system(2, 'UG-0002')],
            stars: [star(5, 2, 'UG-0002-A')],
            planets: [planet(5, 1, 'R')]
        };
        await flushPromises();

        expect(wrapper.text()).not.toMatch(/NaN|undefined/);
        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
    });

    it('holds a well-formed key while no sector has loaded yet, then opens it', async () => {
        const { store, wrapper, router } = await mountCold(`/?seed=${SEED}&planet=${LIFE_KEY}`);

        // Nothing to resolve against yet: the link is kept, not thrown away,
        // because the sector only arrives once the user generates or restores.
        expect(store.sectorData).toBeNull();
        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
        expect(router.currentRoute.value.query.planet).toBe(LIFE_KEY);

        store.sectorData = FIXTURE;
        store.loadedSeed = SEED;
        await flushPromises();
        await settle();

        expect(store.selectedPlanetKey).toBe(LIFE_KEY);
        expect(panelOf(wrapper).exists()).toBe(true);
        expect(wrapper.get('[data-panel-name]').text()).toBe('Thalassa');
        expect(router.currentRoute.value.query.planet).toBe(LIFE_KEY);
    });

    it('strips the held key once a sector arrives that does not contain it', async () => {
        const { store, wrapper, router } = await mountCold(`/?seed=${SEED}&planet=999999-1`);

        expect(router.currentRoute.value.query.planet).toBe('999999-1');
        expect(panelOf(wrapper).exists()).toBe(false);

        store.sectorData = FIXTURE;
        store.loadedSeed = SEED;
        await flushPromises();

        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
    });

    // The bug these pin: (starId, orbitalNumber) is unique inside one sector but
    // not across two, so before the seed was carried a link shared between
    // sectors opened a different planet and looked like it had worked.
    it('refuses a key whose seed is not the loaded sector\'s', async () => {
        const { store, wrapper, router } = await mountResults(
            `/?seed=999&planet=${LIFE_KEY}`
        );

        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(router.currentRoute.value.query.seed).toBeUndefined();
    });

    it('refuses a key that names no seed at all, rather than guessing', async () => {
        const { store, wrapper, router } = await mountResults(`/?planet=${LIFE_KEY}`);

        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
    });

    it('refuses a held key when the sector that lands has another seed', async () => {
        const { store, wrapper, router } = await mountCold(
            `/?seed=${SEED}&planet=${LIFE_KEY}`
        );
        expect(router.currentRoute.value.query.planet).toBe(LIFE_KEY);

        // The same fixture, but generated under a different seed: the key would
        // resolve, which is exactly why the seed has to be checked first.
        store.sectorData = FIXTURE;
        store.loadedSeed = 999;
        await flushPromises();

        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
        expect(router.currentRoute.value.query.planet).toBeUndefined();
    });

    it('rejects a malformed key on a cold load without waiting for a sector', async () => {
        // Garbage needs no sector to be recognised as garbage, so it goes at once.
        const { store, wrapper, router } = await mountCold('/?planet=not-a-key');

        expect(store.sectorData).toBeNull();
        expect(router.currentRoute.value.query.planet).toBeUndefined();
        expect(store.selectedPlanetKey).toBeNull();
        expect(panelOf(wrapper).exists()).toBe(false);
    });

    it('also drives the panel from the system detail screen', async () => {
        const { store, wrapper, router } = await mountDetail();

        await wrapper.get(`[data-planet-row="${LIFE_KEY}"]`).trigger('click');
        await flushPromises();

        expect(panelOf(wrapper).exists()).toBe(true);
        expect(router.currentRoute.value.query.planet).toBe(LIFE_KEY);
        expect(store.selectedPlanetKey).toBe(LIFE_KEY);
    });
});
