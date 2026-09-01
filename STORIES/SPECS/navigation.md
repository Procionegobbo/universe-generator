# Navigation — the sector in the path

## Feature Name & Description

**Sector-scoped routing**: every in-app URL carries the sector it belongs to as the first
path segment, so that any system or planet the user is looking at can be copied out of the
address bar and opened by anyone, and so that no internal navigation can silently lose the
sector.

### Current state

The four parameters that reproduce a sector (`seed`, `zone`, `systems`, `volume`) live in
the **query string**. `frontend/src/composables/useSectorLink.ts` keeps the query and the
store in step in both directions: it reads a sector out of the query and generates it when
it is not the one on screen, and it writes the loaded sector back into the query so that
every page is shareable.

That design is correct but fragile, because Vue Router drops the query on every
`router.push('/path')` and `<RouterLink to="/path">`. Correctness therefore depends on
every navigation site remembering to carry the query forward by hand. Six sites do not:

| File | Line | Form |
|---|---|---|
| `frontend/src/components/PlanetDetailPanel.vue` | 454 | ``router.push(`/system/${id}`)`` |
| `frontend/src/components/SystemsTable.vue` | 152 | ``<RouterLink :to="`/system/${row.systemId}`">`` |
| `frontend/src/components/SystemsTable.vue` | 374 | ``router.push(`/system/${systemId}`)`` |
| `frontend/src/components/StarTable.vue` | 149 | ``<RouterLink :to="`/system/${row.systemId}`">`` |
| `frontend/src/components/StarTable.vue` | 323 | ``router.push(`/system/${systemId}`)`` |
| `frontend/src/components/NotableSystems.vue` | 23 | ``<RouterLink :to="`/system/${entry.systemId}`">`` |

The user-visible bug, reproduced: open a planet panel, press **OPEN SYSTEM**
(`PlanetDetailPanel.vue:454`), and the URL becomes `/system/2` with no sector. Reload, and
`frontend/src/views/SystemDetailView.vue:213` renders *"System not found in the current
sector."* — the sector the link named was never regenerated on that machine.

The write-back watch in `useSectorLink.ts` repairs the URL a moment later while the tab
stays open, so the loss is invisible until a reload or a copy-paste. That is exactly what
makes it a bad failure mode.

### Scope

**In scope**

- A reversible, human-readable sector id (`sid`) in the first path segment.
- Routes `/`, `/:sid`, `/:sid/system/:id`, plus a catch-all that fails soft.
- A navigation helper every internal link uses, so a sector-less internal link becomes
  impossible to write.
- Reducing `useSectorLink.ts` to a read side plus a single narrow publish rule.
- Validation of the system/planet coordinates a link names, with the outcomes in
  Decision 4, once — and only once — the named sector is loaded.
- A new inline notice strip for coordinate/sid errors.
- Updating the in-app documentation (`DocumentationView.vue`, the *Sharing a View*
  section).

**Out of scope**

