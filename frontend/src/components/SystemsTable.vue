<template>
    <section class="flex flex-col">
        <!-- Filter bar (handoff 3a). Every child is flex-none / whitespace-nowrap:
             the bar scrolls sideways on a narrow viewport, it never wraps. -->
        <div
            data-filter-bar
            class="flex items-center justify-between gap-3 overflow-x-auto border-b border-line-strong bg-panel px-[18px] py-3"
        >
            <div class="flex flex-none items-center gap-[10px] whitespace-nowrap">
                <label
                    class="flex flex-none items-center gap-[7px] rounded-ctl border border-line-control bg-input px-[11px] py-2 whitespace-nowrap"
                >
                    <span aria-hidden="true" class="font-mono text-[11px] text-faint">⌕</span>
                    <span class="sr-only">Search systems by name or ID</span>
                    <input
                        data-filter="query"
                        type="search"
                        :value="store.systemFilters.query"
                        placeholder="search name or ID…"
                        class="w-[180px] bg-transparent font-mono text-[11px] text-ink placeholder:text-faint focus:outline-none"
                        @input="setQuery(($event.target as HTMLInputElement).value)"
                    />
                </label>

                <div
                    class="flex flex-none overflow-hidden rounded-ctl border border-line-control whitespace-nowrap"
                    role="group"
                    aria-label="System preset"
                >
                    <button
                        v-for="(option, index) in PRESETS"
                        :key="option.id"
                        type="button"
                        :data-preset="option.id"
                        :aria-pressed="store.systemFilters.preset === option.id"
                        class="px-3 py-2 font-mono text-[10px] tracking-[.06em] whitespace-nowrap transition-colors duration-150"
                        :class="[
                            index > 0 ? 'border-l border-line-strong' : '',
                            store.systemFilters.preset === option.id
                                ? 'bg-[rgba(59,130,246,0.2)] font-semibold text-acc-blue-pale'
                                : 'font-medium text-dim hover:text-ink-2'
                        ]"
                        @click="setPreset(option.id)"
                    >
                        {{ option.label }}
                    </button>
                </div>

                <div
                    class="flex flex-none items-center gap-[7px] rounded-ctl border border-line-control bg-input px-[11px] py-2 whitespace-nowrap"
                >
                    <span class="font-mono text-[10px] text-dim">PRIMARY CLASS</span>
                    <select
                        data-filter="primary-class"
                        aria-label="Primary class"
                        :value="store.systemFilters.primaryClass"
                        class="cursor-pointer appearance-none bg-transparent font-mono font-semibold text-[10px] text-[#e2e8f0] focus:outline-none"
                        @change="setPrimaryClass(($event.target as HTMLSelectElement).value)"
                    >
                        <option value="any">ANY</option>
                        <option v-for="cls in primaryClasses" :key="cls" :value="cls">{{ cls }}</option>
                    </select>
                    <span aria-hidden="true" class="font-mono text-[10px] text-[#e2e8f0]">▾</span>
                </div>

                <div
                    class="flex flex-none items-center gap-[7px] rounded-ctl border border-line-control bg-input px-[11px] py-2 whitespace-nowrap"
                >
                    <span class="font-mono text-[10px] text-dim">SORT</span>
                    <select
                        data-filter="sort"
                        aria-label="Sort systems"
                        :value="store.systemFilters.sort"
                        class="cursor-pointer appearance-none bg-transparent font-mono font-semibold text-[10px] text-[#e2e8f0] focus:outline-none"
                        @change="setSort(($event.target as HTMLSelectElement).value)"
                    >
                        <option v-for="option in SORTS" :key="option.id" :value="option.id">
                            {{ option.label }}
                        </option>
                    </select>
                    <span aria-hidden="true" class="font-mono text-[10px] text-[#e2e8f0]">▾</span>
                </div>
            </div>

            <!-- Mini-counters, over the filtered set (handoff §Interactions). -->
            <div class="flex flex-none items-center gap-[18px] whitespace-nowrap">
                <div
                    v-for="(counter, index) in counters"
                    :key="counter.label"
                    class="flex flex-none items-center gap-[18px] whitespace-nowrap"
                >
                    <span v-if="index > 0" class="h-[24px] w-px flex-none bg-line-strong"></span>
                    <span
                        :data-counter="counter.label"
                        class="flex flex-none flex-col gap-px text-right whitespace-nowrap"
                    >
                        <span class="font-mono font-semibold text-[14px]" :style="{ color: counter.color }">
                            {{ counter.value }}
                        </span>
                        <span class="font-mono text-[8px] tracking-[.1em] text-dim">{{ counter.label }}</span>
                    </span>
                </div>
            </div>
        </div>

        <div class="overflow-x-auto">
            <div class="min-w-[600px] px-[18px]">
                <div
                    :class="GRID"
                    class="border-b border-line-strong py-[10px] font-mono font-medium text-[9px] tracking-[.12em] text-faint"
                >
                    <span>ID</span>
                    <span>SYSTEM</span>
                    <span>PRIMARY</span>
                    <span class="text-right">★</span>
                    <span class="text-right">PLANETS</span>
                    <span class="text-right">MOONS</span>
                    <span class="text-right">HZ</span>
                    <span class="hidden lg:block">ORBIT PROFILE</span>
                    <span class="hidden text-right lg:block">COORDINATES</span>
                </div>

                <!-- Loading: eight skeleton rows, never a spinner — the layout
                     keeps its height while the sector is being generated. -->
                <div v-if="isLoading" data-skeleton>
                    <div v-for="n in 8" :key="n" class="ug-skeleton my-[10px] h-[18px] w-full"></div>
                </div>

                <p
                    v-else-if="visibleRows.length === 0"
                    data-empty
                    class="py-10 text-center font-sans text-[12px]"
                    style="color: #475569"
                >
                    No systems match the current filters.
                </p>

                <template v-else>
                    <div
                        v-for="row in pageRows"
                        :key="row.systemId"
                        :data-system-row="row.systemId"
                        :class="[GRID, row.hasLife ? 'ug-row-life' : '']"
                        class="ug-row cursor-pointer border-b border-line-hairline py-[10px] transition-colors duration-150"
                        @click="openSystem(row.systemId, $event)"
                    >
                        <span data-cell="id" class="font-mono text-[11px] text-faint">{{ paddedId(row.systemId) }}</span>

                        <div class="flex items-center gap-[7px] overflow-hidden">
                            <!-- D-11: the payload's name, verbatim. -->
                            <RouterLink
                                :to="systemTo(row.systemId)"
                                class="truncate font-sans font-semibold text-[12px] text-ink hover:underline"
                            >
                                {{ row.name }}
                            </RouterLink>
                            <span v-if="row.hasProperName" class="ug-badge ug-badge-iau">IAU</span>
                            <span v-if="row.hasLife" class="ug-badge ug-badge-life">LIFE</span>
                            <span v-if="row.hasBH" class="ug-badge ug-badge-bh">BH</span>
                            <span v-if="row.hasNS" class="ug-badge ug-badge-ns">NS</span>
                        </div>

                        <div class="flex items-center gap-2 overflow-hidden" :title="row.primaryLabel">
                            <CelestialThumb
                                v-if="row.primaryStar"
                                kind="star"
                                :code="row.primaryStar.spectralClass"
                                :px="20"
                            />
                            <span class="truncate font-mono text-[11px] text-ink-2">{{ row.primaryCode }}</span>
                            <!-- D-21: the short label names the class in text, so the
                                 decorative thumbnail is never the only signal. -->
                            <span class="sr-only">{{ row.primaryLabel }}</span>
                        </div>

                        <span class="text-right font-mono font-medium text-[12px] text-[#e2e8f0]">
                            {{ row.starCount }}
                        </span>
                        <span class="text-right font-mono font-medium text-[12px] text-[#e2e8f0]">
                            {{ row.planetCount }}
                        </span>
                        <span class="text-right font-mono font-medium text-[12px] text-muted">
                            {{ row.moonCount }}
                        </span>
                        <span
                            class="text-right font-mono font-semibold text-[12px]"
                            :style="{ color: row.habitableCount > 0 ? '#34d399' : '#475569' }"
                        >
                            {{ row.habitableCount }}
                        </span>

                        <!-- §7.7 4d: the profile and the coordinates are the two
                             columns the table drops below 1024px. -->
                        <div class="hidden min-w-0 lg:block">
                            <OrbitProfile :planets="row.planets" />
                        </div>
                        <span class="hidden text-right font-mono text-[10px] text-dim lg:block">
                            {{ row.coordinates }}
                        </span>
                    </div>
                </template>
            </div>
        </div>

        <TablePager
            v-if="!isLoading"
            v-model="pageModel"
            :total="visibleRows.length"
            :page-size="PAGE_SIZE"
        />
    </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import CelestialThumb from './CelestialThumb.vue';
