<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Stars</h2>
            <div class="text-gray-400">
                Showing {{ filteredStars.length }} of {{ stars.length }} stars
            </div>
        </div>

        <div class="mb-6 flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
                <label class="form-label" for="search">Search Stars</label>
                <input
                    id="search"
                    v-model="searchQuery"
                    type="text"
                    class="form-input"
                    placeholder="Search by spectral class, system, or name..."
                />
            </div>
            <div class="w-full sm:w-48">
                <label class="form-label" for="sortBy">Sort By</label>
                <select id="sortBy" v-model="sortBy" class="form-input">
                    <option value="starId">Star ID</option>
                    <option value="systemId">System ID</option>
                    <option value="spectralClass">Spectral Class</option>
                    <option value="subclass">Subclass</option>
                </select>
            </div>
        </div>

        <div v-if="filteredStars.length === 0" class="text-center py-12 text-gray-500">
            No stars found matching your search.
        </div>

        <div v-else class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th @click="sortBy = 'starId'">
                            Star ID
                            <span v-if="sortBy === 'starId'" class="ml-1">▼</span>
                        </th>
                        <th @click="sortBy = 'systemId'">
                            System ID
                            <span v-if="sortBy === 'systemId'" class="ml-1">▼</span>
                        </th>
                        <th>Name</th>
                        <th @click="sortBy = 'spectralClass'">
                            Spectral Class
                            <span v-if="sortBy === 'spectralClass'" class="ml-1">▼</span>
                        </th>
                        <th @click="sortBy = 'subclass'">
                            Subclass
                            <span v-if="sortBy === 'subclass'" class="ml-1">▼</span>
                        </th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="star in paginatedStars" :key="star.starId">
                        <td class="font-mono">{{ star.starId }}</td>
                        <td class="font-mono">{{ star.systemId }}</td>
                        <td class="font-medium">{{ star.name }}</td>
                        <td>
                            <div class="flex items-center gap-2">
                                <div class="relative w-8 h-8 flex-shrink-0">
                                    <img :src="getStarImage(star.spectralClass)"
                                         :alt="getStarDescription(star.spectralClass)"
                                         class="w-8 h-8 rounded-full object-cover ring-1"
                                         :class="getStarRingColor(star.spectralClass)" />
                                </div>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium"
                                    :class="getStarClassColor(star.spectralClass)">
                                    {{ star.spectralClass }}
                                </span>
                            </div>
                        </td>
                        <td>
                            <span v-if="star.subclass" class="text-gray-300">
                                {{ star.subclass }}
                            </span>
                            <span v-else class="text-gray-500">—</span>
                        </td>
                        <td class="text-gray-400 text-sm">
                            {{ getStarDescription(star.spectralClass) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="filteredStars.length > itemsPerPage" class="mt-6 flex justify-between items-center">
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

        <div v-if="starTypeDistribution" class="mt-8 pt-6 border-t border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Star Type Distribution</h3>
            <div class="space-y-3">
                <div v-for="([type, count]) in Object.entries(starTypeDistribution).sort((a, b) => b[1] - a[1])"
                    :key="type" class="flex items-center">
                    <div class="w-32 text-sm text-gray-400">{{ type }}</div>
                    <div class="flex-1 ml-4">
                        <div class="h-6 bg-blue-900/30 rounded overflow-hidden">
                            <div
                                :style="{ width: `${(count / maxStarCount) * 100}%` }"
                                class="h-full bg-blue-500 transition-all duration-500"
                            ></div>
                        </div>
                    </div>
                    <div class="w-16 text-right text-sm font-medium">{{ count }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Star } from '../types';
import { STAR_TYPE_DESCRIPTIONS } from '../types';
import { getStarImage } from '../utils/starColors';

const props = defineProps<{
    stars: Star[];
}>();

const searchQuery = ref('');
const sortBy = ref<'starId' | 'systemId' | 'spectralClass' | 'subclass'>('starId');
const currentPage = ref(1);
const itemsPerPage = 20;

// Filter stars based on search query
const filteredStars = computed(() => {
    if (!searchQuery.value.trim()) {
        return [...props.stars];
    }

    const query = searchQuery.value.toLowerCase();
    return props.stars.filter(star =>
        star.spectralClass.toLowerCase().includes(query) ||
        star.name.toLowerCase().includes(query) ||
        star.starId.toString().includes(query) ||
        star.systemId.toString().includes(query)
    );
});

// Sort filtered stars
const sortedStars = computed(() => {
    const stars = [...filteredStars.value];
    return stars.sort((a, b) => {
        if (sortBy.value === 'starId') return a.starId - b.starId;
        if (sortBy.value === 'systemId') return a.systemId - b.systemId;
        if (sortBy.value === 'spectralClass') return a.spectralClass.localeCompare(b.spectralClass);
        if (sortBy.value === 'subclass') {
            const aSub = a.subclass || 0;
            const bSub = b.subclass || 0;
            return aSub - bSub;
        }
        return 0;
    });
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredStars.value.length / itemsPerPage));
const paginatedStars = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedStars.value.slice(start, end);
});

// Star type distribution
const starTypeDistribution = computed(() => {
    const distribution: Record<string, number> = {};
    props.stars.forEach(star => {
        distribution[star.spectralClass] = (distribution[star.spectralClass] || 0) + 1;
    });
    return distribution;
});

const maxStarCount = computed(() => {
    const counts = Object.values(starTypeDistribution.value);
    return counts.length > 0 ? Math.max(...counts) : 1;
});

// Reset pagination when search changes
watch(searchQuery, () => {
    currentPage.value = 1;
});

// Helper functions
const getStarClassColor = (spectralClass: string) => {
    const colors: Record<string, string> = {
        'O': 'bg-blue-900/30 text-blue-300',
        'B': 'bg-blue-700/30 text-blue-200',
        'A': 'bg-white/30 text-white',
        'F': 'bg-yellow-100/30 text-yellow-100',
        'G': 'bg-yellow-400/30 text-yellow-300',
        'K': 'bg-orange-500/30 text-orange-300',
        'M': 'bg-red-600/30 text-red-300',
        'DB': 'bg-gray-300/30 text-gray-300',
        'DA': 'bg-gray-400/30 text-gray-400',
        'DF': 'bg-gray-500/30 text-gray-500',
        'DG': 'bg-gray-600/30 text-gray-600',
        'DK': 'bg-gray-700/30 text-gray-700',
        'gF': 'bg-yellow-200/30 text-yellow-200',
        'gG': 'bg-yellow-500/30 text-yellow-500',
        'gK': 'bg-orange-600/30 text-orange-600',
        'gM': 'bg-red-700/30 text-red-700',
        'NS': 'bg-purple-900/30 text-purple-300',
        'cB': 'bg-blue-800/30 text-blue-200',
        'cA': 'bg-white/40 text-white',
        'cF': 'bg-yellow-300/30 text-yellow-300',
        'cG': 'bg-yellow-600/30 text-yellow-600',
        'cK': 'bg-orange-700/30 text-orange-700',
        'cM': 'bg-red-800/30 text-red-800',
        'BH': 'bg-black/50 text-gray-300 border border-gray-700'
    };
    return colors[spectralClass] || 'bg-gray-800/30 text-gray-400';
};

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
</script>

<style scoped>
th {
    cursor: pointer;
    user-select: none;
}

th:hover {
    background: rgba(59, 130, 246, 0.1);
}
</style>