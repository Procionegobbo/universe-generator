<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Planets</h2>
            <div class="text-gray-400">
                Showing {{ filteredPlanets.length }} of {{ planets.length }} planets
            </div>
        </div>

        <div class="mb-6 flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
                <label class="form-label" for="search">Search Planets</label>
                <input
                    id="search"
                    v-model="searchQuery"
                    type="text"
                    class="form-input"
                    placeholder="Search by planet type, star ID, or orbit..."
                />
            </div>
            <div class="w-full sm:w-48">
                <label class="form-label" for="planetTypeFilter">Filter by Type</label>
                <select id="planetTypeFilter" v-model="planetTypeFilter" class="form-input">
                    <option value="">All Types</option>
                    <option v-for="type in availablePlanetTypes" :key="type" :value="type">
                        {{ type }} - {{ getPlanetTypeDescription(type) }}
                    </option>
                </select>
            </div>
        </div>

        <div v-if="filteredPlanets.length === 0" class="text-center py-12 text-gray-500">
            No planets found matching your search.
        </div>

        <div v-else class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Star ID</th>
                        <th>Orbit</th>
                        <th>Planet Type</th>
                        <th>Description</th>
                        <th>Diameter (km)</th>
                        <th>Moons</th>
                        <th>Habitable Zone</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="planet in paginatedPlanets" :key="`${planet.starId}-${planet.orbitalNumber}`">
                        <td class="font-mono">{{ planet.starId }}</td>
                        <td class="font-mono">{{ planet.orbitalNumber }}</td>
                        <td>
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                :class="getPlanetTypeColor(planet.planetType)">
                                {{ planet.planetType }}
                            </span>
                        </td>
                        <td class="text-gray-400 text-sm">
                            {{ getPlanetTypeDescription(planet.planetType) }}
                        </td>
                        <td class="font-mono">
                            {{ planet.diameter.toLocaleString() }}
                        </td>
                        <td>
                            <span v-if="planet.moonCount > 0" class="text-blue-300 font-medium">
                                {{ planet.moonCount }}
                            </span>
                            <span v-else class="text-gray-500">—</span>
                        </td>
                        <td>
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                :class="getZoneColor(planet.orbitalNumber)">
                                {{ getHabitableZone(planet.orbitalNumber) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="filteredPlanets.length > itemsPerPage" class="mt-6 flex justify-between items-center">
            <div class="text-gray-400 text-sm">
                Page {{ currentPage }} of {{ totalPages }}
            </div>
            <div class="flex gap-2">
                <button
                    @click="currentPage--"
                    :disabled="currentPage === 1"
                    class="btn btn-secondary px-4 py-2"
                >
                    Previous
                </button>
                <button
                    @click="currentPage++"
                    :disabled="currentPage === totalPages"
                    class="btn btn-secondary px-4 py-2"
                >
                    Next
                </button>
            </div>
        </div>

        <div v-if="planetTypeDistribution" class="mt-8 pt-6 border-t border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Planet Type Distribution</h3>
            <div class="space-y-3">
                <div v-for="([type, count]) in Object.entries(planetTypeDistribution).sort((a, b) => b[1] - a[1])"
                    :key="type" class="flex items-center">
                    <div class="w-32 text-sm text-gray-400">
                        {{ type }} - {{ getPlanetTypeDescription(type) }}
                    </div>
                    <div class="flex-1 ml-4">
                        <div class="h-6 bg-green-900/30 rounded overflow-hidden">
                            <div
                                :style="{ width: `${(count / maxPlanetCount) * 100}%` }"
                                class="h-full bg-green-500 transition-all duration-500"
                            ></div>
                        </div>
                    </div>
                    <div class="w-16 text-right text-sm font-medium">{{ count }}</div>
                </div>
            </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Statistics</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-blue-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-blue-300">{{ avgDiameter.toLocaleString() }}</div>
                    <div class="text-sm text-gray-400">Avg Diameter (km)</div>
                </div>
                <div class="text-center p-4 bg-purple-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-purple-300">{{ totalMoons }}</div>
                    <div class="text-sm text-gray-400">Total Moons</div>
                </div>
                <div class="text-center p-4 bg-green-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-green-300">{{ avgMoonsPerPlanet.toFixed(1) }}</div>
                    <div class="text-sm text-gray-400">Avg Moons/Planet</div>
                </div>
                <div class="text-center p-4 bg-yellow-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-yellow-300">{{ earthLikeCount }}</div>
                    <div class="text-sm text-gray-400">Earth-like Planets</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Planet } from '../types';
import { PLANET_TYPE_DESCRIPTIONS } from '../types';

const props = defineProps<{
    planets: Planet[];
}>();

const searchQuery = ref('');
const planetTypeFilter = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;

// Get unique planet types
const availablePlanetTypes = computed(() => {
    const types = new Set(props.planets.map(p => p.planetType));
    return Array.from(types).sort();
});

// Filter planets based on search query and type filter
const filteredPlanets = computed(() => {
    let filtered = [...props.planets];

    // Apply type filter
    if (planetTypeFilter.value) {
        filtered = filtered.filter(p => p.planetType === planetTypeFilter.value);
    }

    // Apply search query
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(planet =>
            planet.planetType.toLowerCase().includes(query) ||
            planet.starId.toString().includes(query) ||
            planet.orbitalNumber.toString().includes(query)
        );
    }

    return filtered;
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredPlanets.value.length / itemsPerPage));
const paginatedPlanets = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredPlanets.value.slice(start, end);
});

