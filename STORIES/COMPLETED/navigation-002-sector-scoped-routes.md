# navigation-002-sector-scoped-routes

**Spec:** STORIES/SPECS/navigation.md

**As a** user opening or reloading an app URL
**I want** the route table and the URL↔sector sync keyed on a `sid` path segment instead of
a query string — with the planet-panel deep link answering "which sector does this URL
name?" from that same place
**So that** any address I open reproduces exactly the sector it names, unreadable addresses
fail soft instead of crashing to a blank page, the sector I generate is always reflected in
the URL, and opening/closing the planet panel never resurrects the old query format

**Scope note.** This slice is broader than "routes" alone: it also narrows
`usePlanetDeepLink.ts`'s *sector test* (not its full narrowing — `reject()` stays until
`navigation-005`) and deletes the three now-dead query-format exports from
`utils/sectorLink.ts`. See "Why this can't be split" in Technical Notes for why.

## Acceptance Criteria

```gherkin
Feature: sector-scoped routes

  Scenario: A sid route resolves
    When the router resolves "/766207-m-100-1000"
    Then it matches the "sector" route with params.sid = "766207-m-100-1000"

  Scenario: A sid + system route resolves
    When the router resolves "/766207-m-100-1000/system/66"
    Then it matches "system-detail" with params.sid and params.id both set

  Scenario: A trailing slash still resolves (A7)
    When the router resolves "/766207-m-100-1000/"
    Then it matches the "sector" route (no separate canonical redirect is needed)

  Scenario: Home resolves with no query redirect
    When the router resolves "/" with no query
    Then it matches "home"

  Scenario: An old query-string link is not read
    When the router resolves "/?seed=766207&zone=medium&systems=100&volume=1000"
    Then it matches "home" and does not redirect; the query is inert

  Scenario: The removed legacy route is gone
    When the router resolves "/system/66"
    Then it matches "not-found" — there is no "/system/:id" route

  Scenario: An old query-string link on the legacy path also fails
    When the router resolves "/system/66?seed=766207&zone=medium&systems=100&volume=1000"
    Then it matches "not-found"

  Scenario: An arbitrary unknown path fails soft
    When the router resolves "/a/b/c"
    Then it matches "not-found"

  Scenario: Static pages are never read as a sid
    When the router resolves "/documentation" or "/api-reference"
    Then each resolves to its own named route, never to "sector"

  Scenario: No legacy shim exists
    Then no route in the table has a "redirect" or a "beforeEnter" hook

  Scenario: Following a link generates the sector it names
    Given nothing is loaded
    When the app opens on "/766207-m-100-1000"
    Then it posts exactly the four decoded parameters and records the result in loadedParams

  Scenario: The already-loaded sector is left alone
    Given "766207-m-100-1000" is already loaded
    When the app opens on "/766207-m-100-1000"
    Then no generation is started

  Scenario Outline: Regeneration is keyed on the whole sid (Decision 1-bis)
    Given a sector is loaded whose sid differs from the URL's sid only by "<field>"
    When the URL is answered
    Then the sector is regenerated

    Examples:
      | field         |
      | systemCount   |
      | sectorVolume  |
      | seed          |
      | zone          |

  Scenario: No double generation
    Given a generation is already running
    When the URL is answered again
    Then a second generation is not started

  Scenario: "/" generates nothing
    When the app opens on "/"
    Then no generation is started

  Scenario: A malformed sid fails soft
    When the app opens on "/not-a-sector"
    Then the router replaces the URL with "/" and no generation is started

  Scenario: An unmatched address fails soft the same way (A15)
    When the app opens on "/system/66" or "/a/b/c"
    Then the router replaces the URL with "/" and no generation is started,
     and HomeView renders rather than an empty <router-view>

  Scenario: A generation failure is not this composable's concern
    Given the named sid decodes and generation is started
    When generation fails
    Then store.error / generationStatus === 'error' reflect it (the store's own error
     surface, not this slice's redirect path)

  Scenario: A stray planet query on "/" is stripped
    When the app opens on "/?planet=1-1"
    Then "planet" is stripped from the query and no generation is started

  Scenario: First generation from "/" publishes the sid
    Given nothing is loaded and the user generates a sector from "/"
    When generation completes
    Then the router replaces the URL with "/<sid>"

  Scenario: Regeneration with new parameters keeps the tail
    Given the URL is "/oldSid/system/66"
    When the user changes systemCount and generates, landing on a new sid
    Then the URL becomes "/newSid/system/66" (tail preserved)

  Scenario: Answering a link publishes nothing
    Given the sid in the URL already names the loaded sector
    When the URL is answered
    Then no router.replace is called (no publish loop)

  Scenario: A short sid canonicalises itself (A8)
    When the app opens on "/766207"
    Then after generation the URL becomes "/766207-m-100-1000"

  Scenario: Nothing is published while no sector is loaded
    Then no replace occurs before loadedParams is ever set

  Scenario: Mid-session navigation to another sector regenerates
    Given the app is on one sid
    When the user navigates to a different sid
    Then the sector is regenerated

  Scenario: Mid-session navigation within the same sid does not regenerate
    Given the app is on one sid
    When the user navigates to "<sid>/system/66" for the same sid
    Then no regeneration occurs

  Scenario: RESET clears the sector identity too (A13)
    Given a sector is loaded on a sid route
    When the user presses RESET
    Then sectorData and loadedParams are both cleared and the app navigates to "/"

  Scenario: An empty or negative seed is normalised before use (A2)
    Given the seed field would produce a value normaliseSeed() rejects (e.g. "-5" or empty)
    When buildRequest() runs
    Then the seed is replaced with a fresh Math.floor(Math.random() * 1000000), exactly as
     an empty seed is replaced today

  Scenario: usePlanetDeepLink now asks the same question useSectorLink does
    Given a "?planet=" key present on a sid-carrying URL
    When the hold condition is evaluated
    Then it uses sameSid(decodeSid(route.params.sid), store.loadedParams) — not the old
     query-based sameSector(sectorParamsFromQuery(...), ...), which would return false for
     every sid URL and hold the key forever

  Scenario: Opening/closing the planet panel no longer writes sector query params
    When the user opens or closes the planet panel
    Then writeParam merges no sector query into the URL — the old
     Object.assign(query, sectorQuery(store.loadedParams)) is gone, so the panel cannot
     resurrect ?seed=&zone=&systems=&volume=

  Scenario: reject() still exists at the end of this slice
    Then usePlanetDeepLink.reject() is not deleted here — it is deleted in navigation-005,
     once useCoordinateGuard exists to take over stripping and notices

  Scenario: No dead query-format export survives (Success Criterion 10b)
    Then a repo grep over frontend/src for sectorParamsFromQuery, sectorQuery, sameSector
     and the literal ?seed= returns no hits outside test fixtures
```

