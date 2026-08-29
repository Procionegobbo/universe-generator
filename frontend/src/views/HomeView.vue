<template>
    <div class="flex min-h-full flex-col">
        <div
            class="grid flex-1 items-start"
            :class="showRail ? 'md:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr]' : 'grid-cols-1'"
        >
            <!-- Parameter rail — Overview tab only (D-31); below md it lives in
                 the sticky PARAMETERS sheet instead. -->
            <aside
                v-if="showRail"
                class="hidden min-h-[820px] self-stretch border-r border-line-strong bg-panel md:block"
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

                <!-- The tab bodies land in stories 005-008; until then the new
                     shell hosts the pre-redesign results body unchanged. -->
                <div v-else-if="store.sectorData" class="p-4">
                    <ResultsDisplay
                        :systems="store.sectorData.systems"
                        :stars="store.sectorData.stars"
                        :planets="store.sectorData.planets"
                        :sectorVolume="store.sectorVolume"
                    />
                </div>

                <EmptyState v-else @generate="handleGenerate" @restore="handleRestore" />
            </div>
        </div>

        <MobileActionBar
            :disabled="isRunning"
            @open-parameters="sheetOpen = true"
            @generate="handleGenerate"
        />

        <!-- Mobile parameter sheet: the rail is reachable on every tab. -->
        <div v-if="sheetOpen" class="fixed inset-0 z-40 md:hidden">
            <div class="absolute inset-0 bg-black/60" @click="sheetOpen = false"></div>
            <div
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
import { computed, ref } from 'vue';
import SectorControls from '../components/SectorControls.vue';
import ResultsDisplay from '../components/ResultsDisplay.vue';
import KpiStrip from '../components/KpiStrip.vue';
import EmptyState from '../components/EmptyState.vue';
import GeneratingState from '../components/GeneratingState.vue';
import MobileActionBar from '../components/MobileActionBar.vue';
import { useSectorStore } from '../stores/sectorStore';
import { thinThousands } from '../utils/format';
import type { GenerationRequest, SectorZone } from '../types';

const store = useSectorStore();

const sheetOpen = ref(false);
const lastRequest = ref<GenerationRequest | null>(null);
let controller: AbortController | null = null;

const isRunning = computed(() => store.generationStatus === 'running');
const showRail = computed(() => store.activeTab === 'overview');

const subHeader = computed(() =>
    `SECTOR ${store.currentSeed} · ${store.zone.toUpperCase()} ZONE · ${thinThousands(store.sectorVolume)} pc³`);

// An empty seed randomises on submit, exactly as the old handleSubmit did. It
// lives here rather than in the rail because generation is now reachable from
// three places (the rail, the empty state and the mobile action bar).
const buildRequest = (): GenerationRequest => {
    if (store.currentSeed === '' || store.currentSeed === null) {
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
};
</script>
