<template>
    <section class="flex flex-col gap-3 p-[18px]">
        <header class="flex items-baseline justify-between gap-3">
            <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                {{ heading }}
            </h3>
        </header>

        <!-- D-29: the Overview grid shows the top 8 present types with a "+N"
             chip; the Statistics grid wraps and shows every present type. -->
        <div class="grid gap-[10px]" :class="gridClass">
            <button
                v-for="row in visibleRows"
                :key="row.type"
                type="button"
                :data-type-card="row.type"
                :aria-label="`Show ${planetShortLabel(row.type)} planets`"
                class="flex cursor-pointer flex-col gap-[9px] rounded-card border p-[11px] text-left transition-colors duration-150"
                :class="isHighlighted(row.type)
                    ? 'border-acc-green/50 bg-acc-green/10'
                    : 'border-line-soft bg-panel hover:border-line-control'"
                @click="filterToType(row.type)"
            >
                <div class="flex items-center justify-between gap-2">
                    <CelestialThumb kind="planet" :code="row.type" :px="30" />
                    <span
                        class="font-mono font-semibold text-[20px]"
                        :class="isHighlighted(row.type) ? 'text-acc-green-light' : 'text-ink'"
                    >
                        {{ thinThousands(row.count) }}
                    </span>
                </div>

                <span
                    class="font-sans text-[10px]"
                    :class="isHighlighted(row.type) ? 'text-acc-green-mid' : 'text-muted'"
                >
                    {{ planetShortLabel(row.type) }}
                </span>

                <div class="h-[3px] overflow-hidden rounded-[2px] bg-line-soft">
                    <div class="h-full bg-acc-green" :style="{ width: barWidth(row) }"></div>
                </div>

                <span
                    v-if="variant === 'statistics'"
                    class="font-mono text-[9px]"
                    :class="isHighlighted(row.type) ? 'text-acc-green-mid' : 'text-faint'"
                >
                    {{ secondaryFact(row) }}
                </span>
            </button>

            <div
                v-if="overflowCount > 0"
                class="flex flex-col justify-center gap-1 rounded-card border border-line-soft bg-panel p-[11px]"
            >
                <span class="font-mono font-semibold text-[20px] text-ink-2">+{{ overflowCount }}</span>
                <span class="font-sans text-[10px] text-muted">more types</span>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CelestialThumb from './CelestialThumb.vue';
import type { PlanetTypeRow } from '../composables/useSectorStats';
import { useSectorStore } from '../stores/sectorStore';
import { PLANET_TYPE_DESCRIPTIONS } from '../types';
import { planetShortLabel } from '../utils/planetDisplay';
import { formatPercent, thinThousands } from '../utils/format';

const props = withDefaults(defineProps<{
    /** Rows from useSectorStats().planetTypeDistribution — already count-descending. */
    rows: PlanetTypeRow[];
    /** Planet total the shares are taken against. */
    total: number;
    /** 1a shows the top 8 in a 4-up grid; 2a shows every present type, 8-up. */
    variant?: 'overview' | 'statistics';
}>(), {
    variant: 'overview'
});

/** D-29: the Overview card grid stops here and hands the rest to the "+N" chip. */
const OVERVIEW_CARDS = 8;

/**
 * The design highlights the Earth-like card and reads its life count where the
 * other cards read moons — the fact that makes that one type interesting.
 */
const HIGHLIGHT_TYPE = 'E';

// D-36: the canonical map is the closed set, so its size is the "of N types"
// denominator rather than a literal 22 that could drift away from it.
const TYPE_SET_SIZE = Object.keys(PLANET_TYPE_DESCRIPTIONS).length;

const visibleRows = computed(() =>
    (props.variant === 'overview' ? props.rows.slice(0, OVERVIEW_CARDS) : props.rows));

const overflowCount = computed(() =>
    (props.variant === 'overview' ? Math.max(0, props.rows.length - OVERVIEW_CARDS) : 0));

const heading = computed(() =>
    (props.variant === 'statistics'
        ? `PLANET TYPE DISTRIBUTION · ${props.rows.length} OF ${TYPE_SET_SIZE} TYPES PRESENT`
        : 'PLANET TYPE DISTRIBUTION'));

const gridClass = computed(() =>
    (props.variant === 'statistics'
        ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-8'
        : 'grid-cols-2 md:grid-cols-4'));

const maxCount = computed(() => Math.max(0, ...props.rows.map(row => row.count)));

const barWidth = (row: PlanetTypeRow): string =>
    (maxCount.value > 0 ? `${((row.count / maxCount.value) * 100).toFixed(1)}%` : '0%');

const isHighlighted = (type: string): boolean => type === HIGHLIGHT_TYPE;

const store = useSectorStore();

/**
 * Spec §11 Slice 5: a type card is a cross-filter. It replaces whatever the
 * Planets tab was filtered to with this one type and opens that tab, so the
 * card and the tab's own pill strip always agree.
 */
const filterToType = (type: string) => {
    store.planetFilters.types = [type];
    store.activeTab = 'planets';
};

const secondaryFact = (row: PlanetTypeRow): string => {
    const share = formatPercent(row.count, props.total);
    return isHighlighted(row.type)
        ? `${share} · ${thinThousands(row.lifeCount)} with life`
        : `${share} · ${thinThousands(row.moons)} moons`;
};
</script>
