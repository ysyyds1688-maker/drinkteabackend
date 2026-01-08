import { Request } from 'express';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';
import { User } from '../models/User.js';

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


