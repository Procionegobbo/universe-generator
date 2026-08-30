<template>
    <div class="flex flex-col">
        <!-- Six KPI cells, each with the sub-caption from the design. -->
        <div class="grid grid-cols-2 border-b border-line-strong md:grid-cols-3 xl:grid-cols-6">
            <div
                v-for="(cell, index) in kpiCells"
                :key="cell.label"
                :data-kpi="cell.label"
                class="flex flex-col gap-[6px] border-line-soft px-[18px] py-4"
                :class="index < kpiCells.length - 1 ? 'border-r' : ''"
                :style="cell.tint ? { background: cell.tint } : undefined"
            >
                <span
                    class="font-mono font-medium text-[9px] tracking-[.14em]"
                    :style="{ color: cell.labelInk }"
                >
                    {{ cell.label }}
                </span>
                <span
                    class="font-mono font-semibold text-[26px] leading-none xl:text-[32px]"
                    :style="{ color: cell.ink }"
                >
                    {{ cell.value }}
                </span>
                <span class="font-mono text-[9px] text-faint">{{ cell.caption }}</span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2">
            <SpectralDistribution
                class="border-b border-line-soft lg:border-r lg:border-b-0"
                variant="statistics"
                :rows="stats.spectralDistribution.value"
                :total="stats.starCount.value"
                :zone-label="zoneLabel"
            />

            <div class="flex flex-col">
                <!-- System multiplicity -->
                <section class="flex flex-col gap-3 p-[18px]">
                    <header class="flex items-baseline justify-between gap-3">
                        <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                            SYSTEM MULTIPLICITY
                        </h3>
                        <span class="font-mono text-[10px] whitespace-nowrap text-dim">
                            {{ thinThousands(stats.systemCount.value) }} systems
                        </span>
                    </header>
                    <div class="grid grid-cols-4 items-end gap-3">
                        <div v-for="bar in multiplicityBars" :key="bar.label" class="flex flex-col gap-[6px]">
                            <span class="text-center font-mono font-semibold text-[12px] text-ink">
                                {{ thinThousands(bar.count) }}
                            </span>
                            <div class="flex h-[104px] items-end">
                                <div
                                    class="w-full rounded-t-[2px]"
                                    :style="{ height: bar.height, background: bar.background }"
                                ></div>
                            </div>
                            <span class="text-center font-mono text-[9px] text-dim">{{ bar.label }}</span>
                        </div>
                    </div>
                </section>

                <!-- Moons per planet -->
                <section class="flex flex-col gap-3 border-t border-line-soft p-[18px]">
                    <header class="flex items-baseline justify-between gap-3">
                        <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                            MOONS PER PLANET
                        </h3>
                        <span class="font-mono text-[10px] whitespace-nowrap text-dim">
                            mean {{ stats.moonHistogram.value.mean.toFixed(2) }} ·
                            max {{ thinThousands(stats.moonHistogram.value.max) }}
                        </span>
                    </header>
                    <div class="grid grid-cols-10 items-end gap-[3px]">
                        <div v-for="bucket in moonBuckets" :key="bucket.label" class="flex flex-col gap-[6px]">
                            <div class="flex h-[84px] items-end">
                                <div
                                    class="w-full rounded-t-[2px]"
                                    :style="{ height: bucket.height, background: bucket.background }"
                                    :title="`${bucket.label}: ${bucket.count}`"
                                ></div>
                            </div>
                            <span class="text-center font-mono text-[9px] text-faint">{{ bucket.label }}</span>
                        </div>
                    </div>
                </section>

                <ThermalZoneBar
                    class="border-t border-line-soft"
                    :occupancy="stats.thermalOccupancy.value"
                    :total="stats.planetCount.value"
                    :orbit-bands="stats.orbitBands.value"
                />
            </div>
        </div>

        <PlanetTypeDistribution
            class="border-t border-line-strong"
            variant="statistics"
            :rows="stats.planetTypeDistribution.value"
            :total="stats.planetCount.value"
        />

        <div class="grid grid-cols-1 border-t border-line-strong lg:grid-cols-2">
            <!-- Life by development stage -->
            <section class="flex flex-col gap-3 border-b border-line-soft p-[18px] lg:border-r lg:border-b-0">
                <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                    LIFE BY DEVELOPMENT STAGE
                </h3>
                <ul class="flex flex-col gap-[7px]">
                    <li
                        v-for="stage in lifeStages"
                        :key="stage.label"
                        class="grid grid-cols-[110px_1fr_34px] items-center gap-[10px] sm:grid-cols-[150px_1fr_34px]"
                    >
                        <span class="truncate font-sans text-[11px] text-ink-2">{{ stage.label }}</span>
                        <div class="h-2 overflow-hidden rounded-[2px] bg-line-soft">
                            <div
                                class="h-full rounded-[2px]"
                                :style="{ width: stage.width, background: stage.background }"
                            ></div>
                        </div>
                        <span class="text-right font-mono font-semibold text-[13px] text-ink">
                            {{ thinThousands(stage.count) }}
                        </span>
                    </li>
                </ul>
            </section>

            <!-- Generation run -->
            <section class="flex flex-col gap-3 p-[18px]">
                <header class="flex items-baseline justify-between gap-3">
                    <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                        GENERATION RUN
                    </h3>
                    <span class="font-mono text-[10px] whitespace-nowrap text-dim">
                        seed {{ store.currentSeed }}
                    </span>
                </header>
                <div class="grid grid-cols-2 gap-[10px] xl:grid-cols-4">
                    <div
                        v-for="card in runCards"
                        :key="card.label"
                        class="flex flex-col gap-[6px] rounded-card border p-3"
                        :class="card.green ? 'border-acc-green/30 bg-acc-green/5' : 'border-line-soft bg-panel'"
                    >
                        <span
                            class="font-mono font-medium text-[9px] tracking-[.14em]"
                            :class="card.green ? 'text-acc-green-mid' : 'text-dim'"
                        >
                            {{ card.label }}
                        </span>
                        <span
                            class="font-mono font-semibold text-[18px]"
                            :class="card.green ? 'text-acc-green-light' : 'text-ink'"
                        >
                            {{ card.value }}
                        </span>
                    </div>
                </div>
                <p class="font-mono text-[10px] leading-[1.6] text-faint">
                    Re-running with the same seed, volume and zone reproduces this sector exactly.
                </p>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PlanetTypeDistribution from './PlanetTypeDistribution.vue';
