// The coordinates a link names are checked against the sector it names, once,
// and only once that sector is the one on screen.
//
// Decision 4's table, gated by Decision 5's timing. Three outcomes, and which
// one applies is decided by how much of the address survives the check:
//
//   C  the system does not exist            -> open the sector, say so
//   A  the planet does not exist            -> stay, drop ?planet, say so
//   B  both exist but disagree              -> open the sector, say so
//
// B is the one worth arguing. A star that exists in a system the URL does not
// name is proof the address is corrupt, and the surviving half is no more
// trustworthy than the half that failed: resolving to either would be a guess
// dressed up as an answer.
//
// Why this is its own composable rather than more of usePlanetDeepLink: the
// table needs the sid, the system id and the planet key together, and
// usePlanetDeepLink is mounted per view, knows nothing about which system a star
// belongs to, and is never mounted at all on the sector home. This is mounted
// once, in App.vue, beside useSectorLink.
//
// The split that keeps the two from fighting over `?planet`: this is the only
// writer that removes the key or navigates away, and the only raiser of notices;
// usePlanetDeepLink only opens and closes the panel from a key that is present,
// well-formed and resolvable.
//
// `replace` throughout, never `push`: a bad URL that stays in the history is one
// the back button walks straight back into.

import { computed, watch } from 'vue';
import { useRoute, useRouter, type LocationQuery } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { decodeSid, sameSid } from '../utils/sectorLink';

const KEY_PATTERN = /^\d+-\d+$/;

/** The current query without the planet key. Both stripping branches need it. */
const withoutPlanet = (query: LocationQuery): LocationQuery => {
    const rest = { ...query };
    delete rest.planet;
    return rest;
};

export function useCoordinateGuard() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    /**
     * Decision 5: never before the sector this sid names is the one loaded.
     * Checking a coordinate against a sector the URL does not name answers a
     * question nobody asked — and would report a perfectly good link as broken
     * for as long as its sector took to build.
     */
    const ready = computed(() => {
        const params = decodeSid(route.params.sid);
        return params !== null
            && store.sectorData !== null
            && store.generationStatus !== 'running'
            && sameSid(params, store.loadedParams);
    });

    const check = async () => {
        if (!ready.value) return;
        const sector = store.sectorData!;
        const sid = route.params.sid as string;

        const systemId = route.name === 'system-detail' ? Number(route.params.id) : null;
        const rawKey = typeof route.query.planet === 'string' ? route.query.planet : null;

        // Case C — the system does not exist. Nothing below it can be trusted.
        if (systemId !== null && !sector.systems.some(s => s.systemId === systemId)) {
            store.selectPlanet(null);
            await router.replace({ path: `/${sid}` });
            store.raiseLinkNotice('coordinates', `/${sid}`);
            return;
        }

        if (rawKey === null) return;

        // A malformed key is not a coordinate at all: strip it, say nothing.
        // There is no planet it could have named, so there is nothing to report.
        if (!KEY_PATTERN.test(rawKey)) {
            store.selectPlanet(null);
            await router.replace({ path: route.path, query: withoutPlanet(route.query) });
            return;
        }

        const [starId, orbitalNumber] = rawKey.split('-').map(Number);
        const planet = sector.planets.find(
            p => p.starId === starId && p.orbitalNumber === orbitalNumber);

        // Case A — absence. The planet is missing; the rest of the URL still holds.
        if (!planet) {
            store.selectPlanet(null);
            await router.replace({ path: route.path, query: withoutPlanet(route.query) });
            store.raiseLinkNotice('planet', route.path);
            return;
        }

        // Case B — contradiction.
        if (systemId !== null) {
            const star = sector.stars.find(s => s.starId === starId);
            if (!star || star.systemId !== systemId) {
                store.selectPlanet(null);
                await router.replace({ path: `/${sid}` });
                store.raiseLinkNotice('coordinates', `/${sid}`);
            }
        }
    };

    // `sectorData` is watched alongside `ready` rather than left to it: `ready`
    // is a boolean, and a sector replaced under the same sid leaves it true, so
    // watching it alone would keep an answer computed against a sky that is no
    // longer there.
    //
    // The notice is raised after its own replace has landed, so it records the
    // path it will be read on rather than the one it corrected.
    watch(
        [ready, () => store.sectorData, () => route.fullPath],
        () => { void check(); },
        { immediate: true }
    );
}
