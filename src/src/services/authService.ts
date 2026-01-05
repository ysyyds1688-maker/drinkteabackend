import jwt from 'jsonwebtoken';
import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export interface TokenPayload {
  userId: string;
  role: string;
  email?: string;
  phoneNumber?: string;
}

// 生成 Token
export const generateTokens = async (payload: TokenPayload): Promise<{ token: string; refreshToken: string }> => {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  
  // 保存会话到数据库（可选，如果需要会话管理）
  // const sessionId = uuidv4();
  // const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // await query(`
  //   INSERT INTO user_sessions (id, "userId", token, "refreshToken", "expiresAt")
  //   VALUES ($1, $2, $3, $4, $5)
  // `, [sessionId, payload.userId, token, refreshToken, expiresAt]);
  
  return { token, refreshToken };
};

// 验证 Token
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};

// 刷新 Token
export const refreshTokens = async (refreshToken: string): Promise<{ token: string; refreshToken: string } | null> => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as TokenPayload & { type?: string };
    if (decoded.type !== 'refresh') return null;
    
    // 生成新 Token
    const newPayload: TokenPayload = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      phoneNumber: decoded.phoneNumber,
    };
    
    return await generateTokens(newPayload);
  } catch (error) {
    return null;
  }
};

// JWT 中间件
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Token 无效或已过期' });
  }

  req.user = payload;
  next();
};

