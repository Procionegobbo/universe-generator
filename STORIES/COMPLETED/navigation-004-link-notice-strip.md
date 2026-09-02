# navigation-004-link-notice-strip

**Spec:** STORIES/SPECS/navigation.md

**As a** user who opens a stale, malformed, or unresolvable link
**I want** a brief, dismissible inline notice explaining what happened
**So that** a broken link is visible instead of silently resolving somewhere I didn't expect

## Acceptance Criteria

```gherkin
Feature: link notice strip

  Scenario Outline: The notice renders per kind
    Given store.linkNotice is { kind: "<kind>", path: "<path>" }
    Then a "data-link-notice" element renders with "data-link-notice-kind" = "<kind>"
     and the message "<message>"

    Examples:
      | kind         | message                                                                        |
      | sid          | That address does not name a sector that can be generated.                    |
      | planet       | The planet in that link does not exist in this sector.                        |
      | coordinates  | The coordinates in that link are not consistent, so it opened the sector instead. |

  Scenario: No notice, no strip
    Given store.linkNotice is null
    Then no "data-link-notice" element renders

  Scenario: Dismissible by close button
    Given a notice is showing
    When the user activates the close button ("data-link-notice-close", aria-label="Dismiss")
    Then the notice clears

  Scenario: Auto-dismisses after 8 seconds
    Given a notice is showing
    When 8000ms elapse (fake timers)
    Then the notice clears

  Scenario: Survives the corrective navigation that raised it
    Given the guard/read-side performs router.replace to a destination path and then raises
     a notice recorded against that path
    Then the notice is still visible once the app is on the destination path

  Scenario: Clears on the next navigation
    Given a notice is showing on path P
    When the user navigates to a different path
    Then the notice clears

  Scenario: Does not survive a reload
    Given a notice was showing before a reload
    When the app re-mounts at the same (already-corrected) path with a fresh store
    Then no notice renders

  Scenario: The full-page generation error is independent of the strip
    Given store.error is set (a failed generation)
    Then HomeView's own full-page error state still renders, unaffected by the notice strip

  Scenario: A malformed sid raises the "sid" notice (extends navigation-002's test 32)
    When the app opens on "/not-a-sector"
    Then the URL is replaced to "/" and a "sid" notice is raised

  Scenario: An unmatched address raises the "sid" notice too (extends navigation-002's test 32b)
    When the app opens on "/system/66" or "/a/b/c"
    Then the URL is replaced to "/" and a "sid" notice is raised
```

## Technical Notes

**A9. The notice lives in the Pinia store, not a module-level ref.** `sectorStore` already
holds transient UI state (`activeTab`, filters, `selectedPlanetKey`, `page`). A
module-scoped `ref` in a composable would leak between Vitest cases, whereas Pinia is
recreated per test by `createPinia()`/`setActivePinia()` in every existing
`*.dom.test.ts`. The addition is purely additive to the store's public surface.

**New store state** (`frontend/src/stores/sectorStore.ts`, additive):

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

**Value object:**

| Name | Where | Shape |
|---|---|---|
| `LinkNotice` | new, `stores/sectorStore.ts` | `{ kind: 'sid' \| 'planet' \| 'coordinates'; path: string } \| null` |

**Wire `navigation-002`'s two branches to the notice.** In
`frontend/src/composables/useSectorLink.ts`'s `answerTheUrl`, add the raise call into both
existing fail-soft branches (the code otherwise is unchanged from `navigation-002`):

```ts
if (route.name === 'not-found') {
    await router.replace({ path: '/' });
    store.raiseLinkNotice('sid', '/');
    return;
}
...
const params = decodeSid(raw);
if (params === null) {
    await router.replace({ path: '/' });
    store.raiseLinkNotice('sid', '/');
    return;
}
```

**New component — `frontend/src/components/LinkNotice.vue`.** Decision 6: an inline strip
at the top of the destination page, not the full-page error state (`HomeView.vue:51`,
which stays exactly as it is for generation failures).

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
- It does not survive a reload: the state is a plain `ref` in the store, never persisted,
  and the corrective `replace` has already cleaned the URL.
- Styling follows the existing warning surface in `HomeView.vue:51-66` (rounded card,
  `rgb(239 68 68 / .3)` border over `rgb(239 68 68 / .06)`), reduced to a full-width strip.

**`App.vue` change:** mount `<LinkNotice />` between `<AppTopBar />` and `<main>`. (The
`useCoordinateGuard()` mount referenced by the wider spec is `navigation-005`'s job — this
slice does not add it.)

Note the `planet` and `coordinates` notice kinds are defined and rendered by this slice's
`LinkNotice.vue`, but nothing raises them yet — that is `navigation-005`'s job
(`useCoordinateGuard`). This slice only wires the two `sid`-kind cases that already exist
from `navigation-002`.

## Tests

`frontend/src/components/linkNotice.dom.test.ts` (new) — Decision 6:

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

`frontend/src/composables/sectorLink.dom.test.ts` — extend `navigation-002`'s tests 32 and
32b to additionally assert the `sid` notice is raised:

32. A malformed sid (`/not-a-sector`) replaces to `/`, generates nothing, and raises the
    `sid` notice.
32b. An unmatched address (`/system/66`, `/a/b/c`) replaces to `/`, generates nothing, and
    raises the same `sid` notice.

Regression coverage to keep green:

78. `frontend/src/stores/sectorStore.test.ts` — unchanged; the store additions are
    additive.

Success criteria pinned by this slice:

- SC9: an invalid sid lands on `/` with the `sid` notice, never a blank page.
- SC10: `/system/66` and `/a/b/c` land on `/` with the notice and a rendered `HomeView`.
- SC13: the notice strip appears above the destination page, is dismissible, disappears on
  its own, and is absent after a reload of the corrected URL.

**Priority:** High
**Dependencies:** navigation-002-sector-scoped-routes (independent of navigation-003 — can
be implemented in parallel with it)
