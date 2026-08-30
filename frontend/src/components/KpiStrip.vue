<template>
    <div class="grid grid-cols-2 border-b border-line-strong md:grid-cols-3 lg:grid-cols-5">
        <div
            v-for="(cell, index) in cells"
            :key="cell.label"
            class="flex flex-col gap-[6px] border-line-soft px-[18px] py-4"
            :class="index < cells.length - 1 ? 'border-r' : ''"
            :style="cell.tint ? { background: cell.tint } : undefined"
        >
            <span
                class="font-mono font-medium text-[9px] tracking-[.14em]"
                :style="{ color: cell.labelInk }"
            >
                {{ cell.label }}
            </span>
            <div class="flex items-baseline gap-2">
                <span
                    class="font-mono font-semibold text-[26px] leading-none lg:text-[34px]"
                    :style="{ color: cell.ink }"
                >
                    {{ cell.value }}
                </span>
                <span v-if="cell.suffix" class="font-mono font-medium text-[11px] text-dim">
                    {{ cell.suffix }}
                </span>
            </div>
            <div class="h-[3px]" :style="{ background: cell.railTrack }">
                <div class="h-full" :style="{ width: cell.railWidth, background: cell.rail }"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorStats } from '../composables/useSectorStats';
import { railWidth } from '../utils/kpiScale';
import { formatPercent, thinThousands } from '../utils/format';

const store = useSectorStore();
const stats = useSectorStats(() => store.sectorData, () => store.zone);

// The strip is permanent (success criterion 3): while there is nothing to show
// the numerals read "—" and the rails sit at zero — never NaN, undefined or
// Infinity.
const hasData = computed(() => store.sectorData !== null && store.generationStatus !== 'running');

const values = computed(() => [
    stats.systemCount.value,
    stats.starCount.value,
    stats.planetCount.value,
    stats.moonCount.value,
    stats.lifeCount.value
]);

const max = computed(() => Math.max(0, ...values.value));

const numeral = (value: number): string => (hasData.value ? thinThousands(value) : '—');

const width = (value: number): string =>
    (hasData.value ? `${(railWidth(value, max.value) * 100).toFixed(1)}%` : '0%');

const cells = computed(() => [
    {
        label: 'SYSTEMS',
        value: numeral(values.value[0]),
        suffix: '',
        ink: '#93c5fd',
        labelInk: '#64748b',
        rail: '#3b82f6',
        railTrack: 'rgb(59 130 246 / .2)',
        railWidth: width(values.value[0]),
        tint: ''
    },
    {
        label: 'STARS',
        value: numeral(values.value[1]),
        suffix: '',
        ink: '#c4b5fd',
        labelInk: '#64748b',
        rail: '#8b5cf6',
        railTrack: 'rgb(139 92 246 / .2)',
        railWidth: width(values.value[1]),
        tint: ''
    },
    {
        label: 'PLANETS',
        value: numeral(values.value[2]),
        suffix: '',
        ink: '#6ee7b7',
        labelInk: '#64748b',
        rail: '#10b981',
        railTrack: 'rgb(16 185 129 / .2)',
        railWidth: width(values.value[2]),
        tint: ''
    },
    {
        label: 'MOONS',
        value: numeral(values.value[3]),
        suffix: '',
        ink: '#fcd34d',
        labelInk: '#64748b',
        rail: '#f59e0b',
        railTrack: 'rgb(245 158 11 / .2)',
        railWidth: width(values.value[3]),
        tint: ''
    },
    {
        label: 'WORLDS WITH LIFE',
        value: numeral(values.value[4]),
        suffix: hasData.value ? formatPercent(stats.lifeCount.value, stats.planetCount.value) : '',
        ink: '#34d399',
        labelInk: '#6ee7b7',
        rail: '#34d399',
        railTrack: 'rgb(16 185 129 / .2)',
        railWidth: width(values.value[4]),
        tint: 'rgb(16 185 129 / .06)'
    }
]);
</script>
