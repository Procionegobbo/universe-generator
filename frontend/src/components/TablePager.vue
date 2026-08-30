<template>
    <!-- Shared table footer (handoff 3a §Footer): the range caption on the left,
         the pager on the right. Built once here and imported unchanged by the
         Systems, Stars and Planets tables; the page number itself lives in the
         relevant `store.page.*` field, bound through v-model. -->
    <div
        data-pager
        class="flex items-center justify-between gap-3 border-t border-line-strong bg-panel px-[18px] py-3"
    >
        <span data-pager-caption class="font-mono text-[10px] whitespace-nowrap text-faint">
            {{ caption }}
        </span>

        <nav v-if="pageCount > 1" class="flex items-center gap-[6px]" aria-label="Pagination">
            <button
                type="button"
                data-page="prev"
                :disabled="current <= 1"
                :style="stepStyle(current <= 1)"
                class="rounded-ctl px-3 py-[6px] font-mono font-medium text-[10px] transition-colors duration-150"
                @click="go(current - 1)"
            >
                PREV
            </button>

            <template v-for="(entry, index) in entries" :key="`${entry}-${index}`">
                <span v-if="entry === null" class="font-mono text-[10px] text-faint">…</span>
                <button
                    v-else
                    type="button"
                    :data-page="entry"
                    :aria-current="entry === current ? 'page' : undefined"
                    :style="numberStyle(entry === current)"
                    class="rounded-ctl px-[11px] py-[6px] font-mono text-[10px] transition-colors duration-150"
                    @click="go(entry)"
                >
                    {{ entry }}
                </button>
            </template>

            <button
                type="button"
                data-page="next"
                :disabled="current >= pageCount"
                :style="stepStyle(current >= pageCount)"
                class="rounded-ctl px-3 py-[6px] font-mono font-medium text-[10px] transition-colors duration-150"
                @click="go(current + 1)"
            >
                NEXT
            </button>
        </nav>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { thinThousands } from '../utils/format';

const props = defineProps<{
    /** Current page, 1-based. Bound to store.page.<systems|stars|planets>. */
    modelValue: number;
    /** Rows after filtering — the denominator of the caption. */
    total: number;
    /** Rows per page. */
    pageSize: number;
}>();

const emit = defineEmits<{ (event: 'update:modelValue', page: number): void }>();

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

// The bound page can be stale for one tick after a filter shrinks the result
// set, so everything reads the clamped value rather than trusting the prop.
const current = computed(() => Math.min(Math.max(1, props.modelValue), pageCount.value));

const caption = computed(() => {
    if (props.total === 0) return 'SHOWING 0 OF 0';
    const first = (current.value - 1) * props.pageSize + 1;
    const last = Math.min(props.total, current.value * props.pageSize);
    return `SHOWING ${thinThousands(first)}–${thinThousands(last)} OF ${thinThousands(props.total)}`;
});

/**
 * Page buttons, `null` standing for an ellipsis. Up to five pages are listed in
 * full; beyond that the design shows a sliding window of three around the
 * current page, always flanked by the first and last page (`1 2 3 … 12`).
 */
const entries = computed<Array<number | null>>(() => {
    const count = pageCount.value;
    if (count <= 5) return Array.from({ length: count }, (_, index) => index + 1);

    const start = Math.min(Math.max(current.value - 1, 1), count - 2);
    const window: Array<number | null> = [start, start + 1, start + 2];

    if (start > 1) window.unshift(1, null);
    if (start + 2 < count) window.push(null, count);
    return window;
});

const go = (page: number) => {
    const next = Math.min(Math.max(1, page), pageCount.value);
    if (next !== props.modelValue) emit('update:modelValue', next);
};

const stepStyle = (disabled: boolean) => ({
    border: `1px solid rgb(148 163 184 / ${disabled ? '.16' : '.28'})`,
    color: disabled ? '#334155' : '#cbd5e1',
    cursor: disabled ? 'not-allowed' : 'pointer'
});

const numberStyle = (active: boolean) => ({
    border: active ? '1px solid #3b82f6' : '1px solid rgb(148 163 184 / .2)',
    background: active ? 'rgb(59 130 246 / .18)' : 'transparent',
    color: active ? '#bfdbfe' : '#94a3b8',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer'
});
</script>
