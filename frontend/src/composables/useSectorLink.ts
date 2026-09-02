// A shared link has to build its own sector.
//
// Sectors are never stored — only the parameters that make one, and generation
// is deterministic — so someone opening a link arrives with nothing in memory.
// Before this, `/system/52?planet=87-3` answered "System not found in the
// current sector", which is true and useless: the sector the link names had
// simply never been generated on that machine.
//
// The sector now lives in the first path segment, which makes the URL the one
// source of truth and reduces this to two narrow rules:
//
//   URL -> sector   when the path names a sector that is not the one on screen,
//                   generate it — from the link's parameters alone, never from
//                   the reader's saved settings, since a seed applied to a
//                   different zone yields different worlds under the same name.
//   sector -> URL   when the loaded sector changes, make the path name it. Only
//                   two things reach that rule: the first generation from "/",
//                   and a regeneration with new parameters while a sid route is
//                   on screen. Every other way a sector is loaded is a response
//                   to a URL that already names it.
//
// An address that cannot be read — a malformed sid, or a shape that matches no
// route at all — is answered with "/" rather than a blank page, plus a notice
// saying so, since landing somewhere else in silence is its own failure.

import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { decodeSid, encodeSid, requestFor, sameSid } from '../utils/sectorLink';

export function useSectorLink() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    /** URL -> sector. Run for the URL the app opens on and for every navigation. */
    const answerTheUrl = async () => {
        // An address that matched nothing gets the same fail-soft treatment as a
        // sid that cannot be read: one path, never an empty view.
        if (route.name === 'not-found') {
            await router.replace({ path: '/' });
            store.raiseLinkNotice('sid', '/');
            return;
        }

        const raw = typeof route.params.sid === 'string' ? route.params.sid : '';

        // "/" names no sector, and a planet key without one means nothing.
        if (raw === '') {
            if (route.query.planet !== undefined) {
                const query = { ...route.query };
                delete query.planet;
                await router.replace({ path: route.path, query });
            }
            return;
        }

        const params = decodeSid(raw);
        if (params === null) {
            // Fail soft. Never a blank page, never the wrong sector.
            await router.replace({ path: '/' });
            store.raiseLinkNotice('sid', '/');
            return;
        }

        // All four fields, not seed+zone: the sector on screen has to be the one
        // the URL names, or every coordinate read out of that URL is checked
        // against the wrong sky. `isLoading` keeps a navigation arriving
        // mid-generation from starting a second one; a failed generation is not
        // retried, since the URL that asked for it is unchanged.
        if (!sameSid(params, store.loadedParams) && !store.isLoading) {
            void store.generateSector(requestFor(params));
        }
    };

    onMounted(async () => {
        // main.ts mounts without awaiting the router, so on the very first paint
        // the initial URL has not been resolved yet. Waiting here rather than
        // assuming otherwise is the difference between a link that works and one
        // that silently does nothing.
        await router.isReady();
        await answerTheUrl();
    });

    watch(() => route.fullPath, () => { void answerTheUrl(); });

    /**
     * Sector -> URL. Not immediate, which is what lets the ordering flag this
     * composable used to need disappear: on a cold link-follow `loadedParams` is
     * null and never changed, so nothing is published over the parameters the
     * link is carrying; when the link-driven generation lands, the route's sid
     * already equals the new params and the guard below returns early.
     */
    watch(() => store.loadedParams, (params) => {
        if (!params) return;
        const sid = encodeSid(params);
        const current = typeof route.params.sid === 'string' ? route.params.sid : '';
        if (current === sid) return;

        // Keep whatever follows the sid: /oldSid/system/66 -> /newSid/system/66.
        const tail = current ? route.path.slice(1 + current.length) : '';
        // replace, so publishing the sector never costs a press of the back button.
        void router.replace({ path: `/${sid}${tail}`, query: route.query });
    });
}
