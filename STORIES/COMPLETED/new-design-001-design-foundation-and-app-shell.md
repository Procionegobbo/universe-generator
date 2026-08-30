# new-design-001-design-foundation-and-app-shell

**Spec:** STORIES/SPECS/new-design.md

**As a** visitor of the Universe Generator
**I want** the app shell (design tokens, fonts, top bar, celestial-image rendering, and health
polling) rebuilt on the new dark mission-console visual language
**So that** the redesigned console has a consistent visual and structural foundation before the
deeper screens are built, and the existing Documentation / API Reference pages keep rendering
exactly as they do today

## Acceptance Criteria

```gherkin
Feature: Design foundation and app shell

  # --- Design tokens (7.1) ---

  Scenario: Theme tokens are added without touching legacy rules
    Given "frontend/src/style.css"
    When the file is updated
    Then a "@theme" block is prepended immediately after "@import \"tailwindcss\";", declaring
      the color, font, and radius tokens listed in the spec's §7.1
    And a "ug-" prefixed component layer is appended (".ug-panel", ".ug-btn-primary",
      ".ug-btn-outline", ".ug-btn-danger", ".ug-badge" and its "-iau"/"-life"/"-hot"/
      "-temperate"/"-goldilocks"/"-cold" variants, ".ug-row-life", ".ug-row:hover",
      ".ug-skeleton", and input[type=range] styling)
    And every pre-existing rule (":root" variables, ".container", ".card", ".btn*", ".form-*",
      ".table*", ".loading", the "@media (max-width: 768px)" block) is byte-identical to master
    And only "body"'s font-family and background properties change, to the new tokens

  Scenario: Fonts load with a full local fallback
    Given "frontend/index.html"
    Then it links "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
    And carries "<link rel=\"preconnect\">" for both "fonts.googleapis.com" and "fonts.gstatic.com"
    And the "<title>" is "Universe Generator"
    And a "<meta name=\"color-scheme\" content=\"dark\">" tag is present
    And the inline body background/font block matches the new "style.css" tokens

  # --- App.vue shell and the named regression risk ---

  Scenario: App.vue renders AppTopBar and a full-bleed router-view
    Given "frontend/src/App.vue"
    When the app renders any route
    Then "AppTopBar.vue" replaces the previous 6-item header and 3-link footer
    And "<router-view>" is no longer wrapped in the old "container py-8" div for "/" and
      "/system/:id"
    And "<Analytics />" is still rendered
    And the top bar logo still routes to "/"

  Scenario: /documentation and /api-reference keep their prior measure and padding
    Given the "container py-8" wrapper removal in App.vue
    When the route is "/documentation" or "/api-reference"
    Then a per-route conditional (or each view's own root element) re-applies "container py-8"
      so both pages render at an unchanged measure and padding
    And "/api-reference" in particular does not go edge-to-edge

  Scenario: Export still works from the top bar
    Given a generated sector
    When the export action in "AppTopBar.vue" is triggered
    Then it downloads "stellar-sector-<timestamp>.json", exactly as "App.vue"'s prior
      "exportData()" did

  # --- Backend health polling ---

  Scenario: useBackendHealth polls every 5 seconds
    Given "frontend/src/composables/useBackendHealth.ts"
    When a component calls it
    Then it starts the same 5 s poll App.vue previously ran in onMounted, cleans it up in
      onUnmounted, and exposes status: 'checking' | 'online' | 'offline'

  Scenario: The top bar LED reflects backend status
    Given "AppTopBar.vue" consuming useBackendHealth().status
    Then a green "BACKEND ONLINE" LED shows when status is 'online'
    And a red "BACKEND OFFLINE" LED shows when status is 'offline'
    # The blue "GENERATING" LED state (driven by store.generationStatus) is not wired here —
    # generationStatus does not exist until story 003; it is added to AppTopBar in story 004.

  # --- Celestial image rendering (D-35, D-36, D-37) ---

  Scenario: CelestialThumb picks thumbs vs medium by rendered size
    Given "frontend/src/components/CelestialThumb.vue" with props kind, code, px, and optional
      ring/glow
    When px is 34 or below
    Then it renders from the "thumbs" directory
    When px is above 34
    Then it renders from the "medium" directory
    And it never hard-codes a size folder outside this rule

  Scenario: CelestialThumb renders decoratively and handles broken files
    Given any "<img>" rendered by CelestialThumb
    Then it carries alt="" and aria-hidden="true"
    And an "@error" handler swaps to "/images/planets/thumbs/unknown.png" (kind=planet) or
      "/images/stars/thumbs/star-default.png" (kind=star)
    And planet images use object-fit: contain on a black backdrop; star images use
      object-fit: cover
    And every image is border-radius: 50%

  Scenario Outline: Every frozen planet code resolves to an existing image (T-F2)
    Given every code in PLANET_TYPE_DESCRIPTIONS from "frontend/src/types/index.ts"
    When getPlanetImage(code, 'thumbs') and getPlanetImage(code, 'medium') are called
    Then both resolve to a file that exists under "frontend/public/"

  Scenario Outline: Every frozen star class resolves to an existing image (T-F3)
    Given every class in STAR_TYPE_DESCRIPTIONS from "frontend/src/types/index.ts"
    When getStarImage(class, 'thumbs') and getStarImage(class, 'medium') are called
    Then both resolve to a file that exists under "frontend/public/"
    And DB, DF, DG and DK all resolve to "star-DA.png" in both sizes

  Scenario: Unrecognised codes fall back to the default images (T-F9)
    Given a planet code not present in PLANET_TYPE_DESCRIPTIONS
    When getPlanetImage is called for both sizes
    Then both resolve to "unknown.png", and the file exists
    Given a spectral class not present in STAR_TYPE_DESCRIPTIONS
    When getStarImage is called for both sizes
    Then both resolve to "star-default.png", and the file exists

  # --- format.ts (D-34 pure module) ---

  Scenario Outline: thinThousands groups with a thin space (T-F17)
    When thinThousands(<input>) is called
    Then it returns "<output>" using U+2009 as the group separator

    Examples:
      | input  | output   |
      | 1204   | 1 204    |
      | 812    | 812      |
      | 142880 | 142 880  |
      | 0      | 0        |

  Scenario: formatCoord uses a true minus sign (T-F18)
    When formatCoord(-4.118) is called
    Then the result contains U+2212, not U+002D
    And is always rendered to 3 decimals

  Scenario: formatPercent never produces NaN (T-F19)
    When formatPercent(27, 812) is called
    Then it returns "3.3%"
    When the denominator is 0
    Then it returns "0.0%"
```

