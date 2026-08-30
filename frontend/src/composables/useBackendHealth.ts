import { ref, onMounted, onUnmounted } from 'vue';
import { useSectorStore } from '../stores/sectorStore';

export type BackendStatus = 'checking' | 'online' | 'offline';

/**
 * Polls GET /api/sector/health every 5 seconds, exactly as App.vue used to do
 * in its own onMounted/onUnmounted hooks.
 */
export const useBackendHealth = () => {
    const store = useSectorStore();
    const status = ref<BackendStatus>('checking');

    let healthCheckInterval: ReturnType<typeof setInterval> | undefined;

    const checkStatus = async () => {
        const isHealthy = await store.checkHealth();
        status.value = isHealthy ? 'online' : 'offline';
    };

    onMounted(async () => {
        // Initial check
        await checkStatus();

        // Poll every 5 seconds
        healthCheckInterval = setInterval(checkStatus, 5000);
    });

    onUnmounted(() => {
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
        }
    });

    return { status };
};
