# Stellar Universe Generator

A web application for generating procedural star systems with realistic astronomical characteristics. Features a Vue.js frontend and Node.js backend.

![logo.png](frontend/public/images/logo.png)

## Features

- **Procedural Generation**: Generate realistic star systems with 24 spectral classes and 21+ planet types
- **3D Spatial Coordinates**: Systems are placed in a 3D sector with random coordinates
- **Habitable Zones**: Each orbit is classified against the star's optimistic Goldilocks bounds (recent Venus / early Mars, `√(L/1.78)` … `√(L/0.32)`); only planets in the habitable band are flagged
- **Thermal Zoning**: Planet types are biased by orbital temperature — hot types (Molten, Hell) cluster near the star, frozen types (Ice, Methane) appear in the cold outer orbits
- **Surface Temperature**: Every planet reports a surface temperature computed from stellar flux, corrected for the planet's albedo and greenhouse effect
- **Life**: Planets in the habitable band are scored for habitability from their star, temperature, radius, atmosphere and system age, then gated by an abiogenesis probability — a default 100-system sector carries around 2–3 inhabited worlds, and some carry none. Inhabited planets get a proper name and a complexity from microbial life to intelligent life
- **Realistic Orbits**: Refined Titius-Bode spacing with the special Mercury term and a damped outer growth ratio (so the outer planets match reality, e.g. Neptune ≈ 30 AU)
- **Dice Notation Formulas**: Uses dice notation (e.g., "2d6+3") for probabilistic calculations
- **Responsive UI**: Modern Vue.js interface with real-time data visualization
- **REST API**: Node.js backend with Express for generation logic
- **Persistent Parameters**: Generation parameters (seed, system count, sector volume, zone) are saved in localStorage only when a new sector is generated
- **Regeneration on Reload**: When the user returns, the app offers to regenerate the sector using saved parameters (with confirmation)

## Project Structure

```
universe-generator/
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── index.ts        # Express server entry point
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript interfaces
│   ├── lib/                # Core generator logic
│   ├── package.json        # Backend dependencies
│   └── tsconfig.json       # TypeScript configuration
├── frontend/               # Vue.js frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Vue composables
│   │   ├── types/          # TypeScript interfaces
│   │   ├── App.vue         # Root component
│   │   └── main.ts         # Vue app entry
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── index.html          # HTML entry point
├── package.json            # Root package.json
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm run install:all
```

### Development

Start both backend and frontend in development mode:

```bash
npm run dev
```

This will start:
- Backend API on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`

### Individual Servers

Start backend only:
```bash
npm run backend
```

Start frontend only:
```bash
npm run frontend
```

### Production Build

Build both projects:

```bash
npm run build
```

Start production backend:
```bash
npm start
```

## Persistent Memory (Frontend)

- The app saves only the generation parameters (seed, systemCount, sectorVolume, zone) in localStorage.
- Parameters are saved **only** when a new sector is generated (not on every change).
- On reload, if parameters are found, the empty state offers a **RESTORE LAST SECTOR** button, which
  regenerates from them. Nothing is restored without asking: generation is deterministic, so the same
  parameters reproduce the same sector exactly.
- **CLEAR MEMORY** discards the saved parameters.
- No sector data is stored, only parameters.

## Shareable Links

Because no sector is ever stored, a link has to carry everything needed to rebuild the one it is
pointing at. Opening a link on a machine that has never generated that sector makes it on the spot.

```
/system/<systemId>?seed=<seed>&zone=<zone>&systems=<count>&volume=<pc3>[&planet=<starId>-<orbitalNumber>]
```

| Parameter | Meaning |
|---|---|
| `seed` | generator seed |
| `zone` | `extragalactic`, `galactic edge`, `medium`, `central zone` or `core` |
| `systems` | how many systems to generate |
| `volume` | sector volume in pc³ |
| `planet` | optional; opens the detail panel on one planet |

The app writes these itself: the four sector parameters appear as soon as a sector is loaded, and
`planet` is added when a planet panel is opened and removed when it is closed. Copy the address bar
and the link is complete.

### Why all four

`seed` and `zone` decide what every star and planet **is** — the same seed under a different zone is
a different universe, so a link naming only the seed could open a different planet under the same
name. `systems` decides how many systems exist, and a link to a system past the reader's own count
would otherwise find nothing. `volume` scales the coordinates. All four are required: a partial set
is refused rather than completed from whatever the reader happens to have set, and a `planet` whose
sector cannot be read is dropped rather than resolved against the wrong sky.

A link naming the sector already on screen changes nothing; one naming a different `seed` or `zone`
rebuilds it. Links shared before this format existed carry only `seed` and will not rebuild anything.

## Testing

- Unit tests cover the persistence logic: parameters are saved only after generation, restored on reload, and cleared on reset.
- Tests use Vitest and TypeScript.
- To run tests:

```bash
npm run test
```

## API Endpoints

### Backend API (`http://localhost:3000`)

