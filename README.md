# Stellar Universe Generator

A web application for generating procedural star systems with realistic astronomical characteristics. Features a Vue.js frontend and Node.js backend.

## Features

- **Procedural Generation**: Generate realistic star systems with 24 spectral classes and 21+ planet types
- **3D Spatial Coordinates**: Systems are placed in a 3D sector with random coordinates
- **Habitable Zones**: Planets are distributed across inner, habitable, and outer zones
- **Dice Notation Formulas**: Uses dice notation (e.g., "2d6+3") for probabilistic calculations
- **Responsive UI**: Modern Vue.js interface with real-time data visualization
- **REST API**: Node.js backend with Express for generation logic

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

See `backend/lib/example_star_generator.ts` for the full table and scientific references.

## Generation Logic

### Star Generation
- Uses 3-level probability cascade for rare star types
- Subclasses generated for appropriate star types (1-10, or 5-9 for O-class)
- Planet count determined by dice formulas per star type

### Planet Generation
- Planet type is selected using a weighted random distribution based on exoplanet statistics and scientific plausibility
- Each planet type has a realistic diameter formula (see above)
- Moon count determined probabilistically

### System Generation
- Random 3D positions within sector cube
- Star count determined probabilistically (1-4 stars per system)
- Planet count adjusted for multi-star systems

## Frontend Features

- **Sector Controls**: Adjust system count and sector size with sliders
- **Data Tables**: Filterable and sortable tables for stars and planets
- **Statistics**: Visual distribution charts and averages
- **Export**: Download generated data as JSON
- **Responsive Design**: Works on desktop and mobile

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

- The core generator logic is in `backend/lib/example_star_generator.ts`
- TypeScript interfaces are shared between frontend and backend
- Frontend proxies API calls to backend during development
- CORS is configured to allow frontend communication

## License

MIT