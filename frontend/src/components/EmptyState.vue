<template>
    <div class="flex justify-center px-4 py-8">
        <div
            class="flex w-full max-w-[700px] flex-col gap-6 rounded-card px-[30px] py-[34px]"
            style="background: radial-gradient(500px 260px at 50% 0%, rgb(59 130 246 / .1), transparent 70%)"
        >
            <div class="flex flex-col items-center gap-[9px] text-center">
                <span class="font-mono font-medium text-[10px] tracking-[.22em]" style="color: #60a5fa">
                    READY
                </span>
                <h2 class="font-sans font-semibold text-[26px] text-ink-bright">
                    Generate your first sector
                </h2>
                <p class="max-w-[420px] font-sans text-[12px] leading-[1.6] text-muted">
                    24 star types, 22 planet types, moons and habitable zones from scientific
                    probability distributions. Same seed, same universe, every time.
                </p>
            </div>

            <div class="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
                <div
                    v-for="item in preview"
                    :key="item.label"
                    class="flex flex-col gap-1 rounded-card border border-line-soft bg-panel p-3"
                >
                    <span class="font-mono font-medium text-[9px] tracking-[.1em] text-dim">
                        {{ item.label }}
                    </span>
                    <span
                        class="font-mono font-semibold text-[18px]"
                        :style="{ color: item.violet ? '#c4b5fd' : '#e2e8f0' }"
                    >
                        {{ item.value }}
                    </span>
                </div>
            </div>

            <div class="flex flex-wrap justify-center gap-[10px]">
                <button type="button" class="ug-btn-primary px-7 py-[13px]" @click="emit('generate')">
                    GENERATE SECTOR
                </button>
                <button
                    v-if="store.hasSavedParams"
                    type="button"
                    class="ug-btn-outline px-[22px] py-[13px]"
                    style="font-size: 12px"
                    @click="emit('restore')"
                >
                    RESTORE LAST SECTOR
                </button>
            </div>

            <div
                class="flex flex-wrap justify-center gap-x-[22px] gap-y-2 border-t border-line-hairline pt-[6px]"
            >
                <span class="font-mono text-[10px] text-faint">24 star types</span>
                <span class="font-mono text-[10px] text-faint">22 planet types</span>
                <span class="font-mono text-[10px] text-faint">deterministic seeds</span>
                <RouterLink
                    to="/documentation"
                    class="font-mono text-[10px] hover:underline"
                    style="color: #60a5fa"
                >
                    Documentation
                </RouterLink>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { thinThousands } from '../utils/format';

const store = useSectorStore();

const emit = defineEmits<{
    generate: [];
    restore: [];
}>();

const hasSeed = computed(() => store.currentSeed !== '' && store.currentSeed !== null);

const zoneLabel = computed(() => store.zone.charAt(0).toUpperCase() + store.zone.slice(1));

// The empty state carries the pending parameters rather than a wall of prose.
const preview = computed(() => [
    { label: 'SYSTEMS', value: thinThousands(store.systemCount), violet: false },
    { label: 'VOLUME', value: `${thinThousands(store.sectorVolume)} pc³`, violet: false },
    { label: 'ZONE', value: zoneLabel.value, violet: false },
    { label: 'SEED', value: hasSeed.value ? String(store.currentSeed) : 'random', violet: !hasSeed.value }
]);
</script>
