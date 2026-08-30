// A shared link has to build its own sector.
//
// Sectors are never stored — only the parameters that make one, and generation
// is deterministic — so someone opening a link arrives with nothing in memory.
// Before this, `/system/52?planet=87-3&...` answered "System not found in the
// current sector", which is true and useless: the sector the link names had
// simply never been generated on that machine.
//
// So this keeps the URL and the loaded sector in step, both ways. Reading: when
// the URL names a sector that is not the one on screen, generate it — from the
// link's parameters alone, never from the reader's saved settings, since a seed
// applied to a different zone yields different worlds under the same name.
// Writing: whenever a sector is loaded, publish it into the URL, so that every
// page is shareable and not only the ones with a panel open. The sector names
// the page, not the panel, and outlives the panel being closed.

import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import {
    requestFor, sameSector, sectorParamsFromQuery, sectorQuery
} from '../utils/sectorLink';

export function useSectorLink() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    // The link speaks first. Publishing below would otherwise overwrite the very
    // parameters being read here — the watch runs at setup, the read only after
    // the router is ready — and the link would be answered with the sector it
    // was meant to replace.
    const linkAnswered = ref(false);

    onMounted(async () => {
        // main.ts mounts without awaiting the router, so on the very first paint
        // the initial URL has not been resolved yet and the query still reads
        // empty. Waiting here rather than assuming otherwise is the difference
        // between a link that works and one that silently does nothing.
        await router.isReady();

        const params = sectorParamsFromQuery(route.query);

        // Regenerate unless the sector on screen is already the one named. Seed
        // and zone are the whole test, because they are what decides the bodies:
        // a link differing only in how many systems to make, or how far apart to
        // place them, names the same worlds. A link naming a *different* seed or
        // zone names different worlds, and is worth the regeneration — leaving
        // the reader on the old one would answer the link with the wrong sky.
        const needed = params !== null
            && !sameSector(params, store.loadedParams)
            && !store.isLoading;

        // Fire and forget: the store owns the lifecycle, so the console shows
        // its ordinary generating state and its error state if this fails.
        if (needed) void store.generateSector(requestFor(params!));

        // A planet whose sector cannot be read goes now, before that sector is
        // published. Publishing first would make the URL self-consistent and the
        // key would then be honoured against whatever sector happened to be
        // loaded — the wrong-planet failure the naming exists to prevent.
        if (params === null && route.query.planet !== undefined) {
            const query = { ...route.query };
            delete query.planet;
            await router.replace({ query });
        }

        linkAnswered.value = true;
    });

    // Sector -> URL. Nothing to do while the two already agree, which is the
    // common case: a link that was just honoured, or a sector generated from
    // parameters the URL already carries. `replace`, so publishing the sector
    // never costs a press of the back button.
    watch(
        [() => store.loadedParams, linkAnswered],
        ([params]) => {
            if (!params || !linkAnswered.value) return;
            const inUrl = sectorParamsFromQuery(route.query);
            if (sameSector(inUrl, params)
                && inUrl!.systemCount === params.systemCount
                && inUrl!.sectorVolume === params.sectorVolume) return;

            void router.replace({ query: { ...route.query, ...sectorQuery(params) } });
        },
        { immediate: true }
    );
}
