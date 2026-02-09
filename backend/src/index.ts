import express from 'express';
import cors from 'cors';
import { createSectorRoutes } from './routes/sector.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const sectorRoutes = createSectorRoutes();
app.use('/api/sector', sectorRoutes);

// Root route
app.get('/', (_req, res) => {
    res.json({
        message: 'Stellar Generator API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/sector/health',
            generate: 'POST /api/sector/generate'
        }
    });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/sector/health`);
});