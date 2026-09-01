# navigation-005-coordinate-guard

**Spec:** STORIES/SPECS/navigation.md

**As a** user following a link that names a system or planet
**I want** the app to validate those coordinates once — and only once — the sector the link
names has finished loading, and fail soft when they don't resolve
**So that** a stale or corrupted coordinate never shows the wrong body, and I'm never shown
"not found" while the sector is still being rebuilt

**Scope note.** This slice also deletes `usePlanetDeepLink.reject()`, which
`navigation-002` deliberately left in place: removing it earlier would have left an
unresolvable `?planet` sitting in the URL with nothing to clean it up, since this guard is
what replaces it.

## Acceptance Criteria

```gherkin
Feature: coordinate guard (Decision 4, gated by Decision 5)

  Scenario: Case A — planet absent, system holds
    Given the URL is "/sid/system/66?planet=87-999" and planet 87-999 does not exist
    When the guard evaluates
    Then the app stays on "/sid/system/66" with "?planet" removed, a "planet" notice is
     raised, and the panel is closed

  Scenario: Case B — contradiction (star/system disagree)
    Given the URL is "/sid/system/66?planet=87-3" and star 87 belongs to system 12
    When the guard evaluates
    Then the app lands on "/sid" and a "coordinates" notice is raised

  Scenario: Case C — system absent
    Given the URL is "/sid/system/999" and system 999 does not exist
    When the guard evaluates
    Then the app lands on "/sid" and a "coordinates" notice is raised

  Scenario: All three corrections use replace, not push
    Then for cases A, B and C, router.options.history.state.back is unchanged, and pressing
     back does not return to the bad URL

  Scenario: A fully valid link triggers nothing
    Given "/sid/system/66?planet=87-3" where system 66, star 87, and planet 87-3 all agree
    Then no navigation and no notice occur

  Scenario: Decision 5 — cold load holds during generation
    Given the app mounts on a link naming a sector that is not yet loaded
    When generation is still in flight
    Then the guard raises nothing and strips nothing until the sector lands, then decides
     once

  Scenario: Decision 5 — a generation failure raises no coordinate notice
    Given generationStatus becomes 'error'
    Then no coordinate notice is raised — the store's own error surface owns that message

  Scenario: A malformed planet key is stripped silently
    When "?planet=not-a-key" is present
    Then the key is stripped and no notice is raised

  Scenario: A planet key on the sector home is stripped with a planet notice
    Given the URL is "/sid?planet=87-999" (no system in the path)
    Then the key is stripped, a "planet" notice is raised, and no system-membership check
     is attempted

  Scenario: SystemDetailView shows the waiting state while the sector rebuilds
    Given the sid in the URL does not yet match the loaded sector
    Then "data-system-waiting" renders ("Rebuilding the sector this link names…") and
     "data-system-missing" does not

  Scenario: SystemDetailView shows the error state on a generation failure
    Given generationStatus === 'error'
    Then "data-system-error" renders store.error, with a BACK TO SECTOR link to homeTo

  Scenario: SystemDetailView still supports the pre-existing missing-system tick
    Given the sector is loaded but the guard has not yet redirected away from a bad :id
    Then "data-system-missing" renders verbatim ("System not found in the current sector.")
     with its BACK TO SECTOR link, for the one tick before the guard's replace lands

  Scenario: All existing systemDetail cases still pass on sid-carrying URLs
    Then existing systemDetail cases are re-pointed at "/766207-m-100-1000/system/:id" and
     pass unchanged, including the ":id" change case, now expressed as a change of ":id"
     within one sid

  Scenario: reject() is finally deleted
    Then usePlanetDeepLink no longer has a reject() function — this guard is the only
     stripper of a malformed or unresolvable planet key, and the only raiser of "planet"/
     "coordinates" notices

  Scenario: The panel closes when the guard removes "?planet"
    Given a panel is open and the guard strips "?planet" (case A) or removes it entirely
     navigating to "/<sid>" (cases B/C)
    Then usePlanetDeepLink's URL→store watch observes the key becoming null and closes the
     panel
```

## Technical Notes

**A10. The guard is a new composable mounted once in `App.vue`.** Decision 4's table needs
`route.params.sid`, `route.params.id` **and** `route.query.planet` together.
`usePlanetDeepLink` is mounted in two places (`ResultsDisplay.vue:37`,
`SystemDetailView.vue:248`), never simultaneously, and knows nothing about system
membership. Rather than widen it, the guard becomes `composables/useCoordinateGuard.ts`,
mounted once beside `useSectorLink()` in `App.vue`.

