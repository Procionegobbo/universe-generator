<template>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Controls -->
        <div class="lg:col-span-1">
            <SectorControls
                ref="controlsRef"
                @generate="handleGenerate"
                @reset="handleReset"
            />
        </div>

        <!-- Right Column: Results -->
        <div class="lg:col-span-2">
            <ResultsDisplay
                v-if="store.sectorData"
                :systems="store.sectorData.systems"
                :stars="store.sectorData.stars"
                :planets="store.sectorData.planets"
            />

            <div v-else class="card">
                <div class="text-center py-12">
                    <div class="w-24 h-24 mx-auto mb-6 text-gray-600">
                        <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold mb-4">Welcome to the Stellar Generator</h2>
                    <p class="text-gray-400 mb-6 max-w-md mx-auto">
                        Generate realistic star systems with planets, moons, and habitable zones.
                        Adjust the parameters on the left and click "Generate Sector" to begin.
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
                        <div class="text-center p-4 bg-blue-900/20 rounded-lg">
                            <div class="text-2xl font-bold text-blue-300">24</div>
                            <div class="text-sm text-gray-400">Star Types</div>
                        </div>
                        <div class="text-center p-4 bg-purple-900/20 rounded-lg">
                            <div class="text-2xl font-bold text-purple-300">9</div>
                            <div class="text-sm text-gray-400">Planet Types</div>
                        </div>
                        <div class="text-center p-4 bg-green-900/20 rounded-lg">
                            <div class="text-2xl font-bold text-green-300">3</div>
                            <div class="text-sm text-gray-400">Habitable Zones</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SectorControls from '../components/SectorControls.vue';
import ResultsDisplay from '../components/ResultsDisplay.vue';
import { useSectorStore } from '../stores/sectorStore';
import type { GenerationRequest } from '../types';

const store = useSectorStore();
const controlsRef = ref<InstanceType<typeof SectorControls>>();

const handleGenerate = async (request: GenerationRequest) => {
    if (controlsRef.value) {
        controlsRef.value.setLoading(true);
        controlsRef.value.setError(null);
    }

    const response = await store.generateSector(request);

    if (controlsRef.value) {
        controlsRef.value.setLoading(false);

        if (store.error) {
            controlsRef.value.setError(store.error);
        } else if (response?.stats) {
            controlsRef.value.updateStats(response.stats);
        }
    }
};

const handleReset = () => {
    store.sectorData = null;
    if (controlsRef.value) {
        controlsRef.value.setError(null);
    }
};
</script>
