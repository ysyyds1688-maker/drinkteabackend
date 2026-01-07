import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';

// 緩存：記錄最近更新過活躍時間的用戶（避免過度更新資料庫）
const activityUpdateCache = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5分鐘內不重複更新

/**
 * 中間件：更新用戶的活躍時間（用於在線人數統計）
 * 只在有認證的請求時更新，並且使用緩存避免過度更新資料庫
 */
export const updateUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // 沒有認證，跳過
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || !payload.userId) {
      return next(); // Token 無效，跳過
    }

    const userId = payload.userId;
    const now = Date.now();
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

