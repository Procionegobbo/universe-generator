<template>
    <!-- D-30: five tabs on every screen. The active tab is store state, never a
         route (spec 7.2), so switching never touches the URL or remounts the view. -->
    <nav class="flex overflow-x-auto border-b border-line-strong px-[18px]" aria-label="Sector views">
        <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :data-tab="tab.id"
            :aria-current="tab.id === store.activeTab ? 'page' : undefined"
            class="flex-none border-b-2 px-[14px] py-3 font-mono text-[11px] tracking-[.1em] whitespace-nowrap transition-colors duration-150"
            :class="tab.id === store.activeTab
                ? 'border-acc-blue font-semibold text-ink'
                : 'border-transparent font-medium text-dim hover:text-ink-2'"
            @click="store.activeTab = tab.id"
        >
            {{ tab.label }}<!--
            Spec §4d: the tab bar scrolls horizontally under 768px and the labels
            shorten there, which is what dropping the count does.
            --><span v-if="tab.count !== null" class="hidden md:inline"> · {{ tab.count }}</span>
        </button>
    </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSectorStore, type SectorTab } from '../stores/sectorStore';
import { useSectorStats } from '../composables/useSectorStats';
import { thinThousands } from '../utils/format';

const store = useSectorStore();
const stats = useSectorStats(() => store.sectorData, () => store.zone);

const tabs = computed<Array<{ id: SectorTab; label: string; count: string | null }>>(() => [
    { id: 'overview', label: 'OVERVIEW', count: null },
    { id: 'statistics', label: 'STATISTICS', count: null },
    { id: 'systems', label: 'SYSTEMS', count: thinThousands(stats.systemCount.value) },
    { id: 'stars', label: 'STARS', count: thinThousands(stats.starCount.value) },
    { id: 'planets', label: 'PLANETS', count: thinThousands(stats.planetCount.value) }
]);
</script>
