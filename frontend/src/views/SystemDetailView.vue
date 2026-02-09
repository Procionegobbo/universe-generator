<template>
    <div class="container mx-auto">
        <div class="mb-6">
            <button @click="router.back()" class="btn btn-secondary flex items-center gap-2 mb-4">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Sector
            </button>
            <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                System Details
            </h2>
        </div>

        <div v-if="system" class="space-y-8">
            <!-- System Info Card -->
            <div class="card">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 class="text-xl font-bold text-white mb-2">System #{{ system.systemId }}</h3>
                        <div class="flex items-center gap-4 text-gray-400">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                X: {{ system.xPos }}
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                Y: {{ system.yPos }}
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                                Z: {{ system.zPos }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stars and Planets Section -->
            <div>
                <div class="grid grid-cols-1 gap-6">
                    <div v-for="star in systemStars" :key="star.starId" class="space-y-4">
                        <!-- Star Card -->
                        <div class="card bg-gray-800/50 border border-gray-700">
                            <div class="flex flex-col md:flex-row gap-6 items-start">
                                <!-- Star Info -->
                                <div class="flex items-center gap-4 min-w-[250px]">
                                    <div class="relative w-16 h-16 flex-shrink-0">
                                        <img :src="getStarImagePath(star.spectralClass)" 
                                             alt="Star" 
                                             class="w-16 h-16 rounded-full object-cover shadow-lg ring-2"
                                             :class="getStarRingColor(star.spectralClass)"
                                             :style="getStarFilter(star.spectralClass)" />
                                        <div class="absolute inset-0 flex items-center justify-center text-xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                            {{ star.spectralClass }}
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-xl font-bold text-white">{{ star.name }}</div>
                                        <div class="text-gray-400">{{ getStarDescription(star.spectralClass) }}</div>
                                        <div class="text-xs text-gray-500 mt-1">ID: {{ star.starId }}</div>
                                    </div>
                                </div>

                                <!-- Star Planets -->
                                <div class="flex-1 w-full">
                                    <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Planets ({{ getPlanetsForStar(star.starId).length }})
                                    </h4>
                                    
                                    <div v-if="getPlanetsForStar(star.starId).length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <div v-for="planet in getPlanetsForStar(star.starId)" :key="JSON.stringify(planet)" 
                                             class="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600 transition-colors">
                                            <div class="flex items-start gap-3">
                                                <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold bg-gray-800 text-gray-300">
                                                    {{ planet.planetType }}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class="font-medium text-gray-200 text-sm truncate" :title="getPlanetDescription(planet.planetType)">
                                                        {{ getPlanetDescription(planet.planetType) }}
                                                    </div>
                                                    <div class="text-xs text-gray-500 mt-1 space-y-0.5">
                                                        <div class="flex gap-2">
                                                            <span>Pos: #{{ planet.orbitalNumber }}</span>
                                                            <span>•</span>
                                                            <span>{{ planet.moonCount }} Moons</span>
                                                        </div>
                                                        <div>Ø {{ planet.diameter.toLocaleString() }} km</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="text-sm text-gray-600 italic py-2">
                                        No planets orbiting this star.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        <div v-else class="text-center py-12">
            <h3 class="text-xl text-red-400 mb-4">System Not Found</h3>
            <button @click="router.push('/')" class="btn btn-primary">Return to Home</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { PLANET_TYPE_DESCRIPTIONS, STAR_TYPE_DESCRIPTIONS } from '../types';

const route = useRoute();
const router = useRouter();
const store = useSectorStore();

const systemId = route.params.id as string;
const system = computed(() => store.getSystemById(systemId));

const systemStars = computed(() => {
    if (!system.value || !store.sectorData) return [];
    return store.sectorData.stars.filter(s => s.systemId === system.value?.systemId);
});

    const getPlanetsForStar = (starId: number) => {
        if (!store.sectorData) return [];
        return store.sectorData.planets.filter(p => p.starId === starId).sort((a, b) => a.orbitalNumber - b.orbitalNumber);
    };

const getStarImagePath = (spectralClass: string) => {
    const mainClass = spectralClass[0];
    const available = ['O', 'B', 'A', 'F', 'G'];
    if (available.includes(mainClass)) {
        return `/images/stars/star-${mainClass}.png`;
    }
    // Fallbacks
    if (mainClass === 'K' || mainClass === 'M') return '/images/stars/star-G.png';
    if (mainClass === 'N' || spectralClass === 'NS') return '/images/stars/star-A.png';
    if (spectralClass === 'BH') return '/images/stars/star-default.png';
    return '/images/stars/star-default.png';
};

const getStarRingColor = (spectralClass: string) => {
    const mainClass = spectralClass[0];
    const colors: Record<string, string> = {
        'O': 'ring-blue-500/50',
        'B': 'ring-blue-300/50',
        'A': 'ring-white/50',
        'F': 'ring-yellow-100/50',
        'G': 'ring-yellow-500/50',
        'K': 'ring-orange-500/50',
        'M': 'ring-red-500/50',
        'N': 'ring-purple-500/50',
        'BH': 'ring-gray-950/50'
    };
    return colors[mainClass] || 'ring-blue-500/50';
};

const getStarFilter = (spectralClass: string) => {
    const mainClass = spectralClass[0];
    if (mainClass === 'K') return 'filter: hue-rotate(-20deg) saturate(1.5)';
    if (mainClass === 'M') return 'filter: hue-rotate(-50deg) saturate(2)';
    if (mainClass === 'N' || spectralClass === 'NS') return 'filter: hue-rotate(250deg) brightness(1.5)';
    if (spectralClass === 'BH') return 'filter: brightness(0.2) contrast(2)';
    return '';
};

const getStarDescription = (type: string) => STAR_TYPE_DESCRIPTIONS[type] || 'Unknown Star';
const getPlanetDescription = (type: string) => PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown Planet';
</script>
