<template>
    <div class="flex flex-col">
        <SectorTabs />

        <OverviewPanel v-if="store.activeTab === 'overview'" />

        <SectorStatistics v-else-if="store.activeTab === 'statistics'" />

        <SystemsTable v-else-if="store.activeTab === 'systems'" />

        <StarTable v-else-if="store.activeTab === 'stars'" />

        <PlanetTable v-else-if="store.activeTab === 'planets'" />
    </div>
</template>

<script setup lang="ts">
import SectorTabs from './SectorTabs.vue';
import OverviewPanel from './OverviewPanel.vue';
import SectorStatistics from './SectorStatistics.vue';
import SystemsTable from './SystemsTable.vue';
import StarTable from './StarTable.vue';
import PlanetTable from './PlanetTable.vue';
import { useSectorStore } from '../stores/sectorStore';

// The tab host aggregates nothing and takes no props: every body reads the
// store and useSectorStats for itself (spec §7.5).
const store = useSectorStore();
</script>
