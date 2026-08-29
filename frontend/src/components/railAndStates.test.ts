// Coverage for the acceptance criteria of the parameter rail, the KPI strip and
// the empty state that are observable without a browser.
//
// There is no jsdom and no @vue/test-utils in this project, and vitest compiles
// the SFCs in SSR mode, so a component cannot be client-mounted here. What can
// be done without a DOM — and without adding a dependency — is render a
// component to HTML with Vue's own SSR renderer and assert on the markup.
// Interaction (dragging a slider, clicking a button) stays a manual check.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSSRApp, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useSectorStore } from '../stores/sectorStore';
import type { Sector } from '../types';
import EmptyState from './EmptyState.vue';
import KpiStrip from './KpiStrip.vue';
import SectorControls from './SectorControls.vue';
import GeneratingState from './GeneratingState.vue';
import HomeView from '../views/HomeView.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn() }
}));

// localStorage stub for the Node test environment, matching sectorStore.test.ts.
if (typeof globalThis.localStorage === 'undefined') {
    const bag = new Map<string, string>();
    globalThis.localStorage = {
        getItem: (key: string) => bag.get(key) ?? null,
        setItem: (key: string, value: string) => { bag.set(key, String(value)); },
        removeItem: (key: string) => { bag.delete(key); },
        clear: () => bag.clear(),
        key: (i: number) => [...bag.keys()][i] ?? null,
        get length() { return bag.size; }
    } as Storage;
}

const STORAGE_KEY = 'universe-generator-sector-params';

/** The thin space `thinThousands` groups with. */
const THIN = ' ';

type Store = ReturnType<typeof useSectorStore>;

/** Renders a component to HTML, after optionally preparing the store it reads. */
async function render(component: Component, prepare?: (store: Store) => void) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    prepare?.(store);

    const app = createSSRApp(component);
    app.use(pinia);
    app.use(createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { render: () => null } },
            { path: '/documentation', component: { render: () => null } }
        ]
    }));

    return { store, html: await renderToString(app) };
}

beforeEach(() => {
    localStorage.clear();
});

describe('the auto-suggest watcher is gone (D-16)', () => {
    // The removal is a deliberate behaviour change: moving the volume slider or
    // changing the zone must never overwrite systemCount. The density gauge is
    // the non-destructive replacement. This guard is source-level because the
    // watcher it forbids is one that no longer exists to be observed.
    it('has no multi-source watcher anywhere that reacts to sectorVolume or zone', () => {
        const src = dirname(dirname(fileURLToPath(import.meta.url)));
        const files = readdirSync(src, { recursive: true, encoding: 'utf8' })
            .filter(name => /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts'));

        expect(files.length).toBeGreaterThan(20);

        for (const name of files) {
            const source = readFileSync(join(src, name), 'utf8');
            for (const match of source.matchAll(/watch\(\s*\[([^\]]*)\]/g)) {
                expect(`${name}: watch([${match[1]}])`).not.toMatch(/sectorVolume|\bzone\b/);
            }
        }
    });
});

describe('SectorControls — the parameter rail', () => {
    it('opens no restore modal on mount, whatever localStorage holds (D-15)', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 4242, systemCount: 777, sectorVolume: 4000, zone: 'core'
        }));

        const { html } = await render(SectorControls);

        expect(html).not.toContain('Restore previous sector?');
        expect(html).not.toContain('start fresh');
        expect(html).toContain('GENERATION PARAMETERS');
    });

    it('offers the five zones as a single-select segmented control', async () => {
        const { html } = await render(SectorControls);

        for (const label of ['EXTRAGAL.', 'EDGE', 'MEDIUM', 'CENTRAL', 'GALACTIC CORE']) {
            expect(html).toContain(label);
        }
        // One and only one option is selected — no other selection state exists.
        expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
        expect(html).not.toContain('<select');
    });

    it('drives both parameters from a logarithmic slider plus an editable numeral (D-18)', async () => {
        const { html } = await render(SectorControls);

        // Two range inputs on the 0..1000 slider domain of logScale.ts.
        expect(html.match(/type="range"/g)).toHaveLength(2);
        expect(html.match(/max="1000"/g)).toHaveLength(2);
        // Their bound captions, and a number input holding each exact value.
        expect(html).toContain(`5${THIN}000`);
        expect(html).toContain('100 k');
        expect(html).toContain('class="ug-value-input"');
        expect(html).toContain('value="100"');
        expect(html).toContain('value="1000"');
    });

    it('renders the density verdict and the gauge caption', async () => {
        const { html } = await render(SectorControls);

        // 100 systems in 1 000 pc³ -> 0.171 stars/pc³ against a medium zone's 0.140.
        expect(html).toContain('0.171');
        expect(html).toContain('REALISTIC');
        expect(html).toContain('expected 0.140 · marker at current');
        expect(html).toContain('stars / pc³');
    });

    it('flags an out-of-range systemCount and disables GENERATE SECTOR (§8)', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 1, systemCount: 6000, sectorVolume: 1000, zone: 'medium'
        }));

        const { html } = await render(SectorControls);

        expect(html).toContain(`1 – 5${THIN}000`);
        expect(html).toContain('opacity:0.4');
        expect(html).toContain('disabled');
    });

    it('flags an out-of-range sectorVolume with its own hint (§8)', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 1, systemCount: 100, sectorVolume: 250000, zone: 'medium'
        }));

        const { html } = await render(SectorControls);

        expect(html).toContain(`10 – 100${THIN}000 pc³`);
        expect(html).toContain('opacity:0.4');
    });

    it('warns about large sectors without blocking them', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 1, systemCount: 2500, sectorVolume: 1000, zone: 'medium'
        }));

        const { html } = await render(SectorControls);

        expect(html).toContain('large sectors may take several seconds');
        // Density is advisory: a VERY DENSE verdict still generates.
        expect(html).toContain('VERY DENSE');
        expect(html).not.toContain('opacity:0.4');
    });

    it('offers RESET and CLEAR MEMORY instead of the removed modal branch', async () => {
        const { html } = await render(SectorControls);

        expect(html).toContain('GENERATE SECTOR');
        expect(html).toContain('RESET');
        expect(html).toContain('CLEAR MEMORY');
    });
});

