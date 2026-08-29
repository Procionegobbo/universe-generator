<template>
    <div class="flex flex-col">
        <SectorTabs />

        <OverviewPanel v-if="store.activeTab === 'overview'" />

        <SectorStatistics v-else-if="store.activeTab === 'statistics'" />

        <div v-else-if="store.activeTab === 'stars'" class="p-4">
            <StarTable :stars="stars" />
        </div>

        <div v-else-if="store.activeTab === 'planets'" class="p-4">
            <PlanetTable :planets="planets" :systems="systems" :stars="stars" />
        </div>

        <!-- Systems tab — TEMPORARY STOPGAP.
             SystemsTable.vue is genuinely new and is built in story 006, which
             depends on this one, so it cannot be imported yet. Everything below
             (and the filteredSystems/paginatedSystems computeds, systemsWithLife,
             the helpers and the scoped animations in the script) is the
             pre-redesign Systems tab carried over unchanged so the app stays
             buildable and fully functional at the end of this story. Story 006
             deletes all of it and swaps in SystemsTable.vue, after which no
             aggregation logic remains in this file at all. -->
        <div v-else-if="store.activeTab === 'systems'" class="animate-fade-in p-4">
            <div class="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div class="w-full sm:w-48">
                    <label class="form-label" for="systemLifeFilter">Life</label>
                    <select id="systemLifeFilter" v-model="lifeFilter" class="form-input">
                        <option value="">All</option>
                        <option value="1">With life</option>
                        <option value="0">Without life</option>
                    </select>
                </div>
                <div class="text-gray-400 text-sm">
                    Showing {{ filteredSystems.length }} of {{ systems.length }} systems
                </div>
            </div>

            <div v-if="filteredSystems.length === 0" class="text-center py-12 text-gray-500">
                No systems match the selected filter.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="system in paginatedSystems" :key="system.systemId"
                     @click="navigateToSystem(system.systemId)"
                     class="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group relative overflow-hidden">
                    <div class="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors"></div>
                    <div class="flex justify-between items-start mb-3 relative z-10">
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-bold">{{ system.name }}</h3>
                            <span v-if="system.hasProperName"
                                  class="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                IAU
                            </span>
                            <span v-if="systemsWithLife.has(system.systemId)"
                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-700/80 text-emerald-100">
                                Life
                            </span>
                        </div>
                        <span class="text-sm text-gray-400">ID: {{ system.systemId }}</span>
                    </div>

                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Coordinates:</span>
                            <span class="font-mono">({{ system.xPos.toFixed(3) }}, {{ system.yPos.toFixed(3) }}, {{ system.zPos.toFixed(3) }})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Stars in system:</span>
                            <span class="font-medium text-blue-300">
                                {{ getStarsInSystem(system.systemId).length }}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Planets in system:</span>
                            <span class="font-medium text-green-300">
                                {{ getPlanetsInSystem(system.systemId).length }}
                            </span>
                        </div>
                    </div>

                    <div v-if="getStarsInSystem(system.systemId).length > 0" class="mt-4 pt-4 border-t border-gray-700">
                        <h4 class="text-sm font-semibold text-gray-400 mb-2">Stars:</h4>
                        <div class="space-y-2">
                            <div v-for="star in getStarsInSystem(system.systemId)" :key="star.starId"
                                 class="flex items-center justify-between text-sm">
                                <span class="font-medium">{{ star.name }}</span>
                                <span :class="getStarClassColor(star.spectralClass)"
                                      class="px-2 py-1 rounded text-xs border border-transparent">
                                    {{ star.spectralClass }}{{ star.subclass ? `-${star.subclass}` : '' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="filteredSystems.length > itemsPerPage" class="mt-6 flex justify-between items-center">
                <div class="text-gray-400 text-sm">
                    Page {{ currentSystemPage }} of {{ totalSystemPages }}
                </div>
                <div class="flex gap-2">
                    <button
                        @click="currentSystemPage--"
                        :disabled="currentSystemPage === 1"
                        class="btn btn-secondary px-4 py-2"
                    >
                        Previous
                    </button>
                    <button
                        @click="currentSystemPage++"
                        :disabled="currentSystemPage === totalSystemPages"
                        class="btn btn-secondary px-4 py-2"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SectorTabs from './SectorTabs.vue';
import OverviewPanel from './OverviewPanel.vue';
import SectorStatistics from './SectorStatistics.vue';
import StarTable from './StarTable.vue';
import PlanetTable from './PlanetTable.vue';
import type { System, Star, Planet } from '../types';
import { useSectorStore } from '../stores/sectorStore';
import { getStarClassColor } from '../utils/starColors';

const props = defineProps<{
    systems: System[];
    stars: Star[];
    planets: Planet[];
}>();

const store = useSectorStore();

// --- Systems tab stopgap, carried over from the pre-redesign body ---
// Story 006 removes everything down to the end of this block along with the
// markup above. The Overview and Statistics tabs aggregate nothing here: both
// read useSectorStats (spec §7.5).

const currentSystemPage = ref(1);
const itemsPerPage = 9;
const router = useRouter();

const navigateToSystem = (id: number) => {
    router.push(`/system/${id}`);
};

// Systems containing at least one inhabited planet. Built in a single
// O(stars + planets) pass so filtering the grid stays O(systems).
const systemsWithLife = computed(() => {
    const starToSystem = new Map(props.stars.map(star => [star.starId, star.systemId]));
    const withLife = new Set<number>();
    props.planets.forEach(planet => {
        if (!planet.hasLife) return;
        const systemId = starToSystem.get(planet.starId);
        if (systemId !== undefined) withLife.add(systemId);
    });
    return withLife;
});

// '' = All, '1' = with life, '0' = without life (same encoding as PlanetTable).
const lifeFilter = ref('');

const filteredSystems = computed(() => {
    if (lifeFilter.value === '') return props.systems;
    const wanted = lifeFilter.value === '1';
    return props.systems.filter(system => systemsWithLife.value.has(system.systemId) === wanted);
});

watch(lifeFilter, () => {
    currentSystemPage.value = 1;
});

// System pagination
const totalSystemPages = computed(() => Math.ceil(filteredSystems.value.length / itemsPerPage));
const paginatedSystems = computed(() => {
    const start = (currentSystemPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSystems.value.slice(start, end);
});

// Helper functions
const getStarsInSystem = (systemId: number) => {
    return props.stars.filter(star => star.systemId === systemId);
};

const getPlanetsInSystem = (systemId: number) => {
    const systemStars = getStarsInSystem(systemId);
    const starIds = systemStars.map(star => star.starId);
    return props.planets.filter(planet => starIds.includes(planet.starId));
};
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