import SpectralDistribution from './SpectralDistribution.vue';
import ThermalZoneBar from './ThermalZoneBar.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorStats } from '../composables/useSectorStats';
import { LIFE_STAGE_LABELS } from '../types';
import { formatPercent, thinThousands } from '../utils/format';

const store = useSectorStore();

// One aggregate source (spec §3): the same derivation the KPI strip and the
// Overview tab run, so every shared number is identical across the three.
const stats = useSectorStats(() => store.sectorData, () => store.zone);

const zoneLabel = computed(() => store.zone.charAt(0).toUpperCase() + store.zone.slice(1));

const kpiCells = computed(() => [
    {
        label: 'SYSTEMS',
        value: thinThousands(stats.systemCount.value),
        caption: `${stats.starsPerSystem.value.toFixed(2)} stars each`,
        ink: '#93c5fd',
        labelInk: '#64748b',
        tint: ''
    },
    {
        label: 'STARS',
        value: thinThousands(stats.starCount.value),
        caption: `${stats.spectralDistribution.value.length} classes present`,
        ink: '#c4b5fd',
        labelInk: '#64748b',
        tint: ''
    },
    {
        label: 'PLANETS',
        value: thinThousands(stats.planetCount.value),
        caption: `${stats.planetsPerStar.value.toFixed(2)} per star`,
        ink: '#6ee7b7',
        labelInk: '#64748b',
        tint: ''
    },
    {
        label: 'MOONS',
        value: thinThousands(stats.moonCount.value),
        caption: `${stats.moonsPerPlanet.value.toFixed(2)} per planet`,
        ink: '#fcd34d',
        labelInk: '#64748b',
        tint: ''
    },
    {
        label: 'IN HABITABLE ZONE',
        value: thinThousands(stats.habitableCount.value),
        caption: `${formatPercent(stats.habitableCount.value, stats.planetCount.value)} of planets`,
        ink: '#34d399',
        labelInk: '#6ee7b7',
        tint: 'rgb(16 185 129 / .06)'
    },
    {
        label: 'WITH LIFE',
        value: thinThousands(stats.lifeCount.value),
        caption: `across ${thinThousands(stats.lifeSystemCount.value)} systems`,
        ink: '#34d399',
        labelInk: '#6ee7b7',
        tint: 'rgb(16 185 129 / .06)'
    }
]);

