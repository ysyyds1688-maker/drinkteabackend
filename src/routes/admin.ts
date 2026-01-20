import { Router } from 'express';
import { spawn } from 'child_process';
import { profileModel } from '../models/Profile.js';
import { articleModel } from '../models/Article.js';
import { userModel } from '../models/User.js';
import { bookingModel } from '../models/Booking.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile, Article } from '../types.js';
import { getPerformanceStats, clearPerformanceMetrics } from '../middleware/performanceMonitor.js';
import { telegramService } from '../services/telegramService.js';
import { getHealthMetrics, getAggregatedMetrics } from '../services/monitoringService.js';

const router = Router();

// ==================== 監控與診斷 ====================
// GET /api/admin/monitor - 系統狀態監控（僅管理員）
router.get('/monitor', async (req, res) => {
  try {
    const stats = getPerformanceStats();
    const health = await getHealthMetrics();
    const aggregated = await getAggregatedMetrics('24h');
    const tgConfigured = telegramService.isConfigured();
    
    res.json({
      performance: stats,
      health,
      aggregated,
      telegram: {
        configured: tgConfigured,
        botToken: !!process.env.TELEGRAM_BOT_TOKEN,
        groupId: !!process.env.TELEGRAM_GROUP_ID,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasRedis: !!process.env.REDIS_URL || !!process.env.REDIS_HOST,
        hasSentry: !!process.env.SENTRY_DSN,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/monitor/clear - 清除性能指標
router.post('/monitor/clear', async (req, res) => {
  try {
    clearPerformanceMetrics();
    res.json({ message: '性能指標已清空' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/health - 詳細健康檢查（僅管理員）
router.get('/health', async (req, res) => {
  try {
    const health = await getHealthMetrics();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ==================== 統計資訊 ====================
// 統計緩存（5分鐘）
let statsCache: { data: any; timestamp: number } | null = null;
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5分鐘

// GET /api/admin/stats - 取得後台統計資訊（帶緩存優化）
router.get('/stats', async (req, res) => {
  try {
    // 檢查緩存
    const now = Date.now();
    if (statsCache && (now - statsCache.timestamp) < STATS_CACHE_TTL) {
      return res.json(statsCache.data);
    }
    
    console.log('GET /api/admin/stats');
    const profilesResult = await profileModel.getAll();
    const articlesResult = await articleModel.getAll();
    const profiles = profilesResult.profiles;
    const articles = articlesResult.articles;
    
    const stats = {
      profiles: {
        total: profiles.length,
        available: profiles.filter(p => p.isAvailable).length,
        unavailable: profiles.filter(p => !p.isAvailable).length,
        new: profiles.filter(p => p.isNew).length,
        byType: {
          outcall: profiles.filter(p => p.type === 'outcall').length,
          incall: profiles.filter(p => p.type === 'incall').length,
        },
        byLocation: profiles.reduce((acc, p) => {
          acc[p.location] = (acc[p.location] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      articles: {
        total: articles.length,
        totalViews: articles.reduce((sum, a) => sum + (a.views || 0), 0),
        byTag: articles.reduce((acc, a) => {
          acc[a.tag] = (acc[a.tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      users: {
        total: 0,
        providers: 0,
        clients: 0,
      },
      bookings: {
        total: 0,
        pending: 0,
        accepted: 0,
        completed: 0,
      },
      updatedAt: new Date().toISOString(),
    };
    
    // 获取用户统计
    try {
      const allUsers = await userModel.getAll?.() || [];
      stats.users = {
        total: allUsers.length,
        providers: allUsers.filter((u: any) => u.role === 'provider').length,
        clients: allUsers.filter((u: any) => u.role === 'client').length,
      };
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
    
    // 获取预约统计
    try {
      const allBookings = await bookingModel.getAll();
      stats.bookings = {
        total: allBookings.length,
        pending: allBookings.filter(b => b.status === 'pending').length,
        accepted: allBookings.filter(b => b.status === 'accepted').length,
        completed: allBookings.filter(b => b.status === 'completed').length,
      };
    } catch (error) {
      console.error('Failed to load booking stats:', error);
    }
    
    // 更新緩存
    statsCache = {
      data: stats,
      timestamp: now,
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error('GET /api/admin/stats error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ==================== 資料備份（PostgreSQL） ====================
// GET /api/admin/backup - 資料備份頁面（HTML）
router.get('/backup', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>茶王 - 資料備份</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 2rem auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #4b5563; font-size: 0.95rem; line-height: 1.6; }
    .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #10b981; color: #ffffff; border-radius: 6px; text-decoration: none; font-size: 0.95rem; font-weight: 500; }
    .btn:hover { background: #059669; }
    .back-link { display: inline-block; margin-top: 1rem; font-size: 0.85rem; color: #6b7280; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .note { margin-top: 1rem; padding: 0.75rem 1rem; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b; color: #78350f; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💾 資料備份（PostgreSQL）</h1>
    <p>點擊下方按鈕，即可從伺服器即時匯出 <strong>PostgreSQL 資料庫</strong> 的 SQL 備份檔案（.sql）。</p>
    <p>建議下載後保存到安全位置（例如加密硬碟或雲端備份），避免遺失。</p>
    <a class="btn" href="/api/admin/backup/db" target="_blank">💾 下載資料庫 SQL 備份</a>
    <div class="note">
      ⚠️ 如果按下按鈕沒有開始下載，請檢查瀏覽器是否擋下了下載或彈出視窗，或稍後再試一次。
    </div>
    <a class="back-link" href="/admin">← 回到後台儀表板</a>
  </div>
</body>
</html>`);
});

// GET /api/admin/backup/db - 下載資料庫 SQL 備份（僅管理員在前端可見）
router.get('/backup/db', async (req, res) => {
  let pgDump: ReturnType<typeof spawn> | null = null;
  
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      return res.status(500).json({
        error: 'DATABASE_URL 未設定，無法執行備份',
      });
    }

    // 產生備份檔名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.sql`;

    // 設定回應為檔案下載（SQL 純文字）
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 解析連接字符串
    // 格式：postgresql://user:password@host:port/database?query
    const url = new URL(connectionString);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1); // 移除開頭的 '/'
    const user = url.username;
    const password = url.password;
    
    console.log('[backup] 解析連接信息:', { host, port, database, user: user ? '***' : 'none' });

    // 呼叫 pg_dump 將資料庫輸出為 SQL（plain 格式）
    // 要求：容器內需已安裝 postgresql-client（pg_dump）
    // 使用環境變數傳遞密碼，避免在命令行中暴露
    const pgDumpArgs = [
      '-F', 'p',           // plain 格式
      '--no-owner',        // 不包含 owner 信息
      '--no-acl',          // 不包含 ACL 信息
      '-h', host,          // 主機
      '-p', port,          // 端口
      '-U', user,          // 用戶名
      '-d', database,      // 數據庫名
    ];
    
    // 設置環境變數（pg_dump 會自動讀取 PGPASSWORD）
    const pgDumpEnv = {
      ...process.env,
      PGPASSWORD: password,
    };
    
    console.log('[backup] 執行命令: pg_dump', pgDumpArgs.join(' '));
    
    pgDump = spawn('pg_dump', pgDumpArgs, {
      env: pgDumpEnv,
    });

    let stderr = '';
    let hasError = false;

    // 檢查 stderr 是否存在
    if (pgDump.stderr) {
      pgDump.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        // pg_dump 會將進度信息輸出到 stderr，這不是錯誤
        // 只有當包含 "ERROR" 或 "FATAL" 時才是真正的錯誤
        if (text.includes('ERROR') || text.includes('FATAL')) {
          hasError = true;
          console.error('[pg_dump ERROR]', text.trim());
        } else {
          console.log('[pg_dump]', text.trim());
        }
      });
    }

    pgDump.on('error', (error: any) => {
      console.error('[backup] 啟動 pg_dump 失敗:', error);
      console.error('[backup] 錯誤詳情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
      });
      hasError = true;
      if (!res.headersSent) {
        res.status(500).json({
          error: '啟動 pg_dump 失敗',
          details: error.message || '請確認容器已安裝 PostgreSQL 客戶端 (pg_dump)',
          code: error.code,
        });
      } else {
        // 如果已經開始發送響應，只能結束連接
        if (!res.destroyed) {
          res.end();
        }
      }
    });

    // 處理 stdout 數據
    if (pgDump.stdout) {
      pgDump.stdout.on('data', (chunk) => {
        if (!res.headersSent) {
          // 確保在第一次數據到達時才設置 headers
          // 但我們已經在上面設置了，所以這裡只是確保
        }
        if (!res.destroyed) {
          res.write(chunk);
        }
      });

      pgDump.stdout.on('end', () => {
        if (!res.destroyed) {
          res.end();
        }
      });
    } else {
      // 如果 stdout 為 null，返回錯誤
      console.error('pg_dump stdout 為 null');
      if (!res.headersSent) {
        res.status(500).json({
          error: '無法啟動 pg_dump 進程的標準輸出流',
        });
      }
    }

    pgDump.on('close', (code) => {
      console.log(`[backup] pg_dump 進程結束，退出代碼: ${code}`);
      if (code !== 0 || hasError) {
        console.error(`[backup] pg_dump 失敗 - 退出代碼: ${code}`);
        console.error(`[backup] stderr 輸出:`, stderr.substring(0, 1000));
        if (!res.headersSent) {
          res.status(500).json({
            error: '資料庫備份失敗',
            details: `pg_dump exit code: ${code}`,
            stderr: stderr.substring(0, 500), // 限制錯誤信息長度
          });
        } else if (!res.destroyed) {
          // 如果已經開始發送響應，嘗試結束連接
          console.error('[backup] 響應已發送，無法返回錯誤信息');
          res.end();
        }
      } else {
        console.log('[backup] 資料庫備份成功完成');
      }
    });

    // 處理請求中斷
    req.on('close', () => {
      if (pgDump && !pgDump.killed) {
        console.log('[backup] 客戶端中斷連接，終止 pg_dump 進程');
        pgDump.kill('SIGTERM');
      }
    });

  } catch (error: any) {
    console.error('資料庫備份發生錯誤:', error);
    if (pgDump && !pgDump.killed) {
      pgDump.kill('SIGTERM');
    }
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || '資料庫備份發生未知錯誤',
      });
    }
  }
});

// ==================== Profile 管理 ====================
// GET /api/admin/profiles - 取得所有 profiles（管理用，包含更多資訊）
router.get('/profiles', async (req, res) => {
  try {
    console.log('GET /api/admin/profiles');
    const result = await profileModel.getAll();
    res.json(result.profiles);
  } catch (error: any) {
    console.error('GET /api/admin/profiles error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/admin/profiles/:id - 取得單一 profile
router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await profileModel.getById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/profiles - 建立新 profile（上架新茶）
router.post('/profiles', async (req, res) => {
  try {
    // 從 JWT token 獲取用戶信息
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { verifyToken } = await import('../services/authService.js');
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
          userId = payload.userId;
        }
      } catch (error) {
        // Token 無效，繼續但不設置 userId（管理員可以為任何用戶創建）
      }
    }

    // 後台管理系統上架時，確保userId為undefined（高級茶）
    // 只有在明確指定req.body.userId時才設置userId（用於Provider上架）
    // 如果req.body.userId為undefined、null或空字符串，則不設置userId（高級茶）
    const finalUserId = (req.body.userId && req.body.userId !== '' && req.body.userId !== null) 
      ? req.body.userId 
      : undefined;
    
    const profileData: Profile = {
      id: req.body.id || uuidv4(),
      ...req.body,
      userId: finalUserId,
    };
    
    console.log('POST /api/admin/profiles - Creating profile:', {
      id: profileData.id,
      name: profileData.name,
      userId: profileData.userId,
      userIdType: typeof profileData.userId,
      reqBodyUserId: req.body.userId,
      reqBodyUserIdType: typeof req.body.userId
    });

    // Validate required fields
    if (!profileData.name || !profileData.nationality || !profileData.location) {
      return res.status(400).json({ error: 'Missing required fields: name, nationality, location' });
    }

    // 检查是否有 force 参数
    const force = req.query.force === 'true' || req.body.force === true;

    // 重复检测（除非强制上架）
    if (!force) {
      const similarProfiles = await profileModel.findSimilar(profileData);
      
      if (similarProfiles.length > 0) {
        // 计算相似度
        const similarities = similarProfiles.map(existing => ({
          profile: existing,
          similarity: profileModel.calculateSimilarity(profileData, existing)
        })).filter(s => s.similarity >= 70); // 70% 阈值

        if (similarities.length > 0) {
          return res.status(409).json({
            error: '检测到可能重复的 Profile',
            similarProfiles: similarities.map(s => ({
              id: s.profile.id,
              name: s.profile.name,
              nationality: s.profile.nationality,
              age: s.profile.age,
              location: s.profile.location,
              similarity: s.similarity,
              createdAt: (s.profile as any).createdAt || new Date().toISOString()
            })),
            message: `发现 ${similarities.length} 个相似的 Profile，相似度最高 ${similarities[0].similarity}%`,
            canForce: true // 允许强制上架
          });
        }
      }
    }

    // Set defaults
    if (!profileData.imageUrl && profileData.gallery && profileData.gallery.length > 0) {
      profileData.imageUrl = profileData.gallery[0];
    }

    const basePrice = profileData.price || 3000;
    
    if (!profileData.prices) {
      // 如果沒有 prices，創建新的 prices 對象
      profileData.prices = {
        oneShot: { price: basePrice, desc: '一節/50min/1S' },
        twoShot: { price: basePrice * 2 - 500, desc: '兩節/100min/2S' }
      };
    } else {
      // 如果已有 prices，確保 oneShot 存在
      if (!profileData.prices.oneShot) {
        profileData.prices.oneShot = { price: basePrice, desc: '一節/50min/1S' };
      }
      
      // 優先使用提供的兩節價格，如果沒有或無效則套用公式
      const existingTwoShotPrice = profileData.prices.twoShot?.price;
      if (!existingTwoShotPrice || existingTwoShotPrice <= 0) {
        const oneShotPrice = profileData.prices.oneShot.price || basePrice;
        profileData.prices.twoShot = {
          price: oneShotPrice * 2 - 500,
          desc: '兩節/100min/2S'
        };
      }
    }

    if (!profileData.availableTimes) {
      profileData.availableTimes = {
        today: '12:00~02:00',
        tomorrow: '12:00~02:00'
      };
    }

    const profile = await profileModel.create(profileData);
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/profiles/:id - 更新 profile（編輯茶茶）
router.put('/profiles/:id', async (req, res) => {
  try {
    console.log('PUT /api/admin/profiles/:id', req.params.id, 'Body:', JSON.stringify(req.body, null, 2));
    
    // 獲取現有的profile，確保不會意外修改userId
    const existing = await profileModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // 如果req.body中沒有userId字段，保持原有的userId（高級茶保持undefined，Provider保持原有userId）
    const updateData = { ...req.body };
    if (req.body.userId === undefined) {
      // 不設置userId，讓update函數保持原有值
      delete updateData.userId;
    } else if (req.body.userId === null || req.body.userId === '') {
      // 明確設置為undefined（高級茶）
      updateData.userId = undefined;
    }
    
    const profile = await profileModel.update(req.params.id, updateData);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error: any) {
    console.error('PUT /api/admin/profiles/:id error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/admin/profiles/:id - 部分更新 profile（例如只更新可用狀態）
router.patch('/profiles/:id', async (req, res) => {
  try {
    const existing = await profileModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const updated = { ...existing, ...req.body };
    const profile = await profileModel.update(req.params.id, updated);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/profiles/:id - 刪除 profile（下架）
router.delete('/profiles/:id', async (req, res) => {
  try {
    const deleted = await profileModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/profiles/batch - 批量操作 profiles
router.post('/profiles/batch', async (req, res) => {
  try {
    const { action, ids, data } = req.body;
    
    if (!action || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: action and ids array required' });
    }

    const results: any[] = [];
    
    switch (action) {
      case 'delete':
        for (const id of ids) {
          const deleted = await profileModel.delete(id);
          results.push({ id, success: deleted });
        }
        break;
        
      case 'update':
        if (!data) {
          return res.status(400).json({ error: 'Data required for update action' });
        }
        for (const id of ids) {
          const updated = await profileModel.update(id, data);
          results.push({ id, success: !!updated, data: updated });
        }
        break;
        
      case 'toggle-availability':
        for (const id of ids) {
          const existing = await profileModel.getById(id);
          if (existing) {
            const updated = await profileModel.update(id, { isAvailable: !existing.isAvailable });
            results.push({ id, success: !!updated, isAvailable: updated?.isAvailable });
          } else {
            results.push({ id, success: false });
          }
        }
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action. Supported: delete, update, toggle-availability' });
    }
    
    res.json({ results, total: results.length, success: results.filter(r => r.success).length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Article 管理 ====================
// GET /api/admin/articles - 取得所有 articles（管理用）
router.get('/articles', async (req, res) => {
  try {
    const result = await articleModel.getAll();
    res.json(result.articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/articles/:id - 取得單一 article
router.get('/articles/:id', async (req, res) => {
  try {
    const article = await articleModel.getById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/articles - 建立新 article（發布新文章）
router.post('/articles', async (req, res) => {
  try {
    const articleData: Article = {
      id: req.body.id || uuidv4(),
      ...req.body,
    };

    // Validate required fields
    if (!articleData.title || !articleData.summary || !articleData.imageUrl) {
      return res.status(400).json({ error: 'Missing required fields: title, summary, imageUrl' });
    }

    // Set defaults
    if (!articleData.date) {
      articleData.date = new Date().toISOString().split('T')[0];
    }
    if (articleData.views === undefined) {
      articleData.views = 0;
    }
    if (!articleData.tag) {
      articleData.tag = '外送茶';
    }

    const article = await articleModel.create(articleData);
    res.status(201).json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/articles/:id - 更新 article（編輯文章）
router.put('/articles/:id', async (req, res) => {
  try {
    const article = await articleModel.update(req.params.id, req.body);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/articles/:id - 刪除 article
router.delete('/articles/:id', async (req, res) => {
  try {
    const deleted = await articleModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/articles/batch - 批量操作 articles
router.post('/articles/batch', async (req, res) => {
  try {
    const { action, ids, data } = req.body;
    
    if (!action || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: action and ids array required' });
    }

    const results: any[] = [];
    
    switch (action) {
      case 'delete':
        for (const id of ids) {
          const deleted = await articleModel.delete(id);
          results.push({ id, success: deleted });
        }
        break;
        
      case 'update':
        if (!data) {
          return res.status(400).json({ error: 'Data required for update action' });
        }
        for (const id of ids) {
          const updated = await articleModel.update(id, data);
          results.push({ id, success: !!updated, data: updated });
        }
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action. Supported: delete, update' });
    }
    
    res.json({ results, total: results.length, success: results.filter(r => r.success).length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 影片資訊解析 ====================
// POST /api/admin/parse-video-info - 解析影片 URL 獲取番號和標題
router.post('/parse-video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result: { code?: string; title?: string; thumbnail?: string } = {};
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname;
      
      // FANZA (dmm.co.jp) - 例如: https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis123/
      if (hostname.includes('dmm.co.jp') || hostname.includes('dmm.com')) {
        const cidMatch = pathname.match(/cid=([a-z0-9-]+)/i);
        if (cidMatch) {
          result.code = cidMatch[1].toUpperCase();
        }
      }
      
      // JAVLibrary - 例如: https://www.javlibrary.com/cn/?v=javli5abc123
      if (hostname.includes('javlibrary.com')) {
        const vMatch = urlObj.searchParams.get('v');
        if (vMatch) {
          result.code = vMatch.toUpperCase();
        }
      }
      
      // JAVDB - 例如: https://javdb.com/v/abc123
      if (hostname.includes('javdb.com')) {
        const pathMatch = pathname.match(/\/v\/([a-z0-9-]+)/i);
        if (pathMatch) {
          result.code = pathMatch[1].toUpperCase();
        }
      }
      
      // 通用番号格式提取
      const codePatterns = [
        /([A-Z]{2,6}[-_]?[0-9]{2,6})/gi,
        /([A-Z]{3,6}[0-9]{3,6})/gi,
      ];
      
      for (const pattern of codePatterns) {
        const matches = url.match(pattern);
        if (matches && matches.length > 0) {
          const bestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
          if (bestMatch.length >= 5) {
            result.code = bestMatch.toUpperCase().replace(/[-_]/g, '-');
            break;
          }
        }
      }
      
      // 嘗試獲取頁面標題（需要 fetch，但可能遇到 CORS）
      // 注意：這可能需要使用 puppeteer 或其他工具來處理需要 JavaScript 渲染的頁面
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(5000) // 5秒超時
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // 提取 <title> 標籤
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            let title = titleMatch[1].trim();
            // 清理標題（移除常見的後綴）
            title = title.replace(/\s*[-|]\s*(FANZA|DMM|JAVLibrary|JAVDB).*$/i, '');
            title = title.replace(/\s*[-|]\s*.*$/i, ''); // 移除最後的 "- 網站名稱"
            if (title.length > 3 && title.length < 200) {
              result.title = title;
            }
          }
          
          // 提取縮略圖
          // FANZA/DMM 的縮略圖通常在 og:image 或特定的 img 標籤中
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            result.thumbnail = ogImageMatch[1].trim();
          } else {
            // 嘗試查找常見的縮略圖選擇器
            const imgMatches = [
              html.match(/<img[^>]*class=["'][^"']*thumb[^"']*["'][^>]*src=["']([^"']+)["']/i),
              html.match(/<img[^>]*id=["'][^"']*thumb[^"']*["'][^>]*src=["']([^"']+)["']/i),
              html.match(/<img[^>]*data-src=["']([^"']+)["'][^>]*class=["'][^"']*thumb/i),
            ];
            
            for (const match of imgMatches) {
              if (match && match[1]) {
                let imgUrl = match[1].trim();
                // 處理相對路徑
                if (imgUrl.startsWith('//')) {
                  imgUrl = 'https:' + imgUrl;
                } else if (imgUrl.startsWith('/')) {
                  imgUrl = urlObj.protocol + '//' + urlObj.hostname + imgUrl;
                }
                result.thumbnail = imgUrl;
                break;
              }
            }
            
            // 如果還是沒有找到，嘗試根據番號生成 FANZA 縮略圖 URL
            if (!result.thumbnail && result.code) {
              const codeLower = result.code.toLowerCase();
              // FANZA 縮略圖格式: https://pics.dmm.co.jp/digital/video/{code}/{code}pl.jpg
              result.thumbnail = `https://pics.dmm.co.jp/digital/video/${codeLower}/${codeLower}pl.jpg`;
            }
          }
        }
      } catch (fetchError: any) {
        // Fetch 失敗不影響番號解析
        console.warn('無法獲取頁面標題:', fetchError.message);
      }
      
    } catch (parseError: any) {
      console.error('URL 解析錯誤:', parseError);
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Parse video info error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
