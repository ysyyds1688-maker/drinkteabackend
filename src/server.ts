import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db/database.js';
import { initTestUsers } from './scripts/initTestUsers.js';
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
import importRouter from './routes/import.js';
import webhooksRouter from './routes/webhooks.js';
import schedulerRouter from './routes/scheduler.js';
import forumRouter from './routes/forum.js';
import tasksRouter from './routes/tasks.js';
import userStatsRouter from './routes/user-stats.js';
import badgesRouter from './routes/badges.js';
import achievementsRouter from './routes/achievements.js';
import notificationsRouter from './routes/notifications.js';
import { schedulerService } from './services/schedulerService.js';

// Load environment variables - 明確指定 .env 文件路徑
// 使用 process.cwd() 獲取當前工作目錄（backend 目錄）
const envPath = join(process.cwd(), '.env');
console.log(`[DEBUG] 加載環境變數文件: ${envPath}`);
console.log(`[DEBUG] DATABASE_URL 是否存在: ${process.env.DATABASE_URL ? '是' : '否'}`);
dotenv.config({ path: envPath });
console.log(`[DEBUG] 加載後 DATABASE_URL 是否存在: ${process.env.DATABASE_URL ? '是' : '否'}`);

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Middleware
// CORS 設定：全面開放，確保前端和後台管理系統都能正常運作
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// 明確處理 OPTIONS 請求（確保預檢請求通過）
app.options('*', cors(corsOptions));

// 手動添加CORS頭部（作為備用方案）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 請求超時配置（支持高並發）
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10); // 30秒超時
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: '請求超時' });
    }
  });
  next();
});

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
app.use('/api/import', importRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/forum', forumRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/user-stats', userStatsRouter);
app.use('/api/badges', badgesRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/notifications', notificationsRouter);

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
initDatabase()
  .then(() => initTestUsers())
  .then(() => {
    // 启动定时任务
    schedulerService.startAllTasks();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
      console.log(`📡 API endpoints available at http://0.0.0.0:${PORT}/api`);
      console.log(`💚 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`⚙️ Admin panel: http://0.0.0.0:${PORT}/admin`);
      console.log(`📥 Import API: http://0.0.0.0:${PORT}/api/import`);
      console.log(`🔗 Webhooks API: http://0.0.0.0:${PORT}/api/webhooks`);
      console.log(`⏰ Scheduler API: http://0.0.0.0:${PORT}/api/scheduler`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  schedulerService.stopAllTasks();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  schedulerService.stopAllTasks();
  process.exit(0);
});