import OrbitProfile from './OrbitProfile.vue';
import TablePager from './TablePager.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorNav } from '../composables/useSectorNav';
import { useSectorStats, type SystemRow } from '../composables/useSectorStats';
import { formatCoord, thinThousands } from '../utils/format';
import { starShortLabel } from '../utils/starDisplay';

const PAGE_SIZE = 12;

const GRID = 'grid items-center gap-[10px] grid-cols-[40px_1fr_112px_44px_52px_52px_46px]'
    + ' lg:grid-cols-[40px_190px_112px_44px_52px_52px_46px_1fr_152px]';

const PRESETS = [
    { id: 'all', label: 'ALL' },
    { id: 'life', label: 'WITH LIFE' },
    { id: 'hz', label: 'HZ > 0' },
    { id: 'multi', label: 'MULTI-STAR' }
] as const;

const SORTS = [
    { id: 'planets-desc', label: 'PLANETS ↓' },
    { id: 'planets-asc', label: 'PLANETS ↑' },
    { id: 'moons-desc', label: 'MOONS ↓' },
    { id: 'hz-desc', label: 'HZ ↓' },
    { id: 'stars-desc', label: 'STARS ↓' },
    { id: 'name-asc', label: 'NAME ↑' },
    { id: 'id-asc', label: 'ID ↑' },
    { id: 'id-desc', label: 'ID ↓' }
] as const;

