<template>
    <div class="card">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 class="text-2xl font-bold">Generated Data</h2>

            <div class="flex flex-wrap gap-2">
                <button
                    @click="activeTab = 'stats'"
                    :class="[
                        'px-4 py-2 rounded-lg font-medium transition-colors',
                        activeTab === 'stats'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    ]"
                >
                    Statistics
                </button>
                <button
                    @click="activeTab = 'systems'"
                    :class="[
                        'px-4 py-2 rounded-lg font-medium transition-colors',
                        activeTab === 'systems'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    ]"
                >
                    Systems ({{ systems.length }})
                </button>
                <button
                    @click="activeTab = 'stars'"
                    :class="[
                        'px-4 py-2 rounded-lg font-medium transition-colors',
                        activeTab === 'stars'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    ]"
                >
                    Stars ({{ stars.length }})
                </button>
                <button
                    @click="activeTab = 'planets'"
                    :class="[
                        'px-4 py-2 rounded-lg font-medium transition-colors',
                        activeTab === 'planets'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    ]"
                >
                    Planets ({{ planets.length }})
                </button>
            </div>
        </div>

        <div v-if="!hasData" class="text-center py-12">
            <div class="text-gray-500 mb-4">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p class="text-lg">No data generated yet.</p>
                <p class="text-sm mt-2">Use the controls above to generate a stellar sector.</p>
            </div>
        </div>

        <div v-else>
            <!-- Stars Tab -->
            <div v-if="activeTab === 'stars'" class="animate-fade-in">
                <StarTable :stars="stars" />
            </div>

            <!-- Planets Tab -->
            <div v-if="activeTab === 'planets'" class="animate-fade-in">
                <PlanetTable :planets="planets" :systems="systems" :stars="stars" />
            </div>

            <!-- Systems Tab -->
            <div v-if="activeTab === 'systems'" class="animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div v-for="system in paginatedSystems" :key="system.systemId"
                         @click="navigateToSystem(system.systemId)"
                         class="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group relative overflow-hidden">
                        <div class="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors"></div>
                        <div class="flex justify-between items-start mb-3 relative z-10">
                            <h3 class="text-lg font-bold">System {{ system.systemId }}</h3>
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

                <div v-if="systems.length > itemsPerPage" class="mt-6 flex justify-between items-center">
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

            <!-- Statistics Tab -->
            <div v-if="activeTab === 'stats'" class="animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Overall Statistics -->
                    <div>
                        <h3 class="text-xl font-bold mb-6">Overall Statistics</h3>
                        <div class="space-y-6">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-blue-900/20 p-4 rounded-lg">
                                    <div class="text-3xl font-bold text-blue-300">{{ systems.length }}</div>
                                    <div class="text-sm text-gray-400">Systems</div>
                                </div>
                                <div class="bg-purple-900/20 p-4 rounded-lg">
                                    <div class="text-3xl font-bold text-purple-300">{{ stars.length }}</div>
                                    <div class="text-sm text-gray-400">Stars</div>
                                </div>
                                <div class="bg-green-900/20 p-4 rounded-lg">
                                    <div class="text-3xl font-bold text-green-300">{{ planets.length }}</div>
                                    <div class="text-sm text-gray-400">Planets</div>
                                </div>
                                <div class="bg-yellow-900/20 p-4 rounded-lg">
                                    <div class="text-3xl font-bold text-yellow-300">{{ totalMoons }}</div>
                                    <div class="text-sm text-gray-400">Total Moons</div>
                                </div>
                            </div>

                            <div class="bg-gray-800/50 p-4 rounded-lg">
                                <h4 class="font-semibold mb-3">Averages</h4>
                                <div class="space-y-2">
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Stars per System:</span>
                                        <span class="font-medium">{{ avgStarsPerSystem.toFixed(2) }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Planets per Star:</span>
                                        <span class="font-medium">{{ avgPlanetsPerStar.toFixed(2) }}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Moons per Planet:</span>
                                        <span class="font-medium">{{ avgMoonsPerPlanet.toFixed(2) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Star Type Distribution -->
                    <div>
                        <h3 class="text-xl font-bold mb-6">Star Type Distribution</h3>
                        <div class="max-h-125 overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                            <div v-for="([type, count], index) in Object.entries(starTypeDistribution).sort((a, b) => b[1] - a[1])"
                                 :key="type"
                                 class="flex items-center hover:bg-gray-800/30 p-2 rounded-lg transition-colors animate-slide-in"
                                 :style="{ animationDelay: `${index * 50}ms` }">
                                <div class="w-10 shrink-0">
                                    <img :src="getStarImage(type, 'thumbs')"
                                         :alt="getStarDescription(type)"
                                         class="w-10 h-10 rounded-full object-cover shadow ring-1"
                                         :class="getStarRingColor(type)" />
                                </div>
                                <div class="flex-1 ml-4">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-gray-300 text-sm">{{ getStarDescription(type) }}</span>
                                        <span class="font-bold text-base min-w-8 text-right">{{ count }}</span>
                                    </div>
                                    <div class="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                        <div
                                            :class="getStarBarColor(type)"
                                            :style="{ width: `${(count / maxStarCount) * 100}%` }"
                                            class="h-full rounded-full transition-all duration-1000 ease-out"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Planet Type Distribution -->
                    <div class="md:col-span-2">
                        <h3 class="text-xl font-bold mb-6">Planet Type Distribution</h3>
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            <div v-for="([type, count]) in Object.entries(planetTypeDistribution).sort((a, b) => b[1] - a[1])"
                                 :key="type"
                                 class="bg-gray-800/50 p-6 rounded-xl hover:bg-gray-700/50 transition-colors shadow-lg hover:shadow-xl">
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-2">
                                        <img :src="getPlanetImage(type, 'thumbs')" :alt="getPlanetTypeDescription(type)" class="w-10 h-10 rounded-full object-contain border-2 border-gray-800 bg-black" />
                                    </div>
                                    <span class="text-3xl font-bold">{{ count }}</span>
                                </div>
                                <div class="text-base text-gray-300 mb-4 min-h-12">
                                    {{ getPlanetTypeDescription(type) }}
                                </div>
                                <div class="h-3 bg-gray-700/50 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        :style="{ width: `${(count / maxPlanetCount) * 100}%` }"
                                        class="h-full bg-linear-to-r from-green-500 to-emerald-400 transition-all duration-700"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import StarTable from './StarTable.vue';
import PlanetTable from './PlanetTable.vue';
import type { System, Star, Planet } from '../types';
import { STAR_TYPE_DESCRIPTIONS, PLANET_TYPE_DESCRIPTIONS } from '../types';
import { getStarClassColor, getStarBarColor, getStarImage } from '../utils/starColors';
import { getPlanetImage } from '../utils/planetImages';

const props = defineProps<{
    systems: System[];
    stars: Star[];
    planets: Planet[];
}>();

const activeTab = ref<'stars' | 'planets' | 'systems' | 'stats'>('stats');
const currentSystemPage = ref(1);
const itemsPerPage = 9;
const router = useRouter();

const navigateToSystem = (id: number) => {
    router.push(`/system/${id}`);
};

const hasData = computed(() => {
    return props.systems.length > 0 || props.stars.length > 0 || props.planets.length > 0;
});

// System pagination
const totalSystemPages = computed(() => Math.ceil(props.systems.length / itemsPerPage));
const paginatedSystems = computed(() => {
    const start = (currentSystemPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return props.systems.slice(start, end);
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

// Statistics
const totalMoons = computed(() => {
    return props.planets.reduce((sum, planet) => sum + planet.moonCount, 0);
});

const avgStarsPerSystem = computed(() => {
    if (props.systems.length === 0) return 0;
    return props.stars.length / props.systems.length;
});

const avgPlanetsPerStar = computed(() => {
    if (props.stars.length === 0) return 0;
    return props.planets.length / props.stars.length;
});

const avgMoonsPerPlanet = computed(() => {
    if (props.planets.length === 0) return 0;
    return totalMoons.value / props.planets.length;
});

// Distributions
const starTypeDistribution = computed(() => {
    const distribution: Record<string, number> = {};
    props.stars.forEach(star => {
        distribution[star.spectralClass] = (distribution[star.spectralClass] || 0) + 1;
    });
    return distribution;
});

const planetTypeDistribution = computed(() => {
    const distribution: Record<string, number> = {};
    props.planets.forEach(planet => {
        distribution[planet.planetType] = (distribution[planet.planetType] || 0) + 1;
    });
    return distribution;
});

const maxStarCount = computed(() => {
    const counts = Object.values(starTypeDistribution.value);
    return counts.length > 0 ? Math.max(...counts) : 1;
});

const maxPlanetCount = computed(() => {
    const counts = Object.values(planetTypeDistribution.value);
    return counts.length > 0 ? Math.max(...counts) : 1;
});

// Description helpers
const getStarDescription = (spectralClass: string) => {
    return STAR_TYPE_DESCRIPTIONS[spectralClass] || 'Unknown star type';
};

const getStarRingColor = (spectralClass: string) => {
    const colors: Record<string, string> = {
        // Main sequence
        'O': 'ring-blue-500/50',
        'B': 'ring-blue-300/50',
        'A': 'ring-white/50',
        'F': 'ring-yellow-100/50',
        'G': 'ring-yellow-500/50',
        'K': 'ring-orange-500/50',
        'M': 'ring-red-500/50',
        // White dwarfs
        'DB': 'ring-blue-200/50',
        'DA': 'ring-blue-100/50',
        'DF': 'ring-purple-200/50',
        'DG': 'ring-green-200/50',
        'DK': 'ring-yellow-200/50',
        // Giants
        'gF': 'ring-yellow-200/50',
        'gG': 'ring-yellow-400/50',
        'gK': 'ring-orange-400/50',
        'gM': 'ring-red-500/50',
        // Supergiants
        'cB': 'ring-blue-400/50',
        'cA': 'ring-white/50',
        'cF': 'ring-yellow-200/50',
        'cG': 'ring-yellow-500/50',
        'cK': 'ring-orange-500/50',
        'cM': 'ring-red-600/50',
        // Exotics
        'NS': 'ring-purple-500/50',
        'BH': 'ring-gray-950/50'
    };
    return colors[spectralClass] || 'ring-gray-500/50';
};


const getPlanetTypeDescription = (type: string) => {
    return PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown planet type';
};
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
}

.animate-slide-in {
    animation: slideIn 0.3s ease-out backwards;
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

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.7);
}
</style>