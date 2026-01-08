import express from 'express';
import cors from 'cors';
import compression from 'compression';
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
import reportsRouter from './routes/reports.js';
import messagesRouter from './routes/messages.js';
import statsRouter from './routes/stats.js';
import performanceRouter from './routes/performance.js';
import telegramRouter from './routes/telegram.js';
import telegramNotificationsRouter from './routes/telegram-notifications.js';
import miscRouter from './routes/misc.js';
import { schedulerService } from './services/schedulerService.js';
import { initRedis, closeRedis } from './services/redisService.js';
import { authLimiter, readLimiter, writeLimiter, writeLimiterIP } from './middleware/rateLimiter.js';
import { queryLimiter } from './middleware/queryLimiter.js';
import { updateUserActivity } from './middleware/updateUserActivity.js';
import { performanceMonitor } from './middleware/performanceMonitor.js';
import { requestLogger, logger, cleanupOldLogs } from './middleware/logger.js';
import { initErrorTracking, errorTrackingMiddleware } from './services/errorTracking.js';

// Load environment variables - 明確指定 .env 文件路徑
// 使用 process.cwd() 獲取當前工作目錄（backend 目錄）
const envPath = join(process.cwd(), '.env');
console.log(`[DEBUG] 加載環境變數文件: ${envPath}`);
console.log(`[DEBUG] DATABASE_URL 是否存在: ${process.env.DATABASE_URL ? '是' : '否'}`);
dotenv.config({ path: envPath });
console.log(`[DEBUG] 加載後 DATABASE_URL 是否存在: ${process.env.DATABASE_URL ? '是' : '否'}`);

const app = express();

// 靜態文件服務（用於模擬 CDN 上傳的本地文件）
// 將 'uploads' 目錄暴露為 '/uploads' 端點
app.use('/uploads', express.static(join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads')));
const PORT = parseInt(process.env.PORT || '8080', 10);

// Trust proxy - 在 Zeabur 等雲平台上，請求會通過反向代理
// 需要信任代理來正確識別客戶端 IP（用於 rate limiting 等）
// 在生產環境中，Zeabur 會設置 X-Forwarded-For 等頭部
// 注意：設置為 1 表示只信任第一個代理，避免 express-rate-limit 的安全警告
// 設置為 true 會讓任何人都可以繞過 IP-based rate limiting
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1); // 只信任第一個代理，更安全
  console.log('✅ Trust proxy enabled (trusting first proxy only, for production/reverse proxy environments)');
} else if (process.env.TRUST_PROXY === 'false') {
  app.set('trust proxy', false);
  console.log('⚠️  Trust proxy disabled (explicitly set to false)');
} else {
  // 開發環境：如果檢測到 X-Forwarded-For 頭部，啟用 trust proxy
  // 否則保持默認（false）
  console.log('ℹ️  Trust proxy: auto-detecting (development mode)');
}

// Middleware
// CORS 設定：全面開放，確保前端和後台管理系統都能正常運作
// 優先處理 CORS，確保 OPTIONS 預檢請求能正確通過
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// 優先處理所有 OPTIONS 請求（CORS 預檢）
app.options('*', cors(corsOptions));

// 應用 CORS 中間件
app.use(cors(corsOptions));

// ==================== Rate Limit 架構（分層設計）====================
// 重要：不再使用全局 apiLimiter，改為路由層級掛載
// 這樣可以避免一個 API 被打爆就拖全站下水
// 
// 架構：
// - Auth Limiter：5 requests / 1 minute（/auth/login, /auth/register 等）
// - Read Limiter：60 requests / 1 minute（所有 GET 請求）
// - Write Limiter：60 requests / 1 minute / userId + 30 requests / 1 minute / IP（所有 POST/PUT/DELETE）

// 跳過 OPTIONS 請求（CORS 預檢）的輔助函數
const skipOptions = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  next();
};

// 為所有 GET 請求應用 Read Limiter（排除 auth 路由，它有自己的 limiter）
app.use('/api/', skipOptions, (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/auth')) {
    return readLimiter(req, res, next);
  }
  next();
});

// 為所有 POST/PUT/DELETE 請求應用 Write Limiter（排除 auth 路由）
app.use('/api/', skipOptions, (req, res, next) => {
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') && !req.path.startsWith('/auth')) {
    // 先應用 IP 限制
    return writeLimiterIP(req, res, (err) => {
      if (err) return next(err);
      // 再應用用戶限制
      return writeLimiter(req, res, next);
    });
  }
  next();
});

// 應用全局查詢限制（限制查詢參數，防止過大查詢）
app.use('/api/', queryLimiter);