## Technical Notes

**Scope of this story:** the app shell only. No tab content, no rail, no store changes. The
old `HomeView.vue` / `ResultsDisplay.vue` / `SectorControls.vue` bodies are untouched here and
continue to render inside the new full-bleed `<router-view>` until story 004 replaces them.

### 7.1 Design tokens — prepend to `frontend/src/style.css`

Prepend, immediately after `@import "tailwindcss";`, the font `@import` and:

```css
@theme {
  --color-base:        #0a0e17;
  --color-panel:       #0c1322;
  --color-header:      #0d1526;
  --color-input:       #0a1120;

  --color-line-strong:   rgb(148 163 184 / .18);
  --color-line-soft:     rgb(148 163 184 / .12);
  --color-line-hairline: rgb(148 163 184 / .07);
  --color-line-control:  rgb(148 163 184 / .22);

  --color-ink:        #f1f5f9;
  --color-ink-bright: #f8fafc;
  --color-ink-2:      #cbd5e1;
  --color-muted:      #94a3b8;
  --color-dim:        #64748b;
  --color-faint:      #475569;
  --color-ghost:      #334155;

  --color-acc-blue:        #3b82f6;
  --color-acc-blue-600:    #2563eb;
  --color-acc-blue-light:  #93c5fd;
  --color-acc-blue-pale:   #bfdbfe;
  --color-acc-violet:      #8b5cf6;
  --color-acc-violet-light:#c4b5fd;
  --color-acc-violet-pale: #ddd6fe;
  --color-acc-green:       #10b981;
  --color-acc-green-light: #34d399;
  --color-acc-green-mid:   #6ee7b7;
  --color-acc-green-pale:  #a7f3d0;
  --color-acc-amber:       #f59e0b;
  --color-acc-amber-light: #fcd34d;
  --color-acc-red:         #ef4444;
  --color-acc-red-light:   #f87171;
  --color-acc-red-pale:    #fca5a5;

  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system,
               "Segoe UI", Roboto, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo,
               Consolas, monospace;

  --radius-ctl: 4px;  --radius-card: 5px;
  --radius-badge: 3px; --radius-pill: 99px;
}
```