describe('KpiStrip', () => {
    it('shows an em dash for every numeral before any data lands', async () => {
        const { html } = await render(KpiStrip);

        expect(html).not.toMatch(/NaN|undefined|Infinity/);
        expect(html.match(/—/g)).toHaveLength(5);
        for (const label of ['SYSTEMS', 'STARS', 'PLANETS', 'MOONS', 'WORLDS WITH LIFE']) {
            expect(html).toContain(label);
        }
    });

    it('shows an em dash while a generation is running', async () => {
        const { html } = await render(KpiStrip, store => {
            store.sectorData = { systems: [], stars: [], planets: [] } as unknown as Sector;
            store.generationStatus = 'running';
        });

        expect(html.match(/—/g)).toHaveLength(5);
        expect(html).not.toMatch(/NaN|undefined|Infinity/);
    });

    it('renders counts and log-scaled rails once a sector is loaded (D-27)', async () => {
        const { html } = await render(KpiStrip, store => {
            store.sectorData = {
                systems: [
                    { systemId: 1, name: 'A', hasProperName: false, xPos: 0, yPos: 0, zPos: 0 },
                    { systemId: 2, name: 'B', hasProperName: false, xPos: 0, yPos: 0, zPos: 0 }
                ],
                stars: [
                    { starId: 1, systemId: 1, spectralClass: 'M' },
                    { starId: 2, systemId: 2, spectralClass: 'G' }
                ],
                planets: [
                    { starId: 1, orbitalNumber: 1, planetType: 'E', diameter: 12000, moonCount: 3, semiMajorAxis: 1, temperature: 288, habitableZone: true, lifeComplexity: 4, hasLife: true }
                ]
            } as unknown as Sector;
            store.generationStatus = 'done';
        });

        expect(html).not.toMatch(/NaN|undefined|Infinity/);
        expect(html).not.toContain('—');
        // moons (3) is the strip maximum, so only its rail is full.
        expect(html.match(/width:100\.0%/g)).toHaveLength(1);
        // ln(1+2)/ln(1+3) = 79.2% for systems and stars, ln(2)/ln(4) = 50.0% for
        // planets and for the single life-bearing world.
        expect(html.match(/width:79\.2%/g)).toHaveLength(2);
        expect(html.match(/width:50\.0%/g)).toHaveLength(2);
        // 1 life-bearing planet out of 1 planet.
        expect(html).toContain('100.0%');
    });
});

