import { Router, Request, Response } from 'express';
import { verifyToken } from '../services/authService.js';
import { notificationModel } from '../models/Notification.js';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();

// 所有路由都需要認證
router.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }

    (req as AuthenticatedRequest).userId = payload.userId;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || '未授權' });
  }
});

// GET /api/notifications/my - 獲取當前用戶的通知
router.get('/my', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const notifications = await notificationModel.getByUserId(userId, limit);
    
    res.json({ notifications });
  } catch (error: any) {
    console.error('獲取通知失敗:', error);
    res.status(500).json({ error: error.message || '獲取通知失敗' });
  }
});

// PUT /api/notifications/:id/read - 標記通知為已讀
router.put('/:id/read', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const notificationId = req.params.id;
    
    await notificationModel.markAsRead(notificationId, userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('標記已讀失敗:', error);
    res.status(500).json({ error: error.message || '標記已讀失敗' });
  }
});

// PUT /api/notifications/read-all - 標記所有通知為已讀
router.put('/read-all', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    
    await notificationModel.markAllAsRead(userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('全部標記已讀失敗:', error);
    res.status(500).json({ error: error.message || '全部標記已讀失敗' });
  }
});

// DELETE /api/notifications/:id - 刪除通知
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const notificationId = req.params.id;
    
    await notificationModel.delete(notificationId, userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('刪除通知失敗:', error);
    res.status(500).json({ error: error.message || '刪除通知失敗' });
  }
});

export default router;

