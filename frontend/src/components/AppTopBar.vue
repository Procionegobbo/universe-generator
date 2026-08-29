<template>
    <header
        class="flex-none flex h-14 items-center justify-between px-5 border-b border-line-strong"
        style="background: linear-gradient(180deg, #111a2c, #0d1526)"
    >
        <!-- Left: logo + two-line lockup -->
        <button
            type="button"
            class="flex items-center gap-3 text-left cursor-pointer"
            @click="router.push('/')"
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
                <span class="font-mono font-semibold text-[9px] tracking-[.08em]" :style="{ color: ledColor }">
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
        </div>
    </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { useBackendHealth } from '../composables/useBackendHealth';

const router = useRouter();
const store = useSectorStore();
const { status } = useBackendHealth();

// The blue GENERATING branch is added in story 004, once store.generationStatus exists.
const ledColor = computed(() => {
    if (status.value === 'online') return '#34d399';
    if (status.value === 'offline') return '#f87171';
    return '#64748b';
});

const ledLabel = computed(() => {
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
