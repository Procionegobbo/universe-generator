<template>
    <div class="flex min-h-full flex-col">
        <div
            class="grid flex-1 items-start"
            :class="showInlineRail ? 'lg:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr]' : 'grid-cols-1'"
        >
            <!-- Parameter rail — Overview tab only (D-31), and only in the
                 inline tier, which starts at 1024px. The `lg:` prefix matches
                 that tier exactly; what it carries on top is the 260px -> 300px
                 step at `xl`. -->
            <aside
                v-if="showInlineRail"
                data-rail="inline"
                class="min-h-[820px] self-stretch border-r border-line-strong bg-panel"
            >
                <SectorControls @generate="handleGenerate" @reset="handleReset" />
            </aside>

            <div class="flex min-w-0 flex-col">
                <div
                    v-if="!showRail"
                    class="border-b border-line-strong px-[18px] py-3 font-mono text-[10px] tracking-[.08em] text-dim"
                >
                    {{ subHeader }}
                </div>

                <!-- 768-1023px (spec §4d): the rail becomes a collapsible top
                     drawer. It sits in normal flow above the KPI strip, so
                     opening it pushes the strip down instead of covering it. -->
                <div v-if="showDrawer" data-rail="drawer" class="border-b border-line-strong bg-panel">
                    <button
                        type="button"
                        data-rail-toggle="drawer"
                        class="flex w-full items-center justify-between px-[18px] py-[14px] font-mono font-semibold text-[10px] tracking-[.14em] text-dim transition-colors duration-150 hover:text-ink"
                        :aria-expanded="drawerOpen"
                        aria-controls="parameter-drawer"
                        @click="drawerOpen = !drawerOpen"
                    >
                        <span>PARAMETERS</span>
                        <span aria-hidden="true">{{ drawerOpen ? '▲' : '▼' }}</span>
                    </button>
                    <div v-if="drawerOpen" id="parameter-drawer" class="border-t border-line-soft">
                        <SectorControls @generate="handleGenerate" @reset="handleReset" />
                    </div>
                </div>

                <KpiStrip />

                <GeneratingState v-if="isRunning" @cancel="handleCancel" />

                <div v-else-if="store.error" class="flex justify-center px-4 py-8">
                    <div
                        class="flex w-full max-w-[520px] flex-col gap-3 rounded-card p-5"
                        style="border: 1px solid rgb(239 68 68 / .3); background: rgb(239 68 68 / .06)"
                    >
                        <span class="font-sans font-semibold text-[13px] text-ink">
                            Generation failed
                        </span>
                        <p class="font-mono text-[11px] break-words text-acc-red-pale">
                            {{ store.error }}
                        </p>
                        <button type="button" class="ug-btn-outline self-start px-4 py-2" @click="handleRetry">
                            RETRY
                        </button>
                    </div>
                </div>

                <!-- The tab host: the tab bar plus whichever body store.activeTab
                     selects. It is full-bleed, so the bar's bottom border runs the
                     full width of the column as in the design. -->
                <ResultsDisplay v-else-if="store.sectorData" />

                <EmptyState v-else @generate="handleGenerate" @restore="handleRestore" />
            </div>
        </div>

        <MobileActionBar
            :disabled="isRunning"
            @open-parameters="sheetOpen = true"
            @generate="handleGenerate"
        />

        <!-- Mobile parameter sheet: the rail is reachable on every tab. -->
        <div v-if="showSheet" class="fixed inset-0 z-40">
            <div class="absolute inset-0 bg-black/60" @click="sheetOpen = false"></div>
            <div
                data-rail="sheet"
                class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-line-strong bg-panel"
            >
                <div class="flex justify-end p-2">
                    <button
                        type="button"
                        class="ug-btn-outline px-3 py-2"
                        aria-label="Close parameters"
                        @click="sheetOpen = false"
                    >
                        CLOSE ▼
                    </button>
                </div>
                <SectorControls @generate="handleGenerate" @reset="handleReset" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SectorControls from '../components/SectorControls.vue';
