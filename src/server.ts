import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import profilesRouter from './routes/profiles.js';
import articlesRouter from './routes/articles.js';
import geminiRouter from './routes/gemini.js';
import adminRouter from './routes/admin.js';
import adminPanelRouter from './routes/admin-panel.js';
import syncRouter from './routes/sync.js';
import authRouter from './routes/auth.js';
import reviewsRouter from './routes/reviews.js';
import subscriptionsRouter from './routes/subscriptions.js';
import bookingsRouter from './routes/bookings.js';
import adminUsersRouter from './routes/admin-users.js';
import favoritesRouter from './routes/favorites.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS 設定：全面開放，確保前端和後台管理系統都能正常運作
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// 明確處理 OPTIONS 請求（確保預檢請求通過）
app.options('*', cors());
// 增加請求體大小限制以支援圖片上傳（base64 編碼）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    service: '茶王 Backend API',
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
    message: '茶王 Backend API',
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
    service: '茶王 Backend API'
  });
});

// API routes
app.use('/api/profiles', profilesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/sync', syncRouter);
app.use('/api/auth', authRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/favorites', favoritesRouter);

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
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`⚙️ Admin panel: http://localhost:${PORT}/admin`);
  });
}).catch((error) => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});