// Blue -> violet ramp from the design, one step per multiplicity bucket.
const MULTIPLICITY_FILLS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

// An empty bucket draws nothing; a non-empty one keeps a 2% floor so the
// smallest counts stay visible next to the tallest bar.
const barHeight = (count: number, max: number): string => {
    if (count <= 0 || max <= 0) return '0%';
    return `${Math.max(2, (count / max) * 100).toFixed(1)}%`;
};

const multiplicityBars = computed(() => {
    const { one, two, three, fourPlus } = stats.multiplicity.value;
    const counts = [one, two, three, fourPlus];
    const max = Math.max(0, ...counts);
    return ['1 star', '2 stars', '3 stars', '4+ stars'].map((label, index) => ({
        label,
        count: counts[index],
        height: barHeight(counts[index], max),
        background: `linear-gradient(180deg,${MULTIPLICITY_FILLS[index]},${MULTIPLICITY_FILLS[index]}b3)`
    }));
});

// Amber ramp from the design, darkening across the ten moon-count buckets.
const MOON_FILLS = [
    '#f59e0b', '#f59e0b', '#ea9209', '#e08608', '#d97706',
    '#cf6d07', '#c56406', '#bb5b06', '#b45309', '#a3480a'
];

const moonBuckets = computed(() => {
    const buckets = stats.moonHistogram.value.buckets;
    const max = Math.max(0, ...buckets);
    return buckets.map((count, index) => ({
        label: String(index),
        count,
        height: barHeight(count, max),
        background: MOON_FILLS[index]
    }));
});

// Teal ramp across the six LIFE_STAGE_LABELS milestones.
const LIFE_FILLS = ['#065f46', '#0f766e', '#0d9488', '#10b981', '#34d399', '#6ee7b7'];

const lifeStages = computed(() => {
    const buckets = stats.lifeByStage.value;
    const max = Math.max(0, ...buckets);
    return buckets.map((count, index) => ({
        label: LIFE_STAGE_LABELS[index + 1],
        count,
        width: max > 0 ? `${((count / max) * 100).toFixed(1)}%` : '0%',
        background: LIFE_FILLS[index]
    }));
});

// The realised density of the run, from the stars the generator actually
// produced — not the rail's pre-generation estimate from the requested systems.
const density = computed(() =>
    (store.sectorVolume > 0 ? stats.starCount.value / store.sectorVolume : 0));

const runCards = computed(() => [
    {
        label: 'TIME',
        value: store.lastStats ? `${thinThousands(store.lastStats.generationTimeMs)} ms` : '—',
        green: false
    },
    { label: 'ZONE', value: zoneLabel.value, green: false },
    { label: 'VOLUME', value: `${thinThousands(store.sectorVolume)} pc³`, green: false },
    { label: 'DENSITY', value: density.value.toFixed(3), green: true }
]);
</script>
