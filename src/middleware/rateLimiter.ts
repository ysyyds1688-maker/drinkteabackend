import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate Limit 日誌記錄函數
const logRateLimit = (req: Request, limiterName: string, limit: number, windowMs: number) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const path = req.path || req.url?.split('?')[0] || 'unknown';
  const method = req.method || 'unknown';
  
  // 計算窗口時間（秒）
  const windowSeconds = Math.floor(windowMs / 1000);
  const windowStr = windowSeconds >= 60 
    ? `${Math.floor(windowSeconds / 60)}m` 
    : `${windowSeconds}s`;
  
  console.log(JSON.stringify({
    type: 'RATE_LIMIT',
    ip,
    path,
    method,
    limiter: limiterName,
    limit,
    window: windowStr
  }));
};

// 創建 handler 的輔助函數
const createHandler = (
  limiterName: string,
  limit: number,
  windowMs: number,
  errorMessage: string
) => {
  return (req: Request, res: Response) => {
    logRateLimit(req, limiterName, limit, windowMs);
    
    const retryAfter = Math.ceil(windowMs / 1000);
    
    res.status(429)
      .set({
        'Retry-After': retryAfter.toString(),
        'Content-Type': 'application/json'
      })
      .json({
        error: errorMessage,
        retryAfter: retryAfter
      });
  };
};

// ==================== A) Auth Limiter（最嚴格）====================
// 適用：/auth/login, /auth/register, /auth/forgot-password
// 規則：5 requests / 1 minute / IP
// 用途：防爆破密碼、防撞庫
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 5, // 每個 IP 在 1 分鐘內最多 5 次嘗試
  message: {
    error: '嘗試次數過多，請稍後再試',
    retryAfter: '1分鐘'
  },
  standardHeaders: true,
  legacyHeaders: true,
  skipSuccessfulRequests: true, // 只記錄失敗的請求
  handler: createHandler('authLimiter', 5, 60 * 1000, '嘗試次數過多，請稍後再試')
});

// ==================== B) Read Limiter（一般讀取 API）====================
// 適用：GET /profiles, GET /articles, GET /notifications, GET /bookings, 
//      GET /achievements, GET /badges, GET /subscriptions, GET /user-stats
// 規則：60 requests / 1 minute / IP（窗口短、額度寬）
// 特性：專門保護前端 bug、無限重試、快速連點
export const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 60, // 每個 IP 在 1 分鐘內最多 60 個請求
  message: {
    error: '請求過於頻繁，請稍後再試',
    retryAfter: '1分鐘'
  },
  standardHeaders: true,
  legacyHeaders: true,
  skipSuccessfulRequests: false,
  handler: createHandler('readLimiter', 60, 60 * 1000, '請求過於頻繁，請稍後再試')
});

// ==================== C) Write Limiter（寫入 API）====================
// 適用：POST / PUT / DELETE
// 規則：60 requests / minute / userId + 30 requests / minute / IP
// 特性：雙重限制（用戶 + IP）
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 60, // 每個用戶在 1 分鐘內最多 60 個請求
  keyGenerator: (req: Request) => {
    // 優先使用用戶 ID（如果有認證）
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // TODO: 解析 JWT token 獲取用戶 ID
        // 暫時使用 IP，實際應該從 token 中提取 userId
        return `user:${req.ip || req.socket.remoteAddress || 'unknown'}`;
      } catch {
        return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
      }
    }
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
  message: {
    error: '請求過於頻繁，請稍後再試',
    retryAfter: '1分鐘'
  },
  standardHeaders: true,
  legacyHeaders: true,
  skipSuccessfulRequests: false,
  handler: createHandler('writeLimiter', 60, 60 * 1000, '請求過於頻繁，請稍後再試')
});

// Write Limiter 的 IP 限制（雙重限制）
export const writeLimiterIP = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 30, // 每個 IP 在 1 分鐘內最多 30 個請求
  message: {
    error: '請求過於頻繁，請稍後再試',
    retryAfter: '1分鐘'
  },
  standardHeaders: true,
  legacyHeaders: true,
  skipSuccessfulRequests: false,
  handler: createHandler('writeLimiterIP', 30, 60 * 1000, '請求過於頻繁，請稍後再試')
});

// ==================== 向後兼容（保留舊的 limiter）====================
// 注意：這些 limiter 將被逐步移除，改用新的分層 limiter

// 通用 API 限流配置（已廢棄，保留用於向後兼容）
export const apiLimiter = readLimiter; // 暫時指向 readLimiter

// 嚴格限流（已廢棄，改用 authLimiter）
export const strictLimiter = authLimiter; // 暫時指向 authLimiter

// 驗證碼發送限流
export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 5, // 每個 IP 每小時最多發送 5 次驗證碼
  message: {
    error: '驗證碼發送過於頻繁，請稍後再試',
    retryAfter: '1小時'
  },
  standardHeaders: true,
  legacyHeaders: true,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, 'verificationLimiter', 5, 60 * 60 * 1000);
    
    const retryAfter = Math.ceil(60 * 60); // 1 小時
    
    res.status(429)
      .set({
        'Retry-After': retryAfter.toString(),
        'Content-Type': 'application/json'
      })
      .json({
        error: '驗證碼發送過於頻繁，請稍後再試',
        retryAfter: retryAfter
      });
  }
});

// 文件上傳限流
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 20, // 每個 IP 每小時最多上傳 20 次
  message: {
    error: '上傳次數過多，請稍後再試',
    retryAfter: '1小時'
  },
  standardHeaders: true,
  legacyHeaders: true,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, 'uploadLimiter', 20, 60 * 60 * 1000);
    
    const retryAfter = Math.ceil(60 * 60); // 1 小時
    
    res.status(429)
      .set({
        'Retry-After': retryAfter.toString(),
        'Content-Type': 'application/json'
      })
      .json({
        error: '上傳次數過多，請稍後再試',
        retryAfter: retryAfter
      });
  }
});

// 論壇發帖限流
export const forumPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 10, // 每個 IP 每小時最多發 10 個帖子
  message: {
    error: '發帖過於頻繁，請稍後再試',
    retryAfter: '1小時'
  },
  standardHeaders: true,
  legacyHeaders: true,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, 'forumPostLimiter', 10, 60 * 60 * 1000);
    
    const retryAfter = Math.ceil(60 * 60); // 1 小時
    
    res.status(429)
      .set({
        'Retry-After': retryAfter.toString(),
        'Content-Type': 'application/json'
      })
      .json({
        error: '發帖過於頻繁，請稍後再試',
        retryAfter: retryAfter
      });
  }
});

// 根據用戶 ID 的限流（需要認證）
export const createUserBasedLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      // 如果有認證用戶，使用用戶 ID；否則使用 IP
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          // 這裡可以解析 JWT token 獲取用戶 ID
          // 暫時使用 IP，實際應該從 token 中提取
          return req.ip || req.socket.remoteAddress || 'unknown';
        } catch {
          return req.ip || req.socket.remoteAddress || 'unknown';
        }
      }
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
    message: {
      error: '請求過於頻繁，請稍後再試'
    },
    standardHeaders: true,
    legacyHeaders: true,
    handler: (req: Request, res: Response) => {
      logRateLimit(req, 'userBasedLimiter', max, windowMs);
      
      const retryAfter = Math.ceil(windowMs / 1000);
      
      res.status(429)
        .set({
          'Retry-After': retryAfter.toString(),
          'Content-Type': 'application/json'
        })
        .json({
          error: '請求過於頻繁，請稍後再試',
          retryAfter: retryAfter
        });
    }
  });
};


