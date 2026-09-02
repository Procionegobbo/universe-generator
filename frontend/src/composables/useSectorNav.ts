// Where an internal link points.
//
// Vue Router drops whatever a `router.push('/path')` does not name, which is why
// the sector used to fall out of the URL on every OPEN SYSTEM: the link named a
// system and nothing else. With the sector in the first path segment the fix is
// to build the path here, once, so a sector-less internal link is not something
// a call site can write by accident.
//
// The sid comes from the path, which is the source of truth: during a
// link-driven regeneration the loaded sector is still the previous one, and
// links built from it would point out of the sector the user is looking at. The
// `loadedParams` fallback exists only for the routes that carry no sid — "/"
// between a generation landing and the publish replace, and the two
// documentation pages.

import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { decodeSid, encodeSid } from '../utils/sectorLink';

export function useSectorNav() {
    const route = useRoute();
    const store = useSectorStore();

    const sid = computed<string | null>(() => {
        const fromPath = typeof route.params.sid === 'string' ? route.params.sid : '';
        if (fromPath && decodeSid(fromPath) !== null) return fromPath;
        return store.loadedParams ? encodeSid(store.loadedParams) : null;
    });

    const homeTo = computed(() => (sid.value ? `/${sid.value}` : '/'));

    /**
     * A system link with no sector to name would be a link to a route that no
     * longer exists, so it degrades to the sector home. Unreachable in practice:
     * system links are only rendered when a sector is loaded.
     */
    const systemTo = (id: number | string) =>
        sid.value ? `/${sid.value}/system/${id}` : '/';

    return { sid, homeTo, systemTo };
}
