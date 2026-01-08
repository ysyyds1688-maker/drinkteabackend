import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';
import { User } from '../models/User.js';

// 擴展 Request 接口以包含用戶信息
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * 從請求中獲取用戶信息（用於權限檢查）
 * @param req Express 請求對象
 * @returns 用戶對象，如果未授權則返回 null
 */
export const getUserFromRequest = async (req: Request): Promise<User | null> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  
  const user = await userModel.findById(payload.userId);
  return user;
};

/**
 * 驗證 JWT Token 的 Express 中間件
 * @param req Express 請求對象
 * @param res Express 響應對象
 * @param next NextFunction
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    }
    req.user = user; // 將用戶信息添加到請求對象中
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