const store = useSectorStore();
const router = useRouter();
const { systemTo } = useSectorNav();

// One aggregate source (spec §3): systemRows is the same derivation the KPI
// strip, Overview and Statistics read.
const stats = useSectorStats(() => store.sectorData, () => store.zone);

const isLoading = computed(() => store.generationStatus === 'running');

/** D-12: zero-padded to at least three digits; 1204 stays 1204. */
const paddedId = (systemId: number) => String(systemId).padStart(3, '0');

const starCode = (row: SystemRow): string => {
    if (!row.primaryStar) return '—';
    const { spectralClass, subclass } = row.primaryStar;
    return subclass !== undefined ? `${spectralClass}-${subclass}` : spectralClass;
};

interface DisplayRow extends SystemRow {
    primaryCode: string;
    primaryLabel: string;
    coordinates: string;
    haystack: string;
}

const displayRows = computed<DisplayRow[]>(() =>
    stats.systemRows.value.map(row => ({
        ...row,
        primaryCode: starCode(row),
        primaryLabel: row.primaryStar ? starShortLabel(row.primaryStar.spectralClass) : 'no star',
        coordinates: `${formatCoord(row.xPos)} ${formatCoord(row.yPos)} ${formatCoord(row.zPos)}`,
        // §8: the query matches name or systemId, case-insensitively. The padded
        // id is included so searching what the ID column shows ("001") works.
        haystack: `${row.name}\n${row.systemId}\n${paddedId(row.systemId)}`.toLowerCase()
    })));

