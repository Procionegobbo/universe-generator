<template>
    <section class="flex flex-col">
        <!-- Bar 1 — the type strip (handoff 4a). Every child is flex-none /
             whitespace-nowrap: the strip scrolls sideways, it never wraps. -->
        <div
            data-type-strip
            class="flex items-center gap-[10px] overflow-x-auto border-b border-line-strong bg-panel px-[18px] py-[10px]"
        >
            <span class="flex-none font-mono text-[10px] tracking-[.1em] whitespace-nowrap text-dim">TYPE</span>

            <button
                type="button"
                data-type-pill="all"
                :aria-pressed="store.planetFilters.types.length === 0"
                class="flex flex-none items-center gap-[7px] rounded-pill border px-[11px] py-[5px] font-mono font-medium text-[10px] whitespace-nowrap transition-colors duration-150"
                :class="store.planetFilters.types.length === 0
                    ? 'border-acc-blue bg-[rgba(59,130,246,0.2)] text-acc-blue-pale'
                    : 'border-line-control text-dim hover:text-ink-2'"
                @click="clearTypes"
            >
                ALL {{ thinThousands(allRows.length) }}
            </button>

            <button
                v-for="pill in typePills"
                :key="pill.type"
                type="button"
                :data-type-pill="pill.type"
                :aria-pressed="isTypeSelected(pill.type)"
                class="flex flex-none items-center gap-[7px] rounded-pill border py-[5px] pr-[11px] pl-[5px] font-mono font-medium text-[10px] whitespace-nowrap transition-colors duration-150"
                :class="pillClass(pill.type)"
                @click="toggleType(pill.type)"
            >
                <CelestialThumb kind="planet" :code="pill.type" :px="18" />
                <span>{{ planetShortLabel(pill.type) }} {{ thinThousands(pill.count) }}</span>
            </button>

            <!-- D-29's grammar: the types past the strip are counted, not listed. -->
            <span
                v-if="hiddenTypeCount > 0"
                data-type-overflow
                class="flex-none rounded-pill border border-line-control px-[11px] py-[5px] font-mono font-medium text-[10px] whitespace-nowrap text-dim"
            >
                +{{ hiddenTypeCount }}
            </span>
        </div>

        <!-- Bar 2 — zone toggles on the left, sort and the row count on the right. -->
        <div
            data-zone-bar
            class="flex items-center justify-between gap-3 overflow-x-auto border-b border-line-strong bg-panel px-[18px] py-[10px]"
        >
            <div class="flex flex-none items-center gap-[10px] whitespace-nowrap">
                <span class="flex-none font-mono text-[10px] tracking-[.1em] whitespace-nowrap text-dim">ZONE</span>

                <div
                    class="flex flex-none overflow-hidden rounded-ctl border border-line-control whitespace-nowrap"
                    role="group"
                    aria-label="Thermal zone"
                >
                    <button
                        v-for="(option, index) in ZONES"
                        :key="option.id"
                        type="button"
                        :data-zone="option.id"
                        :aria-pressed="store.planetFilters.zone === option.id"
                        class="px-3 py-2 font-mono text-[10px] tracking-[.06em] whitespace-nowrap transition-colors duration-150"
                        :class="[
                            index > 0 ? 'border-l border-line-strong' : '',
                            store.planetFilters.zone === option.id
                                ? 'bg-[rgba(16,185,129,0.2)] font-semibold text-acc-green-mid'
                                : 'font-medium text-dim hover:text-ink-2'
                        ]"
                        @click="setZone(option.id)"
                    >
                        {{ zoneLabel(option) }}
                    </button>
                </div>

                <button
                    type="button"
                    data-toggle="life"
                    :aria-pressed="store.planetFilters.hasLife"
                    class="flex-none rounded-ctl border px-3 py-2 font-mono text-[10px] tracking-[.06em] whitespace-nowrap transition-colors duration-150"
                    :class="store.planetFilters.hasLife
                        ? 'border-acc-green bg-[rgba(16,185,129,0.18)] font-semibold text-acc-green-mid'
                        : 'border-line-control font-medium text-dim hover:text-ink-2'"
                    @click="toggleLife"
                >
                    WITH LIFE {{ thinThousands(lifeCount) }}
                </button>

                <button
                    type="button"
                    data-toggle="moons"
                    :aria-pressed="store.planetFilters.hasMoons"
                    class="flex-none rounded-ctl border px-3 py-2 font-mono text-[10px] tracking-[.06em] whitespace-nowrap transition-colors duration-150"
                    :class="store.planetFilters.hasMoons
                        ? 'border-acc-blue bg-[rgba(59,130,246,0.2)] font-semibold text-acc-blue-pale'
                        : 'border-line-control font-medium text-dim hover:text-ink-2'"
                    @click="toggleMoons"
                >
                    WITH MOONS {{ thinThousands(moonCount) }}
                </button>
            </div>

            <div class="flex flex-none items-center gap-[18px] whitespace-nowrap">
                <div
                    class="flex flex-none items-center gap-[7px] rounded-ctl border border-line-control bg-input px-[11px] py-2 whitespace-nowrap"
                >
                    <span class="font-mono text-[10px] text-dim">SORT</span>
                    <select
                        data-filter="sort"
                        aria-label="Sort planets"
                        :value="store.planetFilters.sort"
                        class="cursor-pointer appearance-none bg-transparent font-mono font-semibold text-[10px] text-[#e2e8f0] focus:outline-none"
                        @change="setSort(($event.target as HTMLSelectElement).value)"
                    >
                        <option v-for="option in SORTS" :key="option.id" :value="option.id">
                            {{ option.label }}
                        </option>
                    </select>
                    <span aria-hidden="true" class="font-mono text-[10px] text-[#e2e8f0]">▾</span>
                </div>

                <span
                    data-counter="SHOWN"
                    class="flex flex-none flex-col gap-px text-right whitespace-nowrap"
                >
                    <span class="font-mono font-semibold text-[14px] text-ink">
                        {{ thinThousands(visibleRows.length) }}
                    </span>
                    <span class="font-mono text-[8px] tracking-[.1em] text-dim">SHOWN</span>
                </span>
            </div>
        </div>

        <div class="overflow-x-auto">
            <div class="min-w-[680px] px-[18px]">
                <div
                    :class="GRID"
                    class="border-b border-line-strong py-[10px] font-mono font-medium text-[9px] tracking-[.12em] text-faint"
                >
                    <span>PLANET</span>
                    <span>TYPE</span>
                    <span>SYSTEM / STAR</span>
                    <span class="text-right">Ø KM</span>
                    <span class="text-right">TEMP</span>
                    <span class="text-right">MOONS</span>
                    <span class="text-right">ORBIT</span>
                    <span class="hidden lg:block">RELATIVE SIZE</span>
                    <span class="text-right">ZONE</span>
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
                    No planets match the current filters.
                </p>

                <template v-else>
                    <div
                        v-for="row in pageRows"
                        :key="row.key"
                        :data-planet-row="row.key"
                        :class="[GRID, row.habitableZone ? 'ug-row-habitable' : '']"
                        class="ug-row cursor-pointer border-b border-line-hairline py-[10px] transition-colors duration-150"
                        @click="openPanel(row.key)"
                    >
                        <div class="flex items-center gap-2 overflow-hidden">
                            <CelestialThumb
                                kind="planet"
                                :code="row.planetType"
                                :px="22"
                                :ring="row.habitableZone ? '#34d399' : undefined"
                            />
                            <!-- D-10: the payload's name, or its star-and-orbit designation. -->
                            <span
                                data-cell="name"
                                class="truncate font-sans font-semibold text-[12px] text-ink"
                                :title="row.name"
                            >
                                {{ row.name }}
                            </span>
                        </div>

                        <div class="flex items-center gap-[6px] overflow-hidden">
                            <!-- D-21: the short label names the type in text, so the
                                 decorative thumbnail is never the only signal. -->
                            <span data-cell="type" class="truncate font-mono text-[11px] text-ink-2">
                                {{ planetShortLabel(row.planetType) }}
                            </span>
                            <span v-if="row.hasLife" class="ug-badge ug-badge-life flex-none">LIFE</span>
                        </div>

                        <span
                            data-cell="system"
                            class="truncate font-mono text-[10px] text-dim"
                            :title="row.starName"
                        >
                            {{ row.systemName }} · {{ row.starClass }}
                        </span>

                        <span class="text-right font-mono font-medium text-[12px] text-[#e2e8f0]">
                            {{ thinThousands(row.diameter) }}
                        </span>
                        <span
                            data-cell="temp"
                            class="text-right font-mono font-medium text-[12px]"
                            :class="tempTextClass(row.zone)"
                        >
                            {{ thinThousands(Math.round(row.temperature)) }}
                        </span>
                        <span class="text-right font-mono font-medium text-[12px] text-muted">
                            {{ row.moonCount }}
                        </span>
                        <span class="text-right font-mono text-[11px] text-faint">#{{ row.orbitalNumber }}</span>

                        <!-- The relative-size bar. Below 1024px it is the column
                             that goes, exactly as 3a drops its orbit profile. -->
                        <div class="hidden min-w-0 lg:block">
                            <div class="h-[8px] overflow-hidden rounded-[4px] bg-line-soft">
                                <div
                                    data-size-bar
                                    class="h-full rounded-[4px]"
                                    :style="{ width: barWidth(row), background: barFill(row) }"
                                ></div>
                            </div>
                        </div>

                        <span class="flex justify-end">
                            <span data-cell="zone" :class="zoneBadgeClass(row.zone)">
                                {{ row.zone.toUpperCase() }}
                            </span>
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
import CelestialThumb from './CelestialThumb.vue';
import TablePager from './TablePager.vue';
import { useSectorStore } from '../stores/sectorStore';
import { useSectorStats, type PlanetRow } from '../composables/useSectorStats';
import { thinThousands } from '../utils/format';
import { planetShortLabel, relativeSize } from '../utils/planetDisplay';
import { tempTextClass, zoneBadgeClass } from '../utils/thermalZone';

