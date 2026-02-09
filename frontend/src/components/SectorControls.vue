<template>
    <div class="card">
        <h2 class="text-2xl font-bold mb-6 text-center">Generate Stellar Sector</h2>

        <form @submit.prevent="handleSubmit" class="space-y-6">
            <div class="form-group">
                <label class="form-label" for="systemCount">
                    Number of Systems
                    <span class="text-gray-400 text-sm ml-2">(1-1000)</span>
                </label>
                <input
                    id="systemCount"
                    v-model.number="systemCount"
                    type="number"
                    min="1"
                    max="1000"
                    required
                    class="form-input"
                    placeholder="e.g., 100"
                />
                <div class="flex items-center mt-2">
                    <input
                        id="systemCountRange"
                        v-model.number="systemCount"
                        type="range"
                        min="1"
                        max="1000"
                        step="1"
                        class="flex-1 mr-4"
                    />
                    <span class="text-gray-400 text-sm">{{ systemCount }}</span>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="sectorSize">
                    Sector Size (cubic units)
                    <span class="text-gray-400 text-sm ml-2">(100-100000)</span>
                </label>
                <input
                    id="sectorSize"
                    v-model.number="sectorSize"
                    type="number"
                    min="100"
                    max="100000"
                    step="100"
                    required
                    class="form-input"
                    placeholder="e.g., 1000"
                />
                <div class="flex items-center mt-2">
                    <input
                        id="sectorSizeRange"
                        v-model.number="sectorSize"
                        type="range"
                        min="100"
                        max="10000"
                        step="100"
                        class="flex-1 mr-4"
                    />
                    <span class="text-gray-400 text-sm">{{ sectorSize }}</span>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" for="seed">
                    Generation Seed
                    <span class="text-gray-400 text-sm ml-2">(Shared seed = Identical sector)</span>
                </label>
                <div class="flex gap-2">
                    <input
                        id="seed"
                        v-model.number="seed"
                        type="number"
                        class="form-input flex-1"
                        placeholder="e.g., 123456"
                    />
                    <button 
                        type="button" 
                        @click="randomizeSeed" 
                        class="btn btn-secondary px-4"
                        title="Generate Random Seed"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
                <button
                    type="submit"
                    :disabled="isLoading"
                    class="btn btn-primary flex-1"
                >
                    <span v-if="isLoading" class="loading mr-2"></span>
                    {{ isLoading ? 'Generating...' : 'Generate Sector' }}
                </button>

                <button
                    type="button"
                    @click="resetForm"
                    class="btn btn-secondary flex-1"
                    :disabled="isLoading"
                >
                    Reset
                </button>
            </div>

            <div v-if="error" class="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p class="text-red-300 font-medium">Error: {{ error }}</p>
            </div>
        </form>

        <div v-if="lastStats" class="mt-8 pt-6 border-t border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Last Generation Stats</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-blue-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-blue-300">{{ lastStats.systemCount }}</div>
                    <div class="text-sm text-gray-400">Systems</div>
                </div>
                <div class="text-center p-4 bg-purple-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-purple-300">{{ lastStats.starCount }}</div>
                    <div class="text-sm text-gray-400">Stars</div>
                </div>
                <div class="text-center p-4 bg-green-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-green-300">{{ lastStats.planetCount }}</div>
                    <div class="text-sm text-gray-400">Planets</div>
                </div>
                <div class="text-center p-4 bg-yellow-900/20 rounded-lg">
                    <div class="text-2xl font-bold text-yellow-300">{{ lastStats.generationTimeMs }}ms</div>
                    <div class="text-sm text-gray-400">Generation Time</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { GenerationRequest } from '../types';
import { useSectorStore } from '../stores/sectorStore';

const store = useSectorStore();

const emit = defineEmits<{
    generate: [request: GenerationRequest];
    reset: [];
}>();

const systemCount = ref(100);
const sectorSize = ref(1000);
const seed = ref<number | string>('');
const error = ref<string | null>(null);
const isLoading = ref(false);
const lastStats = ref<{ systemCount: number; starCount: number; planetCount: number; generationTimeMs: number } | null>(null);

onMounted(() => {
    seed.value = store.currentSeed;
});

const randomizeSeed = () => {
    seed.value = Math.floor(Math.random() * 1000000);
};

// Sync range inputs with number inputs
watch(systemCount, (value) => {
    if (value < 1) systemCount.value = 1;
    if (value > 1000) systemCount.value = 1000;
});

watch(sectorSize, (value) => {
    if (value < 100) sectorSize.value = 100;
    if (value > 100000) sectorSize.value = 100000;
});

const handleSubmit = () => {
    error.value = null;

    if (systemCount.value < 1 || systemCount.value > 1000) {
        error.value = 'System count must be between 1 and 1000';
        return;
    }

    if (sectorSize.value < 100 || sectorSize.value > 100000) {
        error.value = 'Sector size must be between 100 and 100000';
        return;
    }

    if (seed.value === '' || seed.value === 0 || seed.value === null) {
        randomizeSeed();
    }

    const request: GenerationRequest = {
        systemCount: systemCount.value,
        sectorSize: sectorSize.value,
        seed: seed.value
    };

    emit('generate', request);
};

const resetForm = () => {
    systemCount.value = 100;
    sectorSize.value = 1000;
    seed.value = '';
    error.value = null;
    lastStats.value = null;
    emit('reset');
};

// Expose methods to update stats
const updateStats = (stats: { systemCount: number; starCount: number; planetCount: number; generationTimeMs: number }) => {
    lastStats.value = stats;
};

const setLoading = (loading: boolean) => {
    isLoading.value = loading;
};

const setError = (err: string | null) => {
    error.value = err;
};

defineExpose({
    updateStats,
    setLoading,
    setError
});
</script>

<style scoped>
input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 3px;
    outline: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
    background: #1d4ed8;
}

input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: background 0.2s ease;
}

input[type="range"]::-moz-range-thumb:hover {
    background: #1d4ed8;
}
</style>