## Technical Notes

**Why this can't be split from `usePlanetDeepLink`'s sector test.** `useSectorLink` and
`usePlanetDeepLink` both answer the question *"which sector does this URL name?"*, and they
must answer it from the same place. Leaving `usePlanetDeepLink` query-based while
`useSectorLink` goes path-based breaks it in **both** directions:

- **Read** (`usePlanetDeepLink.ts:98`): `sameSector(sectorParamsFromQuery(route.query),
  loadedParams)` returns `false` for every sid URL, because a sid URL carries no sector
  query — so the key is held forever and the panel never opens.
- **Write** (`usePlanetDeepLink.ts:49`): `Object.assign(query, sectorQuery(store.loadedParams))`
  re-adds `?seed=&zone=&systems=&volume=` to the URL on every panel open and close,
  resurrecting the exact format this spec deletes.

The write side is the more serious of the two: it is a **live product defect**, not merely
a red test suite. Both are fixed by doing this narrowing in this same slice, not a later
one. **This coupling is a residual risk to flag, not merely a fact to note once**: it is
invisible from either file alone — it lives in the fact that both read the sector from the
URL — and a future re-slicing that separates `useSectorLink` from this part of
`usePlanetDeepLink` would reintroduce a live defect, not merely a red suite. Do not split
them in a future refactor without re-deriving this analysis.