// 4a: ten rows per page, against 3a's twelve — the rows are taller here.
const PAGE_SIZE = 10;

// Handoff 4a: PLANET 180px · TYPE 132px · SYSTEM/STAR 150px · Ø 96px ·
// TEMP 84px · MOONS 74px · ORBIT 64px · RELATIVE SIZE 1fr · ZONE 104px.
// Below 1024px the relative-size column goes, as 3a drops its orbit profile.
const GRID = 'grid items-center gap-[10px] grid-cols-[180px_132px_150px_96px_84px_74px_64px_104px]'
    + ' lg:grid-cols-[180px_132px_150px_96px_84px_74px_64px_1fr_104px]';

// The handoff's zone control is a two-option segment; WITH LIFE and WITH MOONS
// are separate toggles beside it, which is why the store keeps them apart.
const ZONES = [
    { id: 'any', label: 'ANY' },
    { id: 'goldilocks', label: 'GOLDILOCKS' }
] as const;

const SORTS = [
    { id: 'diameter-desc', label: 'Ø DIAMETER ↓' },
    { id: 'diameter-asc', label: 'Ø DIAMETER ↑' },
    { id: 'temp-desc', label: 'TEMP ↓' },
    { id: 'temp-asc', label: 'TEMP ↑' },
    { id: 'moons-desc', label: 'MOONS ↓' },
    { id: 'orbit-asc', label: 'ORBIT ↑' },
    { id: 'name-asc', label: 'NAME ↑' }
] as const;

