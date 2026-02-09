# Build stage: Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build stage: Backend
FROM node:20-alpine as backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# Final stage: Production
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/dist ./backend/dist
COPY --from=backend-builder /app/package*.json ./backend/
COPY --from=backend-builder /app/node_modules ./backend/node_modules

# Copy frontend build to a public folder in backend
RUN mkdir -p /app/backend/public
COPY --from=frontend-builder /app/dist ./backend/public

EXPOSE 3000

# Start backend (it will serve the static frontend from /public)
CMD ["node", "backend/dist/index.js"]