What moves into this slice, precisely: the *sector test* of `usePlanetDeepLink`'s hold
condition (`sameSid(decodeSid(route.params.sid), store.loadedParams)`), the removal of the
`sectorQuery(...)` merge from `writeParam`, and — because both of those functions are now
dead — the deletion of `sectorQuery`, `sameSector`, and `sectorParamsFromQuery` from
`utils/sectorLink.ts` (with their now-dead `one()` helper, `ZONES` array, and the
`LocationQuery` import), plus migrating `planetPanel.dom.test.ts` off the old
`SECTOR_Q`-based query fixtures. **`reject()` stays untouched in this slice** — it is not
deleted until `navigation-005`, because removing it before `useCoordinateGuard` exists
would leave an unresolvable `?planet` sitting in the URL with nothing to clean it up.

**Routing** — `frontend/src/router/index.ts` (modified). Static paths declared before
`/:sid` for readability; Vue Router's ranking already prefers a static segment over a
dynamic one.

```ts
const routes = [
    { path: '/documentation', name: 'documentation', component: DocumentationView },
    { path: '/api-reference', name: 'api-reference', component: ApiReferenceView },

    { path: '/', name: 'home', component: HomeView },
    { path: '/:sid', name: 'sector', component: HomeView },
    { path: '/:sid/system/:id', name: 'system-detail', component: SystemDetailView },

    // Anything else — /system/2, /a/b/c. Handled by useSectorLink exactly as a
    // malformed sid is, so an unreadable path never renders an empty view (A15).
    { path: '/:pathMatch(.*)*', name: 'not-found', component: HomeView }
];
```

| Path | Name | Component | Meaning |
|---|---|---|---|
| `/` | `home` | `HomeView` | No sector named — the empty state |
| `/:sid` | `sector` | `HomeView` | The console for the sector `sid` names |
| `/:sid/system/:id` | `system-detail` | `SystemDetailView` | One system inside that sector |
| `/documentation` | `documentation` | `DocumentationView` | Unchanged |
| `/api-reference` | `api-reference` | `ApiReferenceView` | Unchanged |
| anything else | `not-found` | `HomeView` | Replaced with `/` (A15) |

`App.vue`'s `LEGACY_ROUTES = ['documentation', 'api-reference']` check keys off
`route.name` and is unaffected by the new names.

**No backward compatibility (by decision).** No legacy redirect route, no transition
route, no code anywhere reads the old `?seed=&zone=&systems=&volume=` query keys.

| Old link | Now resolves to | Why |
|---|---|---|
| `/system/66?seed=…&zone=…&systems=…&volume=…` | `not-found` → `replace('/')` | no `/system/:id` route exists any more |
| `/?seed=…&zone=…&systems=…&volume=…` | `home`, the empty state; query ignored | `/` is a real route, its query is inert |

**A6.** `/` stays a real route; `/:sid` is not a redirect target for it. `/` renders
`HomeView` exactly as `/:sid` does; the only difference is that it names no sector. A
`?planet=` on `/` is stripped unconditionally, preserving today's behaviour — a stray
planet key on the true empty state names nothing. This does not race
`usePlanetDeepLink`: once this slice's narrowing lands, any URL where a sector is actually
loaded carries a sid (`/<sid>?planet=…`), which never reaches this branch — `raw === ''`
only matches `/` and `/documentation`/`/api-reference`-shaped paths, none of which name a
loaded sector.

**A7.** Canonical path has no trailing slash. `vercel.json` sets `"trailingSlash": false`,
and Vue Router's default non-strict matching treats `/x/` and `/x` as the same route. The
canonical form this spec emits is `/<sid>` (no trailing slash); `/<sid>/` continues to
resolve. No code change needed for this — it falls out of Vue Router defaults.