Component classes appended to the same file (all prefixed `ug-`): `.ug-panel`, `.ug-btn-primary`
(`linear-gradient(180deg,#3b82f6,#2563eb)` + `0 6px 18px rgb(37 99 235 / .35)`; hover
`#60a5fa → #3b82f6`), `.ug-btn-outline`, `.ug-btn-danger`, `.ug-badge`, `.ug-badge-iau` /
`-life` / `-hot` / `-temperate` / `-goldilocks` / `-cold`, `.ug-row-life`
(`background rgb(16 185 129 / .06)` + `box-shadow: inset 2px 0 0 #34d399`), `.ug-row:hover`
(`background rgb(148 163 184 / .04)`), `.ug-skeleton`, and `input[type=range]` styling (4px
track, 12px thumb with `box-shadow: 0 0 0 3px rgb(59 130 246 / .25)`), replacing the scoped
range-input block currently in `SectorControls.vue` (that removal itself happens in story 004
when `SectorControls.vue` is rewritten — this story only adds the shared CSS).

**Rule to enforce throughout the redesign:** any number a user might compare is `font-mono`.
Names and prose are `font-sans`.

**D-25 (must hold):** `.container`, `.card`, `.btn*`, `.form-*`, `.table*`, `.loading`, the
`:root` vars and the `@media (max-width: 768px)` block are left byte-identical —
`DocumentationView.vue` (`.card` ×6, `.btn`, `.btn-secondary`) and `ApiReferenceView.vue`
(`.card` ×3, `.btn`, `.btn-secondary`) depend on them. Only `body`'s font stack and background
change, to the new tokens; both pages already render on a dark ground.

**D-26 (no action):** `frontend/tailwind.config.js` stays untouched and inert — Tailwind v4
via `@tailwindcss/postcss` does not auto-load it.

### Fonts — `frontend/index.html`

Exact URL: `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`,
with `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com`. Fallbacks:
sans → `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; mono →
`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. `display=swap` means an offline
client renders the fallback stack, not blank text (D-33). This is the app's only new external
runtime dependency; no CSP exists today, so nothing to update.

### App.vue — the named regression risk (§6 regression review)

The `<div class="container py-8">` wrapper around `<router-view>` (line 55, `max-width: 1200px`)
is removed so the console can go full-bleed. Verified per view:
- `DocumentationView.vue` has its own inner `max-w-7xl mx-auto px-4 lg:px-8` — it would merely
  widen from 1200px to 1280px and lose its vertical padding if left unmitigated.
- `ApiReferenceView.vue` has **no** width constraint of its own — it would go edge-to-edge, a
  real regression.

**Required mitigation:** keep the wrapper for those two routes only, via a per-route
conditional on `route.name` in `App.vue` (`<div :class="isLegacyRoute ? 'container py-8' : ''">`),
or add `container py-8` to each view's own root element. Either keeps both measures identical;
verify both pages manually (success criterion 14, manual checklist item 2).

Preserve: `<Analytics />`, `exportData()` (moved into `AppTopBar` as an emitted action — still
downloads `stellar-sector-<ts>.json`), the 5 s health poll (moved into `useBackendHealth`,
below), and the logo routing to `/`.

### `useBackendHealth.ts` (new, `frontend/src/composables/`)

Moves `App.vue`'s `onMounted`/`onUnmounted` 5 s poll verbatim. Returns
`status: 'checking' | 'online' | 'offline'` (per §6's New files table — this composable does
**not** know about generation state). `AppTopBar.vue` maps `status` to the green/red LED here;
the additional blue `GENERATING` branch (driven by `store.generationStatus === 'running'`) is
wired into `AppTopBar.vue` in story 004, once that store field exists — do not add it now, it
would fail `vue-tsc` against the not-yet-extended store.

### `CelestialThumb.vue` (new, `frontend/src/components/`)