// 啟用 gzip 壓縮（優化 API 響應大小）
app.use(compression({
  filter: (req, res) => {
    // 只壓縮 JSON 和文本響應
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // 壓縮級別 1-9，6 是平衡速度和壓縮率的良好選擇
  threshold: 1024, // 只壓縮大於 1KB 的響應
}));

// 手動添加 CORS 頭部（作為備用方案，確保所有響應都包含 CORS 頭部）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  // OPTIONS 請求已經在上面處理，這裡不需要再次處理
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

// 性能監控中間件（放在最前面以測量所有請求）
app.use(performanceMonitor);

// HTTP 請求日誌中間件
app.use(requestLogger);

// 更新用戶活躍時間（用於在線人數統計）
// 放在 logging 之後，確保所有 API 請求都會經過
app.use(updateUserActivity);

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
app.use('/api/reports', reportsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/telegram-notifications', telegramNotificationsRouter);
app.use('/api', miscRouter);

// 後台管理系統頁面（可視化介面）
app.use('/admin', adminPanelRouter);

// 全局錯誤處理中間件（必須放在所有路由之後，404 之前）
app.use((error: any, req: any, res: any, next: any) => {
  errorTrackingMiddleware(error, req, res, next);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (使用錯誤追蹤)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorTrackingMiddleware(err, req, res, next);
  
  logger.error('HTTP 錯誤', {
    error: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 全局錯誤處理器 - 防止未捕獲的錯誤導致進程退出
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ 未處理的 Promise Rejection:', reason);
  console.error('Promise:', promise);
  // 不要退出進程，記錄錯誤即可
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ 未捕獲的異常:', error);
  console.error('堆棧:', error.stack);
  // 對於未捕獲的異常，我們仍然需要退出，但先記錄錯誤
  // 在生產環境中，應該使用 PM2 或類似的進程管理器來重啟
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  生產環境未捕獲異常，進程將退出');
    process.exit(1);
  } else {
    console.error('⚠️  開發環境未捕獲異常，繼續運行（建議修復）');
  }
});

// Initialize database and start server
initDatabase()
  .then(() => initTestUsers())
  .then(async () => {
    // 确保自动取消预约任务存在
    const { query } = await import('./db/database.js');
    const { v4: uuidv4 } = await import('uuid');
    
    try {
      const existingTask = await query(
        "SELECT * FROM scheduled_tasks WHERE task_type = 'booking_auto_cancel'"
      );
      
      if (existingTask.rows.length === 0) {
        // 创建自动取消预约任务（每小时执行一次）
        const taskId = uuidv4();
        await query(
          `INSERT INTO scheduled_tasks (id, name, task_type, cron_expression, config, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            taskId,
            '自动取消过期预约',
            'booking_auto_cancel',
            '0 * * * *', // 每小时执行一次
            JSON.stringify({}),
            1
          ]
        );
        console.log('✅ 创建了自动取消预约定时任务');
      }

      // 檢查並創建自動解凍預約限制任務
      const existingUnfreezeTask = await query(
        "SELECT * FROM scheduled_tasks WHERE task_type = 'auto_unfreeze_restrictions'"
      );
      
      if (existingUnfreezeTask.rows.length === 0) {
        // 創建自動解凍任務（每小時執行一次）
        const unfreezeTaskId = uuidv4();
        await query(
          `INSERT INTO scheduled_tasks (id, name, task_type, cron_expression, config, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            unfreezeTaskId,
            '自動解凍預約限制',
            'auto_unfreeze_restrictions',
            '0 * * * *', // 每小時執行一次
            JSON.stringify({}),
            1
          ]
        );
        console.log('✅ 已創建自動解凍預約限制任務');
      }
    } catch (error: any) {
      console.warn('创建自动取消预约任务时出现警告:', error.message);
    }
    
    // 初始化錯誤追蹤（Sentry）
    initErrorTracking();
    
    // 初始化 Redis（如果配置了）
    // 注意：Redis URL 後續再加入，目前先以內存緩存運行
    await initRedis();
    
    // 啟動定時清理舊日誌（每天運行一次）
    setInterval(() => {
      cleanupOldLogs(7); // 保留最近 7 天的日誌
    }, 24 * 60 * 60 * 1000); // 每 24 小時運行一次
    
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
    console.error('錯誤堆棧:', error.stack);
    console.error('⚠️  服務器啟動失敗，請檢查：');
    console.error('   1. 數據庫連接配置（DATABASE_URL）');
    console.error('   2. 數據庫服務是否正在運行');
    console.error('   3. 環境變數是否正確設置');
    // 在開發環境中，不要立即退出，給開發者時間查看錯誤
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.error('⚠️  開發環境：服務器未啟動，但進程繼續運行以便查看錯誤');
    }
  });

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  schedulerService.stopAllTasks();
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  schedulerService.stopAllTasks();
  await closeRedis();
  process.exit(0);
});