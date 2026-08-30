// D-32: the planet panel is deep-linked by the composite key
// `?planet=<starId>-<orbitalNumber>` on whatever route is current. Planets carry
// no id, but (starId, orbitalNumber) is unique by construction.
//
// This keeps `store.selectedPlanetKey` and the query param in step in both
// directions, so a reload or a shared link opens straight to one planet and a
// row click makes the current URL shareable. Per spec §8 a value is honoured
// only when it matches /^\d+-\d+$/ **and** resolves to a planet in the current
// sector; anything else is ignored, the param stripped, and no panel opens.

import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSectorStore } from '../stores/sectorStore';

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
        if (key === null) delete query.planet;
        else query.planet = key;
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
        [paramValue, () => store.sectorData],
        ([key]) => {
            if (key === null) return;

            if (!KEY_PATTERN.test(key)) {
                reject();
                return;
            }
            if (!store.sectorData) return;
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