- `GET /` - API information
- `GET /api/sector/health` - Health check
- `POST /api/sector/generate` - Generate sector

#### Generate Sector Request

```json
{
  "systemCount": 100,
  "sectorSize": 1000
}
```

#### Generate Sector Response

```json
{
  "success": true,
  "data": {
    "systems": [...],
    "stars": [...],
    "planets": [...]
  },
  "stats": {
    "systemCount": 100,
    "starCount": 150,
    "planetCount": 450,
    "generationTimeMs": 120
  }
}
```

#### Planet Object

```json
{
  "starId": 1,
  "orbitalNumber": 3,
  "planetType": "E",
  "diameter": 12000,
  "moonCount": 1,
  "mass": 4.97e24,
  "gravity": 9.23,
  "semiMajorAxis": 1.0,
  "temperature": 288,
  "habitableZone": true,
  "lifeProbability": 0.5252,
  "lifeComplexity": 2.07,
  "hasLife": true,
  "name": "Arrakis"
}
```

`semiMajorAxis` is in AU, `temperature` is the surface temperature in Kelvin (albedo + greenhouse), and `habitableZone` is `true` only when the orbit falls in the star's habitable band.

`lifeProbability` is the habitability score `P` — the odds the world *could* host life, not that it does; realisation is gated by a further abiogenesis factor. `lifeComplexity` is `P × C(t_bio)` on a 0–6 scale, which the UI rounds and clamps into the six named stages. `hasLife` is the realised outcome, and `name` is present only when it is `true`.

## Star Types

The generator supports 24 spectral classes:

- **Main Sequence**: O, B, A, F, G, K, M
- **White Dwarfs**: DB, DA, DF, DG, DK
- **Giants**: gF, gG, gK, gM
- **Neutron Stars**: NS
- **Supergiants**: cB, cA, cF, cG, cK, cM
- **Black Holes**: BH

## Planet Types

21+ planet types with realistic characteristics and diameters:

- **A**: Asteroid Belt (0 km)
- **G**: Gas Giant (50,000–140,000 km)
- **Q**: Hot Gas Giant (50,000–140,000 km)
- **U**: Uranian/Ice Giant (30,000–60,000 km)
- **S**: Super-Earth (9,000–15,000 km)
- **R**: Rocky Planet (3,000–9,000 km)
- **E**: Earth-like Planet (6,000–7,000 km)
- **O**: Ocean Planet (6,000–15,000 km)
- **I**: Ice Planet (6,000–15,000 km)
- **D**: Desert Planet (3,000–9,000 km)
- **C**: Carbon Planet (3,000–9,000 km)
- **L**: Silicate Planet (3,000–9,000 km)
- **F**: Iron Planet (3,000–7,000 km)
- **T**: Toxic Planet (4,000–15,000 km)
- **N**: Ammonia Planet (6,000–15,000 km)
- **B**: Methane Planet (6,000–15,000 km)
- **J**: Jungle Planet (6,000–9,000 km)
- **W**: Dwarf Planet (600–2,500 km)
- **H**: Hell Planet (3,000–9,000 km)
- **M**: Molten Planet (3,000–9,000 km)
- **X**: Cold Desert Planet (3,000–9,000 km)
- **#**: Unknown Planet Type

### Planet Diameter Formulas

Each planet type uses a dice formula to generate a realistic diameter (in km). Example formulas:

- Gas Giant: `1d10+4` × 10,000 km
- Super-Earth: `1d7+8` × 1,000 km
- Rocky: `1d7+2` × 1,000 km
- Dwarf: `1d20+5` × 100 km

See `backend/src/lib/example_star_generator.ts` for the full table and scientific references.

## Generation Logic

### Star Generation
- Uses 3-level probability cascade for rare star types
- Subclasses generated for appropriate star types (1-10, or 5-9 for O-class)
- Planet count determined by dice formulas per star type

### Planet Generation
- Planet type is selected using a weighted random distribution based on exoplanet statistics and scientific plausibility
- Base weights are then biased by the orbital thermal zone (hot types near the star, frozen types far out), with rare exceptions still possible
- Each planet type has a realistic diameter formula (see above)
- Moon count determined probabilistically

### Orbital Mechanics
- Distances follow a refined Titius-Bode law computed by `orbitalDistance(orbit)`:
  - orbit 1 uses the special Mercury term (`0.4 AU`)
  - later orbits add a growing "excess" that doubles each step, then grows by only ×1.5 once it passes ~19 AU — this damps the classic law's overshoot beyond Uranus so the outer planets match reality (e.g. orbit 9 ≈ 29 AU, near Neptune's 30 AU)