import ResultsDisplay from '../components/ResultsDisplay.vue';
import KpiStrip from '../components/KpiStrip.vue';
import EmptyState from '../components/EmptyState.vue';
import GeneratingState from '../components/GeneratingState.vue';
import MobileActionBar from '../components/MobileActionBar.vue';
import { useRailTier } from '../composables/useRailTier';
import { useSectorStore } from '../stores/sectorStore';
import { thinThousands } from '../utils/format';
import { normaliseSeed } from '../utils/sectorLink';
import type { GenerationRequest, SectorZone } from '../types';

const store = useSectorStore();
const router = useRouter();

const { tier } = useRailTier();

const sheetOpen = ref(false);
const drawerOpen = ref(false);
const lastRequest = ref<GenerationRequest | null>(null);
let controller: AbortController | null = null;

const isRunning = computed(() => store.generationStatus === 'running');
const showRail = computed(() => store.activeTab === 'overview');

// One rail host at a time (spec §4d). The sheet is reachable on every tab, the
// drawer and the inline rail only on Overview (D-31).
const showInlineRail = computed(() => showRail.value && tier.value === 'inline');
const showDrawer = computed(() => showRail.value && tier.value === 'drawer');
const showSheet = computed(() => sheetOpen.value && tier.value === 'sheet');

// Crossing a breakpoint hands the rail to another host; the one being left
// should not come back open when the viewport comes back.
watch(tier, () => {
    sheetOpen.value = false;
    drawerOpen.value = false;
});

const subHeader = computed(() =>
    `SECTOR ${store.currentSeed} · ${store.zone.toUpperCase()} ZONE · ${thinThousands(store.sectorVolume)} pc³`);

// An empty seed randomises on submit, exactly as the old handleSubmit did. It
// lives here rather than in the rail because generation is now reachable from
// three places (the rail, the empty state and the mobile action bar).
//
// The same replacement covers every seed that cannot be written into a sid:
// `type="number"` still lets a user type `-5`, whose leading `-` is the sid's
// field delimiter. Normalising here rather than weakening the sid grammar is
// what guarantees the round-trip, and it cannot loop — the replacement is
// always a value normaliseSeed accepts.
const buildRequest = (): GenerationRequest => {
    if (normaliseSeed(store.currentSeed) === null) {
        store.currentSeed = Math.floor(Math.random() * 1000000);
    }
    return {
        systemCount: store.systemCount,
        sectorVolume: store.sectorVolume,
        seed: store.currentSeed,
        zone: store.zone
    };
};

const run = async (request: GenerationRequest) => {
    lastRequest.value = request;
    sheetOpen.value = false;
    controller = new AbortController();
    // A copy, because the store fills in defaults on the object it is handed.
    await store.generateSector({ ...request }, controller.signal);
    controller = null;
};

const handleGenerate = () => run(buildRequest());

const handleRetry = () => run(lastRequest.value ?? buildRequest());

const handleCancel = () => {
    controller?.abort();
};

// D-15: restoring means re-generating from the saved parameters, which — because
// generation is deterministic — reproduces the previous sector exactly.
const handleRestore = () => {
    const saved = store.loadSavedParams();
    if (!saved) return;

    store.currentSeed = saved.currentSeed as number | string;
    store.systemCount = saved.systemCount as number;
    store.sectorVolume = saved.sectorVolume as number;
    store.zone = saved.zone as SectorZone;

    return run({
        systemCount: saved.systemCount,
        sectorVolume: saved.sectorVolume,
        seed: saved.currentSeed,
        zone: saved.zone
    });
};

const handleReset = () => {
    store.sectorData = null;
    store.error = null;
    lastRequest.value = null;
    // The sector's identity goes with the sector. Leaving loadedParams set would
    // leave the path naming a sector that is not on screen, and a reload would
    // regenerate it — undoing the reset.
    store.loadedParams = null;
    void router.push('/');
};
</script>
