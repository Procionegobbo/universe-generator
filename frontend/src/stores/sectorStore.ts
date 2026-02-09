import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Sector, GenerationRequest } from '../types';
import axios from 'axios';

export const useSectorStore = defineStore('sector', () => {
    const sectorData = ref<Sector | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const currentSeed = ref<number | string>(Math.floor(Math.random() * 1000000));

    // Actions
    const checkHealth = async (): Promise<boolean> => {
        try {
            const response = await axios.get('/api/sector/health');
            return response.data.status === 'ok';
        } catch (e) {
            return false;
        }
    };

    const generateSector = async (request: GenerationRequest) => {
        isLoading.value = true;
        error.value = null;

        // If request doesn't have a seed, use the current store seed
        if (request.seed === undefined) {
            request.seed = currentSeed.value;
        } else {
            currentSeed.value = request.seed;
        }

        try {
            const response = await axios.post('/api/sector/generate', request);
            if (response.data.success) {
                sectorData.value = response.data.data;
                return response.data;
            } else {
                error.value = response.data.error || 'Failed to generate sector';
                return null;
            }
        } catch (e: any) {
            error.value = e.message || 'An error occurred';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const getSystemById = (id: string) => {
        const targetId = parseInt(id);
        if (sectorData.value && !isNaN(targetId)) {
            return sectorData.value.systems.find(s => s.systemId === targetId) || null;
        }
        return null;
    };

    // We should probably add IDs to systems if they don't have them, 
    // but for now let's use index as ID for simplicity in routing.

    return {
        sectorData,
        isLoading,
        error,
        currentSeed,
        checkHealth,
        generateSector,
        getSystemById
    };
});
