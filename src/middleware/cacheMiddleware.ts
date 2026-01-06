import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/redisService.js';

// 緩存中間件配置
interface CacheOptions {
  ttl?: number; // 緩存過期時間（秒），默認 300 秒（5 分鐘）
  keyGenerator?: (req: Request) => string; // 自定義緩存鍵生成器
  skipCache?: (req: Request) => boolean; // 跳過緩存的條件
}

// 創建緩存中間件
export const createCacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 默認 5 分鐘
    keyGenerator,
    skipCache,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // 只緩存 GET 請求
    if (req.method !== 'GET') {
      return next();
    }

    // 檢查是否跳過緩存
    if (skipCache && skipCache(req)) {
      return next();
    }

    // 生成緩存鍵
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}`;

    try {
      // 嘗試從緩存獲取
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // 如果沒有緩存，繼續處理請求並保存響應
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        // 只緩存成功的響應（狀態碼 200）
        if (res.statusCode === 200 && body) {
          cacheService.set(cacheKey, body, ttl).catch((err) => {
            console.warn('緩存設置失敗:', err);
          });
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      // 緩存錯誤不應該阻止請求處理
      console.warn('緩存中間件錯誤:', error);
      next();
    }
  };
};

// 預定義的緩存中間件

// Profiles 列表緩存（5 分鐘）
export const profilesCache = createCacheMiddleware({
  ttl: 300,
  keyGenerator: (req) => `cache:profiles:${req.query.limit || 'all'}:${req.query.offset || 0}`,
});

// Articles 列表緩存（10 分鐘）
export const articlesCache = createCacheMiddleware({
  ttl: 600,
  keyGenerator: (req) => `cache:articles:${req.query.limit || 'all'}:${req.query.offset || 0}`,
});

// Forum posts 緩存（2 分鐘，因為更新頻繁）
export const forumPostsCache = createCacheMiddleware({
  ttl: 120,
  keyGenerator: (req) => `cache:forum:posts:${req.query.category || 'all'}:${req.query.sortBy || 'latest'}:${req.query.limit || 20}`,
});

// Profile 詳情緩存（10 分鐘）
export const profileDetailCache = createCacheMiddleware({
  ttl: 600,
  keyGenerator: (req) => `cache:profile:${req.params.id}`,
});

// Article 詳情緩存（30 分鐘）
export const articleDetailCache = createCacheMiddleware({
  ttl: 1800,
  keyGenerator: (req) => `cache:article:${req.params.id}`,
});

