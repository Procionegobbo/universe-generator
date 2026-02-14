// api/index.ts
// Wrapper per Vercel serverless functions
// Importa e ri-esporta l'app Express dal backend

// IMPORTANTE: In production Vercel compila a .js, quindi importiamo .js
import app from '../backend/src/index.js';

export default app;