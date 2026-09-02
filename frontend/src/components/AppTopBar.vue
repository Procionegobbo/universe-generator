<template>
    <header
        class="flex-none flex h-14 items-center justify-between px-5 border-b border-line-strong"
        style="background: linear-gradient(180deg, #111a2c, #0d1526)"
    >
        <!-- Left: logo + two-line lockup -->
        <button
            type="button"
            class="flex items-center gap-3 text-left cursor-pointer"
            @click="router.push(homeTo)"
        >
            <img src="/images/logo.png" alt="Universe Generator" class="h-7 w-7 rounded-full object-cover" />
            <span class="flex flex-col leading-none">
                <span class="font-sans font-semibold text-[14px] tracking-[.02em] text-ink">
                    UNIVERSE GENERATOR
                </span>
                <span class="mt-1 font-mono text-[10px] tracking-[.08em] text-dim">
                    PROCEDURAL STELLAR SECTOR · v1.1.0
                </span>
            </span>
        </button>

        <!-- Right: backend LED, seed pill, export -->
        <div class="flex items-center gap-2">
            <div
                class="hidden sm:flex items-center gap-2 rounded-pill border border-line-control bg-input px-2.5 py-1.5"
            >
                <span class="h-1.5 w-1.5 rounded-full" :style="ledStyle"></span>
                <span class="font-mono font-semibold text-[9px] tracking-[.08em]" :style="{ color: ledTextColor }">
                    {{ ledLabel }}
                </span>
            </div>

            <div
                class="hidden md:flex items-center gap-2 rounded-pill border border-line-control bg-input px-2.5 py-1.5"
            >
                <span class="font-mono font-medium text-[9px] tracking-[.14em] text-dim">SEED</span>
                <span class="font-mono font-medium text-[11px] text-acc-violet-light">{{ store.currentSeed }}</span>
            </div>

            <button
                type="button"
                class="rounded-ctl px-3 py-1.5 font-mono font-semibold text-[10px] tracking-[.08em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
                style="border: 1px solid rgb(139 92 246 / .45); background: rgb(139 92 246 / .14); color: #ddd6fe"
                :disabled="!store.sectorData"
                @click="exportData"
            >
                EXPORT JSON
            </button>

            <!-- The `≡` glyph of the handoff's 4d top bar, kept at every width:
                 it is the only in-app way back to the two legacy pages since
                 the old footer went away. -->
            <div class="relative">
                <button
                    type="button"
                    data-testid="app-menu"
                    class="rounded-ctl border border-line-control bg-input px-2.5 py-1 font-mono text-[14px] leading-[1.4] text-muted transition-colors duration-150 hover:text-ink"
                    aria-haspopup="menu"
                    :aria-expanded="menuOpen"
                    aria-label="Open menu"
                    @click="menuOpen = !menuOpen"
                >
                    ≡
                </button>

                <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false"></div>

                <div
                    v-if="menuOpen"
                    role="menu"
                    class="absolute right-0 z-50 mt-2 flex w-[168px] flex-col rounded-card border border-line-control bg-panel py-1"
                >
                    <RouterLink
                        v-for="item in MENU_ITEMS"
                        :key="item.to"
                        role="menuitem"
                        :to="item.to"
                        class="px-3 py-2 font-mono text-[11px] text-muted transition-colors duration-150 hover:text-ink"
                        @click="menuOpen = false"
                    >
                        {{ item.label }}
                    </RouterLink>
                </div>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { useBackendHealth } from '../composables/useBackendHealth';
import { useSectorNav } from '../composables/useSectorNav';

const MENU_ITEMS = [
    { to: '/documentation', label: 'Documentation' },
    { to: '/api-reference', label: 'API Reference' }
] as const;

const menuOpen = ref(false);

const router = useRouter();
const store = useSectorStore();
const { homeTo } = useSectorNav();
const { status } = useBackendHealth();

// A generation in flight overrides the online/offline colour for its duration.
const isGenerating = computed(() => store.generationStatus === 'running');

const ledColor = computed(() => {
    if (isGenerating.value) return '#3b82f6';
    if (status.value === 'online') return '#34d399';
    if (status.value === 'offline') return '#f87171';
    return '#64748b';
});

const ledTextColor = computed(() => (isGenerating.value ? '#93c5fd' : ledColor.value));

const ledLabel = computed(() => {
    if (isGenerating.value) return 'GENERATING';
    if (status.value === 'online') return 'BACKEND ONLINE';
    if (status.value === 'offline') return 'BACKEND OFFLINE';
    return 'BACKEND CHECKING';
});

const ledStyle = computed(() => ({
    background: ledColor.value,
    boxShadow: `0 0 8px ${ledColor.value}`
}));

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
