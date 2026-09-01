# navigation-003-internal-links-carry-sector

**Spec:** STORIES/SPECS/navigation.md

**As a** user browsing systems, stars, and planets within a generated sector
**I want** every internal link and programmatic navigation to carry the current sector's sid
**So that** pressing OPEN SYSTEM (or any other in-app link) never drops the sector, and the
resulting URL still works after a reload or when copy-pasted

This is **the slice that closes the reported bug** (`PlanetDetailPanel.vue:454` losing the
sector on OPEN SYSTEM). It is shippable on its own once `navigation-001` and
`navigation-002` are in — it does not require the notice strip (`navigation-004`) or the
coordinate guard (`navigation-005`).

**Scope note.** `usePlanetDeepLink`'s narrowing, the three dead-export deletions
(`sectorQuery`, `sameSector`, `sectorParamsFromQuery`), and the `planetPanel.dom.test.ts`
migration all happened in `navigation-002` — they could not be separated from
`useSectorLink`'s rewrite without leaving the tree broken (see that story's "Why this can't
be split" note). This slice is purely `useSectorNav` plus wiring every internal link site
through it.

## Acceptance Criteria

```gherkin
Feature: every internal link carries the sector

  Scenario: useSectorNav.systemTo builds a sid-carrying link
    Given the current route is "/766207-m-100-1000"
    When I call useSectorNav().systemTo(66)
    Then it returns "/766207-m-100-1000/system/66"

  Scenario: homeTo on a sid route
    Given the current route is "/766207-m-100-1000"
    Then useSectorNav().homeTo is "/766207-m-100-1000"

  Scenario: homeTo with nothing loaded
    Given no sector is loaded and the route carries no sid
    Then useSectorNav().homeTo is "/"

  Scenario: homeTo falls back to the loaded sector off a sid-less route
    Given the route is "/documentation" and a sector is loaded
    Then useSectorNav().homeTo falls back to the loaded sector's sid

  Scenario: OPEN SYSTEM carries the sector (the reported bug, fixed)
    Given a planet panel is open for a system in the loaded sector
    When the user presses OPEN SYSTEM
    Then the app navigates to "/<sid>/system/<id>"

  Scenario: The fixed URL survives a reload
    Given the URL from the previous scenario
    When that URL is opened in a fresh tab with an empty store
    Then the named system renders (not "System not found in the current sector")

  Scenario: SystemsTable links and clicks carry the sid
    Then SystemsTable's name RouterLink has href "/<sid>/system/<id>"
    And SystemsTable's row click navigates to "/<sid>/system/<id>"
    And a click that lands on the link itself does not double-navigate

  Scenario: StarTable links and clicks carry the sid
    Then StarTable's system RouterLink href, and its row click, both carry the sid

  Scenario: NotableSystems entries carry the sid
    Then NotableSystems' entries have sid-carrying hrefs

  Scenario: AppTopBar logo stays inside the sector
    When the user clicks the AppTopBar logo
    Then the app navigates to "/<sid>", not to "/"

  Scenario: SystemDetailView's own links carry the sid
    Then the breadcrumb "← SECTOR" and the "BACK TO SECTOR" link both point at "/<sid>"

  Scenario: No bare "/system/..." target remains (Success Criterion 4)
    Then a repo grep under frontend/src for the literal `` `/system/${ `` returns only
     hits in useSectorNav.ts and test files
```

## Technical Notes

**New file — `frontend/src/composables/useSectorNav.ts`:**

```ts
/**
 * Where an internal link points. The sid comes from the path, which is the
 * source of truth: during a link-driven regeneration the loaded sector is still
 * the previous one, and links built from it would point out of the sector the
 * user is looking at. The loadedParams fallback exists only for the routes that
 * carry no sid — "/" between a generation landing and the publish replace, and
 * the two documentation pages.
 */
export function useSectorNav() {
    const route = useRoute();
    const store = useSectorStore();

    const sid = computed<string | null>(() => {
        const fromPath = typeof route.params.sid === 'string' ? route.params.sid : '';
        if (fromPath && decodeSid(fromPath) !== null) return fromPath;
        return store.loadedParams ? encodeSid(store.loadedParams) : null;
    });

    const homeTo = computed(() => (sid.value ? `/${sid.value}` : '/'));

    /** A system link with no sector to name would be a link to a route that no
     *  longer exists, so it degrades to the sector home. Unreachable in
     *  practice: system links are only rendered when a sector is loaded. */
    const systemTo = (id: number | string) =>
        sid.value ? `/${sid.value}/system/${id}` : '/';

    return { sid, homeTo, systemTo };
}
```

**Always destructure at the call site — not optional, and the same at all seven sites.**
`useSectorNav()` returns a plain object, so `homeTo` and `sid` reach the caller as
`ComputedRef`s. Vue's template compiler unwraps a top-level `<script setup>` binding that
is a ref, but **not** a ref reached through a property access — so `nav.homeTo` in a
template compiles to `_unref(nav).homeTo`, which stays a `ComputedRef` and fails
type-checking with

```
error TS2322: Type 'ComputedRef<string>' is not assignable to type
  'string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric'
```

breaking `npm run build` (Success Criterion 2). Fixed at the spec level after being caught
empirically by independent review (`vue-tsc` rejects `:to="nav.homeTo"` with `TS2322`) —
**always destructure:**

```ts
const { homeTo, systemTo } = useSectorNav();   // homeTo unwraps in the template
```

```html
<RouterLink :to="homeTo">…</RouterLink>        <!-- string, correct -->
```

and write `homeTo.value` only in genuine `<script setup>` code.

The boundary is the template, not the binding syntax: **every** template expression
auto-unwraps a destructured top-level ref — interpolations, `:bind` props, and inline
`@click` handlers alike. So `@click="router.push(homeTo)"` is correct and
`@click="router.push(homeTo.value)"` fails with `TS2551: Property 'value' does not exist
on type 'string'`. Every `router.push` site this story touches is an inline handler, so
none of them take `.value`.

`systemTo` is a plain function returning a string, so `systemTo(row.systemId)` (in script
or `:to=`) needs nothing special — it is never a ref.

This matches the codebase's existing convention: `useRailTier` and `useBackendHealth` — the
two composables whose values reach a template — are both destructured
(`const { tier } = useRailTier()`, `const { status } = useBackendHealth()`).
`useSectorStats` is bound as an object precisely because it is only ever read in script,
through `stats.systemRows.value`.

**Sites to migrate** (per the spec's bug table — every site destructures):

| File | Line | Change |
|---|---|---|
| `frontend/src/components/PlanetDetailPanel.vue` | 454 | `const { systemTo } = useSectorNav();` `router.push(\`/system/${id}\`)` → `router.push(systemTo(id))` |
| `frontend/src/components/SystemsTable.vue` | 152 | `const { systemTo } = useSectorNav();` `<RouterLink :to="\`/system/${row.systemId}\`">` → `:to="systemTo(row.systemId)"` |
| `frontend/src/components/SystemsTable.vue` | 374 | (same `systemTo` binding) `router.push(\`/system/${systemId}\`)` → `router.push(systemTo(systemId))` |
| `frontend/src/components/StarTable.vue` | 149 | idem (RouterLink) |
| `frontend/src/components/StarTable.vue` | 323 | idem (`router.push`) |
| `frontend/src/components/NotableSystems.vue` | 23 | `const { systemTo } = useSectorNav();` `<RouterLink :to="\`/system/${entry.systemId}\`">` → `:to="systemTo(entry.systemId)"` |
| `frontend/src/components/AppTopBar.vue` | 10 | `const { homeTo } = useSectorNav();` logo click `router.push('/')` → `router.push(homeTo)` (inline `@click`, a template expression: **no** `.value`) |
| `frontend/src/views/SystemDetailView.vue` | 11, 214 | `const { homeTo } = useSectorNav();` both `RouterLink to="/"` → `:to="homeTo"` (template context, so no `.value` — the destructured binding unwraps). Link swap only — the three-state block restructuring is `navigation-005`'s job, and it reuses this same `homeTo` binding. |

`usePlanetDeepLink`'s *hold, do not refuse* behaviour (Decision 5) and its narrowed
`writeParam` are already in place from `navigation-002` and are untouched by this slice —
this story only adds new consumers of `useSectorNav`, it does not touch
`usePlanetDeepLink.ts` or `utils/sectorLink.ts`.

## Tests

`frontend/src/composables/sectorNav.dom.test.ts` (new) — the reported bug:

42. `useSectorNav().systemTo(66)` on `/766207-m-100-1000` returns
    `/766207-m-100-1000/system/66`.
43. `homeTo` returns `/766207-m-100-1000` on a sid route and `/` with nothing loaded.
44. On `/documentation` with a sector loaded, `homeTo` falls back to the loaded params.
45. `PlanetDetailPanel`'s OPEN SYSTEM navigates to `/<sid>/system/<id>` — the exact bug at
    `PlanetDetailPanel.vue:454`.
46. The resulting URL survives a reload: re-mount at that path with an empty store and the
    system renders (rather than "System not found in the current sector").
47. `SystemsTable`'s name `RouterLink` has `href="/<sid>/system/<id>"`.
48. `SystemsTable`'s row click navigates to `/<sid>/system/<id>`, and still does not
    double-navigate when the click landed on the link.
49. `StarTable`'s system `RouterLink` href, and its row click, carry the sid.
50. `NotableSystems`' entries have sid-carrying hrefs.
51. `AppTopBar`'s logo click goes to `/<sid>`, not `/`.
52. `SystemDetailView`'s breadcrumb `← SECTOR` and its BACK TO SECTOR link both point at
    `/<sid>`.

Regression coverage to keep green (route-fixture/href updates driven by this slice's
component changes):

79. `frontend/src/components/{systemsTable,starsTable,tabs,planetsTable,railAndStates,shell}.dom.test.ts`
    — local `makeRouter`/`ROUTES` fixtures updated to the new sid-carrying route shape; href
    assertions updated only where they existed before (`starsTable.dom.test.ts:328`,
    `tabs.dom.test.ts:231-263`) — `shell.dom.test.ts:121`'s documentation-link assertions
    stand unchanged (A11).

Success criteria pinned by this slice:

- SC3: OPEN SYSTEM produces `/<sid>/system/<id>`, and reloading it renders the system.
- SC4: a repo grep for `` `/system/${ `` returns only `useSectorNav.ts` and test files.

(SC10b — the legacy-symbol grep — is pinned by `navigation-002`, where the deletions
themselves happen.)

**Priority:** Critical
**Dependencies:** navigation-002-sector-scoped-routes
