# Handoff: Universe Generator UI Redesign

## Overview

A redesign of the front end of [universe-generator](https://github.com/Procionegobbo/universe-generator) (`https://universe-generator.procionegobbo.it`) — a procedural stellar-sector generator. The current Vue 3 + Tailwind app hides the interesting numbers behind tabs and gives every element the same visual weight. The redesign turns the app into a **mission-console dashboard**: a fixed parameter rail, a permanent KPI strip, and distributions that can be read at a glance using the project's own planet and star renders.

Design goals agreed with the product owner:

1. **Key metrics must not get lost.** Every screen opens with a KPI strip (systems / stars / planets / moons / habitable / life).
2. **Establish hierarchy.** Big monospace numerals, quiet labels, one accent colour per data family.
3. **Star and planet data must be scannable.** Every row carries the actual render thumbnail plus a colour-coded badge (thermal zone, LIFE, IAU).

Aesthetic direction: **scientific instrumentation** — dense, precise, near-NASA. Not neon, not retro-CRT. The existing blue/purple-on-near-black palette is retained.

Out of scope: the 3D sector view (an experiment in the current codebase, explicitly excluded).

## About the Design Files

`Universe Generator UI.dc.html` in this bundle is a **design reference created in HTML** — a prototype showing intended look, layout, and content, not production code to copy. It is a single canvas containing all screens side by side, with option badges (`1a`, `2a`, `3a`, `4a`…) used for review.

The task is to **recreate these designs inside the existing Vue 3 + Vite + Tailwind frontend** (`frontend/` in the repo), using its established component structure — `HomeView.vue`, `SectorControls.vue`, `ResultsDisplay.vue`, `SystemDetailView.vue`, `PlanetDetailModal.vue` — and its existing API client and store. Do not port the inline styles verbatim; express them as Tailwind utilities and, where a value repeats, as a Tailwind theme extension.

Note also that the prototype's per-element inline styles exist because of the tool that produced it. In the real app they should become utility classes.

## Fidelity

**High-fidelity.** Colours, typography, spacing, and the exact copy are final. Recreate pixel-perfectly. Where a value below is given in px, it is the intended rendered value at a 1280px-wide desktop viewport.

The only deliberately loose parts: the number of rows shown in tables (paginate as the API allows) and the exact sample data (seed 482913, 140 systems, etc. is illustrative — it should come from the generator).

---

## Design Tokens

### Colour

| Token | Hex | Use |
| --- | --- | --- |
| `bg/base` | `#0a0e17` | Page background |
| `bg/panel` | `#0c1322` | Parameter rail, filter bars, footers, cards |
| `bg/header` | `#0d1526` | Top bar base (top bar is `linear-gradient(180deg,#111a2c,#0d1526)`) |
| `bg/input` | `#0a1120` | Input fields, unselected segmented options |
| `border/strong` | `rgba(148,163,184,.18)` | Section dividers, top-bar bottom edge |
| `border/soft` | `rgba(148,163,184,.12)` | Grid dividers between KPI cells and panels |
| `border/hairline` | `rgba(148,163,184,.07)` | Table row separators |
| `border/control` | `rgba(148,163,184,.22)` | Inputs, buttons, chips |
| `text/primary` | `#f1f5f9` | Numerals, headings |
| `text/bright` | `#f8fafc` | Emphasised names (highlighted rows) |
| `text/secondary` | `#cbd5e1` | Row labels |
| `text/muted` | `#94a3b8` | Type names, secondary values |
| `text/dim` | `#64748b` | Field labels, captions |
| `text/faint` | `#475569` | Table micro-captions, sub-values |
| `text/ghost` | `#334155` | Disabled / pending |
| `accent/blue` | `#3b82f6` | Primary action, active tab, systems |
| `accent/blue-600` | `#2563eb` | Primary button gradient end |
| `accent/blue-light` | `#93c5fd` / `#bfdbfe` | Systems KPI, cold badge text |
| `accent/violet` | `#8b5cf6` | Stars, export button, secondary series |
| `accent/violet-light` | `#c4b5fd` / `#ddd6fe` | Stars KPI, seed value |
| `accent/green` | `#10b981` | Habitability, primary state |
| `accent/green-light` | `#34d399` / `#6ee7b7` / `#a7f3d0` | Life KPI, HZ badges |
| `accent/amber` | `#f59e0b` / `#fcd34d` | Moons, temperate zone, IAU badge |
| `accent/red` | `#ef4444` / `#f87171` / `#fca5a5` | Hot zone, destructive action |

Spectral-class bar colours (keep consistent with `utils/starHexColors.ts`):
`M` `linear-gradient(90deg,#ef4444,#f97316)` · `K` `#f97316→#fbbf24` · `G` `#fbbf24→#fde68a` · `F` `#fde68a→#fef9c3` · `DA` `#bfdbfe→#e0e7ff` · `A` `#e2e8f0→#f8fafc` · `BH` `#7f1d1d` · `NS` `#a855f7`.

Thermal-zone badges: HOT `bg rgba(239,68,68,.18)` / text `#fca5a5` · TEMPERATE `bg rgba(245,158,11,.18)` / text `#fcd34d` · GOLDILOCKS `bg #10b981` / text `#052e1c` (primary) or `bg rgba(16,185,129,.35)` / text `#a7f3d0` (secondary) · COLD `bg rgba(59,130,246,.18)` / text `#93c5fd`.

### Typography

Two families, loaded from Google Fonts:

- **IBM Plex Sans** — names, headings, prose. Weights 400/500/600.
- **IBM Plex Mono** — all numerals, labels, badges, coordinates, IDs. Weights 400/500/600/700.

Rule: **any number a user might compare is monospace.** Labels are monospace uppercase with letter-spacing; prose and entity names are sans.

| Role | Spec |
| --- | --- |
| KPI numeral (home / stats) | Mono 600, 32–34px, line-height 1 |
| KPI numeral (system detail) | Mono 600, 26px/1 |
| KPI numeral (mobile) | Mono 600, 26px/1 |
| Section label | Mono 600, 11px, letter-spacing .12em, `#e2e8f0` |
| Field / column label | Mono 500, 9px, letter-spacing .14em (.12em in tables), `#64748b`–`#475569` |
| Tab label | Mono 500/600, 11px, letter-spacing .08em |
| Entity name (table row) | Sans 500/600, 12px |
| Entity name (detail header) | Sans 600, 20–21px |
| Type name | Sans 400, 11px, `#94a3b8` |
| Table numeral | Mono 500/600, 11–13px |
| Coordinates | Mono 400, 10px, `#64748b` |
| Badge | Mono 600, 8–9px, letter-spacing .06–.08em |
| Micro caption | Mono 400, 9px, `#475569` |
| Button label | Mono 600/700, 10–12px, letter-spacing .08–.12em |
| Prose | Sans 400, 11–13px, line-height 1.6 |

Numbers use a **thin-space thousands separator** (`1 204`, `142 880`, `5 000`) and a **true minus** (`−4.118`) in coordinates.

### Spacing, radius, effects

- Section padding: `18px` (desktop panels), `14px` (mobile), `20–22px` (hero blocks).
- Top bar height `56px` (48–52px on sub-headers and mobile).
- Table row padding: `9–10px` vertical, gap `10px`.
- Radius: `4px` controls, `5px` cards/buttons, `3px` badges/bars, `99px` pills, `50%` celestial thumbnails.
- Bar/meter heights: `3px` (micro), `6–9px` (distribution), `26px` (stacked zone bar), `34px` (stacked spectral bar).
- Primary button: `linear-gradient(180deg,#3b82f6,#2563eb)`, shadow `0 6px 18px rgba(37,99,235,.35)`.
- Status LED: `6px` circle, `box-shadow: 0 0 8px <colour>`.
- Star glow: `box-shadow: 0 0 24–50px rgba(<class colour>,.45–.6)`.
- Habitable planet ring: `box-shadow: 0 0 0 2px #34d399` (primary) or `rgba(52,211,153,.6)` (secondary).
- Highlighted table row: `background rgba(16,185,129,.05–.07)` + `box-shadow: inset 2px 0 0 #34d399` and `padding-left:8px` on the first cell.

---

## Screens / Views

Screen ids below match the badges on the design canvas.

### 1a — Home / Mission Console (`HomeView.vue`)

**Purpose.** Set generation parameters and read the resulting sector without scrolling or switching tabs.

**Layout.** Full-bleed, 1280px reference width.
- Top bar, `56px`, `padding 0 20px`, `display:flex; justify-content:space-between`.
- Body: `grid-template-columns: 300px 1fr`, `align-items:start`. Left rail has `border-right: 1px solid border/strong`, `background bg/panel`, `min-height 820px`.
- Right column: KPI strip → tab bar → two-column distributions → notable systems.

**Top bar.** Left: 28px round logo (`images/logo.png`), then a two-line lockup — `UNIVERSE GENERATOR` (Sans 600 14px, letter-spacing .02em) over `PROCEDURAL STELLAR SECTOR · v1.1.0` (Mono 400 10px, `#64748b`, .08em). Right, a `gap:8px` flex row: a backend-status pill (green LED + `BACKEND ONLINE`), a seed pill (`SEED` label + `482913` in `#c4b5fd`), and an `EXPORT JSON` button (border `rgba(139,92,246,.45)`, bg `rgba(139,92,246,.14)`, text `#ddd6fe`).

**Parameter rail (`SectorControls.vue`).** Header strip `GENERATION PARAMETERS` (Mono 600 10px, .14em, `#64748b`, `padding 14px 18px`, bottom border). Then `padding 18px`, `flex column`, `gap 20px`:

1. **Systems slider** — label row: `SYSTEMS` (Mono 500 10px .1em `#94a3b8`) left, value `140` (Mono 600 18px `#f1f5f9`) right. Track `4px` `rgba(148,163,184,.18)` radius 2; fill `#3b82f6`; thumb 12px circle with `box-shadow: 0 0 0 3px rgba(59,130,246,.25)`. Bounds caption `1` / `5 000` (Mono 400 9px `#475569`).
2. **Volume slider** — identical, label `VOLUME pc³`, value `1 000`, bounds `10` / `100 k`.
3. **Galactic zone** — `grid-cols-2 gap-6px` of 5 options: `EXTRAGAL.`, `EDGE`, `MEDIUM`, `CENTRAL`, and `GALACTIC CORE` spanning both columns. Unselected: border `border/control`, bg `bg/input`, Mono 500 10px `#64748b`. Selected: border `#3b82f6`, bg `rgba(59,130,246,.18)`, Mono 600 `#bfdbfe`.
4. **Density readout** — a bordered box (`rgba(16,185,129,.35)` / bg `rgba(16,185,129,.07)`) containing: label `STELLAR DENSITY` + verdict pill (`REALISTIC`, bg `rgba(16,185,129,.2)`, `#6ee7b7`); the value `0.239` (Mono 600 22px) with unit `stars / pc³`; a 16px-tall gauge — a 2px rail `linear-gradient(90deg,#475569,#10b981 45%,#f59e0b 75%,#ef4444)` with a white 2px marker at the current value and a faint 1px tick at the expected value; caption `expected 0.140 · marker at current`. **This is the key new affordance** — it tells the user whether their parameters are physically plausible before they generate.
5. **Seed** — a value field (`482913`, Mono 500 12px) plus a 38px reroll button (`⟳`).
6. **Actions** — `GENERATE SECTOR` primary, full width, `padding 13px`, Mono 700 12px .12em. Below, a two-up row: `RESET` (neutral outline) and `CLEAR MEMORY` (red outline `rgba(239,68,68,.3)`, `#f87171`).

**KPI strip.** `grid-cols-5`, cells divided by `border/soft`, each `padding 16px 18px`, `gap 6px`: label (Mono 500 9px .14em `#64748b`), value (Mono 600 34px/1, colour per family), and a 3px progress rail showing the value's share of its own max. The fifth cell, `WORLDS WITH LIFE`, gets `background rgba(16,185,129,.06)`, a green label, and a percentage beside the numeral (`27` · `3.3%`).

**Tab bar.** `padding 0 18px`, items `padding 12px 14px`. Active: `border-bottom: 2px solid #3b82f6`, Mono 600 `#f1f5f9`. Inactive: Mono 500 `#64748b`. Labels carry their counts: `OVERVIEW`, `SYSTEMS · 140`, `STARS · 239`, `PLANETS · 812`.

**Distributions.** `grid-cols-2` with a divider.
- *Left — spectral class.* Header row: title + `n = 239`. Eight rows, each `grid-template-columns: 26px 130px 1fr 44px; gap:10px`: 26px star thumbnail with a 1px class-coloured ring, class + common name (`M · Red dwarf`), an 8px bar on `rgba(148,163,184,.12)` filled with the class gradient, and the count right-aligned (Mono 600 13px). Below, a three-up ratio block: `STARS / SYSTEM 1.71`, `PLANETS / STAR 3.40`, `MOONS / PLANET 1.48`.
- *Right — planet types.* Header + hint `click to filter`. `grid-cols-4 gap-10px` of type cards: `padding 11px`, border `rgba(148,163,184,.16)`, bg `bg/panel`; inside, a row with the 30px planet render and the count (Mono 600 20px), then the type name (Sans 400 10px `#94a3b8`), then a 3px share bar (`#10b981`). The Earth-like card is highlighted: border `rgba(16,185,129,.5)`, bg `rgba(16,185,129,.09)`, green numeral and label. Below, the **habitable-zone occupancy bar**: a 26px stacked bar, radius 3, segments HOT / HZ / TEMP / COLD with the count written inside each in Mono 600 10px.

**Notable systems.** A header row (`NOTABLE SYSTEMS` + `VIEW ALL 140 →` in `#60a5fa`), then `grid-cols-4` of compact entries, each `padding 14px 18px` with a right divider: name + badges (`IAU` outlined amber, `LIFE` filled green), a line with the 20px primary-star thumbnail and `K-4 · 2 stars · 7 planets`, and the coordinates in Mono 400 9px `#475569`.

### 2a — Sector statistics

**Purpose.** The full statistical picture of the generated sector, everything visible without a tab change.

Reuses the 1a top bar (sub-line becomes `SECTOR 482913 · MEDIUM ZONE · 1 000 pc³`) and tab bar with `STATISTICS` active. No parameter rail — content is full width.

**KPI strip.** Six cells this time (`grid-cols-6`): SYSTEMS 140, STARS 239, PLANETS 812, MOONS 1 204, IN HABITABLE ZONE 89, WITH LIFE 27. Each has a sub-caption in Mono 400 9px `#475569` (`1.71 stars each`, `3.40 per star`, `11.0% of planets`, `across 21 systems`). Numeral size 32px. The last two cells share the green tint.

**Panels** (`grid-cols-2`, divider):
- *Spectral class distribution vs. expected IMF.* Same eight rows as 1a but the row grid is `26px 128px 1fr 40px 56px` — bar, count, and percentage. Each bar carries a **1px white tick** at the share expected for the selected galactic zone, so over/under-representation reads instantly. Legend below: a 10px white rule + `tick = share expected for a Medium zone`.
- *Right column*, three stacked blocks separated by `border/soft` and `padding-top 16px`:
  - **System multiplicity** — a 104px-tall column chart, four bars (`1 star` 71, `2 stars` 46, `3 stars` 18, `4+ stars` 5), value above each bar, blue→violet gradient fills stepping through `#3b82f6`, `#6366f1`, `#8b5cf6`, `#a855f7`.
  - **Moons per planet** — an 84px-tall histogram, ten bars `0…9`, amber ramp `#f59e0b → #d97706 → #b45309`, header caption `mean 1.48 · max 9`.
  - **Thermal zone occupancy** — the same 26px stacked bar as 1a, plus a three-up orbit-band summary (`INNER 301`, `MEDIUM 288`, `OUTER 223`).

**Planet type distribution.** Full width, `grid-cols-8` — all present types on one row. Same card as 1a plus a fourth line: share and a secondary fact (`25.9% · 143 moons`; Earth-like reads `2.2% · 18 with life`).

**Bottom row** (`grid-cols-2`):
- *Life by development stage* — four bars: Microbial 16, Simple multicellular 7, Complex 3, Intelligent 1; teal ramp `#065f46 → #0d9488 → #10b981 → #34d399`.
- *Generation run* — four small stat cards (TIME `412 ms`, ZONE `Medium`, VOLUME `1 000 pc³`, DENSITY `0.239` on green), then the note `Re-running with the same seed, volume and zone reproduces this sector exactly.`

### 3a — Systems index

**Purpose.** Find a system among hundreds. Replaces the current card grid with one scannable row per system.

**Filter bar** (`bg/panel`, `padding 12px 18px`, space-between):
- Left group, `gap 10px`, every child `flex:none` with `white-space:nowrap` (they must never wrap):
  - Search field, `width 180px`: `⌕` + placeholder `search name or ID…`.
  - Segmented control (single bordered box, `overflow:hidden`, options divided by `border-left`): `ALL` (active, bg `rgba(59,130,246,.2)`, `#bfdbfe`), `WITH LIFE`, `HZ > 0`, `MULTI-STAR`.
  - Two dropdown pills: `PRIMARY CLASS · ANY ▾` and `SORT · PLANETS ↓`.
- Right: three mini-counters (value Mono 600 14px over a 8px .1em label), divided by 1px 24px rules — `140 SHOWN`, `21 WITH LIFE` (green), `69 MULTI-STAR` (violet).

**Table.** Column grid `40px 190px 112px 44px 52px 52px 46px 1fr 152px`, `gap 10px`, `padding 0 18px`, rows `padding 10px 0` separated by `border/hairline`.

| Column | Content | Style |
| --- | --- | --- |
| ID | `001` | Mono 400 11px `#475569` |
| SYSTEM | name + `IAU` / `LIFE` / `BH` / `NS` badges | Sans 600 12px |
| PRIMARY | 20px star thumbnail + class (`K-4`) | Mono 400 11px |
| ★ | star count | Mono 500 12px, right |
| PLANETS | count | Mono 500 12px, right |
| MOONS | count | Mono 500 12px `#94a3b8`, right |
| HZ | count | Mono 600 12px, `#34d399` when > 0 else `#475569`, right |
| ORBIT PROFILE | the system's planets as thumbnails in orbital order, sized by relative diameter (10–28px), `gap 7–14px`, green 2px ring on habitable ones | — |
| COORDINATES | `12.402 −4.118 33.907` | Mono 400 10px `#64748b`, right |

Rows with life get `background rgba(16,185,129,.05)`. A system with no planets shows `no planetary bodies` in `#334155` in the profile column instead of thumbnails.

**Footer.** `SHOWING 1–12 OF 140` left; pager right (`PREV`, numbered pages with the active one on `rgba(59,130,246,.18)` / border `#3b82f6`, ellipsis, last page, `NEXT`).

### 1d — System detail (`SystemDetailView.vue`)

**Purpose.** Understand one system's structure — where its planets sit relative to the habitable zone.

**Breadcrumb bar**, 52px, `bg #0d1526`: `← SECTOR 482913` (Mono 500 11px `#60a5fa`), `/` separator `#334155`, system name (Sans 600 13px), `IAU` and `LIFE DETECTED` badges. Right: coordinate/age readout `X 12.402 · Y −4.118 · Z 33.907 · AGE 4.2 Gyr` — labels `#64748b`, values `#e2e8f0`, Mono 10px, `gap 22px`.

**KPI strip.** `grid-cols-5`, `padding 14px 18px`, numerals Mono 600 26px/1: STARS 2 (violet), PLANETS 7 (green), MOONS 11 (amber), IN HABITABLE ZONE 2 (green tint cell), TOTAL MASS 1.34 M☉.

**Orbital map.** The centrepiece; replaces the flat card grid of the current app.
- Header: `ORBITAL MAP · KEPLER-442 A` + a legend of three 9px swatches (HOT / GOLDILOCKS / COLD).
- Body: a 150px-tall bordered box, radius 6, with a horizontal thermal gradient `linear-gradient(90deg, rgba(239,68,68,.16) 0%, rgba(245,158,11,.12) 22%, rgba(16,185,129,.2) 34%, rgba(16,185,129,.2) 48%, rgba(59,130,246,.1) 60%, rgba(59,130,246,.16) 100%)`.
- Two vertical `rgba(52,211,153,.6)` rules at the HZ boundaries, labelled `HZ INNER 0.82 AU` / `HZ OUTER 1.41 AU` (Mono 500 8px `#6ee7b7`, top-aligned).
- The primary star sits at the left edge — a 70px render pulled `margin-left:-24px` so it bleeds off-canvas, with a 50px orange glow.
- A 1px `rgba(148,163,184,.25)` orbit line across the middle; planets absolutely positioned by orbital distance (14 %, 25 %, 39 %, 45 %, 62 %, 78 %, 92 %), sized by relative diameter (20–44px), each with its orbit letter beneath. Habitable planets get the green ring and, for the flagship, `0 0 22px rgba(52,211,153,.5)`.

**Lower half**, `grid-template-columns: 300px 1fr`:
- *Stars rail* (`bg/panel`): `STARS IN SYSTEM`, then one entry per star — 52–64px render (sized by relative mass), name (Sans 600 14px), class + common name (Mono 400 10px `#94a3b8`), and `0.61 M☉ · 4 402 K · 7 planets` (Mono 400 9px `#475569`). Entries divided by `border/soft`.
- *Planet table*: header `PLANETS · 7` + `sorted by orbital number`. Grid `38px 1.3fr 1fr 84px 78px 70px 92px`: `#`, name (with thumbnail sized by diameter and a `LIFE` pill where relevant), type, Ø km, temperature (coloured by band: `#fca5a5` hot, `#fcd34d` temperate, `#6ee7b7` habitable, `#93c5fd` cold), moons, and a right-aligned zone badge. Habitable rows use the green tint + inset green rule.

### 4a — Planets table

**Purpose.** Query all planets in the sector across systems.

Same shell, `PLANETS · 812` tab active. Two stacked filter bars:
1. **Type strip** (`bg/panel`): label `TYPE`, then pills — `ALL 812` (active blue) and one per present type, each a 99px pill with the 18px render inside on the left (`padding: 5px 11px 5px 5px`), Mono 500 10px. Earth-like uses the green treatment. A trailing `+1` indicates hidden types. All children `flex:none; white-space:nowrap`.
2. **Zone + sort bar**: label `ZONE`, then `ANY`, `GOLDILOCKS 89` (active green), `WITH LIFE 27`, `WITH MOONS`; right side `SORT Ø DIAMETER ↓` and the row count.

**Table.** Grid `180px 132px 150px 96px 84px 74px 64px 1fr 104px`: PLANET (render + name), TYPE (+ `LIFE` pill), SYSTEM / STAR (`Kepler-442 · K-4`, Mono 10px `#64748b`), Ø km, TEMP (band-coloured), MOONS, ORBIT (`#3`), **RELATIVE SIZE** — an 8px bar whose width is the planet's diameter as a share of the largest in the current result set, filled violet→blue for giants, green for habitable, amber for temperate, red for hot, blue for cold — and the right-aligned zone badge. Habitable rows highlighted as elsewhere.

Footer pager identical to 3a (`SHOWING 1–10 OF 812`, 82 pages).

### 4b — Planet detail panel (replaces `PlanetDetailModal.vue`)

**Purpose.** Inspect one planet without losing the table behind it. A **520px right-hand side panel**, not a centred modal.

Sections, top to bottom:
1. **Header bar**, 48px: `PLANET DETAIL` + `✕`.
2. **Hero**, `padding 22px 18px`, background `radial-gradient(320px 180px at 18% 50%, rgba(16,185,129,.14), transparent 70%)`: the 118px planet render with a 44px glow, beside it the name (Sans 600 21px) + `LIFE` badge, type (`Earth-like · type E`), provenance (`Kepler-442 A · orbit #3 of 7`), and a `GOLDILOCKS ZONE` badge.
3. **Three-up stats**: DIAMETER `13 402` (`km · 1.05 R⊕`), TEMPERATURE `288 K` (`15 °C mean`), MOONS `2` (`tidally stable`). Numerals Mono 600 19px.
4. **Position in system**: a 56px reduction of the orbital map with this planet ringed and glowing; axis caption `0.1 AU` — `HZ 0.82 – 1.41 AU` (green, centre) — `18 AU`.
5. **Physical profile**: four `96px 1fr 62px` rows with 6px bars — Mass `1.18 M⊕` (blue), Gravity `1.07 g` (blue), Density `5.4 g/cm³` (violet), Water cover `66 %` (green).
6. **Life block** (`bg rgba(16,185,129,.06)`): header `LIFE` + stage `COMPLEX MULTICELLULAR`; a two-line description; four outlined pills (`O₂ 21%`, `liquid water`, `magnetosphere`, `1.1 Gyr`).
7. **Actions**: `OPEN SYSTEM` (primary blue) and `COPY JSON` (outline), 50/50.

### 4c — Empty and generating states

Both are 700px-wide centred cards.

**First run.** Top bar reads `NO SECTOR LOADED`. Body on `radial-gradient(500px 260px at 50% 0%, rgba(59,130,246,.1), transparent 70%)`:
- Centred: eyebrow `READY` (Mono 500 10px .22em `#60a5fa`), headline `Generate your first sector` (Sans 600 26px), and one paragraph of body copy, max-width 420px: *"24 star types, 22 planet types, moons and habitable zones from scientific probability distributions. Same seed, same universe, every time."*
- A `grid-cols-4` preview of the pending parameters (SYSTEMS 140, VOLUME 1 000 pc³, ZONE Medium, SEED random) — the empty state carries the parameters rather than the current wall of prose.
- Buttons: `GENERATE SECTOR` primary + `RESTORE LAST SECTOR` outline (shown only when localStorage holds a previous sector).
- A footer rule with four micro-links: `24 star types`, `22 planet types`, `deterministic seeds`, `Documentation` (blue).

**Generating.** Status LED turns blue, label `GENERATING`. Body: `Building sector 482913` + `64%`; a 5px progress rail filled `linear-gradient(90deg,#3b82f6,#8b5cf6)`; then a checklist of the pipeline stages — done rows green with `✓` and a count, current row blue with `▸` and `518 / 812`, pending rows `#334155` with `·` and `pending`. Footer: `elapsed 264 ms` and a red-outline `CANCEL`.

### 4d — Mobile (390px)

- Top bar 50px: logo + two-line lockup (`UNIVERSE GEN` / `SECTOR 482913`), LED and a `≡` menu glyph.
- KPI strip becomes a **2×2 grid** with 26px numerals; the life cell keeps the green tint.
- Tab bar scrolls horizontally, `padding 0 8px`, items `padding 11px 10px`, labels shortened (`STATS`).
- Spectral distribution collapses to `22px 1fr 34px` rows (thumbnail, bar, count — the class name is dropped) with only the top five shown plus a `Show all 8 classes` link.
- Planet types become a 2-column list of icon + count + name.
- Thermal zones keep the stacked bar; counts inside, labels below.
- A **sticky bottom action bar** (`bg #0d1526`, top border): `PARAMETERS ▲` (opens the parameter sheet) and `GENERATE` (primary). Both `padding 13px` — ≥44px touch targets.

---

## Interactions & Behaviour

**Generation.** `GENERATE SECTOR` posts the current parameters and switches the results area to the 4c generating state. The stage checklist should be driven by whatever progress the API reports; if it reports none, animate the stages on a timer and show the elapsed counter. On completion, populate the KPI strip and land on the Overview tab. `CANCEL` aborts the request and returns to the previous sector, or to the empty state if there was none.

**Density gauge.** Recompute on every change to systems or volume, before generation: `density = systems / volume`. Compare against the expected density for the selected zone; the verdict pill reads REALISTIC / SPARSE / DENSE with the box border and pill colour following (green / slate / amber–red). This is a live derived value, not a server response.

**Slider behaviour.** Both sliders are logarithmic — the top of each range (5 000 systems, 100 000 pc³) is far above typical use.

**Filtering.** Planet-type cards in 1a/2a and the type pills in 4a are toggles: clicking one filters the planets table and switches to the Planets tab. Segmented controls in 3a are single-select; the counters on the right update to the filtered set. Sort headers cycle desc → asc → default.

**Navigation.** A system name anywhere (notable systems, 3a rows, 4b `OPEN SYSTEM`) routes to the system detail. A planet row in 4a or 1d opens the 4b side panel over the current view — it slides in from the right (200 ms, `cubic-bezier(.2,.8,.2,1)`), the underlying table keeps its scroll position, and `✕` or `Esc` closes it. Deep-link the panel via a query param so a planet can be shared.

**Hover states.** Table rows: `background rgba(148,163,184,.04)`, cursor pointer. Buttons and pills: raise border to `rgba(148,163,184,.4)` and text one step brighter. Primary button: gradient shifts to `#60a5fa → #3b82f6`. Distribution bars: show a tooltip with the exact count and percentage. All transitions 120–150 ms ease-out. Keep the parameter rail and KPI strip static — no motion on data readouts.

**Loading.** Tables show 8 skeleton rows (`rgba(148,163,184,.07)` blocks, subtle pulse); KPI numerals show `—` until data lands. Never collapse the layout to a spinner.

**Errors.** Backend unreachable: the header LED turns red with `BACKEND OFFLINE`, and the results area shows a compact card — `Generation failed`, the error message in Mono 11px, and a `RETRY` button. Validation (systems or volume out of range) marks the field border `rgba(239,68,68,.5)` with an inline Mono 9px hint; `GENERATE` disables at 40 % opacity.

**Responsive.** ≥1280px as documented. 1024–1279px: parameter rail 260px, KPI strip stays 5-up, distributions stack. 768–1023px: rail collapses into a top drawer, KPI strip 3-up, tables drop the coordinates and orbit-profile columns. <768px: the 4d layout.

**Persistence.** Keep the current app's behaviour of restoring the last sector, and expose it explicitly through `RESTORE LAST SECTOR` in the empty state and `CLEAR MEMORY` in the rail.

**Accessibility.** Every zone and life state is conveyed by a text badge, never colour alone. Planet and star thumbnails are decorative — `alt=""` — with the type named in adjacent text. Tables need real `<table>` semantics or ARIA grid roles; the orbital map needs a text summary for screen readers (planet, type, distance, zone).

## State Management

Extend the existing store rather than introducing a new one.

| State | Type | Notes |
| --- | --- | --- |
| `params.systemCount` | number | 1–5 000, log slider |
| `params.volume` | number | 10–100 000 pc³ |
| `params.zone` | enum | `extragalactic \| edge \| medium \| central \| core` |
| `params.seed` | number \| null | null = random on generate |
| `derived.density` | number | `systemCount / volume`, computed |
| `derived.densityVerdict` | enum | `sparse \| realistic \| dense`, vs. expected for zone |
| `generation.status` | enum | `idle \| running \| done \| error` |
| `generation.stage` | enum | `coordinates \| stars \| planets \| moons \| habitability` |
| `generation.progress` | number | 0–1 |
| `generation.elapsedMs` | number | ticks while running |
| `sector` | object | the generated payload |
| `stats` | object | aggregates; derive client-side if the API doesn't return them |
| `ui.activeTab` | enum | `overview \| statistics \| systems \| stars \| planets` |
| `ui.systemFilters` | object | `{ query, preset, primaryClass, sort }` |
| `ui.planetFilters` | object | `{ types: string[], zone, hasLife, hasMoons, sort }` |
| `ui.selectedPlanetId` | string \| null | drives the 4b panel; mirror to a query param |
| `ui.page` | object | per-table pagination |

The stats aggregates the design needs, if not already served: counts per spectral class, per planet type, planets per thermal band, systems by star count, moons-per-planet histogram, life counts by development stage, and the `stars/system`, `planets/star`, `moons/planet` ratios.

## Assets

All from the repo itself (`frontend/public/images/`) — copied into `images` in this bundle:

- `images/logo.png`
- `images/planets/medium/*.png` — 12 renders, used at 64–118px (planet census, detail hero)
- `images/planets/thumbs/*.png` — 8 renders, used at 10–34px (tables, orbit maps, type cards)
- `images/stars/medium/*.png` — 4 renders (`star-G`, `star-K`, `star-M`, `star-DA`), used at 52–70px
- `images/stars/thumbs/*.png` — 8 renders including `star-BH` and `star-NS`, used at 18–26px

Keep the existing `utils/planetImages.ts` and `utils/starHexColors.ts` mapping logic; the design assumes a thumb/medium size split, so pick the size by rendered dimension (≤34px → thumbs, >34px → medium). Renders are square with transparent or black backgrounds — always `border-radius:50%`, and `object-fit:contain` on a black backdrop for planet cards, `object-fit:cover` for stars.

Fonts: IBM Plex Sans and IBM Plex Mono via Google Fonts, weights 400/500/600/700. No icon library is used — the few glyphs are literal characters (`⌕ ⟳ ✕ ▾ ↓ → ← ▸ ✓ · ≡ ▲ ★`).

## Files

- `screenshots` — a 2× PNG of each screen, named by badge:
  `1a-home-mission-console.png`, `1d-system-detail.png`, `2a-sector-statistics.png`, `3a-systems-index.png`, `4a-planets-table.png`, `4b-planet-detail-panel.png`, `4c-empty-and-generating-states.png`, `4d-mobile.png`.
- `Universe Generator UI.dc.html` — the full design canvas. Screens are marked with badges: `1a` home console, `1d` system detail, `2a` statistics, `3a` systems index, `4a` planets table, `4b` planet detail panel, `4c` empty/generating states, `4d` mobile. Turns `1b` (Field Report) and `1c` (Star Atlas) are **rejected** alternatives kept for reference — do not implement them.
- `images` — the assets listed above.
- `support.js` — runtime for the design file only. Not part of the handoff; do not port.

Source files these designs replace, in `Procionegobbo/universe-generator@master`:

| Design | Repo file |
| --- | --- |
| 1a | `frontend/src/views/HomeView.vue`, `components/SectorControls.vue`, `components/ResultsDisplay.vue` |
| 2a, 3a, 4a | `frontend/src/components/ResultsDisplay.vue` (its tab panels) |
| 1d | `frontend/src/views/SystemDetailView.vue` |
| 4b | `frontend/src/components/PlanetDetailModal.vue` |
| 4c | `frontend/src/views/HomeView.vue` (empty + loading branches) |