- The whole ladder is scaled by `√L` (stellar flux goes as `L/a²`, so each orbit index keeps the same insolation for every star class — without it a red dwarf's planets would all sit far outside its habitable zone), and pushed outward if the star is physically large so no orbit falls inside a bloated giant's envelope
- Each orbit then gets a ±15% random spread, so systems differ instead of every star sharing an identical layout (small enough that orbits keep their ordering)
- Reference ladder for the Sun, before jitter: `0.4, 0.7, 1.0, 1.6, 2.8, 5.2, 10.0, 19.6, 29.2, 43.6, …` AU

### Temperature & Habitability
- Each orbit is classified into a thermal zone using the star's optimistic Goldilocks bounds (recent Venus / early Mars) `a_inner = √(L/1.78)` and `a_outer = √(L/0.32)` (~0.75–1.77 AU for the Sun): Zone A (hot, inside `a_inner`), Zone B (habitable, between), Zone C (cold, beyond `a_outer`). With the √L-scaled ladder this band lands on the Earth- and Mars-equivalent orbits (3 and 4) for every star class, with the jitter shifting which of them qualifies from system to system
- Stellar remnants with no luminosity (neutron stars, black holes) get no planets: the flux-based model does not apply to them
- The zone drives both planet-type selection and the `habitableZone` flag (`true` only in Zone B)
- Surface temperature: `T_eq = 278.3 · ((1 − albedo) · L)^0.25 · a^−0.5`, then `T_surface = T_eq + greenhouse`, with albedo and greenhouse taken from the planet type — so a thick-atmosphere world can be hotter than a closer bare rock (as Venus is hotter than Mercury)

### Life & Habitability
- Each system is given an `age` in Gyr, drawn from a range that follows the zone's stellar population — core sectors skew old, outer sectors young
- Planets flagged `habitableZone` are scored `P = S × T × R × A × A_age`: the host star's spectral class, a Gaussian on Earth's 288 K with a 30 K tolerance, the planet's radius in Earth radii, an atmosphere factor by planet type, and a stellar-age factor gated by the star's main-sequence lifetime `L = 10 · (M/M☉)^−2.5`
- Anything past its main sequence scores zero, so giants, white dwarfs, neutron stars, black holes and short-lived O and B stars carry no life by construction
- `P` says whether a world *could* host life. It is multiplied by an abiogenesis factor of `0.1` — the odds life ever got started — before the draw that decides. That factor is the single knob for how common life is: at `0.1` a default 100-system sector carries around 2–3 inhabited worlds, and some carry none
- Complexity follows the model's `C_index = P × C(t_bio)`, where `t_bio` is the system's age less a 0.5 Gyr delay for prebiotic chemistry. The API returns the raw index; the UI rounds and clamps it to six named stages, from microbial life to intelligent life
- Inhabited worlds take a proper name drawn without replacement from a pool of 288 names. Only very large sectors exhaust it, after which worlds fall back to a `<star name> <roman orbit>` designation, so every inhabited planet stays uniquely named
- Life draws from its own PRNG stream (`<seed>::life`), so adding it left the geometry, spectral classes, planets and system and star names of every pre-existing seed unchanged
- The model is documented in `docs/exoplanet-habitability-model.md`; the abiogenesis factor is an implementation term the document does not model
- A planet's displayed label and description are resolved from its type together with its life outcome, so a Jungle-class world with no biosphere is presented as a rain world rather than a jungle. The stored planet type is unchanged.

### System Generation
- Random 3D positions within sector cube
- Star count determined probabilistically (1-4 stars per system)
- Planet count adjusted for multi-star systems

## Frontend Features

- **Sector Controls**: Adjust system count and sector size with sliders
- **Data Tables**: Filterable and sortable tables for stars and planets, including filters for which systems and planets carry life
- **Statistics**: Visual distribution charts and averages
- **Export**: Download generated data as JSON
- **Responsive Design**: Works on desktop and mobile
- **Persistent Parameters**: Parameters are saved only on generation, not on every change
- **Restore**: An explicit RESTORE LAST SECTOR button regenerates from the saved parameters
- **Shareable Links**: Every view names its sector in the URL, so a link rebuilds it on any machine

## Technology Stack

### Backend
- Node.js with Express
- TypeScript
- CORS enabled for frontend communication

### Frontend
- Vue.js 3 with Composition API
- TypeScript
- Vite for development and building
- Axios for API calls
- CSS with modern features (Flexbox, Grid, custom properties)

## Development Notes

- The core generator logic is in `backend/src/lib/example_star_generator.ts`
- TypeScript interfaces are shared between frontend and backend
- Frontend proxies API calls to backend during development
- CORS is configured to allow frontend communication
- Persistent memory logic is in `frontend/src/stores/sectorStore.ts`
- Tests for persistence are in `frontend/src/stores/sectorStore.test.ts`

## License

MIT