**A8.** A short sid canonicalises itself. `/766207` decodes to
`{seed: '766207', zone: 'medium', systemCount: 100, sectorVolume: 1000}`. Generation then
sets `loadedParams`; the publish rule sees route sid ≠ `encodeSid(loadedParams)` and
replaces the URL with the full `/766207-m-100-1000`.

**A12.** No hosting or server change is required. `vercel.json` already rewrites
`"/(.*)"` to `"/"` behind the `/api` rewrite, and `backend/src/index.ts:23-30` serves
`index.html` for any non-`/api` path. `utils/deployRouting.test.ts` is pinned and needs no
change.

**A13.** `HomeView.handleReset()` currently nulls `sectorData` but leaves `loadedParams`
set. With the sid in the path that would leave the URL naming a sector not on screen, and a
reload would regenerate it — undoing the reset. Reset therefore also clears `loadedParams`
and navigates to `/`.

**A2.** `store.currentSeed` is typed `number | string`, and `type="number"` still lets a
user type `-5`, which cannot appear in a sid. `HomeView.buildRequest()` normalises: a seed
for which `normaliseSeed()` returns `null` is replaced by a fresh random one, exactly as an
empty seed already is today (`HomeView.vue:151-153`).

**Sequencing note — a deliberate departure from the spec's literal code listing.** The
spec's `useSectorLink.ts` implementation (Implementation Detail section) calls
`store.raiseLinkNotice(...)` in the malformed-sid and not-found branches. That store method
does not exist yet — it is added in `navigation-004` ("Store state; ... wire the
malformed-sid and not-found cases from slice 2 to it", i.e. slice 4 wires slice 2's
existing branches to the notice). To keep the tree buildable at every slice boundary, this
story implements the two branches below **without** the `store.raiseLinkNotice(...)` calls
— they still `router.replace({ path: '/' })` and generate nothing, which is everything this
slice's tests (32, 32b) assert. `navigation-004` adds the two `raiseLinkNotice` calls into
these same branches and extends tests 32/32b to also assert the notice. (This is the only
departure from the spec's literal listing in this slice — the `raw === ''` branch's
`planet`-stripping is implemented exactly as the spec writes it, unconditional; the earlier
review round's proposed guard on `!store.loadedParams` was based on a misdiagnosis and is
not carried forward — see "Why this can't be split" above for the actual fix.)

**`frontend/src/composables/useSectorLink.ts` (rewritten)** — implement as below, minus
the two `store.raiseLinkNotice(...)` calls per the sequencing note above:

```ts
export function useSectorLink() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    /** URL -> sector. Run for the URL the app opens on and for every navigation. */
    const answerTheUrl = async () => {
        // An address that matched nothing gets the same fail-soft treatment as a
        // sid that cannot be read: one path, never an empty view (A15).
        if (route.name === 'not-found') {
            await router.replace({ path: '/' });
            // navigation-004 adds: store.raiseLinkNotice('sid', '/');
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
            // Decision 1: fail soft. Never a blank page, never the wrong sector.
            await router.replace({ path: '/' });
            // navigation-004 adds: store.raiseLinkNotice('sid', '/');
            return;
        }

        // All four fields, not seed+zone: the coordinate guard's checks are only
        // sound against the sector the URL actually names (A3). isLoading keeps a
        // navigation arriving mid-generation from starting a second one; a failed
        // generation is not retried, since the URL that asked for it is unchanged.
        if (!sameSid(params, store.loadedParams) && !store.isLoading) {
            void store.generateSector(requestFor(params));
        }
    };

    onMounted(async () => {
        // main.ts mounts without awaiting the router, so the first paint sees an
        // unresolved URL.
        await router.isReady();
        await answerTheUrl();
    });

    watch(() => route.fullPath, () => { void answerTheUrl(); });

    /**
     * Sector -> URL, one direction and one rule: whenever the loaded sector
     * changes, make the path name it. Only two things reach here — the first
     * generation from "/", and a regeneration with new parameters while a sid
     * route is on screen. Not immediate, which is what lets the ordering flag
     * this composable used to need disappear (A5, `linkAnswered` is deleted).
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
```

