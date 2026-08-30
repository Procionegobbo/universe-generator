<template>
    <div class="flex justify-center px-4 py-8">
        <div class="flex w-full max-w-[700px] flex-col gap-[18px] px-[30px] py-[26px]">
            <div class="flex items-baseline justify-between gap-3">
                <span class="font-sans font-semibold text-[13px] text-ink">
                    Building sector {{ store.currentSeed }}
                </span>
                <span class="font-mono font-semibold text-[13px]" style="color: #93c5fd">
                    {{ percent }}%
                </span>
            </div>

            <div
                class="h-[5px] overflow-hidden rounded-[3px]"
                style="background: rgb(148 163 184 / .14)"
                role="progressbar"
                :aria-valuenow="percent"
                aria-valuemin="0"
                aria-valuemax="100"
            >
                <div
                    class="h-full transition-[width] duration-150 ease-out"
                    :style="{ width: `${percent}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }"
                ></div>
            </div>

            <!-- The API exposes no progress channel: the stages are animated on a
                 timer and no count is ever fabricated (D-19). -->
            <ul class="flex flex-col gap-[7px]">
                <li
                    v-for="(stage, index) in stages"
                    :key="stage.id"
                    class="flex justify-between gap-3 py-[7px]"
                    :class="index < stages.length - 1 ? 'border-b border-line-hairline' : ''"
                >
                    <span class="font-mono text-[11px]" :style="{ color: STAGE_INK[stage.status] }">
                        {{ MARK[stage.status] }} {{ stage.label }}
                    </span>
                    <span
                        class="font-mono text-[10px]"
                        :style="{ color: stage.status === 'pending' ? '#334155' : '#475569' }"
                    >
                        {{ trailing(stage) }}
                    </span>
                </li>
            </ul>

            <div class="flex items-center justify-between gap-3">
                <span class="font-mono text-[10px] text-faint">
                    elapsed {{ thinThousands(elapsedMs) }} ms
                </span>
                <button type="button" class="ug-btn-danger px-4 py-2" @click="emit('cancel')">
                    CANCEL
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSectorStore } from '../stores/sectorStore';
import { useGenerationProgress, type ProgressStage } from '../composables/useGenerationProgress';
import { thinThousands } from '../utils/format';

const store = useSectorStore();
const { stages, progress, elapsedMs } = useGenerationProgress();

const emit = defineEmits<{
    cancel: [];
}>();

const MARK = { done: '✓', current: '▸', pending: '·' } as const;

const STAGE_INK = { done: '#6ee7b7', current: '#93c5fd', pending: '#334155' } as const;

const percent = computed(() => Math.round(progress.value * 100));

// Only the requested system count is a real number; the other stages show
// "pending" before they start and nothing at all while they run (D-19).
const trailing = (stage: ProgressStage): string => {
    if (stage.status === 'pending') return 'pending';
    return stage.count === null ? '' : thinThousands(stage.count);
};
</script>
