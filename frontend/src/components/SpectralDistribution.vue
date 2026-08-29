<template>
    <section class="flex flex-col gap-3 p-[18px]">
        <header class="flex items-baseline justify-between gap-3">
            <h3 class="font-mono font-semibold text-[11px] tracking-[.12em] text-[#e2e8f0]">
                SPECTRAL CLASS DISTRIBUTION
            </h3>
            <span class="font-mono text-[10px] whitespace-nowrap text-dim">{{ caption }}</span>
        </header>

        <ul class="flex flex-col gap-[7px]">
            <!-- D-29: every present class, count descending. Only the mobile tier
                 truncates, and only until the disclosure below is used. -->
            <li
                v-for="(row, index) in rows"
                :key="row.cls"
                class="grid items-center gap-[10px]"
                :class="[gridClass, index >= MOBILE_ROWS && !showAll ? 'hidden md:grid' : '']"
            >
                <CelestialThumb kind="star" :code="row.cls" :px="26" :ring="ringColor(row.cls)" />

                <span class="hidden truncate font-sans text-[11px] text-ink-2 md:block">
                    {{ row.cls }} · {{ starShortLabel(row.cls) }}
                </span>

                <div class="relative h-2 overflow-hidden rounded-[2px] bg-line-soft">
                    <div
                        class="h-full rounded-[2px]"
                        :style="{ width: barWidth(row), background: getStarClassGradient(row.cls) }"
                    ></div>
                    <!-- The 1px expected-IMF tick, on the same scale as the bar. -->
                    <div
                        v-if="variant === 'statistics' && tickLeft(row) !== null"
                        class="absolute inset-y-0 w-px bg-white"
                        :style="{ left: tickLeft(row) as string }"
                    ></div>
                </div>

                <span class="text-right font-mono font-semibold text-[13px] text-ink">
                    {{ thinThousands(row.count) }}
                </span>

                <span
                    v-if="variant === 'statistics'"
                    class="hidden text-right font-mono text-[11px] text-muted md:block"
                >
                    {{ formatPercent(row.count, total) }}
                </span>
            </li>
        </ul>

        <button
            v-if="rows.length > MOBILE_ROWS && !showAll"
            type="button"
            class="self-start font-mono text-[10px] tracking-[.08em] text-acc-blue-light hover:underline md:hidden"
            @click="showAll = true"
        >
            Show all {{ rows.length }} classes
        </button>

        <p v-if="variant === 'statistics'" class="flex items-center gap-2 font-mono text-[10px] text-dim">
            <span class="inline-block h-px w-[10px] bg-white" aria-hidden="true"></span>
            tick = share expected for a {{ zoneLabel }} zone
        </p>
    </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import CelestialThumb from './CelestialThumb.vue';
import type { SpectralRow } from '../composables/useSectorStats';
import { getStarClassGradient, starShortLabel } from '../utils/starDisplay';
import { getStarHexColor } from '../utils/starHexColors';
import { formatPercent, thinThousands } from '../utils/format';

const props = withDefaults(defineProps<{
    /** Rows from useSectorStats().spectralDistribution — already count-descending. */
    rows: SpectralRow[];
    /** Star total the shares are taken against. */
    total: number;
    /** 1a omits the percentage column and the expected tick; 2a carries both. */
    variant?: 'overview' | 'statistics';
    /** Zone name for the tick legend, e.g. "Medium". */
    zoneLabel?: string;
}>(), {
    variant: 'overview',
    zoneLabel: 'Medium'
});

/** Spec §7.7 4d: under 768px only the top rows show, behind a disclosure. */
const MOBILE_ROWS = 5;

const showAll = ref(false);

// Mobile collapses to thumbnail / bar / count; the label and percentage columns
// are the ones that drop out, so the same cells serve both tiers.
const gridClass = computed(() =>
    props.variant === 'statistics'
        ? 'grid-cols-[26px_1fr_34px] md:grid-cols-[26px_128px_1fr_40px_56px]'
        : 'grid-cols-[26px_1fr_34px] md:grid-cols-[26px_130px_1fr_44px]');

const caption = computed(() =>
    props.variant === 'statistics'
        ? `n = ${thinThousands(props.total)} · vs. expected IMF`
        : `n = ${thinThousands(props.total)}`);

const maxCount = computed(() => Math.max(0, ...props.rows.map(row => row.count)));

// Bars are scaled against the largest class, as in the design, so the smallest
// classes stay visible. A zero maximum (no stars) yields an empty bar, never NaN.
const barWidth = (row: SpectralRow): string =>
    (maxCount.value > 0 ? `${((row.count / maxCount.value) * 100).toFixed(1)}%` : '0%');

/**
 * The expected-share tick has to sit on the bar's own scale, so the expected
 * fraction is re-expressed against the largest class's share:
 * `expected / (maxCount / total)`. A zone whose expectation exceeds anything
 * observed pins the tick to the end of the track rather than overflowing it.
 */
const tickLeft = (row: SpectralRow): string | null => {
    if (maxCount.value <= 0 || props.total <= 0) return null;
    const position = (row.expected * props.total) / maxCount.value;
    return `${Math.min(100, Math.max(0, position * 100)).toFixed(1)}%`;
};

// The thumbnail ring is the class's own colour. getStarHexColor is the existing
// numeric table (it feeds the 3D view); CSS wants the same value as a hex string.
const ringColor = (spectralClass: string): string =>
    `#${getStarHexColor(spectralClass).toString(16).padStart(6, '0')}`;
</script>
