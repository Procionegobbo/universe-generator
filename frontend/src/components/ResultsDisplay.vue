<template>
    <div class="flex flex-col">
        <SectorTabs />

        <OverviewPanel v-if="store.activeTab === 'overview'" />

        <SectorStatistics v-else-if="store.activeTab === 'statistics'" />

        <SystemsTable v-else-if="store.activeTab === 'systems'" />

        <StarTable v-else-if="store.activeTab === 'stars'" />

        <PlanetTable v-else-if="store.activeTab === 'planets'" />

        <!-- The 4b panel overlays whichever tab is showing, so a planet row on
             the Planets tab opens it without the table losing its scroll
             position. usePlanetDeepLink keeps it in step with `?planet=`. -->
        <PlanetDetailPanel v-if="store.selectedPlanetKey" @close="store.selectPlanet(null)" />
    </div>
</template>

<script setup lang="ts">
import SectorTabs from './SectorTabs.vue';
import OverviewPanel from './OverviewPanel.vue';
import SectorStatistics from './SectorStatistics.vue';
import SystemsTable from './SystemsTable.vue';
import StarTable from './StarTable.vue';
import PlanetTable from './PlanetTable.vue';
import PlanetDetailPanel from './PlanetDetailPanel.vue';
import { useSectorStore } from '../stores/sectorStore';
import { usePlanetDeepLink } from '../composables/usePlanetDeepLink';

// The tab host aggregates nothing and takes no props: every body reads the
// store and useSectorStats for itself (spec §7.5).
const store = useSectorStore();

usePlanetDeepLink();
</script>