Props: `kind` (`'planet' | 'star'`), `code`, `px`, optional `ring`, `glow`. Picks the directory
itself per the handoff's size rule: `thumbs` at ≤ 34px rendered, `medium` above — no caller
ever hard-codes a size folder. Reuses the existing, unchanged functions
`getPlanetImage(code, size)` from `utils/planetImages.ts` and `getStarImage(spectralClass, size)`
from `utils/starColors.ts`. Rendering: `border-radius: 50%` always; `object-fit: contain` on a
black backdrop for planets, `object-fit: cover` for stars. Every `<img>` carries `@error` →
swap to `/images/planets/thumbs/unknown.png` or `/images/stars/thumbs/star-default.png`.
Per the handoff's accessibility note, all celestial renders are decorative: `alt=""` plus
`aria-hidden="true"`, with the class or type always named in adjacent text (enforced by the
consuming component, not this one).

**D-37 (must hold):** the renders under `frontend/public/images/` are the shipped, approved
artwork. This story consumes them and produces none — no image is generated, redrawn,
re-exported, re-cropped, renamed, replaced or deleted, and nothing is copied out of
`STORIES/SPECS/design_handoff_universe_generator_ui/`. `frontend/public/images/` must be
unmodified by this work (verified by `git diff master -- frontend/public/images/` being empty).

**Known fallback cases** (already handled by the existing, untouched functions — this story
only tests them):
1. Every one of the 22 `PLANET_TYPE_DESCRIPTIONS` codes has a file; an unrecognised code
   returns `unknown.png` (exists both sizes).
2. `DB`/`DF`/`DG`/`DK` have no dedicated render — `getStarImage` already aliases all four to
   `star-DA.png`. Deliberate and preserved (D-37); they are the same physical object (a white
   dwarf) and the adjacent text always names the exact class.
3. Unrecognised spectral class → `star-default.png` (exists both sizes).
4. Missing file at runtime (a deploy slip) → the `@error` handler above.

### `format.ts` (new, `frontend/src/utils/`)

`thinThousands` (groups with U+2009 thin space), `trueMinus` (U+2212, used by `formatCoord`),
`formatCoord` (always 3 decimals), `formatAu`, `formatPercent` (never `NaN`, zero denominator
→ `0.0%`).

### Not touched by this story

`frontend/src/stores/sectorStore.ts`, `frontend/src/views/HomeView.vue` (body untouched, only
now rendered full-bleed by the new `App.vue`), `frontend/src/components/SectorControls.vue`,
`frontend/src/components/ResultsDisplay.vue` and every tab component, `frontend/src/types/index.ts`,
`frontend/src/router/index.ts`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`,
`backend/` entirely.

## Tests

`frontend/src/utils/format.test.ts` (new):
- **T-F17** — `thinThousands(1204)` → `1 204` with U+2009; `812` → `812`; `142880` →
  `142 880`; `0` → `0`.
- **T-F18** — `formatCoord(-4.118)` renders U+2212, not U+002D, and always 3 decimals.
- **T-F19** — `formatPercent(27, 812)` → `3.3%`; a zero denominator → `0.0%`, never `NaN`.

`frontend/src/utils/imageAssets.test.ts` (new) — filesystem-backed:
- **T-F2** — for every code in `PLANET_TYPE_DESCRIPTIONS`, both `getPlanetImage(code,'thumbs')`
  and `(code,'medium')` resolve to a file that exists under `frontend/public/`.
- **T-F3** — for every class in `STAR_TYPE_DESCRIPTIONS`, both sizes of `getStarImage` resolve
  to an existing file; `DB`, `DF`, `DG`, `DK` all resolve to `star-DA.png`.
- **T-F9** — an unrecognised planet code resolves to `unknown.png` and an unrecognised
  spectral class to `star-default.png`, in both sizes, and both files exist.

**Manual verification (D-34, no automated coverage):**
- Top bar matches the handoff's top-bar treatment; export and the health LED still work.
- `/documentation` and `/api-reference` render at their previous measure and padding — the
  named regression risk in §6; `/api-reference` in particular must not go edge-to-edge.
- Offline backend → red LED, `BACKEND OFFLINE`.

**Priority:** Critical
**Dependencies:** None
