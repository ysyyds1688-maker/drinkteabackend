import { Router } from 'express';
import { userModel } from '../models/User.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 获取我的订阅状态
router.get('/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const isActive = user.membershipLevel === 'subscribed' && 
      (!user.membershipExpiresAt || new Date(user.membershipExpiresAt) > new Date());
    
    res.json({
      membershipLevel: user.membershipLevel,
      membershipExpiresAt: user.membershipExpiresAt,
      isActive,
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message || '获取订阅状态失败' });
  }
});

// 订阅（简化版，仅标记状态）
router.post('/subscribe', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const { duration } = req.body; // duration in days, default 30
    const days = duration || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    await userModel.updateMembership(payload.userId, 'subscribed', expiresAt);
    
    res.json({
      message: '订阅成功',
      membershipLevel: 'subscribed',
      membershipExpiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message || '订阅失败' });
  }
});

export default router;

