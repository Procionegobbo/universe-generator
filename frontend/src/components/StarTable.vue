<template>
    <section class="flex flex-col">
        <!-- D-23: the STARS tab has no design screen, so the shell is 3a's,
             control for control. Every child is flex-none / whitespace-nowrap:
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
                    <span class="sr-only">Search stars by name or system</span>
                    <input
                        data-filter="query"
                        type="search"
                        :value="store.starFilters.query"
                        placeholder="search star or system…"
                        class="w-[180px] bg-transparent font-mono text-[11px] text-ink placeholder:text-faint focus:outline-none"
                        @input="setQuery(($event.target as HTMLInputElement).value)"
                    />
                </label>

                <div
                    class="flex flex-none overflow-hidden rounded-ctl border border-line-control whitespace-nowrap"
                    role="group"
                    aria-label="Star preset"
                >
                    <button
                        v-for="(option, index) in PRESETS"
                        :key="option.id"
                        type="button"
                        :data-preset="option.id"
                        :aria-pressed="store.starFilters.preset === option.id"
                        class="px-3 py-2 font-mono text-[10px] tracking-[.06em] whitespace-nowrap transition-colors duration-150"
                        :class="[
                            index > 0 ? 'border-l border-line-strong' : '',
                            store.starFilters.preset === option.id
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
                    <span class="font-mono text-[10px] text-dim">SORT</span>
                    <select
                        data-filter="sort"
                        aria-label="Sort stars"
                        :value="store.starFilters.sort"
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
                    <span>STAR</span>
                    <span>CLASS</span>
                    <span>SYSTEM</span>
                    <span class="text-right">PLANETS</span>
                    <span class="text-right">HZ</span>
                    <span class="text-right">MOONS</span>
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
                    No stars match the current filters.
                </p>

                <template v-else>
                    <div
                        v-for="row in pageRows"
                        :key="row.starId"
                        :data-star-row="row.starId"
                        :class="GRID"
                        class="ug-row cursor-pointer border-b border-line-hairline py-[10px] transition-colors duration-150"
                        @click="openSystem(row.systemId, $event)"
                    >
                        <span data-cell="id" class="font-mono text-[11px] text-faint">{{ paddedId(row.starId) }}</span>

                        <!-- D-11: the payload's name, verbatim. -->
                        <span
                            data-cell="name"
                            class="truncate font-sans font-semibold text-[12px] text-ink"
                            :title="row.name"
                        >
                            {{ row.name }}
                        </span>

                        <div class="flex items-center gap-2 overflow-hidden" :title="row.classLabel">
                            <CelestialThumb kind="star" :code="row.spectralClass" :px="20" />
                            <span class="truncate font-mono text-[11px] text-ink-2">{{ row.classCode }}</span>
                            <!-- D-21: the short label names the class in text, so the
                                 decorative thumbnail is never the only signal. -->
                            <span class="sr-only">{{ row.classLabel }}</span>
                        </div>

                        <RouterLink
                            :to="systemTo(row.systemId)"
                            data-cell="system"
                            class="truncate font-sans text-[12px] text-ink-2 hover:underline"
                            :title="row.systemName"
                        >
                            {{ row.systemName }}
                        </RouterLink>

                        <span class="text-right font-mono font-medium text-[12px] text-[#e2e8f0]">
                            {{ row.planetCount }}
                        </span>
                        <span
                            class="text-right font-mono font-semibold text-[12px]"
                            :style="{ color: row.habitableCount > 0 ? '#34d399' : '#475569' }"
                        >
                            {{ row.habitableCount }}
                        </span>
                        <span class="text-right font-mono font-medium text-[12px] text-muted">
                            {{ row.moonCount }}
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
import TablePager from './TablePager.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorNav } from '../composables/useSectorNav';
import { useSectorStats, type StarRow } from '../composables/useSectorStats';
import { thinThousands } from '../utils/format';
import { starShortLabel } from '../utils/starDisplay';

// The same row rhythm as 3a, so the two indexes page identically.
const PAGE_SIZE = 12;

// D-23: ID 40px · STAR 190px · CLASS 112px · SYSTEM 1fr · PLANETS 52px ·
// HZ 46px · MOONS 52px. Narrower than 600px the wrapper scrolls sideways.
const GRID = 'grid items-center gap-[10px] grid-cols-[40px_190px_112px_1fr_52px_46px_52px]';

const PRESETS = [
    { id: 'all', label: 'ALL' },
    { id: 'planets', label: 'WITH PLANETS' },
    { id: 'hz', label: 'HZ > 0' },
    { id: 'exotic', label: 'EXOTIC' }
] as const;