/** D-29's threshold, shared with the Overview type cards. */
const TYPE_PILLS = 8;

/** The types the design fills violet→blue: the giants. */
const GIANT_TYPES = new Set(['G', 'Q', 'U']);

const store = useSectorStore();

// One aggregate source (spec §3): planetRows and planetTypeDistribution are the
// same derivations the KPI strip, Overview and Statistics read.
const stats = useSectorStats(() => store.sectorData, () => store.zone);

const isLoading = computed(() => store.generationStatus === 'running');

const allRows = computed<PlanetRow[]>(() => stats.planetRows.value);

/**
 * The pill strip: the top 8 present types, plus any selected type that falls
 * outside them — a type card on Statistics can filter to a type the strip would
 * otherwise hide, and the two controls must never disagree.
 */
const typePills = computed(() => {
    const rows = stats.planetTypeDistribution.value;
    const top = rows.slice(0, TYPE_PILLS);
    const shown = new Set(top.map(row => row.type));
    const pinned = rows.filter(row => !shown.has(row.type) && isTypeSelected(row.type));
    return [...top, ...pinned];
});

const hiddenTypeCount = computed(() =>
    Math.max(0, stats.planetTypeDistribution.value.length - typePills.value.length));

/** Rows after the type filter — what the zone toggles count against. */
const typedRows = computed(() => {
    const types = store.planetFilters.types;
    if (types.length === 0) return allRows.value;
    return allRows.value.filter(row => types.includes(row.planetType));
});

const goldilocksCount = computed(() => typedRows.value.filter(row => row.habitableZone).length);

/** `ANY` carries no count; `GOLDILOCKS` reads how many rows it would leave. */
const zoneLabel = (option: { id: string; label: string }): string =>
    (option.id === 'any' ? option.label : `${option.label} ${thinThousands(goldilocksCount.value)}`);

const lifeCount = computed(() => typedRows.value.filter(row => row.hasLife).length);
const moonCount = computed(() => typedRows.value.filter(row => row.moonCount > 0).length);

