<template>
    <section class="flex flex-col gap-3 p-[18px]">
        <header class="flex items-baseline justify-between gap-3">
            <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                {{ title }}
            </h3>
            <span class="font-mono text-[10px] whitespace-nowrap text-dim">
                {{ thinThousands(total) }} planets
            </span>
        </header>

        <!-- Success criterion 15: every zone present in the sector carries its
             own text badge inside the bar, so none is conveyed by colour alone. -->
        <div class="flex h-[26px] overflow-hidden rounded-[3px] bg-line-soft">
            <div
                v-for="segment in segments"
                :key="segment.key"
                class="flex items-center justify-center overflow-hidden px-1"
                :style="{ width: segment.width, background: segment.background }"
                :title="`${segment.label} ${thinThousands(segment.count)}`"
            >
                <span
                    class="font-mono font-semibold text-[10px] tracking-[.06em] whitespace-nowrap"
                    :style="{ color: segment.ink }"
                >
                    {{ segment.label }} {{ thinThousands(segment.count) }}
                </span>
            </div>
        </div>

        <!-- D-6: the derived orbit bands, shown on the Statistics tab only. -->
        <div v-if="orbitBands" class="grid grid-cols-3 gap-3 pt-1">
            <div v-for="band in bandCells" :key="band.label" class="flex flex-col gap-[6px]">
                <span class="font-mono font-medium text-[9px] tracking-[.14em] text-dim">
                    {{ band.label }}
                </span>
                <span class="font-mono font-semibold text-[18px] text-ink">
                    {{ thinThousands(band.count) }}
                </span>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrbitBandCounts, ThermalOccupancy } from '../composables/useSectorStats';
import { thinThousands } from '../utils/format';

const props = withDefaults(defineProps<{
    /** useSectorStats().thermalOccupancy. */
    occupancy: ThermalOccupancy;
    /** Planet total the segment widths are taken against. */
    total: number;
    /** 1a titles this block "HABITABLE ZONE OCCUPANCY"; 2a uses the default. */
    title?: string;
    /** useSectorStats().orbitBands — the 2a three-up summary under the bar. */
    orbitBands?: OrbitBandCounts | null;
}>(), {
    title: 'THERMAL ZONE OCCUPANCY',
    orbitBands: null
});

// Order and colours from the design's stacked bar: hottest to coldest.
const ZONES = [
    { key: 'hot', label: 'HOT', background: '#7f1d1d', ink: '#fecaca' },
    { key: 'goldilocks', label: 'HZ', background: '#047857', ink: '#d1fae5' },
    { key: 'temperate', label: 'TEMP', background: '#854d0e', ink: '#fde68a' },
    { key: 'cold', label: 'COLD', background: '#1e3a8a', ink: '#bfdbfe' }
] as const;

const segments = computed(() =>
    ZONES
        .map(zone => ({ ...zone, count: props.occupancy[zone.key] }))
        // A zone with no planets gets no segment: a zero-width band carrying a
        // "0" label would read as a present-but-tiny zone.
        .filter(zone => zone.count > 0)
        .map(zone => ({
            ...zone,
            width: props.total > 0 ? `${((zone.count / props.total) * 100).toFixed(2)}%` : '0%'
        })));

const bandCells = computed(() => {
    const bands = props.orbitBands;
    if (!bands) return [];
    return [
        { label: 'INNER ORBITS', count: bands.inner },
        { label: 'MEDIUM ORBITS', count: bands.medium },
        { label: 'OUTER ORBITS', count: bands.outer }
    ];
});
</script>
