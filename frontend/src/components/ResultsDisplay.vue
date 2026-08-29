<template>
    <div class="flex flex-col">
        <SectorTabs />

        <OverviewPanel v-if="store.activeTab === 'overview'" />

        <SectorStatistics v-else-if="store.activeTab === 'statistics'" />

        <SystemsTable v-else-if="store.activeTab === 'systems'" />

        <StarTable v-else-if="store.activeTab === 'stars'" />

        <div v-else-if="store.activeTab === 'planets'" class="p-4">
            <PlanetTable :planets="planets" :systems="systems" :stars="stars" />
        </div>
    </div>
</template>

<script setup lang="ts">
import SectorTabs from './SectorTabs.vue';
import OverviewPanel from './OverviewPanel.vue';
import SectorStatistics from './SectorStatistics.vue';
import SystemsTable from './SystemsTable.vue';
import StarTable from './StarTable.vue';
import PlanetTable from './PlanetTable.vue';
import type { System, Star, Planet } from '../types';
import { useSectorStore } from '../stores/sectorStore';

// The tab host aggregates nothing: every body reads useSectorStats (spec §7.5).
// The props are here only for PlanetTable, which still takes the raw arrays
// until story 008 rewrites it.
defineProps<{
    systems: System[];
    stars: Star[];
    planets: Planet[];
}>();

const store = useSectorStore();
</script>
