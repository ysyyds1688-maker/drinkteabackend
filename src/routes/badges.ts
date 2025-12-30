import { Router } from 'express';
import { badgeModel } from '../models/Badge.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 獲取所有可兌換的勳章
router.get('/available', async (req, res) => {
  try {
    const badges = badgeModel.getAvailableBadges();
    res.json({ badges });
  } catch (error: any) {
    console.error('Get available badges error:', error);
    res.status(500).json({ error: error.message || '獲取勳章列表失敗' });
  }
});

// 獲取用戶已擁有的勳章
router.get('/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    const badges = await badgeModel.getUserBadges(payload.userId);
    res.json({ badges });
  } catch (error: any) {
    console.error('Get user badges error:', error);
    res.status(500).json({ error: error.message || '獲取用戶勳章失敗' });
  }
});

// 兌換勳章
router.post('/purchase/:badgeId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }
    
    const { badgeId } = req.params;
    const badge = await badgeModel.purchaseBadge(payload.userId, badgeId);
    
    res.json({ badge, message: '勳章兌換成功！' });
  } catch (error: any) {
    console.error('Purchase badge error:', error);
    res.status(400).json({ error: error.message || '兌換勳章失敗' });
  }
});

export default router;



