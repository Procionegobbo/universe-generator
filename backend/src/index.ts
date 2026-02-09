import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createSectorRoutes } from './routes/sector.routes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const sectorRoutes = createSectorRoutes();
app.use('/api/sector', sectorRoutes);

// Static files (frontend)
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Support for Single Page Application routing (fallback to index.html)
app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
            // If index.html doesn't exist, just show the API root or error
            if (req.path === '/') {
                res.json({
                    message: 'Stellar Generator API',
                    version: '1.0.0'
                });
            } else {
                next();
            }
        }
    });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
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