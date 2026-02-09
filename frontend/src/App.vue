<template>
    <div class="h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm z-10 flex-none">
            <div class="container py-6">
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4 cursor-pointer" @click="router.push('/')">
                        <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                            <svg class="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                                Stellar Universe Generator
                            </h1>
                            <p class="text-gray-400 text-sm">Generate procedural star systems with realistic characteristics</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="hidden sm:flex items-center gap-2 text-sm">
                            <div class="flex items-center gap-1">
                                <div class="w-2 h-2 rounded-full" 
                                     :class="backendStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'"></div>
                                <span class="text-gray-400">Backend:</span>
                                <span :class="backendStatus === 'connected' ? 'text-green-400' : 'text-red-400'">
                                    {{ backendStatus === 'connected' ? 'Connected' : 'Disconnected' }}
                                </span>
                            </div>
                            <div class="text-gray-600">|</div>
                            <div class="text-gray-400">
                                Systems: {{ store.sectorData?.systems.length || 0 }}
                            </div>
                            <div class="text-gray-600">|</div>
                            <div class="text-gray-400">
                                Stars: {{ store.sectorData?.stars.length || 0 }}
                            </div>
                        </div>

                        <button
                            @click="exportData"
                            :disabled="!store.sectorData"
                            class="btn btn-secondary text-sm"
                        >
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export JSON
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content (Router View) -->
        <main class="flex-1 overflow-y-auto">
            <div class="container py-8">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </div>
        </main>

        <!-- Footer -->
        <footer class="border-t border-gray-800 bg-gray-900/50 mt-12">
            <div class="container py-6">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="text-gray-500 text-sm">
                        <p>Stellar Universe Generator v1.0.0</p>
                        <p class="mt-1">Powered by procedural generation algorithms</p>
                    </div>
                    <div class="flex items-center gap-4 text-sm">
                        <router-link to="/documentation" class="text-gray-400 hover:text-white transition-colors underline decoration-purple-500/30 hover:decoration-purple-500 transition-all underline-offset-4">
                            Documentation
                        </router-link>
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">GitHub</a>
                        <router-link to="/api-reference" class="text-gray-400 hover:text-white transition-colors underline decoration-blue-500/30 hover:decoration-blue-500 transition-all underline-offset-4">
                            API Reference
                        </router-link>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSectorStore } from './stores/sectorStore';

const router = useRouter();
const store = useSectorStore();
const backendStatus = ref<'checking' | 'connected' | 'disconnected'>('checking');

// Check backend health on mount
// Check backend health on mount and poll
let healthCheckInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
    const checkStatus = async () => {
        const isHealthy = await store.checkHealth();
        backendStatus.value = isHealthy ? 'connected' : 'disconnected';
    };

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

const exportData = () => {
    if (!store.sectorData) return;

    const dataStr = JSON.stringify(store.sectorData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `stellar-sector-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
</script>

<style>
/* Additional global styles */
.gradient-text {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Route transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>