`linkAnswered` is deleted (A5): the old write watch ran `{ immediate: true }` and would
otherwise publish the reader's own sector over the parameters a link is carrying. The new
publish watch is **not** immediate and fires only on a *change* of `loadedParams`. On a
cold link-follow `loadedParams` is `null` and never changed, so nothing is published; when
link-driven generation lands, the route sid already equals the new params and the guard
returns early. The race the flag guarded cannot occur.

**`frontend/src/composables/usePlanetDeepLink.ts` (partially narrowed — sector test only,
`reject()` untouched).** Change:

- The hold condition's sector test becomes
  `sameSid(decodeSid(route.params.sid), store.loadedParams)`, replacing
  `sameSector(sectorParamsFromQuery(route.query), loadedParams)`.
- `writeParam` no longer merges `sectorQuery(store.loadedParams)` into the query. The
  sector is in the path now, so a write that names only the planet cannot drop it.
- `reject()` is **not** touched in this slice — it stays exactly as it is (still rejecting
  an unresolvable key) until `navigation-005` deletes it once `useCoordinateGuard` exists
  to take over. Do not delete it here.
- The URL→store watch's shape does not otherwise change in this slice (the "close the
  panel when `planet` disappears" addition and `reject()`'s removal are `navigation-005`'s
  job — see that story for the final watch listing).

```ts
watch(
    [paramValue, () => store.sectorData, () => store.loadedParams],
    ([key]) => {
        if (key === null) return;                        // unchanged in this slice
        if (!KEY_PATTERN.test(key)) { reject(); return; } // reject() still exists here
        if (!store.sectorData) return;                    // hold
        if (!sameSid(decodeSid(route.params.sid), store.loadedParams)) return;  // hold — was sameSector(sectorParamsFromQuery(...), ...)
        if (!resolves(key)) { reject(); return; }          // reject() still exists here
        if (store.selectedPlanetKey !== key) store.selectPlanet(key);
    },
    { immediate: true }
);
```

**`frontend/src/utils/sectorLink.ts` — delete the three dead query-format exports**, now
that `usePlanetDeepLink.ts` (above) and `useSectorLink.ts` (this slice) are both migrated:

