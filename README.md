# Stellar Universe Generator

A web application for generating procedural star systems with realistic astronomical characteristics. Features a Vue.js frontend and Node.js backend.

## Features

- **Procedural Generation**: Generate realistic star systems with 24 spectral classes and 9 planet types
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

9 planet types with different characteristics:

- **A**: Asteroid Belt
- **G**: Gas Giant
- **R**: Rocky Planet
- **C**: Carbon Planet
- **D**: Desert Planet
- **H**: Hell Planet
- **M**: Molten Planet
- **E**: Earth-like Planet
- **#**: Unknown Planet Type

## Generation Logic

### Star Generation
- Uses 3-level probability cascade for rare star types
- Subclasses generated for appropriate star types (1-10, or 5-9 for O-class)
- Planet count determined by dice formulas per star type

### Planet Generation
- Habitable zone determined by total planets and position
- Planet type weighted differently in each zone
- Diameter calculated using dice formulas with multipliers
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