const SORTS = [
    { id: 'id-asc', label: 'ID ↑' },
    { id: 'id-desc', label: 'ID ↓' },
    { id: 'planets-desc', label: 'PLANETS ↓' },
    { id: 'hz-desc', label: 'HZ ↓' },
    { id: 'moons-desc', label: 'MOONS ↓' },
    { id: 'class-asc', label: 'CLASS ↑' },
    { id: 'name-asc', label: 'NAME ↑' }
] as const;

const store = useSectorStore();
const router = useRouter();
const { systemTo } = useSectorNav();

// One aggregate source (spec §3): starRows is the same derivation the KPI
// strip, Overview and Statistics read.
const stats = useSectorStats(() => store.sectorData, () => store.zone);

const isLoading = computed(() => store.generationStatus === 'running');

/** Zero-padded to at least three digits, matching 3a's ID column. */
const paddedId = (id: number) => String(id).padStart(3, '0');

interface DisplayRow extends StarRow {
    classCode: string;
    classLabel: string;
    haystack: string;
}

const displayRows = computed<DisplayRow[]>(() =>
    stats.starRows.value.map(row => ({
        ...row,
        classCode: row.subclass !== undefined ? `${row.spectralClass}-${row.subclass}` : row.spectralClass,
        classLabel: starShortLabel(row.spectralClass),
        // §8: the query matches the star's name or its system's name/id,
        // case-insensitively. The padded ids are included so searching what the
        // ID and SYSTEM columns show works.
        haystack: [row.name, row.systemName, row.systemId, paddedId(row.systemId), row.starId, paddedId(row.starId)]
            .join('\n')
            .toLowerCase()
    })));

const matchesPreset = (row: DisplayRow): boolean => {
    switch (store.starFilters.preset) {
        case 'planets': return row.planetCount > 0;
        case 'hz': return row.habitableCount > 0;
        case 'exotic': return row.isExotic;
        default: return true;
    }
};

const filteredRows = computed(() => {
    const query = store.starFilters.query.trim().toLowerCase();

    return displayRows.value.filter(row => {
        if (query && !row.haystack.includes(query)) return false;
        return matchesPreset(row);
    });
});

// starId ascending is the last tie-break everywhere, so the order is stable for
// a given seed however the rows are sorted.
const visibleRows = computed(() => {
    const rows = [...filteredRows.value];
    const byId = (a: DisplayRow, b: DisplayRow) => a.starId - b.starId;

    switch (store.starFilters.sort) {
        case 'id-desc': return rows.sort((a, b) => b.starId - a.starId);
        case 'planets-desc': return rows.sort((a, b) => b.planetCount - a.planetCount || byId(a, b));
        case 'hz-desc': return rows.sort((a, b) => b.habitableCount - a.habitableCount || byId(a, b));
        case 'moons-desc': return rows.sort((a, b) => b.moonCount - a.moonCount || byId(a, b));
        case 'class-asc': return rows.sort((a, b) => a.classCode.localeCompare(b.classCode) || byId(a, b));
        case 'name-asc': return rows.sort((a, b) => a.name.localeCompare(b.name) || byId(a, b));
        default: return rows.sort(byId);
    }
});

const counters = computed(() => [
    { label: 'SHOWN', value: thinThousands(visibleRows.value.length), color: '#f1f5f9' },
    {
        label: 'CLASSES',
        value: thinThousands(new Set(visibleRows.value.map(row => row.spectralClass)).size),
        color: '#c4b5fd'
    },
    {
        label: 'EXOTIC',
        value: thinThousands(visibleRows.value.filter(row => row.isExotic).length),
        color: '#fca5a5'
    }
]);

const pageCount = computed(() => Math.max(1, Math.ceil(visibleRows.value.length / PAGE_SIZE)));

const pageModel = computed({
    get: () => Math.min(Math.max(1, store.page.stars), pageCount.value),
    set: (page: number) => { store.page.stars = page; }
});

const pageRows = computed(() => {
    const start = (pageModel.value - 1) * PAGE_SIZE;
    return visibleRows.value.slice(start, start + PAGE_SIZE);
});

// Any filter, preset or sort change sends the table back to page 1.
watch(
    () => [store.starFilters.query, store.starFilters.preset, store.starFilters.sort],
    () => { store.page.stars = 1; }
);

const setQuery = (value: string) => { store.starFilters.query = value; };
const setPreset = (preset: string) => { store.starFilters.preset = preset; };
const setSort = (sort: string) => { store.starFilters.sort = sort; };

// The row is clickable for convenience; the system name is the real link, so a
// click that already landed on it must not navigate twice.
const openSystem = (systemId: number, event: MouseEvent) => {
    if ((event.target as HTMLElement | null)?.closest('a')) return;
    router.push(systemTo(systemId));
};
</script>