Responsibility split (established by `navigation-002`'s partial narrowing, completed here):
the guard is the only writer that *removes* `planet` or navigates away, and the only
raiser of `planet`/`coordinates` notices; `usePlanetDeepLink` only opens/closes the panel
from a key that is present, well-formed and resolvable.

**Why the guard cannot run early (Decision 5).** `useCoordinateGuard` evaluates only when
**all** of these hold:

- the route names a sid and it decodes;
- `store.sectorData` is non-null and
  `sameSid(decodeSid(route.params.sid), store.loadedParams)` — i.e. the sector on screen
  *is* the one the URL names;
- `store.generationStatus !== 'running'`.

If generation fails, `generationStatus === 'error'` and the guard stays silent: the store's
own error surface owns that message.

**New file — `frontend/src/composables/useCoordinateGuard.ts`.** `replace`, never `push`,
so the bad URL does not stay in the history and "back" cannot re-trigger the error in a
loop. Note the module-level `withoutPlanet` helper below — both stripping branches share
it, and it is the fix (made at the spec level) for what an earlier draft's listing called
`without(...)`, a helper that did not exist anywhere in the codebase.

```ts
const KEY_PATTERN = /^\d+-\d+$/;

// LocationQuery is a type-only import from vue-router, alongside the
// useRoute/useRouter this composable already needs.
/** The current query without the planet key. The same spread-and-delete
 *  `useSectorLink` uses on its own branch, named here because both stripping
 *  branches below need it. */
const withoutPlanet = (query: LocationQuery): LocationQuery => {
    const rest = { ...query };
    delete rest.planet;
    return rest;
};

export function useCoordinateGuard() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    /** Decision 5: never before the sector this sid names is the one loaded. */
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
        if (systemId !== null
            && !sector.systems.some(s => s.systemId === systemId)) {
            store.selectPlanet(null);
            await router.replace({ path: `/${sid}` });
            store.raiseLinkNotice('coordinates', `/${sid}`);
            return;
        }

        if (rawKey === null) return;

        // A malformed key is not a coordinate at all: strip it, say nothing.
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

        // Case B — contradiction. The pair exists but disagrees, which is proof the
        // URL is corrupt; the surviving half is not more trustworthy for resolving.
        if (systemId !== null) {
            const star = sector.stars.find(s => s.starId === starId);
            if (!star || star.systemId !== systemId) {
                store.selectPlanet(null);
                await router.replace({ path: `/${sid}` });
                store.raiseLinkNotice('coordinates', `/${sid}`);
            }
        }
    };

    watch([ready, () => route.fullPath], () => { void check(); }, { immediate: true });
}
```

Notes on the guard:

- It raises the notice **after** `await router.replace(...)`, recording the path the notice
  will be read on. That is what stops the corrective navigation from clearing the notice it
  just caused.
- The malformed-key branch raises no notice: `?planet=not-a-key` names no coordinate that
  could have existed; today's behaviour is a silent strip. Preserved.
- A generation failure never reaches `check()` (`ready` is false, `sectorData` is null or
  `loadedParams` does not match), so the generation error keeps its own message.

**`App.vue` change:** mount `useCoordinateGuard()` beside `useSectorLink()`.

**Validation rules — `:id` (system):** `Number(route.params.id)`; must match a `systemId`
in the loaded sector. Non-numeric or absent → Decision 4 case C.

**Validation rules — `?planet` (planet key):**

| Rule | On violation |
|---|---|
| matches `/^\d+-\d+$/` | strip the param, no notice |
| resolves to a planet in the loaded sector | Decision 4 case A |
| on a `system-detail` route, `star(starId).systemId === Number(route.params.id)` | Decision 4 case B |
| repeated param | first value wins (existing `paramValue` behaviour) |

All three are evaluated only when the guard is `ready` (Decision 5).

**`frontend/src/composables/usePlanetDeepLink.ts` — finish the narrowing started in
`navigation-002`.** `navigation-002` already switched the hold condition's sector test to
`sameSid(...)` and removed the `sectorQuery` merge from `writeParam`. This slice finishes
the job now that the guard exists to take over:

- `reject()` is deleted.
- The URL→store watch gains: when the param disappears (`key === null`) and a panel is
  open, close it. Today (through `navigation-002`) it returns early on `key === null`,
  because the only writer of `null` was `reject()`/the user; now this guard can remove the
  param too, and the panel must follow.

```ts
watch(
    [paramValue, () => store.sectorData, () => store.loadedParams],
    ([key]) => {
        if (key === null) {
            if (store.selectedPlanetKey !== null) store.selectPlanet(null);
            return;
        }
        if (!KEY_PATTERN.test(key)) return;              // the guard strips it
        if (!store.sectorData) return;                   // hold
        if (!sameSid(decodeSid(route.params.sid), store.loadedParams)) return;  // hold
        if (!resolves(key)) return;                      // the guard strips it
        if (store.selectedPlanetKey !== key) store.selectPlanet(key);
    },
    { immediate: true }
);
```

**`SystemDetailView` states.** The single `v-else` block at `SystemDetailView.vue:212-215`
becomes three, in this order (Decision 5 forces the split — "System not found" must not
show while the sector the link names is still being built). Reuses the `homeTo` binding
`navigation-003` already destructured in this file (`const { homeTo } = useSectorNav()`) —
no `.value` in the template, since it is the destructured binding, not a property access:

```
v-if="row && system"                    → the system (unchanged)
v-else-if="isBuilding"                  → data-system-waiting
        "Rebuilding the sector this link names…"
v-else-if="store.generationStatus === 'error'"  → data-system-error
        store.error, plus <RouterLink :to="homeTo">BACK TO SECTOR</RouterLink>
v-else                                  → data-system-missing (kept, verbatim text)
        "System not found in the current sector." + BACK TO SECTOR
```

with

```ts
const isBuilding = computed(() =>
    store.generationStatus === 'running'
    || (decodeSid(route.params.sid) !== null
        && !sameSid(decodeSid(route.params.sid), store.loadedParams)));
```

`data-system-missing` is retained rather than deleted: it is the one-tick state between the
guard deciding and the `replace` landing, and keeping the hook lets the existing assertions
in `systemDetail.dom.test.ts` continue to describe something real.

## Tests

`frontend/src/composables/coordinateGuard.dom.test.ts` (new) — Decision 4 and 5:

53. Case A: `/sid/system/66?planet=87-999` — stays on `/sid/system/66`, `?planet` gone,
    notice kind `planet`, panel closed.
54. Case B: `/sid/system/66?planet=87-3` where star 87 belongs to system 12 — lands on
    `/sid`, notice kind `coordinates`.
55. Case C: `/sid/system/999` — lands on `/sid`, notice kind `coordinates`.
56. All three use `replace`: `router.options.history.state.back` is unchanged, and pressing
    back does not return to the bad URL.
57. A valid `/sid/system/66?planet=87-3` triggers no navigation and no notice.
58. Decision 5 — cold load: mounted at a link for a sector that is not loaded, the guard
    raises nothing and strips nothing **while the generation is in flight**, then decides
    once it lands.
59. Decision 5 — a generation failure produces `generationStatus === 'error'` and **no**
    coordinate notice.
60. `?planet=not-a-key` is stripped with **no** notice.
61. A planet key on the home route (`/sid?planet=87-999`) is stripped with a `planet`
    notice; no system membership check is attempted.

`frontend/src/components/systemDetail.dom.test.ts` (rewritten):

70. All existing cases re-pointed at `/766207-m-100-1000/system/:id` and passing unchanged.
71. The `:id` change case (:643) becomes a change of `:id` **within one sid**, and still
    re-renders.
72. New: while the named sector is being built, `data-system-waiting` renders and
    `data-system-missing` does not.
73. New: on a generation failure, `data-system-error` renders `store.error`.

`frontend/src/components/planetPanel.dom.test.ts` — cases retired by this slice's
`reject()` deletion. These were left passing (unmodified, still exercising `reject()`)
through `navigation-002` and `navigation-003`; this slice is where `reject()` actually
disappears, so these cases are handled now, not before:

- `ignores the invalid value %s, strips the param and opens no panel`
- `refuses a key that names no seed at all, rather than guessing`
- `rejects a malformed key on a cold load without waiting for a sector`

These are **deleted** (their subject, active rejection by `usePlanetDeepLink`, is gone —
leaving them in place would fail immediately once `reject()` no longer exists), with a
one-line comment at the deletion site noting that this slice's own
`coordinateGuard.dom.test.ts` (tests 53, 60) now covers the equivalent stripping behaviour,
owned by the guard instead.

Success criteria pinned by this slice:

- SC5: `/766207-m-100-1000/system/66?planet=87-3` opened in an empty tab generates the
  sector, renders system 66, and opens the panel on planet 87-3.
- SC11: Decision 4's table holds exactly: A stays on the system without `?planet`; B and C
  land on `/<sid>`; all three use `replace`.
- SC12: no coordinate notice is ever raised while `generationStatus === 'running'`, nor
  when it is `'error'`.

**Priority:** High
**Dependencies:** navigation-003-internal-links-carry-sector, navigation-004-link-notice-strip
