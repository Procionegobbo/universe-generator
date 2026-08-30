// D-32: the planet panel is deep-linked by the composite key
// `?planet=<starId>-<orbitalNumber>` on whatever route is current. Planets carry
// no id, but (starId, orbitalNumber) is unique by construction.
//
// The pair is unique only *within one sector*, so the link names its sector too
// — see `utils/sectorLink.ts` for which parameters that takes and why. Without
// them a link shared between two sectors still resolves — against a different
// planet — and opens the panel on the wrong world with no sign that anything is
// amiss. A key whose sector is unnamed, or is not the one loaded, is refused:
// showing nothing is right where showing the wrong planet is not.
//
// This keeps `store.selectedPlanetKey` and the query param in step in both
// directions, so a reload or a shared link opens straight to one planet and a
// row click makes the current URL shareable. Per spec §8 a value is honoured
// only when it matches /^\d+-\d+$/ **and** resolves to a planet in the current
// sector; anything else is ignored, the param stripped, and no panel opens.

import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';
import { sameSector, sectorParamsFromQuery, sectorQuery } from '../utils/sectorLink';

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

        // Every write republishes the loaded sector, whether opening, closing or
        // refusing. Both this and useSectorLink write through `router.replace`
        // off their own snapshot of the query, so a write that named only the
        // planet would drop the sector a moment after it was added — and one
        // that refused a mismatched link would leave the URL still advertising
        // the sector that is not on screen.
        if (store.loadedParams) Object.assign(query, sectorQuery(store.loadedParams));
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

    /**
     * A value that cannot be honoured leaves nothing behind: the panel closes if
     * it was open — a sector regenerated under it makes its key stale — and the
     * param goes, so the URL never advertises a planet that is not there.
     */
    const reject = () => {
        if (store.selectedPlanetKey !== null) store.selectPlanet(null);
        writeParam(null);
    };

    // URL -> store. A syntactically invalid value is rejected at once; a
    // well-formed one is held while the sector is still absent, because the
    // sector only lands after the user generates or restores it, and is then
    // either opened or rejected.
    watch(
        [paramValue, () => store.sectorData, () => store.loadedParams],
        ([key]) => {
            if (key === null) return;

            if (!KEY_PATTERN.test(key)) {
                reject();
                return;
            }
            if (!store.sectorData) return;
            // The sector has landed, so what it is made of is known and the
            // link's claim about which sector it meant can finally be checked.
            if (!sameSector(sectorParamsFromQuery(route.query), store.loadedParams)) {
                reject();
                return;
            }
            if (!resolves(key)) {
                reject();
                return;
            }
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
