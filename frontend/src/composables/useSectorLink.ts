// A shared link has to build its own sector.
//
// Sectors are never stored — only the parameters that make one, and generation
// is deterministic — so someone opening a link arrives with nothing in memory.
// Before this, `/system/52?planet=87-3&...` answered "System not found in the
// current sector", which is true and useless: the sector the link names had
// simply never been generated on that machine.
//
// So this keeps the URL and the loaded sector in step, both ways. Reading: when
// the URL names a sector and none is loaded, generate it — from the link's
// parameters alone, never from the reader's saved settings, since a seed applied
// to a different zone yields different worlds under the same name. Writing:
// whenever a sector is loaded, publish it into the URL, so that every page is
// shareable and not only the ones with a panel open. The sector names the page,
// not the panel, and outlives the panel being closed.

import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import {
    requestFor, sameSector, sectorParamsFromQuery, sectorQuery
} from '../utils/sectorLink';

export function useSectorLink() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    onMounted(async () => {
        // main.ts mounts without awaiting the router, so on the very first paint
        // the initial URL has not been resolved yet and the query still reads
        // empty. Waiting here rather than assuming otherwise is the difference
        // between a link that works and one that silently does nothing.
        await router.isReady();

        // Only ever fills a vacuum. A sector already in memory is the reader's
        // own — the result of their parameters, possibly mid-inspection — and a
        // link arriving later must not replace it. This also keeps the reload of
        // a link generated in-session from regenerating what is already there.
        if (store.sectorData || store.isLoading) return;

        const params = sectorParamsFromQuery(route.query);
        if (!params) return;

        // Fire and forget: the store owns the lifecycle, so the console shows
        // its ordinary generating state and its error state if this fails.
        void store.generateSector(requestFor(params));
    });

    // Sector -> URL. Nothing to do while the two already agree, which is the
    // common case: a link that was just honoured, or a sector generated from
    // parameters the URL already carries. `replace`, so publishing the sector
    // never costs a press of the back button.
    watch(
        () => store.loadedParams,
        (params) => {
            if (!params) return;
            const inUrl = sectorParamsFromQuery(route.query);
            if (sameSector(inUrl, params)
                && inUrl!.systemCount === params.systemCount
                && inUrl!.sectorVolume === params.sectorVolume) return;

            void router.replace({ query: { ...route.query, ...sectorQuery(params) } });
        },
        { immediate: true }
    );
}
