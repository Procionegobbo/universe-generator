# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Root-Level Commands
- `npm run install:all` – Install dependencies for root, backend, and frontend
- `npm run dev` – Start both backend and frontend in development mode (concurrently)
- `npm run backend` – Start backend only (http://localhost:3000)
- `npm run frontend` – Start frontend only (http://localhost:5173)
- `npm run build` – Build both backend and frontend for production
- `npm start` – Start production backend server (serves built frontend from `/backend/public`)

### Backend (in `/backend`)
- `npm run dev` – Start with nodemon (hot reload)
- `npm run build` – Compile TypeScript to JavaScript
- `npm start` – Run compiled JavaScript

### Frontend (in `/frontend`)
- `npm run dev` – Start Vite dev server
- `npm run build` – Build for production (runs `vue-tsc` then `vite build`)
- `npm run preview` – Preview production build

### Docker
- `docker build -t universe-generator .` – Build multi‑stage Docker image
- The final image serves the frontend statically from the backend at `/backend/public`

## High‑Level Architecture

This is a **full‑stack TypeScript monorepo** with a Node.js/Express backend and a Vue.js 3 frontend.

### Directory Structure
```
universe-generator/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── index.ts        # Express server entry
│   │   ├── routes/         # API routes (sector.routes.ts)
│   │   ├── controllers/    # Request handlers (sector.controller.ts)
│   │   ├── services/       # Business logic (stellar.service.ts)
│   │   ├── lib/           # Core generator (example_star_generator.ts)
│   │   └── types/         # TypeScript interfaces (shared with frontend)
│   └── package.json
├── frontend/               # Vue.js 3 SPA
│   ├── src/
│   │   ├── components/     # Vue components (ResultsDisplay, SectorControls, etc.)
│   │   ├── composables/    # Vue composables (useSectorApi.ts)
│   │   ├── stores/        # Pinia store (sectorStore.ts)
│   │   ├── types/         # TypeScript interfaces (shared with backend)
│   │   ├── views/         # Route views (HomeView, DocumentationView)
│   │   ├── router/        # Vue Router configuration
│   │   ├── App.vue        # Root component
│   │   └── main.ts        # Vue app entry
│   ├── vite.config.ts     # Vite configuration with proxy to backend
│   └── package.json
├── package.json           # Root package with monorepo scripts
├── Dockerfile            # Multi‑stage Docker build
├── README.md            # Project documentation
└── stellar_prompts.md   # AI image generation prompts for star classes
```

### Key Architectural Patterns
1. **Shared Types**: TypeScript interfaces in `/backend/src/types` and `/frontend/src/types` are kept synchronized. Changes to data structures must be reflected in both places.
2. **Controller‑Service‑Lib Layering**:
   - Routes delegate to controllers
   - Controllers call services
   - Services use the core generator library (`lib/example_star_generator.ts`)
3. **Vue 3 Composition API**: All components use `<script setup>` syntax and reactive composition functions.
4. **State Management**: Pinia store (`frontend/src/stores/sectorStore.ts`) holds sector data and generation settings with reactive persistence.
5. **Proxy in Development**: Frontend Vite dev server proxies API requests to `http://localhost:3000` (see `frontend/vite.config.ts`).

## Important Implementation Details

### Generation Logic
- **Dice Notation**: Many formulas use dice notation (e.g., `"2d6+3"`). The `parseDiceFormula` function (in `backend/lib/example_star_generator.ts`) evaluates these.
- **Probability Cascade**: Star generation uses a 3‑level cascade for rare star types (see `generateStarType`).
- **Sector Zones**: The sector is divided into zones (core, inner, outer) with different star‑type distributions.
- **3D Coordinates**: Systems are placed randomly within a cubic sector volume; coordinates are stored as `{ x, y, z }`.
- **Habitable Zones**: Planets are assigned to inner, habitable, or outer zones with type‑specific weightings.

### Data Flow
1. Frontend sends generation parameters (`systemCount`, `sectorSize`, `zone`) to `POST /api/sector/generate`.
2. Backend generates sector data (stars, planets, systems) using the core generator.
3. Response includes `systems`, `stars`, `planets` arrays plus generation statistics.
4. Frontend stores the result in the Pinia store and displays it in tables and charts.

### Shared Interfaces
Key shared interfaces (defined in both `/backend/src/types` and `/frontend/src/types`):
- `Sector`, `StarSystem`, `Star`, `Planet`
- `GenerationRequest`, `GenerationResponse`
- `StarType`, `PlanetType` enums

When modifying data structures, update both type definitions.

### Frontend Patterns
- **Composables**: API calls are encapsulated in `useSectorApi.ts`.
- **Reactive State**: The Pinia store uses `ref` and `computed` for reactivity.
- **Component Organization**: Views (`/views`) assemble components (`/components`); composables provide reusable logic.
- **Tailwind CSS v4**: Styling uses utility classes with PostCSS.

### Backend Patterns
- **Express with TypeScript**: Routes and controllers are fully typed.
- **Error Handling**: Centralized error‑handling middleware (see `src/index.ts`).
- **CORS**: Enabled for frontend communication.

## Technology Stack
- **Backend**: Node.js, Express, TypeScript, seedrandom
- **Frontend**: Vue.js 3 (Composition API), TypeScript, Vite, Pinia, Vue Router, Axios, Tailwind CSS v4
- **Build Tools**: TypeScript compiler, Vite, multi‑stage Docker
- **Development**: concurrently, nodemon, ts‑node

## Notable Absences
- No test framework (jest, vitest, etc.) configured
- No linting (eslint, prettier) configured
- No CI/CD configuration files

## Useful References
- `stellar_prompts.md` contains AI image generation prompts for all 24 star classes.
- The core generation algorithm is in `backend/lib/example_star_generator.ts`.
- The frontend store includes state persistence logic (`sectorStore.ts`).
- The Docker image serves the built frontend as static files from the backend.