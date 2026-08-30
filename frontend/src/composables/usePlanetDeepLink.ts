// D-32: the planet panel is deep-linked by the composite key
// `?planet=<starId>-<orbitalNumber>` on whatever route is current. Planets carry
// no id, but (starId, orbitalNumber) is unique by construction.
//
// The pair is unique only *within one sector*, so the link carries `?seed=` as
// well. Without it a link shared between two sectors still resolves — against a
// different planet — and opens the panel on the wrong world with no sign that
// anything is amiss. The seed is what makes the key mean one planet rather than
// one coordinate, so a key whose seed is absent or does not match the loaded
// sector is refused: showing nothing is right where showing the wrong planet is
// not.
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

    const seedValue = (): string | null => {
        const raw = route.query.seed;
        const value = Array.isArray(raw) ? raw[0] : raw;
        return typeof value === 'string' && value.length > 0 ? value : null;
    };

    /** The seed of the sector actually loaded, as it appears in a URL. */
    const loadedSeed = (): string | null =>
        store.loadedSeed === null ? null : String(store.loadedSeed);

    const writeParam = (key: string | null) => {
        const query = { ...route.query };
        if (key === null) {
            delete query.planet;
            delete query.seed;
        } else {
            query.planet = key;
            const seed = loadedSeed();
            if (seed !== null) query.seed = seed;
        }
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
        [paramValue, () => store.sectorData, () => store.loadedSeed],
        ([key]) => {
            if (key === null) return;

            if (!KEY_PATTERN.test(key)) {
                reject();
                return;
            }
            if (!store.sectorData) return;
            // The sector has landed, so its seed is known and the link's claim
            // about which sector it meant can finally be checked.
            if (seedValue() !== loadedSeed()) {
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
