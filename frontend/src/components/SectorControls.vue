<template>
    <div class="flex flex-col">
        <div
            class="border-b border-line-soft px-[18px] py-[14px] font-mono font-semibold text-[10px] tracking-[.14em] text-dim"
        >
            GENERATION PARAMETERS
        </div>

        <form class="flex flex-col gap-5 p-[18px]" @submit.prevent="handleSubmit">
            <!-- 1. Systems (logarithmic, D-18) -->
            <div class="flex flex-col gap-[7px]">
                <div class="flex items-baseline justify-between gap-2">
                    <label
                        for="systemCount"
                        class="font-mono font-medium text-[10px] tracking-[.1em] text-muted"
                    >
                        SYSTEMS
                    </label>
                    <input
                        id="systemCount"
                        v-model="systemsDraft"
                        type="number"
                        inputmode="numeric"
                        :min="SYSTEMS_RANGE.min"
                        :max="SYSTEMS_RANGE.max"
                        class="ug-value-input"
                        :style="systemsInvalid ? INVALID_FIELD : undefined"
                        @blur="commitSystems"
                    />
                </div>
                <input
                    aria-label="Systems"
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    :value="systemsSlider"
                    @input="onSystemsSlider"
                />
                <div class="flex justify-between font-mono text-[9px] text-faint">
                    <span>{{ SYSTEMS_RANGE.min }}</span>
                    <span>{{ thinThousands(SYSTEMS_RANGE.max) }}</span>
                </div>
                <p v-if="systemsInvalid" class="font-mono text-[9px] text-acc-red-light">
                    {{ SYSTEMS_RANGE.min }} – {{ thinThousands(SYSTEMS_RANGE.max) }}
                </p>
            </div>

            <!-- 2. Volume (logarithmic, D-18) -->
            <div class="flex flex-col gap-[7px]">
                <div class="flex items-baseline justify-between gap-2">
                    <label
                        for="sectorVolume"
                        class="font-mono font-medium text-[10px] tracking-[.1em] text-muted"
                    >
                        VOLUME pc³
                    </label>
                    <input
                        id="sectorVolume"
                        v-model="volumeDraft"
                        type="number"
                        inputmode="numeric"
                        :min="VOLUME_RANGE.min"
                        :max="VOLUME_RANGE.max"
                        class="ug-value-input"
                        :style="volumeInvalid ? INVALID_FIELD : undefined"
                        @blur="commitVolume"
                    />
                </div>
                <input
                    aria-label="Volume in cubic parsecs"
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    :value="volumeSlider"
                    @input="onVolumeSlider"
                />
                <div class="flex justify-between font-mono text-[9px] text-faint">
                    <span>{{ VOLUME_RANGE.min }}</span>
                    <span>100 k</span>
                </div>
                <p v-if="volumeInvalid" class="font-mono text-[9px] text-acc-red-light">
                    {{ VOLUME_RANGE.min }} – {{ thinThousands(VOLUME_RANGE.max) }} pc³
                </p>
            </div>

            <!-- 3. Galactic zone — single-select segmented control -->
            <div class="flex flex-col gap-2">
                <span class="font-mono font-medium text-[10px] tracking-[.1em] text-muted">
                    GALACTIC ZONE
                </span>
                <div class="grid grid-cols-2 gap-[6px]" role="radiogroup" aria-label="Galactic zone">
                    <button
                        v-for="option in ZONE_OPTIONS"
                        :key="option.value"
                        type="button"
                        role="radio"
                        :aria-checked="store.zone === option.value"
                        :class="[
                            'rounded-ctl border p-2 text-center font-mono text-[10px] transition-colors duration-150',
                            option.wide ? 'col-span-2' : '',
                            store.zone === option.value
                                ? 'border-acc-blue font-semibold text-acc-blue-pale'
                                : 'border-line-control bg-input font-medium text-dim hover:text-ink-2'
                        ]"
                        :style="store.zone === option.value ? SELECTED_ZONE : undefined"
                        @click="store.zone = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <!-- 4. Density readout (D-17) — advisory only, never blocking -->
            <div
                class="flex flex-col gap-[9px] rounded-card p-3"
                :style="{ border: `1px solid ${TONE[verdict.tone].border}`, background: TONE[verdict.tone].bg }"
            >
                <div class="flex items-center justify-between gap-2">
                    <span class="font-mono font-medium text-[10px] tracking-[.1em] text-muted">
                        STELLAR DENSITY
                    </span>
                    <span
                        class="rounded-badge px-[7px] py-[2px] font-mono font-semibold text-[9px] tracking-[.08em]"
                        :style="{ background: TONE[verdict.tone].pillBg, color: TONE[verdict.tone].pillInk }"
                    >
                        {{ verdict.label }}
                    </span>
                </div>
                <div class="flex items-baseline gap-[6px]">
                    <span class="font-mono font-semibold text-[22px] text-ink">
                        {{ currentDensity.toFixed(3) }}
                    </span>
                    <span class="font-mono text-[10px] text-dim">stars / pc³</span>
                </div>
                <div class="relative h-4">
                    <div
                        class="absolute top-[7px] right-0 left-0 h-[2px]"
                        style="background: linear-gradient(90deg, #475569, #10b981 45%, #f59e0b 75%, #ef4444)"
                    ></div>
                    <!-- Faint expected tick: ratio 1, always at 50%. -->
                    <div
                        class="absolute top-[2px] left-1/2 h-3 w-px"
                        style="background: rgb(148 163 184 / .5)"
                    ></div>
                    <div
                        class="absolute top-[2px] h-3 w-[2px] bg-ink"
                        :style="{ left: `${markerPercent}%` }"
                    ></div>
                </div>
                <div class="font-mono text-[9px] text-faint">
                    expected {{ expectedDensity(store.zone).toFixed(3) }} · marker at current
                </div>
            </div>

            <!-- 5. Seed -->
            <div class="flex flex-col gap-2">
                <label for="seed" class="font-mono font-medium text-[10px] tracking-[.1em] text-muted">
                    SEED
                </label>
                <div class="flex gap-[6px]">
                    <input
                        id="seed"
                        v-model.number="store.currentSeed"
                        type="number"
                        min="0"
                        placeholder="random"
                        class="flex-1 rounded-ctl border border-line-control bg-input px-[11px] py-[9px] font-mono font-medium text-[12px] text-ink-2 outline-none focus:border-acc-blue"
                    />
                    <button
                        type="button"
                        title="Generate random seed"
                        aria-label="Generate random seed"
                        class="w-[38px] rounded-ctl border border-line-control bg-input font-mono font-medium text-[13px] text-muted transition-colors duration-150 hover:text-ink"
                        @click="randomizeSeed"
                    >
                        ⟳
                    </button>
                </div>
            </div>

            <!-- 6. Actions -->
            <div class="flex flex-col gap-2">
                <button
                    type="submit"
                    class="ug-btn-primary w-full p-[13px]"
                    :disabled="!isValid || isRunning"
                    :style="!isValid ? { opacity: 0.4 } : undefined"
                >
                    {{ isRunning ? 'GENERATING…' : 'GENERATE SECTOR' }}
                </button>
                <p v-if="isLargeSector" class="font-mono text-[9px] text-faint">
                    large sectors may take several seconds
                </p>
                <div class="flex gap-2">
                    <button
                        type="button"
                        class="ug-btn-outline flex-1 p-[9px]"
                        :disabled="isRunning"
                        @click="resetForm"
                    >
                        RESET
                    </button>
                    <button
                        type="button"
                        class="ug-btn-danger flex-1 p-[9px]"
                        :disabled="isRunning"
                        @click="clearMemory"
                    >
                        CLEAR MEMORY
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SectorZone } from '../types';
import { useSectorStore } from '../stores/sectorStore';
import { SYSTEMS_RANGE, VOLUME_RANGE, fromSlider, toSlider } from '../utils/logScale';
import { densityMarker, densityVerdict, expectedDensity, starDensity } from '../utils/density';
import { thinThousands } from '../utils/format';