- Delete `sectorQuery`, `sameSector`, `sectorParamsFromQuery`.
- This strands the module-private `one()` helper and the `ZONES` array (`ZONES` was used
  only by `sectorParamsFromQuery`; `ZONE_CODE`'s keys replace it) — delete both.
- Drop the now-unused `LocationQuery` type import. After this the module has no
  `vue-router` dependency at all.
- Rewrite the module's header comment: the four-parameter rationale survives as the A3
  invariant; the `sameSector` split does not.
- Keep `SectorLinkParams` and `requestFor` byte-for-byte.

Verified callers before deletion (grep): `sectorQuery` and `sameSector` — only
`useSectorLink.ts` and `usePlanetDeepLink.ts` (both migrated above);
`sectorParamsFromQuery` — the same two files, plus its own unit tests (removed alongside).

**A3 invariant reminder** (why regeneration is keyed on the whole sid): `sameSector()`
compared seed and zone only, on the premise that `systemCount`/`sectorVolume` don't change
*what* a star or planet is — but they change *what exists*. Keying regeneration on the
whole sid via `sameSid` is what a later slice's coordinate guard depends on for
correctness.

**A14 (recorded risk, not an AC for this slice).** `store.generateSector` restores the
previous `sectorData`/`loadedParams` on abort. If the user follows a link to sector B from
sector A and cancels mid-generation, `loadedParams` changes back to A and the publish rule
rewrites the URL to `/sidA`. This is judged correct (the URL should name what is on
screen) and needs no code beyond what's already implemented above.

**Value objects** (unchanged from `navigation-001`): `SectorLinkParams`, `sid`.

## Tests

`frontend/src/router/router.test.ts` (new):

14. `/system/66` resolves to `not-found` — there is no `/system/:id` route.
15. `/system/66?seed=766207&zone=medium&systems=100&volume=1000` also resolves to
    `not-found`: the old query form is read by nothing.
16. `/a/b/c` resolves to `not-found`.
17. `/?seed=766207&zone=medium&systems=100&volume=1000` resolves to `home` and does **not**
    redirect; the query is inert.
18. No route in the table has a `redirect` or `beforeEnter` — pinned so a legacy shim
    cannot be reintroduced by accident.
19. `/` with no query resolves to `home`.
20. `/documentation` and `/api-reference` resolve to their own routes and are never read as
    a sid.
21. `/766207-m-100-1000` resolves to `sector` with `params.sid` set.
22. `/766207-m-100-1000/system/66` resolves to `system-detail` with both params set.
23. `/766207-m-100-1000/` (trailing slash) resolves to `sector` (A7).

`frontend/src/composables/sectorLink.dom.test.ts` (rewritten) — reading:

24. Builds the sector a sid names when nothing is loaded, and posts exactly the four
    decoded parameters.
25. Records the result in `loadedParams` so the guard can check against it.
26. Leaves the sector alone when the sid is the one already loaded.
27. Regenerates when the sid differs only by `systemCount` (Decision 1-bis / A3).
28. Regenerates when the sid differs only by `sectorVolume` (Decision 1-bis / A3).
29. Regenerates when the sid names another seed, and when it names another zone.
30. Does not start a second generation while one is running.
31. Generates nothing on `/`.
32. A malformed sid (`/not-a-sector`) replaces to `/` and generates nothing (the notice
    assertion for this case is added in `navigation-004`).
32b. An unmatched address (`/system/66`, `/a/b/c`) replaces to `/` and generates nothing,
    verified to render `HomeView` rather than an empty `<router-view>` (the notice
    assertion for this case is added in `navigation-004`).
33. A generation failure surfaces as `store.error` / `generationStatus === 'error'`.
34. `/?planet=1-1` strips `planet` and generates nothing.

Publishing:

35. Generating from `/` replaces the URL with `/<sid>` (the *Da non dimenticare* case).
36. Regenerating with a new `systemCount` while on `/oldSid` replaces the sid **and keeps
    the tail**: `/oldSid/system/66` becomes `/newSid/system/66`.
37. Answering a link publishes nothing — no `router.replace` is called when the sid
    already names the loaded sector (the A5 no-loop property).
38. A short sid `/766207` canonicalises to `/766207-m-100-1000` after generation (A8).
39. Nothing is published while no sector is loaded.

Mid-session:

40. Navigating to a link naming another sector regenerates.
41. Navigating within the same sid does not regenerate.

`frontend/src/components/planetPanel.dom.test.ts` (rewritten, the query-format migration):

74. All `SECTOR_Q` URLs become sid paths; the OPEN SYSTEM path assertion at :520 becomes
    `/766207-m-100-1000/system/1` (the link itself is fixed by `navigation-003`; this test
    file's fixtures move to sid paths here so the suite stays green in between).
75. The deep-link hold case (`mountCold`) keeps its meaning: the key is held, not rejected,
    while the sector is absent — now driven by `sameSid(decodeSid(route.params.sid),
    store.loadedParams)` rather than the old query-based test.
76. Opening and closing the panel writes and removes `?planet` **without touching the
    path** — the narrowed `writeParam` (no sector query is merged any more). This is the
    fix for the live "resurrects `?seed=&zone=&systems=&volume=`" defect described above.

`frontend/src/utils/sectorLink.test.ts` (deletions):

13. Remove, not rewrite: the whole `sectorParamsFromQuery` describe (7 cases), the
    `sectorQuery` round-trip case, and the whole `sameSector` describe. Their subjects no
    longer exist.

Regression coverage to keep green:

77. `frontend/src/utils/deployRouting.test.ts` — unchanged and still passing (A12).

Success criteria pinned by this slice:

- SC10b: a repo grep for `sectorParamsFromQuery`, `sectorQuery`, `sameSector`, `?seed=`
  returns no hits outside test fixtures (moved here from `navigation-003`, since the
  deletions themselves now happen in this slice).

**Priority:** Critical
**Dependencies:** navigation-001-sid-codec
