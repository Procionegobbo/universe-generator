// D-32: the planet panel is deep-linked by the composite key
// `?planet=<starId>-<orbitalNumber>` on whatever route is current. Planets carry
// no id, but (starId, orbitalNumber) is unique by construction.
//
// The pair is unique only *within one sector*, so the link names its sector too
// — in the path, as the sid the route carries; see `utils/sectorLink.ts` for
// which parameters that takes and why. Without it a link shared between two
// sectors still resolves — against a different planet — and opens the panel on
// the wrong world with no sign that anything is amiss. A key whose sector is
// unnamed, or is not the one loaded, opens nothing: showing nothing is right
// where showing the wrong planet is not.
//
// This keeps `store.selectedPlanetKey` and the query param in step in both
// directions, so a reload or a shared link opens straight to one planet and a
// row click makes the current URL shareable. Per spec §8 a value is honoured
// only when it matches /^\d+-\d+$/ **and** resolves to a planet in the current
// sector; anything else opens no panel here.
//
// It does not strip what it will not open, and raises no notices: removing a key
// from the URL and explaining why belong to `useCoordinateGuard`, which is
// mounted once and can see the system the key claims to sit in. Two writers over
// one query param is the failure that split buys off.

import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { decodeSid, sameSid } from '../utils/sectorLink';

const KEY_PATTERN = /^\d+-\d+$/;

export function usePlanetDeepLink() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    const paramValue = (): string | null => {
        const raw = route.query.planet;
        const value = Array.isArray(raw) ? raw[0] : raw;
        return typeof value === 'string' && value.length > 0 ? value : null;
    };

    const writeParam = (key: string | null) => {
        const query = { ...route.query };
        // Closing takes only the planet away: the sector belongs to the page,
        // not to the panel, and is what keeps the page reloadable.
        if (key === null) delete query.planet;
        else query.planet = key;

        // Nothing but the planet is written. The sector is in the path now, so a
        // write that names only the planet cannot drop it — which is what used
        // to force this to republish the sector into the query on every open and
        // close, and what would otherwise resurrect the old link format here.
        //
        // replace, not push: the panel is a view of the current page, so closing
        // it must not need two presses of the browser's back button.
        router.replace({ query });
    };

    const resolves = (key: string): boolean => {
        const sector = store.sectorData;
        if (!sector) return false;
        const [starId, orbitalNumber] = key.split('-').map(Number);
        return sector.planets.some(
            planet => planet.starId === starId && planet.orbitalNumber === orbitalNumber
        );
    };

    // URL -> store. This only ever opens and closes the panel: a value that
    // cannot be honoured is the coordinate guard's to strip and to explain, and
    // splitting it that way is what keeps two writers from fighting over
    // `?planet`. A well-formed key is held while the sector is still absent,
    // because the sector only lands after the user generates or restores it.
    watch(
        [paramValue, () => store.sectorData, () => store.loadedParams],
        ([key]) => {
            // The key went away — the user closed the panel, or the guard took
            // an unresolvable one out of the URL. Either way the panel follows.
            if (key === null) {
                if (store.selectedPlanetKey !== null) store.selectPlanet(null);
                return;
            }

            if (!KEY_PATTERN.test(key)) return;  // the guard strips it
            if (!store.sectorData) return;
            // Named a sector that is not the one loaded: hold, do not refuse.
            // useSectorLink answers such a URL by building the sector it names,
            // and the key becomes checkable when that lands. Refusing here threw
            // the planet away in the gap, so a link followed from inside another
            // sector arrived with its planet already stripped.
            //
            // Holding is safe in every direction: if the rebuild fails, or the
            // URL names no readable sector at all, the key simply never opens
            // anything — and an unreadable one is dropped by useSectorLink
            // before it can be adopted by whatever is loaded.
            if (!sameSid(decodeSid(route.params.sid), store.loadedParams)) return;
            if (!resolves(key)) return;          // the guard strips it
            if (store.selectedPlanetKey !== key) store.selectPlanet(key);
        },
        { immediate: true }
    );

    // store -> URL. Writing the value the read side just consumed is a no-op
    // there, so the two watchers cannot loop.
    watch(
        () => store.selectedPlanetKey,
        (key) => {
            if (paramValue() !== key) writeParam(key);
        }
    );
}