const store = useSectorStore();

const emit = defineEmits<{
    generate: [];
    reset: [];
}>();

const ZONE_OPTIONS: Array<{ value: SectorZone; label: string; wide?: boolean }> = [
    { value: 'extragalactic', label: 'EXTRAGAL.' },
    { value: 'galactic edge', label: 'EDGE' },
    { value: 'medium', label: 'MEDIUM' },
    { value: 'central zone', label: 'CENTRAL' },
    { value: 'core', label: 'GALACTIC CORE', wide: true }
];

const SELECTED_ZONE = { background: 'rgb(59 130 246 / .18)' };
const INVALID_FIELD = { borderColor: 'rgb(239 68 68 / .5)' };

const TONE = {
    slate: {
        border: 'rgb(148 163 184 / .3)',
        bg: 'rgb(148 163 184 / .05)',
        pillBg: 'rgb(148 163 184 / .18)',
        pillInk: '#cbd5e1'
    },
    green: {
        border: 'rgb(16 185 129 / .35)',
        bg: 'rgb(16 185 129 / .07)',
        pillBg: 'rgb(16 185 129 / .2)',
        pillInk: '#6ee7b7'
    },
    amber: {
        border: 'rgb(245 158 11 / .35)',
        bg: 'rgb(245 158 11 / .07)',
        pillBg: 'rgb(245 158 11 / .2)',
        pillInk: '#fcd34d'
    },
    red: {
        border: 'rgb(239 68 68 / .35)',
        bg: 'rgb(239 68 68 / .07)',
        pillBg: 'rgb(239 68 68 / .2)',
        pillInk: '#fca5a5'
    }
} as const;