// Planet type distribution
const planetTypeDistribution = computed(() => {
    const distribution: Record<string, number> = {};
    props.planets.forEach(planet => {
        distribution[planet.planetType] = (distribution[planet.planetType] || 0) + 1;
    });
    return distribution;
});

const maxPlanetCount = computed(() => {
    const counts = Object.values(planetTypeDistribution.value);
    return counts.length > 0 ? Math.max(...counts) : 1;
});

// Statistics
const avgDiameter = computed(() => {
    if (props.planets.length === 0) return 0;
    const total = props.planets.reduce((sum, planet) => sum + planet.diameter, 0);
    return Math.round(total / props.planets.length);
});

const totalMoons = computed(() => {
    return props.planets.reduce((sum, planet) => sum + planet.moonCount, 0);
});

const avgMoonsPerPlanet = computed(() => {
    if (props.planets.length === 0) return 0;
    return totalMoons.value / props.planets.length;
});

const earthLikeCount = computed(() => {
    return props.planets.filter(p => p.planetType === 'E').length;
});

// Reset pagination when filters change
watch([searchQuery, planetTypeFilter], () => {
    currentPage.value = 1;
});

// Helper functions
const getPlanetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
        'A': 'bg-gray-700/30 text-gray-400',
        'G': 'bg-yellow-800/30 text-yellow-300',
        'R': 'bg-orange-900/30 text-orange-300',
        'C': 'bg-gray-900/30 text-gray-300',
        'D': 'bg-yellow-900/30 text-yellow-200',
        'H': 'bg-red-900/30 text-red-300',
        'M': 'bg-red-800/30 text-red-200',
        'E': 'bg-green-900/30 text-green-300',
        '#': 'bg-purple-900/30 text-purple-300'
    };
    return colors[type] || 'bg-gray-800/30 text-gray-400';
};

const getPlanetTypeDescription = (type: string) => {
    return PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown planet type';
};

const getHabitableZone = (orbit: number) => {
    if (orbit <= 2) return 'Inner';
    if (orbit <= 4) return 'Habitable';
    return 'Outer';
};

const getZoneColor = (orbit: number) => {
    if (orbit <= 2) return 'bg-red-900/30 text-red-300';
    if (orbit <= 4) return 'bg-green-900/30 text-green-300';
    return 'bg-blue-900/30 text-blue-300';
};
</script>