import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// 通用 API 限流配置
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每個 IP 在 15 分鐘內最多 100 個請求
  message: {
    error: '請求過於頻繁，請稍後再試',
    retryAfter: '15分鐘'
  },
  standardHeaders: true, // 返回 `RateLimit-*` headers
  legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
  // 跳過成功響應的記錄（減少日誌）
  skipSuccessfulRequests: false,
  // 跳過失敗請求的記錄
  skipFailedRequests: false,
});

// 嚴格限流（用於登入、註冊等敏感操作）
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 每個 IP 在 15 分鐘內最多 5 次嘗試
  message: {
    error: '嘗試次數過多，請稍後再試',
    retryAfter: '15分鐘'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 只記錄失敗的請求
});

// 驗證碼發送限流
export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 5, // 每個 IP 每小時最多發送 5 次驗證碼
  message: {
    error: '驗證碼發送過於頻繁，請稍後再試',
    retryAfter: '1小時'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
  legacyHeaders: false,
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
  legacyHeaders: false,
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
    legacyHeaders: false,
  });
};