// --- Editable numerals (D-18) ---------------------------------------------
// The draft holds what the user is typing so an in-progress value is never
// written to the store; a valid draft updates the store live (so the density
// gauge follows), and blur clamps it back into the documented range (§8).

const systemsDraft = ref(String(store.systemCount));
const volumeDraft = ref(String(store.sectorVolume));

const inRange = (draft: string, min: number, max: number): boolean => {
    const value = Number(draft);
    return draft.trim() !== '' && Number.isInteger(value) && value >= min && value <= max;
};

const clampInt = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, Math.round(value)));

const systemsInvalid = computed(() => !inRange(systemsDraft.value, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max));
const volumeInvalid = computed(() => !inRange(volumeDraft.value, VOLUME_RANGE.min, VOLUME_RANGE.max));

watch(systemsDraft, draft => {
    if (!systemsInvalid.value) store.systemCount = Number(draft);
});

watch(volumeDraft, draft => {
    if (!volumeInvalid.value) store.sectorVolume = Number(draft);
});

// Anything that moves the store value (slider, reset, restore, clear memory)
// writes the draft back so the two never drift apart.
watch(() => store.systemCount, value => {
    if (Number(systemsDraft.value) !== value) systemsDraft.value = String(value);
});

watch(() => store.sectorVolume, value => {
    if (Number(volumeDraft.value) !== value) volumeDraft.value = String(value);
});

const commitSystems = () => {
    const value = Number(systemsDraft.value);
    const clamped = Number.isFinite(value)
        ? clampInt(value, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max)
        : store.systemCount;
    store.systemCount = clamped;
    systemsDraft.value = String(clamped);
};

const commitVolume = () => {
    const value = Number(volumeDraft.value);
    const clamped = Number.isFinite(value)
        ? clampInt(value, VOLUME_RANGE.min, VOLUME_RANGE.max)
        : store.sectorVolume;
    store.sectorVolume = clamped;
    volumeDraft.value = String(clamped);
};

// The clamps the pre-redesign component carried are kept: the sliders cannot
// produce an out-of-range value, but a restored or hand-edited one might.
watch(() => store.systemCount, value => {
    if (value < 1) store.systemCount = 1;
    if (value > 5000) store.systemCount = 5000;
});

watch(() => store.sectorVolume, value => {
    if (value < 10) store.sectorVolume = 10;
    if (value > 1000000) store.sectorVolume = 1000000;
});

// --- Logarithmic sliders (D-18) -------------------------------------------

const SLIDER_STEPS = 1000;

const systemsSlider = computed(() =>
    Math.round(toSlider(store.systemCount, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max) * SLIDER_STEPS));

const volumeSlider = computed(() =>
    Math.round(toSlider(store.sectorVolume, VOLUME_RANGE.min, VOLUME_RANGE.max) * SLIDER_STEPS));

const onSystemsSlider = (event: Event) => {
    const t = Number((event.target as HTMLInputElement).value) / SLIDER_STEPS;
    store.systemCount = fromSlider(t, SYSTEMS_RANGE.min, SYSTEMS_RANGE.max, SYSTEMS_RANGE.step);
};

const onVolumeSlider = (event: Event) => {
    const t = Number((event.target as HTMLInputElement).value) / SLIDER_STEPS;
    store.sectorVolume = fromSlider(t, VOLUME_RANGE.min, VOLUME_RANGE.max, VOLUME_RANGE.step);
};

// --- Density gauge (D-17) --------------------------------------------------
// Read-only guidance. It replaces the removed [sectorVolume, zone] -> systemCount
// auto-suggest watcher (D-16) and never writes back to any parameter.

const currentDensity = computed(() => starDensity(store.systemCount, store.sectorVolume));
const verdict = computed(() => densityVerdict(currentDensity.value, store.zone));
const markerPercent = computed(() => densityMarker(currentDensity.value, store.zone) * 100);

// --- Actions ---------------------------------------------------------------

const isRunning = computed(() => store.generationStatus === 'running');
const isValid = computed(() => !systemsInvalid.value && !volumeInvalid.value);
const isLargeSector = computed(() => store.systemCount > 2000);

const randomizeSeed = () => {
    store.currentSeed = Math.floor(Math.random() * 1000000);
};

const handleSubmit = () => {
    if (!isValid.value || isRunning.value) return;
    emit('generate');
};

const resetForm = () => {
    store.systemCount = 100;
    store.sectorVolume = 1000;
    store.zone = 'medium';
    store.currentSeed = '';
    emit('reset');
};

const clearMemory = () => {
    store.clearPersistentMemory();
};
</script>
