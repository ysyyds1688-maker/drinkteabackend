import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import profilesRouter from './routes/profiles.js';
import articlesRouter from './routes/articles.js';
import geminiRouter from './routes/gemini.js';
import adminRouter from './routes/admin.js';
import adminPanelRouter from './routes/admin-panel.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    service: '茶湯匯 Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: {
        profiles: '/api/profiles',
        articles: '/api/articles',
        gemini: '/api/gemini',
        admin: '/api/admin'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: '茶湯匯 Backend API',
    version: '1.0.0',
    endpoints: {
      profiles: {
        getAll: 'GET /api/profiles',
        getById: 'GET /api/profiles/:id',
        create: 'POST /api/profiles',
        update: 'PUT /api/profiles/:id',
        delete: 'DELETE /api/profiles/:id'
      },
      articles: {
        getAll: 'GET /api/articles',
        getById: 'GET /api/articles/:id',
        create: 'POST /api/articles',
        update: 'PUT /api/articles/:id',
        delete: 'DELETE /api/articles/:id'
      },
      gemini: {
        parseProfile: 'POST /api/gemini/parse-profile',
        analyzeName: 'POST /api/gemini/analyze-name'
      },
      admin: {
        stats: 'GET /api/admin/stats',
        profiles: {
          getAll: 'GET /api/admin/profiles',
          getById: 'GET /api/admin/profiles/:id',
          create: 'POST /api/admin/profiles',
          update: 'PUT /api/admin/profiles/:id',
          patch: 'PATCH /api/admin/profiles/:id',
          delete: 'DELETE /api/admin/profiles/:id',
          batch: 'POST /api/admin/profiles/batch'
        },
        articles: {
          getAll: 'GET /api/admin/articles',
          getById: 'GET /api/admin/articles/:id',
          create: 'POST /api/admin/articles',
          update: 'PUT /api/admin/articles/:id',
          delete: 'DELETE /api/admin/articles/:id',
          batch: 'POST /api/admin/articles/batch'
        }
      }
    },
    documentation: 'See /api for endpoint details',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '茶湯匯 Backend API'
  });
});

// API routes
app.use('/api/profiles', profilesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/admin', adminRouter);

// 後台管理系統頁面（可視化介面）
app.use('/admin', adminPanelRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
