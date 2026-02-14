<template>
    <div class="container mx-auto">
        <div class="mb-6">
            <button @click="router.back()" class="btn btn-secondary flex items-center gap-2 mb-4">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Sector
            </button>
            <h2 class="text-3xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
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
                                <div class="flex items-center gap-4 min-w-62.5">
                                    <div class="relative w-32 h-32 shrink-0">
                                        <img :src="getStarImage(star.spectralClass, 'medium')"
                                             :alt="getStarDescription(star.spectralClass)"
                                             class="w-32 h-32 rounded-full object-cover shadow-lg ring-2"
                                             :class="getStarRingColor(star.spectralClass)" />
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
                                             :class="['bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 hover:border-blue-400 transition-colors cursor-pointer', getZoneColor(getOrbitalZone(planet)), getOrbitalZone(planet) === 'Goldilocks' ? 'ring-2 ring-green-400/60 ring-offset-2 ring-offset-gray-900 bg-green-900/10' : '']"
                                             @click="openPlanetDetail(planet)">
                                            <div class="flex items-start gap-3">
                                                <img :src="getPlanetImage(planet.planetType, 'medium')" :alt="getPlanetDescription(planet.planetType)" class="w-20 h-20 rounded-full object-contain border-2 border-gray-800 bg-black" />
                                                <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold bg-gray-800 text-gray-300 ml-1">
                                                    {{ planet.planetType }}
                                                    <svg v-if="getOrbitalZone(planet) === 'Goldilocks'" class="ml-1 w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 110 12A6 6 0 0110 4zm0 2a4 4 0 100 8 4 4 0 000-8z"/></svg>
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

        <!-- Planet Detail Modal -->
        <PlanetDetailModal v-if="selectedPlanet" :planet="selectedPlanet" :close="closePlanetDetail" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { PLANET_TYPE_DESCRIPTIONS, STAR_TYPE_DESCRIPTIONS } from '../types';
import { getStarImage } from '../utils/starColors';
import { getPlanetImage } from '../utils/planetImages';
import PlanetDetailModal from '../components/PlanetDetailModal.vue';

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
    return colors[spectralClass] || 'ring-blue-500/50';
};

const getStarDescription = (type: string) => STAR_TYPE_DESCRIPTIONS[type] || 'Unknown Star';
const getPlanetDescription = (type: string) => PLANET_TYPE_DESCRIPTIONS[type] || 'Unknown Planet';

const selectedPlanet = ref(null);
function openPlanetDetail(planet: any) {
  selectedPlanet.value = planet;
}
function closePlanetDetail() {
  selectedPlanet.value = null;
}

// Correggi la dichiarazione delle funzioni e la loro visibilità nel template
// Sposta getOrbitalZone e getZoneColor sopra e assicurati che restituiscano sempre una stringa
// Tipizza i parametri delle funzioni per eliminare i warning TS7006
function getOrbitalZone(planet: any): string {
  if (planet.habitableZone) return 'Goldilocks';
  if (planet.orbitalNumber <= 2) return 'Inner';
  if (planet.orbitalNumber <= 4) return 'Medium';
  return 'Outer';
}
function getZoneColor(zone: string): string {
  switch (zone) {
    case 'Inner':
      return 'bg-red-900/30 text-red-300';
    case 'Medium':
      return 'bg-yellow-900/30 text-yellow-200';
    case 'Outer':
      return 'bg-blue-900/30 text-blue-300';
    case 'Goldilocks':
      return 'bg-green-700/80 text-green-100 font-bold shadow';
    default:
      return 'bg-gray-800/30 text-gray-400';
  }
}
</script>

<style scoped>
.card {
    /* Usa solo classi Tailwind standard, non @apply */
    background-color: #1f2937; /* bg-gray-800 */
    border-color: #374151;     /* border-gray-700 */
    border-radius: 0.5rem;     /* rounded-lg */
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06); /* shadow-md */
    transition: box-shadow 0.3s;
}

.card:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05); /* shadow-lg */
}
</style>
