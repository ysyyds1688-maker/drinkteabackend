import { Router } from 'express';
import { achievementModel, ACHIEVEMENT_DEFINITIONS, LADY_ACHIEVEMENT_DEFINITIONS } from '../models/Achievement.js';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';

const router = Router();

// 獲取用戶的成就
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
    
    const achievements = await achievementModel.getUserAchievements(payload.userId);
    res.json({ achievements });
  } catch (error: any) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ error: error.message || '獲取成就失敗' });
  }
});

// 獲取所有成就定義（根據用戶角色返回對應的成就定義）
router.get('/definitions', async (req, res) => {
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

    // 根據角色選擇對應的成就定義
    const achievementDefinitions = userRole === 'provider' 
      ? LADY_ACHIEVEMENT_DEFINITIONS 
      : ACHIEVEMENT_DEFINITIONS;

    // 過濾掉 condition 函數，只返回前端需要的欄位
    const definitions = achievementDefinitions.map(def => ({
      type: def.type,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      pointsReward: def.pointsReward,
      experienceReward: def.experienceReward,
    }));
    
    console.log(`[achievements] 返回 ${userRole} 角色的成就定義，共 ${definitions.length} 個`);
    res.json({ definitions });
  } catch (error: any) {
    console.error('Get achievement definitions error:', error);
    res.status(500).json({ error: error.message || '獲取成就定義失敗' });
  }
});

// 檢查並解鎖成就（通常在完成任務時調用）
router.post('/check', async (req, res) => {
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
    
    const unlocked = await achievementModel.checkAndUnlockAchievements(payload.userId);
    res.json({ unlocked, count: unlocked.length });
  } catch (error: any) {
    console.error('Check achievements error:', error);
    res.status(500).json({ error: error.message || '檢查成就失敗' });
  }
});

export default router;



