<template>
    <div
        v-if="store.linkNotice"
        data-link-notice
        role="status"
        :data-link-notice-kind="store.linkNotice.kind"
        class="flex flex-none items-center justify-between gap-3 px-5 py-[10px]"
        style="border-bottom: 1px solid rgb(239 68 68 / .3); background: rgb(239 68 68 / .06)"
    >
        <p class="font-sans text-[12px] text-acc-red-pale">{{ message }}</p>
        <button
            type="button"
            data-link-notice-close
            aria-label="Dismiss"
            class="flex-none rounded-ctl px-2 py-1 font-mono text-[12px] leading-none text-muted transition-colors duration-150 hover:text-ink"
            @click="store.clearLinkNotice()"
        >
            ✕
        </button>
    </div>
</template>

<script setup lang="ts">
// Decision 6: a link that went wrong is said inline, at the top of wherever the
// corrective navigation landed — not through HomeView's full-page error state,
// which belongs to a failed generation and stays exactly as it is.
//
// Mounted once in App.vue, so both destinations get it without either view
// knowing the strip exists.

import { computed, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import type { LinkNoticeKind } from '../stores/sectorStore';

/** Long enough to read, short enough not to become furniture. */
const DISMISS_MS = 8000;

const MESSAGES: Record<LinkNoticeKind, string> = {
    sid: 'That address does not name a sector that can be generated.',
    planet: 'The planet in that link does not exist in this sector.',
    coordinates: 'The coordinates in that link are not consistent, so it opened the sector instead.'
};

const route = useRoute();
const store = useSectorStore();

const message = computed(() => (store.linkNotice ? MESSAGES[store.linkNotice.kind] : ''));

let timer: ReturnType<typeof setTimeout> | undefined;

// Re-armed on every notice, so a second one gets its own full reading time
// rather than inheriting what is left of the first one's.
watch(() => store.linkNotice, (notice) => {
    clearTimeout(timer);
    if (!notice) return;
    timer = setTimeout(() => store.clearLinkNotice(), DISMISS_MS);
});

// The notice is raised *after* its own corrective replace has landed and records
// the path it belongs to, which is what lets this clear on the next navigation
// without clearing on the one that caused it.
// Watched on fullPath so a query-only navigation is seen at all, but compared on
// the path: the guard's own strip of `?planet` leaves the user where they are,
// and the notice explaining it must not be swept away by the navigation that
// raised it.
watch(() => route.fullPath, () => {
    const notice = store.linkNotice;
    if (notice && route.path !== notice.path) store.clearLinkNotice();
});

onBeforeUnmount(() => clearTimeout(timer));
</script>