- Any change to the generator, the backend, or the API contract.
- **Backward compatibility with the old `?seed=&zone=&systems=&volume=` link format.**
  Old shared links are allowed to break (Decision *Da non dimenticare* — "niente
  retrocompatibilità"). No legacy redirect, no transition route, nothing that reads the
  old form.
- Persisting sectors anywhere. Sectors remain regenerated on demand.
- Putting the planet panel in the path (explicitly rejected — Decision 3).
- Putting the active tab, filters or paging in the URL.
- Short/opaque link ids, link shortening, or a server-side link registry.

---

## Assumptions & Decisions

Decisions 1–6 in the draft are settled and are implemented here as written. The entries
below are the decisions the draft left implicit, resolved here, plus two notes where
carrying out a settled decision required completing it. Each is independently
acceptable or overridable.

### A1. The `sid` grammar is `<seed>-<zoneCode>-<systemCount>-<sectorVolume>`

Per Decision 1. Concretely: `766207-m-100-1000`.

- **Zone codes** (single letter, per the draft's `-m-` example): `x` extragalactic,
  `g` galactic edge, `m` medium, `z` central zone, `c` core. `core` gets the obvious
  letter; `central zone` takes `z` from its second word, because both begin with `c`.
- **Seed segment**: `^\d+(?:\.\d+)?$`. Reasoning: the seed input is
  `<input type="number" min="0">` (`SectorControls.vue:164`) and the randomiser is
  `Math.floor(Math.random() * 1000000)`, so every seed the app can produce is a
  non-negative number. Restricting the segment to that shape is what lets `/foo` be
  rejected as a malformed sid instead of silently generating a sector seeded `"foo"`.
- **Field order is positional and left-to-right**, not right-to-left. This is what
  satisfies Decision 1's forward-compatibility clause: a future fifth field is appended,
  today's four-field links still decode with the fifth defaulted, and a today-decoder
  ignores a fifth field it does not know.

### A2. A seed that cannot be encoded is normalised before it is used

`store.currentSeed` is typed `number | string`, and `type="number"` still lets a user type
`-5`, which cannot appear in a sid (the leading `-` is the field delimiter). Rather than
weaken the grammar, `HomeView.buildRequest()` normalises: a seed that is not a finite
non-negative number is replaced by a fresh random one, exactly as an empty seed already is
today. Precedent: `buildRequest` already rewrites an empty seed in place before generating
(`HomeView.vue:151-153`). This is the only way to guarantee the round-trip Decision 1
requires, and it cannot loop.

### A3. Recording Decision 1 / 1-bis as an invariant, and what it costs today

This is not a judgment call — Decisions 1 and 1-bis settle it. It is recorded here only
because carrying it out deletes code that exists today, and because the invariant needs a
single place to be stated so a future parameter cannot quietly escape it.

> **Invariant.** The sid encodes **every** parameter that feeds generation, and the
> comparison that decides whether a link is honoured or the sector rebuilt is equality of
> the whole sid. Not a curated subset of "the ones that matter".

"Every parameter that feeds generation" has a precise definition in this codebase:
**the fields of `GenerationRequest`**. Verified identical in
`frontend/src/types/index.ts:46-51` and `backend/src/types/index.ts:62-67`:

```ts
export interface GenerationRequest {
    systemCount: number;
    sectorVolume: number;
    seed?: string | number;
    zone?: SectorZone;
}
```

Four fields, all four already in the sid format of A1. **Nothing needs to be added today.**
The invariant is what makes the answer obvious tomorrow: a fifth generation parameter is
added to `GenerationRequest`, and therefore to `encodeSid`, to `decodeSid`'s field list
and its `SID_DEFAULTS`, and — for free, since `sameSid` compares the encoded string — to
the comparison.

**Why the rule is worth having** (Decision 1-bis's own argument): today `sameSector()`
compares seed and zone only, on the measured and true premise that `systemCount` and
`sectorVolume` do not change *what* a star or planet is. But they change *what exists*. A
link to `/766207-m-400-1000/system/350`, opened by a reader holding a 100-system sector,
would not regenerate; system 350 would be absent; and Decision 4's guard would fire a
false coordinate error on a perfectly valid link — precisely the failure Decision 5 exists
to prevent. Correctness of the guard depends on the invariant *the loaded sector always
matches the sid on screen*, which only whole-sid equality gives.

**What it costs in existing code:** `sameSector` is deleted, the measured comment at the
head of `utils/sectorLink.ts` is rewritten, and three currently-passing cases in
`composables/sectorLink.dom.test.ts` are inverted. One extra deterministic generation in
the count-only/volume-only case. See *Regression Review*.

### A4. Note on Decision 1's "the write-back can be eliminated" — it reduces, it does not vanish

Verified against `useSectorLink.ts:89-107`. The claim is right about the *mechanism* and
not quite right about the *rule*. With the sid in the path, URL and store stop being two
sources of truth kept aligned by watchers, and the bidirectional sync goes. But two cases
still require the store to write the URL, and neither is reachable from the read side:

1. **First generation from `/`** — the draft names this itself under *Da non dimenticare*.
2. **Regeneration with new parameters while a sid route is on screen** — the user is on
   `/766207-m-100-1000`, changes `systems` to 400 in the rail and presses GENERATE. A new
   sector is loaded and the URL still names the old one.

Both collapse into one one-directional rule: *after `loadedParams` changes, if the route's
sid is not `encodeSid(loadedParams)`, `replace` the sid in place*. The spec keeps that and
deletes everything else on the write side, including the `linkAnswered` ordering flag
(see A5). No decision is overturned — case 2 is simply not covered by the draft's own
phrasing of case 1, and silently omitting it would leave a link that names a sector nobody
is looking at.

### A5. `linkAnswered` is deleted, and the deletion is justified rather than assumed

`linkAnswered` exists because the old write watch runs `{ immediate: true }` at setup and
would otherwise publish the reader's own sector over the parameters the link is carrying.
The new publish watch is **not** immediate and fires only on a *change* of
`loadedParams`. On a cold link-follow `loadedParams` is `null` and never changed, so
nothing is published; when the link-driven generation lands, the route sid already equals
the new params and the guard returns early. The race the flag guarded cannot occur, so the
flag goes.

### A6. `/` stays a real route; `/:sid` is not a redirect target for it

`/` is the empty state with RESTORE LAST SECTOR (`EmptyState.vue`), and must keep working
with nothing loaded. It renders `HomeView` exactly as `/:sid` does; the only difference is
that it names no sector. A `?planet=` on `/` is stripped, preserving today's behaviour
(`useSectorLink.ts:64-69`).

### A7. Canonical path has no trailing slash

The draft writes `/<sid>/`. `vercel.json` sets `"trailingSlash": false`, and Vue Router's
default non-strict matching treats `/x/` and `/x` as the same route. The canonical form
this spec emits is `/<sid>` (no trailing slash); `/<sid>/` continues to resolve.

### A8. A short sid canonicalises itself

Because missing trailing fields default (Decision 1), `/766207` decodes to
`{seed: '766207', zone: 'medium', systemCount: 100, sectorVolume: 1000}`. Generation then
sets `loadedParams`, the publish rule sees the route sid ≠ `encodeSid(loadedParams)`, and
replaces the URL with the full `/766207-m-100-1000`. This is intended, not incidental: a
hand-shortened link works and immediately becomes a complete one.

### A9. The notice lives in the Pinia store, not in a module-level ref

`sectorStore` already holds transient UI state (`activeTab`, filters, `selectedPlanetKey`,
`page`). A module-scoped `ref` in a composable would leak between Vitest cases, whereas
Pinia is recreated per test by `createPinia()`/`setActivePinia()` in every existing
`*.dom.test.ts`. The addition is purely additive to the store's public surface.

### A10. The coordinate guard is a new composable mounted once in `App.vue`

Decision 4's table needs `route.params.sid`, `route.params.id` **and**
`route.query.planet` together. `usePlanetDeepLink` is mounted in two places
(`ResultsDisplay.vue:37`, `SystemDetailView.vue:248`), never simultaneously, and knows
nothing about system membership. Rather than widen it, the guard becomes
`composables/useCoordinateGuard.ts`, mounted once beside `useSectorLink()` in `App.vue`
— the same precedent App.vue already cites for mounting `useSectorLink` at the root.

Responsibility split, so the two cannot fight over `?planet`:

- **the guard** is the only writer that *removes* `planet` or navigates away, and the only
  raiser of notices;
- **`usePlanetDeepLink`** only opens/closes the panel from a key that is present,
  well-formed and resolvable, and writes `planet` when the user selects a planet.

### A11. Three test files beyond the two the draft names must be rewritten

The draft lists `composables/sectorLink.dom.test.ts` and
`components/systemDetail.dom.test.ts`. Verified: `components/planetPanel.dom.test.ts` is
built entirely on the query form (`const SECTOR_Q = 'seed=…&zone=…&systems=…&volume=…'`,
used in ~10 cases, plus `expect(router.currentRoute.value.path).toBe('/system/1')` at
:520), and two more files assert bare `/system/N` hrefs
(`components/starsTable.dom.test.ts:328`, `components/tabs.dom.test.ts:231-263`). All are
listed in *Impact on Existing Code*.

### A12. No hosting or server change is required — verified

`vercel.json` already rewrites `"/(.*)"` to `"/"` behind the `/api` rewrite, and
`backend/src/index.ts:23-30` serves `index.html` for any non-`/api` path. Arbitrary
`/:sid/system/:id` depths therefore already resolve on a direct load. `utils/deployRouting.test.ts`
pins that config and needs no change.

### A13. RESET clears the sector identity as well as the sector

`HomeView.handleReset()` currently nulls `sectorData` but leaves `loadedParams` set. With
the sid in the path, that would leave the URL naming a sector that is not on screen, and a
reload would regenerate it — undoing the reset. Reset therefore also clears
`loadedParams` and navigates to `/`.

### A14. Open risk: an aborted generation moves the URL

`store.generateSector` restores the previous `sectorData`/`loadedParams` on abort (D-20,
`sectorStore.ts:192-200`). If the user follows a link to sector B from sector A and
cancels mid-generation, `loadedParams` changes back to A and the publish rule rewrites the
URL to `/sidA`. This is judged correct — the URL should name what is on screen — but it is
recorded here because it is a behaviour the draft does not discuss, and because cancel is
only reachable from `HomeView`'s `GeneratingState`, i.e. from a `/:sid` route.

### A15. Unknown paths fail soft through a catch-all, not a blank page

Dropping the legacy `/system/:id` route leaves that path — and every other unknown shape —
matching no route at all, which in Vue Router means a console warning and an empty
`<router-view>`. Decision 1 forbids exactly that outcome ("mai una pagina bianca") for a
sid it cannot read, and there is no reason an unreadable *path* should be treated worse
than an unreadable *sid*.

So a catch-all `{ path: '/:pathMatch(.*)*', name: 'not-found', component: HomeView }` is
added, and `useSectorLink` gives it the same treatment as a malformed sid: `replace('/')`
plus the notice. One code path, one message, no blank page. Note that `/:sid` already
absorbs any single unknown segment (`/foo` is a malformed sid), so the catch-all only ever
sees multi-segment unknowns — `/system/2` among them, which is what an old shared link now
resolves to.

The notice message is worded to cover both entrances: *"That address does not name a
sector that can be generated."*

---

## Architecture / Design Overview

### The shape of the change

```
BEFORE                                  AFTER

URL query  <──watch──>  store           URL path  ──read──>  store
   (two sources of truth kept              (one source of truth)
    aligned in both directions)         store  ──publish──>  URL path
                                           (only when the URL cannot
                                            already name the sector:
                                            first generation, or a
                                            regeneration with new params)
```

### Layers

```
utils/sectorLink.ts          pure codec + params type. No Vue, no router.
    encodeSid / decodeSid / sameSid / normaliseSeed / requestFor
          │
          ├── router/index.ts            routes + the catch-all
          │
          ├── composables/useSectorNav.ts (new)
          │       sid → link targets. Every internal link goes through it.
          │
          ├── composables/useSectorLink.ts (rewritten)
          │       URL → sector (generate what the sid names)
          │       sector → URL (publish the sid, one direction, narrow)
          │
          └── composables/useCoordinateGuard.ts (new)
                  Decision 4's table, gated by Decision 5's timing.
```

### The flow a shared link takes

```
GET /766207-m-100-1000/system/66?planet=87-3
        │
        ▼
  SPA shell (vercel rewrite / express catch-all — already in place)
        │
        ▼
  router matches /:sid/system/:id     sid = "766207-m-100-1000", id = "66"
        │
        ▼
  useSectorLink (App.vue)
        │  decodeSid → {seed:'766207', zone:'medium', systemCount:100, sectorVolume:1000}
        │  sameSid(params, store.loadedParams)? no → store.generateSector(requestFor(params))
        │
        ▼  (while running: SystemDetailView shows the waiting state, NOT "not found";
        │   usePlanetDeepLink HOLDS the key; useCoordinateGuard does nothing — Decision 5)
        │
        ▼  generation done → loadedParams set → publish rule: route sid already equal → no write
        │
        ▼
  useCoordinateGuard evaluates once, against the loaded sector:
        system 66 exists?  ──no──> replace /766207-m-100-1000 + notice "coordinates"
             │ yes
        planet 87-3 exists? ──no──> replace same path without ?planet + notice "planet"
             │ yes
        star 87 in system 66? ──no──> replace /766207-m-100-1000 + notice "coordinates"
             │ yes
        ▼
  usePlanetDeepLink opens the panel on 87-3.
```

### Why the guard cannot run early

Decision 5. `useCoordinateGuard` evaluates only when **all** of these hold:

- the route names a sid and it decodes;
- `store.sectorData` is non-null and `sameSid(decodeSid(route.params.sid), store.loadedParams)`
  — i.e. the sector on screen *is* the one the URL names;
- `store.generationStatus !== 'running'`.

If generation fails, `generationStatus === 'error'` and the guard stays silent: the store's
own error surface owns that message (Decision 5's last paragraph).

---

## Configuration

**No configuration change is required.** No environment variables, feature flags or build
settings are introduced or modified.

`vercel.json` and `backend/src/index.ts` already provide the catch-all SPA fallback the
new deeper paths need (A12), and `utils/deployRouting.test.ts` already pins it.

---

## Data Model

**No persistence change.** Sectors are never stored; only the four generation parameters
are, and only in `localStorage` under `universe-generator-sector-params`
(`sectorStore.ts:24`). That key, its shape, and its write timing are unchanged by this
spec.

### Value objects

| Name | Where | Shape |
|---|---|---|
| `SectorLinkParams` | `utils/sectorLink.ts` (existing, unchanged) | `{ seed: string; zone: SectorZone; systemCount: number; sectorVolume: number }` |
| `sid` | new, `utils/sectorLink.ts` | `string` — `<seed>-<zoneCode>-<systemCount>-<sectorVolume>` |
| planet key | existing (D-32) | `string` — `<starId>-<orbitalNumber>`, e.g. `87-3` |
| `LinkNotice` | new, `stores/sectorStore.ts` | `{ kind: 'sid' \| 'planet' \| 'coordinates'; path: string } \| null` |

### Zone codes

| `SectorZone` | code |
|---|---|
| `extragalactic` | `x` |
| `galactic edge` | `g` |
| `medium` | `m` |
| `central zone` | `z` |
| `core` | `c` |

### New store state (additive)

```ts
export type LinkNoticeKind = 'sid' | 'planet' | 'coordinates';
export interface LinkNotice { kind: LinkNoticeKind; path: string }

const linkNotice = ref<LinkNotice | null>(null);

/** Raised after the corrective navigation has landed, so it records the path it
 *  will be read on. Nothing persists it: a reload shows no notice (Decision 6). */
function raiseLinkNotice(kind: LinkNoticeKind, path: string) {
    linkNotice.value = { kind, path };
}
function clearLinkNotice() { linkNotice.value = null; }
```

`linkNotice`, `raiseLinkNotice` and `clearLinkNotice` are added to the store's returned
object. `clearPersistentMemory()` also clears the notice.

---

## Routing

`frontend/src/router/index.ts` (modified). Static paths are declared before `/:sid` for
readability; Vue Router's ranking already prefers a static segment over a dynamic one, so
`/documentation` can never be read as a sid.

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
| anything else | `not-found` | `HomeView` | Replaced with `/` plus a notice (A15) |

`App.vue`'s `LEGACY_ROUTES = ['documentation', 'api-reference']` check keys off
`route.name` and is unaffected by the new names. The catch-all is declared last; Vue
Router's ranking already prefers every route above it, and the explicit ordering is for
the reader.

### No backward compatibility

Links in the old `?seed=&zone=&systems=&volume=` form are **not** supported. There is no
legacy redirect route, no transition route, and no code anywhere that reads those query
keys. An old link resolves as follows:

| Old link | Now resolves to | Why |
|---|---|---|
| `/system/66?seed=…&zone=…&systems=…&volume=…` | `not-found` → `replace('/')` + notice | no `/system/:id` route exists any more |
| `/?seed=…&zone=…&systems=…&volume=…` | `home`, the empty state; the query is ignored | `/` is a real route and its query is inert |

The second row is worth stating explicitly: `/` still matches, so an old home link does
not 404 — it simply lands on the empty state with a stale query string nobody reads. That
is acceptable and needs no code; the user reaches the same place as anyone opening the app
cold, with RESTORE LAST SECTOR available.

**Consequence for `utils/sectorLink.ts`:** `sectorParamsFromQuery` existed only to read
that format, so it is deleted along with `sectorQuery` and `sameSector`. Verified by grep
that its only callers are `useSectorLink.ts:41,98` and `usePlanetDeepLink.ts:98` — all
three rewritten by this spec — plus its own unit tests. Deleting it also makes the
module-private `one()` helper and the `ZONES` array dead (`ZONES` is used only by
`sectorParamsFromQuery`; `ZONE_CODE`'s keys replace it), and drops the `LocationQuery`
type import. What remains of the module is sid encode/decode plus `requestFor`.

---

## Impact on Existing Code

### New files

| Path | Purpose |
|---|---|
| `frontend/src/composables/useSectorNav.ts` **(new)** | `sid`, `homeTo`, `systemTo(id)` — the only way internal links are built |
| `frontend/src/composables/useCoordinateGuard.ts` **(new)** | Decision 4's table, gated by Decision 5 |
| `frontend/src/components/LinkNotice.vue` **(new)** | The inline strip of Decision 6 |
| `frontend/src/composables/sectorNav.dom.test.ts` **(new)** | Tests for `useSectorNav` + every migrated link site |
| `frontend/src/composables/coordinateGuard.dom.test.ts` **(new)** | Tests for Decision 4's table and Decision 5's timing |
| `frontend/src/router/router.test.ts` **(new)** | Route resolution, including the catch-all |
| `frontend/src/components/linkNotice.dom.test.ts` **(new)** | Tests for the notice strip (Decision 6) |

### Modified files

| Path | Change | Contract |
|---|---|---|
| `frontend/src/utils/sectorLink.ts` | Add `ZONE_CODE`, `encodeSid`, `decodeSid`, `sameSid`, `normaliseSeed`. Delete `sectorQuery`, `sameSector` **and `sectorParamsFromQuery`**, plus the now-dead `one()` helper, `ZONES` array and `LocationQuery` import. Keep `SectorLinkParams` and `requestFor` byte-for-byte. Rewrite the header comment: the four-parameter rationale survives as the A3 invariant, the `sameSector` split does not. | **Breaking** (three exports removed) — every caller migrated in the same slices |
| `frontend/src/router/index.ts` | New route table + the catch-all. No legacy handling. | **Breaking by design** — old links are not supported |
| `frontend/src/composables/useSectorLink.ts` | Rewritten: read side keyed on `route.params.sid`, publish side reduced to the single rule of A4. `linkAnswered` deleted. | **Breaking** — public signature `useSectorLink(): void` unchanged; behaviour changed per A3/A4 |
| `frontend/src/composables/usePlanetDeepLink.ts` | Narrowed: stops writing sector query params, stops rejecting (the guard owns that), gains "close the panel when `planet` disappears". Holding behaviour preserved (Decision 5). | **Breaking** internally; signature `usePlanetDeepLink(): void` unchanged |
| `frontend/src/stores/sectorStore.ts` | Add `linkNotice`, `raiseLinkNotice`, `clearLinkNotice`; clear the notice in `clearPersistentMemory()` | **Additive** |
| `frontend/src/App.vue` | Mount `useCoordinateGuard()` beside `useSectorLink()`; render `<LinkNotice />` between `<AppTopBar />` and `<main>` | **Additive** |
| `frontend/src/components/PlanetDetailPanel.vue` (:454) | `openSystem` uses `nav.systemTo(id)` | Fixes the reported bug |
| `frontend/src/components/SystemsTable.vue` (:152, :374) | `RouterLink :to` and `openSystem` use `nav.systemTo(...)` | Behaviour-preserving except the URL now carries the sid |
| `frontend/src/components/StarTable.vue` (:149, :323) | idem | idem |
| `frontend/src/components/NotableSystems.vue` (:23) | `RouterLink :to` uses `nav.systemTo(entry.systemId)` | idem |
| `frontend/src/components/AppTopBar.vue` (:10) | Logo click `router.push('/')` → `router.push(nav.homeTo.value)` | Stays inside the current sector |
| `frontend/src/views/SystemDetailView.vue` (:11, :214) | Both `RouterLink to="/"` → `:to="nav.homeTo"`. Replace the single `data-system-missing` block with the three states below. | See *SystemDetailView states* |
| `frontend/src/views/HomeView.vue` | `buildRequest()` normalises the seed (A2); `handleReset()` also clears `loadedParams` and navigates to `/` (A13) | Additive + A13 |
| `frontend/src/views/DocumentationView.vue` (~:288-315) | Replace the *Sharing a View* → *The Link* block with the new format **only**; add the zone-code table. The old form is removed, not shown alongside. | Documentation only |

### Deliberately unmodified

- `backend/**` — no API change.
- `vercel.json`, `frontend/src/utils/deployRouting.test.ts` — already correct (A12).
- `frontend/src/composables/useSectorApi.ts` — has its own unused `generateSector`; out of
  scope, do not touch.
- `frontend/src/components/EmptyState.vue` — its only link is `/documentation`.
- `frontend/src/views/ApiReferenceView.vue` / `DocumentationView.vue` back buttons
  (`router.push('/')`): **optional**, may adopt `nav.homeTo` for consistency; not required,
  because `/` with a sector loaded is a valid state and the publish rule does not fire
  (`loadedParams` did not change). If adopted, `useSectorNav`'s `loadedParams` fallback is
  what makes it work off a sid-less route.

### Tests to rewrite

| Path | Why |
|---|---|
| `frontend/src/composables/sectorLink.dom.test.ts` | Entirely query-based; the "publishing the sector into the URL" describe block and the three `sameSector` leniency cases no longer describe the system (Decision 1-bis / A3) |
| `frontend/src/components/systemDetail.dom.test.ts` | `makeRouter` routes, `router.push('/system/N')` at :118 and :643 |
| `frontend/src/components/planetPanel.dom.test.ts` | `SECTOR_Q` in ~10 cases, `makeRouter` routes, path assertion at :520 (A11) |
| `frontend/src/utils/sectorLink.test.ts` | Drop the `sectorQuery` round-trip and the whole `sameSector` describe; add `encodeSid`/`decodeSid`/`sameSid` |
| `frontend/src/components/starsTable.dom.test.ts` | `makeRouter` routes; href assertion `'/system/2'` at :328 |
| `frontend/src/components/tabs.dom.test.ts` | `makeRouter` routes; href assertions at :231-235 and :260-263 |
| `frontend/src/components/systemsTable.dom.test.ts` | `makeRouter` routes at :107-110 (no href assertions) |
| `frontend/src/components/planetsTable.dom.test.ts` | `makeRouter` routes at :143-146 |
| `frontend/src/components/railAndStates.dom.test.ts` | routes at :81 |
| `frontend/src/components/shell.dom.test.ts` | `ROUTES` at :43; the href assertions at :121 are the documentation links and stand |

---

## Implementation Detail

### `frontend/src/utils/sectorLink.ts`

```ts
export const ZONE_CODE: Record<SectorZone, string> = {
    'extragalactic': 'x',
    'galactic edge': 'g',
    'medium': 'm',
    'central zone': 'z',
    'core': 'c'
};
const ZONE_BY_CODE: Record<string, SectorZone> = Object.fromEntries(
    Object.entries(ZONE_CODE).map(([zone, code]) => [code, zone])
) as Record<string, SectorZone>;

/** The defaults a sid's missing trailing fields take, so a link written before a
 *  field existed still decodes. They are the store's own defaults. */
const SID_DEFAULTS = { zone: 'medium' as SectorZone, systemCount: 100, sectorVolume: 1000 };

const SEED_PATTERN = /^\d+(?:\.\d+)?$/;

/** Every seed the app can produce, in its canonical string form. */
export function normaliseSeed(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return SEED_PATTERN.test(text) ? text : null;
}

export function encodeSid(params: SectorLinkParams): string {
    return [
        String(params.seed),
        ZONE_CODE[params.zone],
        String(params.systemCount),
        String(params.sectorVolume)
    ].join('-');
}

/**
 * The sector a sid names, or null when it names none.
 *
 * Positional and left-to-right: field 1 seed, 2 zone, 3 systemCount, 4
 * sectorVolume. Trailing fields may be absent and take their default; fields
 * beyond the last one this version knows are ignored, so a link written by a
 * future build that appends a fifth parameter still resolves to a sector here.
 * Present-but-wrong is never defaulted — an unknown zone code or a non-positive
 * count is a malformed sid, not a missing field.
 */
export function decodeSid(sid: unknown): SectorLinkParams | null {
    if (typeof sid !== 'string' || sid.length === 0) return null;
    const [rawSeed, rawZone, rawSystems, rawVolume] = sid.split('-');

    const seed = normaliseSeed(rawSeed);
    if (seed === null) return null;

    let zone = SID_DEFAULTS.zone;
    if (rawZone !== undefined) {
        if (!(rawZone in ZONE_BY_CODE)) return null;
        zone = ZONE_BY_CODE[rawZone];
    }

    let systemCount = SID_DEFAULTS.systemCount;
    if (rawSystems !== undefined) {
        const n = positiveInt(rawSystems);
        if (n === null) return null;
        systemCount = n;
    }

    let sectorVolume = SID_DEFAULTS.sectorVolume;
    if (rawVolume !== undefined) {
        const n = positiveInt(rawVolume);
        if (n === null) return null;
        sectorVolume = n;
    }

    return { seed, zone, systemCount, sectorVolume };
}

/** Whether two parameter sets name the same sector — all four fields. See A3. */
export function sameSid(a: SectorLinkParams | null, b: SectorLinkParams | null): boolean {
    if (a === null || b === null) return false;
    return encodeSid(a) === encodeSid(b);
}
```

`positiveInt` is the existing private helper; its signature widens from
`string | null` to `string | undefined | null` or is called with a non-null argument as
above. `requestFor` and `SectorLinkParams` are untouched. `sectorParamsFromQuery`,
`sectorQuery`, `sameSector`, `one()` and `ZONES` are all deleted, along with the
`LocationQuery` import — after this the module has no `vue-router` dependency at all,
which is the shape the layer diagram above describes.

### `frontend/src/composables/useSectorNav.ts` (new)

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

### `frontend/src/composables/useSectorLink.ts` (rewritten)

```ts
export function useSectorLink() {
    const route = useRoute();
    const router = useRouter();
    const store = useSectorStore();

    /** URL -> sector. Run for the URL the app opens on and for every navigation. */
    const answerTheUrl = async () => {
        // An address that matched nothing gets the same fail-soft treatment as a
        // sid that cannot be read: one path, one message, never an empty view (A15).
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
            // Decision 1: fail soft. Never a blank page, never the wrong sector.
            await router.replace({ path: '/' });
            store.raiseLinkNotice('sid', '/');
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
     * route is on screen — because every other way a sector is loaded is a
     * response to a URL that already names it. Not immediate, which is what lets
     * the ordering flag this composable used to need disappear (A5).
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

### `frontend/src/composables/useCoordinateGuard.ts` (new)

Decision 4's table, gated by Decision 5's timing. `replace`, never `push`, so the bad URL
does not stay in the history and "back" cannot re-trigger the error in a loop.

```ts
const KEY_PATTERN = /^\d+-\d+$/;

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
            await router.replace({ path: route.path, query: without(route.query, 'planet') });
            return;
        }

        const [starId, orbitalNumber] = rawKey.split('-').map(Number);
        const planet = sector.planets.find(
            p => p.starId === starId && p.orbitalNumber === orbitalNumber);

        // Case A — absence. The planet is missing; the rest of the URL still holds.
        if (!planet) {
            store.selectPlanet(null);
            await router.replace({ path: route.path, query: without(route.query, 'planet') });
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
  just caused (see `LinkNotice.vue`).
- The malformed-key branch raises no notice: `?planet=not-a-key` names no coordinate that
  could have existed, and today's behaviour is a silent strip
  (`usePlanetDeepLink.ts:83-86`). Preserved.
- A generation failure never reaches `check()` (`ready` is false, `sectorData` is null or
  `loadedParams` does not match), so the generation error keeps its own message —
  Decision 5's final paragraph.

### `frontend/src/composables/usePlanetDeepLink.ts` (narrowed)

Keeps: the composite-key doc comment, the `KEY_PATTERN` gate, the *hold, do not refuse*
behaviour while the named sector is not yet loaded (Decision 5 explicitly preserves this),
and the store→URL write on selection.

Changes:

- `writeParam` no longer merges `sectorQuery(store.loadedParams)` into the query. The
  sector is in the path now, so a write that names only the planet cannot drop it. This
  removes the reason the two composables had to share a query-writing convention.
- The hold condition becomes `sameSid(decodeSid(route.params.sid), store.loadedParams)`.
- `reject()` is deleted; the guard owns stripping and notices.
- The URL→store watch gains: when the param disappears (`key === null`) and a panel is
  open, close it. Today it returns early, because the only writer of `null` was
  `reject()`/the user; now the guard can remove the param too.

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

### `frontend/src/components/LinkNotice.vue` (new)

Decision 6: an inline strip at the top of the destination page, not the full-page error
state (`HomeView.vue:51`, which stays exactly as it is for generation failures).

- Rendered once, in `App.vue`, between `<AppTopBar />` and `<main>`, so it works on both
  destinations without either view knowing about it.
- `v-if="store.linkNotice"`; `data-link-notice` and `:data-link-notice-kind="kind"` for
  tests.
- Messages:

| kind | Message |
|---|---|
| `sid` | `That address does not name a sector that can be generated.` |
| `planet` | `The planet in that link does not exist in this sector.` |
| `coordinates` | `The coordinates in that link are not consistent, so it opened the sector instead.` |

- Dismissal, all three of:
  1. a close button (`data-link-notice-close`, `aria-label="Dismiss"`);
  2. an 8000 ms `setTimeout`, cleared on unmount and re-armed whenever the notice changes;
  3. `watch(() => route.fullPath, ...)` — clear as soon as the path differs from
     `linkNotice.path`, which is "the first interaction" for a navigation.
- It does not survive a reload: the state is a plain `ref`, never persisted, and the
  corrective `replace` has already cleaned the URL.
- Styling follows the existing warning surface in `HomeView.vue:51-66` (rounded card,
  `rgb(239 68 68 / .3)` border over `rgb(239 68 68 / .06)`), reduced to a full-width strip.

### `SystemDetailView` states

The single `v-else` block at `SystemDetailView.vue:212-215` becomes three, in this order.
Decision 5 is what forces the split: "System not found" must not be shown while the sector
the link names is still being built.

```
v-if="row && system"                    → the system (unchanged)
v-else-if="isBuilding"                  → data-system-waiting
        "Rebuilding the sector this link names…"
v-else-if="store.generationStatus === 'error'"  → data-system-error
        store.error, plus <RouterLink :to="nav.homeTo">BACK TO SECTOR</RouterLink>
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

`data-system-missing` is retained rather than deleted: it is the one-tick state between
the guard deciding and the `replace` landing, and keeping the hook lets the existing
assertions in `systemDetail.dom.test.ts` continue to describe something real.

---

## Validation Rules

### `sid` (path segment 1)

| Field | Position | Required | Rule | On violation |
|---|---|---|---|---|
| seed | 1 | yes | `/^\d+(?:\.\d+)?$/` | whole sid invalid |
| zone code | 2 | no (default `m`) | one of `x g m z c` | whole sid invalid |
| systemCount | 3 | no (default `100`) | `/^\d+$/`, safe integer, `> 0` | whole sid invalid |
| sectorVolume | 4 | no (default `1000`) | `/^\d+$/`, safe integer, `> 0` | whole sid invalid |
| fields 5+ | — | no | ignored | — |

An invalid sid causes `router.replace('/')` plus a `sid` notice. Never a blank page, never
a different sector (Decision 1).

### `:id` (system)

`Number(route.params.id)`; must match a `systemId` in the loaded sector. Non-numeric or
absent → Decision 4 case C.

### `?planet` (planet key)

| Rule | On violation |
|---|---|
| matches `/^\d+-\d+$/` | strip the param, no notice |
| resolves to a planet in the loaded sector | Decision 4 case A |
| on a `system-detail` route, `star(starId).systemId === Number(route.params.id)` | Decision 4 case B |
| repeated param | first value wins (existing `paramValue` behaviour) |

All three are evaluated only when the guard is `ready` (Decision 5).

### Generation parameters

Unchanged; the existing rail validation and backend validation stand. The one addition is
A2: `HomeView.buildRequest()` replaces a seed for which `normaliseSeed()` returns `null`
with a fresh `Math.floor(Math.random() * 1000000)`, in the same place and the same way it
already replaces an empty one.

---

## Authorization & Security

There is **no authentication, authorization, or user data in this application**. Sectors
are deterministic functions of four public parameters; there is nothing private to protect
and no per-user resource to scope. Every action below is available to every visitor by
design.

| Action | Who | Enforcement |
|---|---|---|
| Open any sid | anyone | none needed; a sid is a set of public generation parameters |
| Generate a sector | anyone | existing rate limits of the deployment; unchanged |
| Read a system/planet | anyone | none needed |

Security considerations that *are* relevant:

- **No new untrusted sink.** The sid and the planet key are parsed with strict regular
  expressions and never interpolated into HTML, `v-html`, or a URL passed to `open()`.
  The only consumer is `store.generateSector`, whose request body is typed
  `GenerationRequest`.
- **No open redirect.** Every corrective navigation targets a locally constructed path
  (`/`, `` `/${sid}` ``, `route.path`) — never a value taken from the query.
- **Resource use.** A crafted sid can request a large `systemCount`. This is unchanged
  from today (`?systems=` was already user-controlled) and remains bounded by the
  backend's existing handling; `frontend/src/stores/sectorStore.size.test.ts` covers the
  large-sector path. No new limit is introduced by this spec.
- **No CSRF surface**: the only mutating call is `POST /api/sector/generate`, which is
  stateless and unauthenticated. Unchanged.

---

## Testing

Vitest, run with `npm test` in `/frontend`. Follow the conventions already in place:
`*.test.ts` beside the unit under test for pure functions; `*.dom.test.ts` with
`@vue/test-utils` `mount`, `createPinia()`/`setActivePinia()`, `createMemoryHistory()`,
and `vi.mock('axios')` for anything that touches the router or the store.

### `frontend/src/utils/sectorLink.test.ts` (modified)

1. `encodeSid` produces `766207-m-100-1000` for the canonical params.
2. `encodeSid` emits the right code for each of the five zones.
3. `decodeSid(encodeSid(p))` round-trips all four fields, for each zone.
4. `decodeSid('766207')` defaults zone/count/volume to medium/100/1000.
5. `decodeSid('766207-c')` defaults count and volume only.
6. `decodeSid('766207-m-100-1000-9')` ignores the unknown fifth field (forward
   compatibility, Decision 1).
7. `decodeSid` returns `null` for: `''`, `'foo'`, `'-m-100-1000'` (empty seed),
   `'766207-q-100-1000'` (unknown zone), `'766207-m-0-1000'`, `'766207-m-100-0'`,
   `'766207-m-lots-1000'`, `'766207-m-10.5-1000'`.
8. `decodeSid('1.5-m-100-1000')` accepts a fractional seed and returns it as `'1.5'`.
9. `sameSid` is true for identical params and false when **any one** of the four differs —
    including `systemCount` and `sectorVolume`, which is what Decision 1-bis requires.
10. `sameSid(null, x)` and `sameSid(x, null)` are false.
11. `normaliseSeed` accepts `766207`, `'766207'`, `'1.5'`; rejects `-5`, `'abc'`, `''`,
    `NaN`, `null`, `undefined`.
12. `requestFor`: its existing `describe` retained unchanged — it is the only part of
    the old module that survives.
13. **Removed, not rewritten**: the whole `sectorParamsFromQuery` describe (7 cases), the
    `sectorQuery` round-trip case, and the whole `sameSector` describe. Their subjects no
    longer exist.

### `frontend/src/router/router.test.ts` (new)

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

### `frontend/src/composables/sectorLink.dom.test.ts` (rewritten)

Reading:

24. Builds the sector a sid names when nothing is loaded, and posts exactly the four
    decoded parameters.
25. Records the result in `loadedParams` so the guard can check against it.
26. Leaves the sector alone when the sid is the one already loaded.
27. **Regenerates when the sid differs only by `systemCount`** (Decision 1-bis / A3 — the
    inverse of the deleted "leaves it alone when the link differs only by a larger count").
28. **Regenerates when the sid differs only by `sectorVolume`** (Decision 1-bis / A3).
29. Regenerates when the sid names another seed, and when it names another zone.
30. Does not start a second generation while one is running.
31. Generates nothing on `/`.
32. A malformed sid (`/not-a-sector`) replaces to `/`, generates nothing, and raises the
    `sid` notice.
32b. An unmatched address (`/system/66`, `/a/b/c`) replaces to `/`, generates nothing, and
    raises the same `sid` notice — the A15 path, verified to render `HomeView` rather than
    an empty `<router-view>`.
33. A generation failure surfaces as `store.error` / `generationStatus === 'error'` and
    raises **no** notice (Decision 5).
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

### `frontend/src/composables/sectorNav.dom.test.ts` (new) — the reported bug

42. `useSectorNav().systemTo(66)` on `/766207-m-100-1000` returns
    `/766207-m-100-1000/system/66`.
43. `homeTo` returns `/766207-m-100-1000` on a sid route and `/` with nothing loaded.
44. On `/documentation` with a sector loaded, `homeTo` falls back to the loaded params.
45. **`PlanetDetailPanel`'s OPEN SYSTEM navigates to `/<sid>/system/<id>`** — the exact bug
    at `PlanetDetailPanel.vue:454`.
46. **The resulting URL survives a reload**: re-mount at that path with an empty store and
    the system renders (rather than "System not found in the current sector").
47. `SystemsTable`'s name `RouterLink` has `href="/<sid>/system/<id>"`.
48. `SystemsTable`'s row click navigates to `/<sid>/system/<id>`, and still does not
    double-navigate when the click landed on the link.
49. `StarTable`'s system `RouterLink` href, and its row click, carry the sid.
50. `NotableSystems`' entries have sid-carrying hrefs.
51. `AppTopBar`'s logo click goes to `/<sid>`, not `/`.
52. `SystemDetailView`'s breadcrumb `← SECTOR` and its BACK TO SECTOR link both point at
    `/<sid>`.

### `frontend/src/composables/coordinateGuard.dom.test.ts` (new) — Decision 4 and 5

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

### `frontend/src/components/linkNotice.dom.test.ts` (new) — Decision 6

62. Renders `data-link-notice` with the message for each of the three kinds.
63. Does not render when `store.linkNotice` is null.
64. The close button clears the notice.
65. Auto-dismisses after 8000 ms (`vi.useFakeTimers()`).
66. Survives the corrective `replace` that raised it — the notice is still visible on the
    destination path.
67. Clears on the next navigation to a different path.
68. Re-mounting at the destination path with a fresh store shows no notice (it does not
    survive a reload).
69. `HomeView`'s full-page generation error still renders for `store.error`, independently
    of the strip.

### `frontend/src/components/systemDetail.dom.test.ts` (rewritten)

70. All existing cases re-pointed at `/766207-m-100-1000/system/:id` and passing unchanged.
71. The `:id` change case (:643) becomes a change of `:id` **within one sid**, and still
    re-renders.
72. New: while the named sector is being built, `data-system-waiting` renders and
    `data-system-missing` does not.
73. New: on a generation failure, `data-system-error` renders `store.error`.

### `frontend/src/components/planetPanel.dom.test.ts` (rewritten)

74. All `SECTOR_Q` URLs become sid paths; the OPEN SYSTEM path assertion at :520 becomes
    `/766207-m-100-1000/system/1`.
75. The deep-link hold case (`mountCold`) keeps its meaning: the key is held, not rejected,
    while the sector is absent.
76. Opening and closing the panel writes and removes `?planet` **without touching the
    path** — the narrowed `writeParam` (no sector query is merged any more).

### Regression coverage to keep green

77. `frontend/src/utils/deployRouting.test.ts` — unchanged and still passing (A12).
78. `frontend/src/stores/sectorStore.test.ts` — unchanged; the store additions are
    additive.
79. `frontend/src/components/{systemsTable,starsTable,tabs,planetsTable,railAndStates,shell}.dom.test.ts`
    — routes updated, assertions otherwise unchanged.

---

## Suggested Story Breakdown

Six vertical slices, in order. Each is independently verifiable; 2 depends on 1, and so on
down the chain except where noted.

**1 — The sid codec.** `utils/sectorLink.ts`: add `ZONE_CODE`, `encodeSid`, `decodeSid`,
`sameSid`, `normaliseSeed`. Nothing consumes them yet; the old exports stay for now, so
nothing breaks. Tests 1–12 (the deletions in 13 land in slice 3).
*Depends on: nothing. Verifiable: `npm test` green with the new unit tests.*

**2 — Sector-scoped routes.** `router/index.ts` including the catch-all; `useSectorLink`'s
read side keyed on `route.params.sid` plus the `not-found` branch; the publish rule;
`linkAnswered` deleted; `HomeView.buildRequest` seed normalisation (A2) and `handleReset`
(A13). Tests 14–23, 24–41. **Old links stop working at this slice** — that is intended,
and it is the slice to call out in any release note. The app is navigable end to end.
*Depends on: 1.*

**3 — Every internal link carries the sector.** `useSectorNav`; the six navigation sites
plus `AppTopBar` and `SystemDetailView`'s two links; delete `sectorQuery`, `sameSector`
and `sectorParamsFromQuery` with their dead helpers; narrow `usePlanetDeepLink` to the
panel sync. Tests 42–52, 74–76, and the deletions in 13. **This is the slice that closes
the reported bug** — it is worth shipping even alone.
*Depends on: 2.*

**4 — The notice strip.** Store state; `LinkNotice.vue`; wire the malformed-sid and
`not-found` cases from slice 2 to it. Tests 62–69, 32, 32b.
*Depends on: 2. Independent of 3 — can run in parallel with it.*

**5 — The coordinate guard.** `useCoordinateGuard.ts` mounted in `App.vue`;
`SystemDetailView`'s three states. Tests 53–61, 70–73.
*Depends on: 3 and 4.*

**6 — The documentation.** `DocumentationView.vue` *Sharing a View*: the new link format
and the zone-code table, replacing the old form rather than sitting beside it. No code, no
tests beyond keeping `shell.dom.test.ts` green.
*Depends on: 3 (the format has to be real before it is documented).*

---

## Success Criteria

Each item is pass/fail.

1. `frontend`: `npm test` passes with no skipped or `.only` cases.
2. `frontend`: `npm run build` (which runs `vue-tsc`) passes with no type errors.
3. Opening a planet panel and pressing **OPEN SYSTEM** produces a URL of the form
   `/<sid>/system/<id>`, and reloading that URL in a fresh tab renders the system —
   not "System not found in the current sector."
4. No `router.push`, `router.replace` or `RouterLink :to` anywhere under `frontend/src`
   targets a bare `/system/...` path; a repo grep for `` `/system/${ `` returns only
   `useSectorNav.ts` and test files.
5. `/766207-m-100-1000/system/66?planet=87-3` opened in an empty tab generates the sector,
   renders system 66, and opens the panel on planet 87-3.
6. `decodeSid(encodeSid(p)) === p` for all four fields and all five zones.
7. `/766207` decodes, generates, and the URL becomes `/766207-m-100-1000`.
8. `/766207-m-100-1000-99` (an unknown fifth field) still decodes and generates.
9. `/not-a-sector` lands on `/` with the `sid` notice, never a blank page.
10. `/system/66` and `/a/b/c` land on `/` with the notice and a rendered `HomeView` —
    never a blank page and never a router warning about an unmatched route.
10b. A repo grep over `frontend/src` for `sectorParamsFromQuery`, `sectorQuery`,
    `sameSector` and the literal `?seed=` returns no hits outside test fixtures: no
    legacy shim survives anywhere.
11. Decision 4's table holds exactly: A stays on the system without `?planet`; B and C land
    on `/<sid>`; all three use `replace`, and pressing back does not return to the bad URL.
12. No coordinate notice is ever raised while `generationStatus === 'running'`, nor when it
    is `'error'`.
13. The notice strip appears above the destination page, is dismissible, disappears on its
    own, and is absent after a reload of the corrected URL.
14. Generating from `/` replaces the URL with `/<sid>` without adding a history entry.
15. Regenerating with a changed `systemCount` while on `/<oldSid>/system/66` leaves the
    user on `/<newSid>/system/66`.
16. `DocumentationView`'s *Sharing a View* section shows the `/<sid>/system/<id>?planet=`
    form and the five zone codes, and the `?seed=&zone=&systems=&volume=` form appears
    nowhere in it.
17. `utils/deployRouting.test.ts` still passes with `vercel.json` unmodified.

---

## Regression Review

Every entry in *Impact on Existing Code* that modifies rather than adds:

| Target | Classification | Notes |
|---|---|---|
| `utils/sectorLink.ts` — `sectorQuery` removed | **Breaking, deliberate** | Sole callers: `useSectorLink.ts:103`, `usePlanetDeepLink.ts:49`. Both rewritten in slices 2–3. Its unit test (round-trip) is deleted with it. No other consumer exists — verified by grep. |
| `utils/sectorLink.ts` — `sameSector` removed | **Breaking, deliberate** | Sole callers: `useSectorLink.ts:54` and `:99`, `usePlanetDeepLink.ts:98`. Both migrate to `sameSid`. Its `describe` block in `utils/sectorLink.test.ts` is deleted. |
| `utils/sectorLink.ts` — `sectorParamsFromQuery` removed | **Breaking, deliberate** | Its only reason to exist was reading the old query format, which is no longer supported. Sole callers verified by grep: `useSectorLink.ts:41` and `:98`, `usePlanetDeepLink.ts:98` — all three rewritten by this spec — plus its own `describe` in `utils/sectorLink.test.ts`, which is deleted rather than rewritten. Removing it also strands `one()`, `ZONES` and the `LocationQuery` import, which go with it. |
| `utils/sectorLink.ts` — `requestFor`, `SectorLinkParams` | **Backward-compatible** | Kept unchanged; `requestFor`'s existing test stands. |
| Regeneration keyed on the whole sid instead of seed+zone | **Breaking, deliberate — the main behavioural change, and a settled rule** | Required by Decision 1-bis, not proposed here. Affects one feature: following a link whose `systemCount`/`sectorVolume` differ from the loaded sector now regenerates instead of reusing it. Migration: three cases in `sectorLink.dom.test.ts` are inverted (tests 27–28), and the measured comment at the head of `utils/sectorLink.ts` is rewritten to record why the seed+zone split no longer governs. Justification restated in A3: without whole-sid equality, Decision 4's existence checks fire false errors on valid links. User-visible cost: one extra deterministic generation. |
| `router/index.ts` — `/system/:id` removed outright | **Breaking, deliberate, no migration path — by decision** | Previously shared links of the form `/system/:id?seed=…` stop working. They land on the catch-all, are replaced with `/`, and the user is told the address names no sector (A15). This is the user's explicit choice ("niente retrocompatibilità"); the affected population is anyone holding a link shared before this ships, and the cost to them is re-obtaining the link. Tests 14–15 pin the new behaviour, test 18 pins that no shim was reintroduced. |
| `router/index.ts` — `/?seed=…` | **Backward-compatible by accident, and adequate** | `/` remains a real route, so an old home link still resolves; its query is simply ignored and the user gets the empty state with RESTORE LAST SECTOR. No code handles it. Test 17 pins that it does not redirect. |
| `router/index.ts` — catch-all added | **Additive** | Nothing matched `/:pathMatch(.*)*` before except paths that previously rendered an empty view. Strictly an improvement; test 32b pins it. |
| `useSectorLink.ts` rewritten | **Breaking, deliberate** | Its exported signature (`(): void`) and its mount point (`App.vue:34`) are unchanged, so no caller changes. The behavioural deltas are A3 (above), A4 (the write side narrows to one rule) and A5 (`linkAnswered` deleted). A5 is argued from the watch no longer being `immediate`; test 37 pins the no-loop property that the flag used to buy. |
| `usePlanetDeepLink.ts` narrowed | **Breaking, deliberate** | Signature and both mount points (`ResultsDisplay.vue:37`, `SystemDetailView.vue:248`) unchanged. Two behaviours move out (rejecting an unresolvable key; merging the sector into the query) and one moves in (closing the panel when the param disappears). The *hold, do not refuse* behaviour Decision 5 asks to preserve is explicitly retained and pinned by test 75. Risk of a double-writer over `?planet` is removed by A10's split, not by ordering. |
| `sectorStore.ts` | **Backward-compatible** | Three new members plus one line in `clearPersistentMemory`. No existing member changes type or semantics; `sectorStore.test.ts` and `sectorStore.size.test.ts` need no edit. |
| `App.vue` | **Backward-compatible** | One extra composable call and one component. `isLegacyRoute` reads `route.name`, and both names it checks (`documentation`, `api-reference`) are unchanged. Note the new `not-found` route renders `HomeView`, which is correctly *not* in `LEGACY_ROUTES` and so gets the full-bleed console layout for the one tick before the replace lands. |
| `HomeView.vue` — `buildRequest` seed normalisation | **Backward-compatible in practice, narrow behaviour change** | Only fires for a seed that cannot be encoded (negative or non-numeric), which the UI does not produce through its own controls. For every seed reachable today it is a no-op. Precedent: the same function already rewrites an empty seed. |
| `HomeView.vue` — `handleReset` (A13) | **Deliberate small change** | Reset additionally clears `loadedParams` and navigates to `/`. Previously reset left the sector's identity behind; with the sid in the path that would leave the URL naming a sector that is not on screen and silently regenerate it on reload. No test asserts the old behaviour (verified: `handleReset` is untested today). |
| `SystemDetailView.vue` — three states | **Additive to the render, with one hook preserved** | `data-system-missing` is kept with its exact text so existing assertions stand; the two new states are additional branches ahead of it. The two `RouterLink to="/"` become `:to="nav.homeTo"`, which evaluates to `/` when no sector is loaded — identical to today in that case. |
| `PlanetDetailPanel`, `SystemsTable`, `StarTable`, `NotableSystems`, `AppTopBar` | **Deliberate, and the point of the feature** | Destinations gain the sid prefix. `starsTable.dom.test.ts:328` and `tabs.dom.test.ts:231-263` assert the old bare hrefs and are updated. |
| `DocumentationView.vue` | **Content only** | No behaviour. |
| `vercel.json`, `backend/**` | **Unmodified** | Verified sufficient (A12); `deployRouting.test.ts` unchanged. |

**Residual risks recorded rather than resolved**

- Old links break on the day slice 2 ships, with no in-app affordance to recover a link
  the user only has in the old form. Accepted by decision; recorded because it is the one
  change in this spec that is visible to someone who never opens the app again until they
  click a stale link. Nothing in the codebase or in analytics tells us how many such links
  exist.
- A14 — an aborted generation moves the URL back to the previous sector's sid. Judged
  correct; recorded because it is a new, undiscussed interaction between D-20's snapshot
  restore and the publish rule.
- Slice 3 deletes `sameSector` and slice 2 changes the regeneration rule; if slice 2 ships
  without slice 3 the app is correct but still contains the old comparison in
  `usePlanetDeepLink`'s hold condition, which is *more* permissive than the read side and
  can hold a key one tick longer than necessary. Harmless, and closed by slice 3.

---

## Future Considerations

Not part of this spec. Listed only so they are not mistaken for omissions.

- **A fifth generation parameter.** Governed by the A3 invariant, so the answer is not a
  judgment call: it is added to `GenerationRequest`, and therefore to `encodeSid`, to
  `decodeSid`'s field list and `SID_DEFAULTS`, and — for free — to `sameSid`. The decoder
  is already built to absorb it (Decision 1), so no link written today would break.
- **A "copy link" affordance.** `PlanetDetailPanel` already has clipboard plumbing
  (`copyViaTextarea`). With the sid in the path, a share button that copies
  `location.href` becomes trivial — but the draft's requirement is that the address bar is
  already correct, which this spec delivers on its own.
- **Putting the active tab in the query.** `?tab=planets` appears in one existing test
  fixture but is inert. Making it real would extend shareability from "which sector and
  which body" to "which view", and is a separate decision.
- **A real 404 page.** A15 makes every unreadable address fail soft onto `/` with a
  notice, which is correct but terse. A dedicated not-found view — one that says what was
  asked for and offers the empty state — would read better, and is a design question, not
  a correctness one. It would replace the `not-found` route's `component: HomeView`
  without touching anything else.
- **Recovering an old link.** Backward compatibility is out of scope by decision, but if
  stale links turn out to be common, a one-page "paste your old link here" converter would
  need nothing from the app but `encodeSid` — the old form carries exactly the four
  parameters the sid does.