const filteredRows = computed(() =>
    typedRows.value.filter(row => {
        if (store.planetFilters.zone === 'goldilocks' && !row.habitableZone) return false;
        if (store.planetFilters.hasLife && !row.hasLife) return false;
        if (store.planetFilters.hasMoons && row.moonCount === 0) return false;
        return true;
    }));

// (starId, orbitalNumber) ascending is the last tie-break everywhere, so the
// order is stable for a given seed however the rows are sorted.
const visibleRows = computed(() => {
    const rows = [...filteredRows.value];
    const byKey = (a: PlanetRow, b: PlanetRow) =>
        a.starId - b.starId || a.orbitalNumber - b.orbitalNumber;

    switch (store.planetFilters.sort) {
        case 'diameter-asc': return rows.sort((a, b) => a.diameter - b.diameter || byKey(a, b));
        case 'temp-desc': return rows.sort((a, b) => b.temperature - a.temperature || byKey(a, b));
        case 'temp-asc': return rows.sort((a, b) => a.temperature - b.temperature || byKey(a, b));
        case 'moons-desc': return rows.sort((a, b) => b.moonCount - a.moonCount || byKey(a, b));
        case 'orbit-asc': return rows.sort(byKey);
        case 'name-asc': return rows.sort((a, b) => a.name.localeCompare(b.name) || byKey(a, b));
        default: return rows.sort((a, b) => b.diameter - a.diameter || byKey(a, b));
    }
});

const pageCount = computed(() => Math.max(1, Math.ceil(visibleRows.value.length / PAGE_SIZE)));

const pageModel = computed({
    get: () => Math.min(Math.max(1, store.page.planets), pageCount.value),
    set: (page: number) => { store.page.planets = page; }
});

const pageRows = computed(() => {
    const start = (pageModel.value - 1) * PAGE_SIZE;
    return visibleRows.value.slice(start, start + PAGE_SIZE);
});

// Any type, zone, toggle or sort change sends the table back to page 1 —
// including one made from the Overview or Statistics type cards.
watch(
    () => [
        store.planetFilters.types.join('\n'),
        store.planetFilters.zone,
        store.planetFilters.hasLife,
        store.planetFilters.hasMoons,
        store.planetFilters.sort
    ],
    () => { store.page.planets = 1; }
);

const isTypeSelected = (type: string): boolean => store.planetFilters.types.includes(type);

const pillClass = (type: string): string => {
    if (!isTypeSelected(type)) return 'border-line-control text-dim hover:text-ink-2';
    // The design gives the Earth-like pill the green treatment; every other
    // selected pill takes the blue one the ALL pill uses.
    return type === 'E'
        ? 'border-acc-green bg-[rgba(16,185,129,0.18)] text-acc-green-mid'
        : 'border-acc-blue bg-[rgba(59,130,246,0.2)] text-acc-blue-pale';
};

const toggleType = (type: string) => {
    const types = store.planetFilters.types;
    store.planetFilters.types = types.includes(type)
        ? types.filter(entry => entry !== type)
        : [...types, type];
};

const clearTypes = () => { store.planetFilters.types = []; };
const setZone = (zone: string) => { store.planetFilters.zone = zone; };
const toggleLife = () => { store.planetFilters.hasLife = !store.planetFilters.hasLife; };
const toggleMoons = () => { store.planetFilters.hasMoons = !store.planetFilters.hasMoons; };
const setSort = (sort: string) => { store.planetFilters.sort = sort; };

/** §7.7 4a: the bar is the planet's diameter against the sector's largest. */
const barWidth = (row: PlanetRow): string =>
    `${relativeSize(row.diameter, stats.maxPlanetDiameter.value) * 100}%`;

/**
 * Fill colour precedence, in order: a habitable-zone planet is green, a giant
 * is the violet→blue gradient, and everything else takes its thermal zone.
 */
const barFill = (row: PlanetRow): string => {
    if (row.habitableZone) return '#34d399';
    if (GIANT_TYPES.has(row.planetType)) return 'linear-gradient(90deg,#8b5cf6,#3b82f6)';
    switch (row.zone) {
        case 'Hot': return '#ef4444';
        case 'Temperate': return '#f59e0b';
        default: return '#3b82f6';
    }
};

// The row opens the detail panel (story 009 mounts it) rather than navigating:
// nothing here routes, so the table keeps its page and its scroll position.
const openPanel = (key: string) => {
    store.selectPlanet(key);
};
</script>
