import { Router } from 'express';
import { badgeModel } from '../models/Badge.js';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';

const router = Router();

// 獲取所有可兌換的勳章（根據用戶角色返回對應的勳章）
router.get('/available', async (req, res) => {
  try {
    // 嘗試從 Authorization header 獲取用戶角色
    let userRole: 'provider' | 'client' | 'admin' = 'client'; // 默認為品茶客
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
          const user = await userModel.findById(payload.userId);
          if (user) {
            userRole = user.role;
          }
        }
      }
    } catch (e) {
      // 如果獲取用戶信息失敗，使用默認值（品茶客）
      console.log('無法獲取用戶角色，使用默認值（品茶客）');
    }

    const badges = badgeModel.getAvailableBadges(userRole);
    console.log(`[badges] 返回 ${userRole} 角色的勳章列表，共 ${badges.length} 個`);
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
    
    // 獲取用戶角色
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    const { badgeId } = req.params;
    const badge = await badgeModel.purchaseBadge(payload.userId, badgeId, user.role);
    
    res.json({ badge, message: '勳章兌換成功！' });
  } catch (error: any) {
    console.error('Purchase badge error:', error);
    res.status(400).json({ error: error.message || '兌換勳章失敗' });
  }
});

// 注意：勳章現在都是可購買的，不再需要自動解鎖功能
// 如果需要檢查並解鎖勳章的功能，請通過成就系統來實現

// 管理員授予勳章
router.post('/grant/:userId/:badgeId', async (req, res) => {
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
    
    // 檢查管理員權限
    const admin = await userModel.findById(payload.userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: '只有管理員可以授予勳章' });
    }
    
    // 獲取目標用戶角色
    const { userId, badgeId } = req.params;
    const targetUser = await userModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: '目標用戶不存在' });
    }
    
    const badge = await badgeModel.grantBadge(userId, badgeId, payload.userId, targetUser.role);
    
    res.json({ badge, message: '勳章授予成功！' });
  } catch (error: any) {
    console.error('Grant badge error:', error);
    res.status(400).json({ error: error.message || '授予勳章失敗' });
  }
});

export default router;