describe('GeneratingState', () => {
    it('lists the five animated stages and the elapsed counter, fabricating no counts (D-19)', async () => {
        // Rendered from the idle state on purpose: the composable's timers only
        // start while the status is 'running', and SSR never unmounts.
        const { html } = await render(GeneratingState, store => { store.currentSeed = 482913; });

        expect(html).toContain('Building sector 482913');
        for (const label of [
            'system coordinates', 'stellar classes', 'planetary bodies', 'moons', 'habitability &amp; life'
        ]) {
            expect(html).toContain(label);
        }
        // Only the requested system count is a real number; rows 2-5 are pending.
        expect(html.match(/pending/g)).toHaveLength(4);
        expect(html).toContain('elapsed 0 ms');
        expect(html).toContain('CANCEL');
    });
});

describe('HomeView — the console shell', () => {
    it('shows the rail on the Overview tab', async () => {
        const { html } = await render(HomeView);

        expect(html).toContain('GENERATION PARAMETERS');
        expect(html).toContain('md:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr]');
        // The KPI strip and the sticky mobile bar are present on every tab.
        expect(html).toContain('WORLDS WITH LIFE');
        expect(html).toContain('PARAMETERS ▲');
        // Nothing generated yet: the empty state, not the results body.
        expect(html).toContain('Generate your first sector');
    });

    it('hides the rail and shows the sector sub-header on any other tab (D-31)', async () => {
        const { html } = await render(HomeView, store => {
            store.activeTab = 'statistics';
            store.currentSeed = 482913;
            store.zone = 'galactic edge';
        });

        expect(html).not.toContain('GENERATION PARAMETERS');
        expect(html).toContain('grid-cols-1');
        expect(html).toContain(`SECTOR 482913 · GALACTIC EDGE ZONE · 1${THIN}000 pc³`);
        // Still reachable on mobile through the sticky sheet.
        expect(html).toContain('PARAMETERS ▲');
    });

    it('shows the error card with a RETRY button when a generation fails', async () => {
        const { html } = await render(HomeView, store => {
            store.error = 'Request failed with status code 500';
        });

        expect(html).toContain('Generation failed');
        expect(html).toContain('Request failed with status code 500');
        expect(html).toContain('RETRY');
    });
});

describe('EmptyState', () => {
    it('shows the handoff copy, the parameter preview and the micro-links', async () => {
        const { html } = await render(EmptyState);

        expect(html).toContain('READY');
        expect(html).toContain('Generate your first sector');
        expect(html).toContain('24 star types, 22 planet types, moons and habitable zones from scientific');
        expect(html).toContain('Same seed, same universe, every time.');

        for (const label of ['SYSTEMS', 'VOLUME', 'ZONE', 'SEED']) {
            expect(html).toContain(label);
        }
        expect(html).toContain(`1${THIN}000 pc³`);
        expect(html).toContain('Medium');

        expect(html).toContain('24 star types');
        expect(html).toContain('22 planet types');
        expect(html).toContain('deterministic seeds');
        expect(html).toContain('href="/documentation"');
    });

    it('shows an unset seed as "random" in violet', async () => {
        const { html } = await render(EmptyState, store => { store.currentSeed = ''; });

        expect(html).toContain('random');
        expect(html).toContain('#c4b5fd');
    });

    it('hides RESTORE LAST SECTOR until a complete parameter set is saved (D-15)', async () => {
        const { html } = await render(EmptyState);

        expect(html).toContain('GENERATE SECTOR');
        expect(html).not.toContain('RESTORE LAST SECTOR');
    });

    it('shows RESTORE LAST SECTOR once a complete parameter set is saved (D-15)', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentSeed: 482913, systemCount: 140, sectorVolume: 1000, zone: 'medium'
        }));

        const { html } = await render(EmptyState);

        expect(html).toContain('RESTORE LAST SECTOR');
    });

    it('stays hidden for an incomplete saved parameter set', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentSeed: 482913, systemCount: 140 }));

        const { html } = await render(EmptyState);

        expect(html).not.toContain('RESTORE LAST SECTOR');
    });
});