/** Distinct primary spectral classes present, for the PRIMARY CLASS pill. */
const primaryClasses = computed(() =>
    [...new Set(displayRows.value
        .map(row => row.primaryStar?.spectralClass)
        .filter((cls): cls is string => Boolean(cls)))].sort());

const matchesPreset = (row: DisplayRow): boolean => {
    switch (store.systemFilters.preset) {
        case 'life': return row.hasLife;
        case 'hz': return row.habitableCount > 0;
        case 'multi': return row.starCount > 1;
        default: return true;
    }
};

const filteredRows = computed(() => {
    const query = store.systemFilters.query.trim().toLowerCase();
    const primaryClass = store.systemFilters.primaryClass;

    return displayRows.value.filter(row => {
        if (query && !row.haystack.includes(query)) return false;
        if (primaryClass !== 'any' && row.primaryStar?.spectralClass !== primaryClass) return false;
        return matchesPreset(row);
    });
});

// systemId ascending is the last tie-break everywhere, so the order is stable
// for a given seed however the rows are sorted.
const visibleRows = computed(() => {
    const rows = [...filteredRows.value];
    const byId = (a: DisplayRow, b: DisplayRow) => a.systemId - b.systemId;

    switch (store.systemFilters.sort) {
        case 'planets-asc': return rows.sort((a, b) => a.planetCount - b.planetCount || byId(a, b));
        case 'moons-desc': return rows.sort((a, b) => b.moonCount - a.moonCount || byId(a, b));
        case 'hz-desc': return rows.sort((a, b) => b.habitableCount - a.habitableCount || byId(a, b));
        case 'stars-desc': return rows.sort((a, b) => b.starCount - a.starCount || byId(a, b));
        case 'name-asc': return rows.sort((a, b) => a.name.localeCompare(b.name) || byId(a, b));
        case 'id-desc': return rows.sort((a, b) => b.systemId - a.systemId);
        case 'id-asc': return rows.sort(byId);
        default: return rows.sort((a, b) => b.planetCount - a.planetCount || byId(a, b));
    }
});

const counters = computed(() => [
    { label: 'SHOWN', value: thinThousands(visibleRows.value.length), color: '#f1f5f9' },
    {
        label: 'WITH LIFE',
        value: thinThousands(visibleRows.value.filter(row => row.hasLife).length),
        color: '#34d399'
    },
    {
        label: 'MULTI-STAR',
        value: thinThousands(visibleRows.value.filter(row => row.starCount > 1).length),
        color: '#c4b5fd'
    }
]);

const pageCount = computed(() => Math.max(1, Math.ceil(visibleRows.value.length / PAGE_SIZE)));

const pageModel = computed({
    get: () => Math.min(Math.max(1, store.page.systems), pageCount.value),
    set: (page: number) => { store.page.systems = page; }
});

const pageRows = computed(() => {
    const start = (pageModel.value - 1) * PAGE_SIZE;
    return visibleRows.value.slice(start, start + PAGE_SIZE);
});

// Any filter, preset or sort change sends the table back to page 1.
watch(
    () => [
        store.systemFilters.query,
        store.systemFilters.preset,
        store.systemFilters.primaryClass,
        store.systemFilters.sort
    ],
    () => { store.page.systems = 1; }
);

const setQuery = (value: string) => { store.systemFilters.query = value; };
const setPreset = (preset: string) => { store.systemFilters.preset = preset; };
const setPrimaryClass = (cls: string) => { store.systemFilters.primaryClass = cls; };
const setSort = (sort: string) => { store.systemFilters.sort = sort; };

// The row is clickable for convenience; the name is the real link, so a click
// that already landed on it must not navigate twice.
const openSystem = (systemId: number, event: MouseEvent) => {
    if ((event.target as HTMLElement | null)?.closest('a')) return;
    router.push(systemTo(systemId));
};
</script>
