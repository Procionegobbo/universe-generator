import { ref } from 'vue';
import axios from 'axios';
import type { GenerationRequest, GenerationResponse } from '../types';

const API_BASE_URL = '/api/sector';

export function useSectorApi() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const response = ref<GenerationResponse | null>(null);

    /**
     * Generate a new sector
     */
    const generateSector = async (request: GenerationRequest) => {
        isLoading.value = true;
        error.value = null;

        try {
            const result = await axios.post<GenerationResponse>(`${API_BASE_URL}/generate`, request);
            response.value = result.data;

            if (!result.data.success) {
                error.value = result.data.error || 'Failed to generate sector';
            }
        } catch (err: any) {
            error.value = err.response?.data?.error || err.message || 'Network error';
            response.value = null;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Check if backend is healthy
     */
    const checkHealth = async () => {
        try {
            const result = await axios.get(`${API_BASE_URL}/health`);
            return result.data.status === 'ok';
        } catch {
            return false;
        }
    };

    /**
     * Reset the state
     */
    const reset = () => {
        isLoading.value = false;
        error.value = null;
        response.value = null;
    };

    return {
        isLoading,
        error,
        response,
        generateSector,
        checkHealth,
        reset
    };
}