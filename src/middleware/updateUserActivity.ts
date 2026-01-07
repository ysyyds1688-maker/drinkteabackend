import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';

// 緩存：記錄最近更新過活躍時間的用戶（避免過度更新資料庫）
const activityUpdateCache = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5分鐘內不重複更新

// 訪客追蹤：記錄訪客的 IP 和最後訪問時間（用於在線人數統計）
const guestActivityCache = new Map<string, number>();
const GUEST_CACHE_TTL = 5 * 60 * 1000; // 5分鐘內視為在線

/**
 * 獲取客戶端 IP 地址
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * 中間件：更新用戶的活躍時間（用於在線人數統計）
 * 同時追蹤訪客（未登入用戶）的活動
 */
export const updateUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const now = Date.now();
    
    // 追蹤訪客（未登入用戶）
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const clientIp = getClientIp(req);
      // 更新訪客活動時間
      guestActivityCache.set(clientIp, now);
      
      // 清理過期的訪客緩存（每1000次請求清理一次）
      if (Math.random() < 0.001) {
        const cutoff = now - GUEST_CACHE_TTL;
        for (const [ip, timestamp] of guestActivityCache.entries()) {
          if (timestamp < cutoff) {
            guestActivityCache.delete(ip);
          }
        }
      }
      
      return next();
    }

    // 處理已登入用戶
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || !payload.userId) {
      // Token 無效，視為訪客
      const clientIp = getClientIp(req);
      guestActivityCache.set(clientIp, now);
      return next();
    }

    const userId = payload.userId;
    const lastUpdate = activityUpdateCache.get(userId);

    // 如果5分鐘內已經更新過，跳過
    if (lastUpdate && (now - lastUpdate) < CACHE_TTL) {
      return next();
    }

    // 更新活躍時間（異步執行，不阻塞請求）
    userModel.updateLastLogin(userId).catch((error) => {
      console.error(`更新用戶 ${userId} 活躍時間失敗:`, error);
    });

    // 更新緩存
    activityUpdateCache.set(userId, now);

    // 清理過期的緩存條目（每1000次請求清理一次，避免內存洩漏）
    if (Math.random() < 0.001) {
      const cutoff = now - CACHE_TTL;
      for (const [uid, timestamp] of activityUpdateCache.entries()) {
        if (timestamp < cutoff) {
          activityUpdateCache.delete(uid);
        }
      }
    }

    next();
  } catch (error) {
    // 出錯不影響請求處理
    console.error('updateUserActivity middleware error:', error);
    next();
  }
};

/**
 * 獲取當前在線的訪客數量（導出供 stats 路由使用）
 */
export const getGuestOnlineCount = (): number => {
  const now = Date.now();
  const cutoff = now - GUEST_CACHE_TTL;
  let count = 0;
  
  for (const timestamp of guestActivityCache.values()) {
    if (timestamp > cutoff) {
      count++;
    }
  }
  
  return count;
};




