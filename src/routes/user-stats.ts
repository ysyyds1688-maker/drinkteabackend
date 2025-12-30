import { Router } from 'express';
import { userStatsModel, getLevelFromExperience } from '../models/UserStats.js';
import { subscriptionModel } from '../models/Subscription.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 獲取用戶統計
router.get('/me', async (req, res) => {
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
    
    const stats = await userStatsModel.getOrCreate(payload.userId);
    const currentLevel = getLevelFromExperience(stats.experiencePoints);
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(payload.userId);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    // 計算下一級所需經驗值
    const levelThresholds = {
      tea_guest: 0,
      tea_scholar: 100,
      royal_tea_scholar: 500,
      royal_tea_officer: 2000,
      tea_king_attendant: 10000,
      imperial_chief_tea_officer: 50000,
      tea_king_confidant: 100000,
      tea_king_personal_selection: 200000,
      imperial_golden_seal_tea_officer: 500000,
      national_master_tea_officer: 1000000,
    };
    
    let nextLevel: string | null = null;
    let experienceNeeded = 0;
    
    if (currentLevel === 'tea_guest') {
      nextLevel = 'tea_scholar';
      experienceNeeded = levelThresholds.tea_scholar - stats.experiencePoints;
    } else if (currentLevel === 'tea_scholar') {
      nextLevel = 'royal_tea_scholar';
      experienceNeeded = levelThresholds.royal_tea_scholar - stats.experiencePoints;
    } else if (currentLevel === 'royal_tea_scholar') {
      nextLevel = 'royal_tea_officer';
      experienceNeeded = levelThresholds.royal_tea_officer - stats.experiencePoints;
    } else if (currentLevel === 'royal_tea_officer') {
      nextLevel = 'tea_king_attendant';
      experienceNeeded = levelThresholds.tea_king_attendant - stats.experiencePoints;
    } else if (currentLevel === 'tea_king_attendant') {
      nextLevel = 'imperial_chief_tea_officer';
      experienceNeeded = levelThresholds.imperial_chief_tea_officer - stats.experiencePoints;
    } else if (currentLevel === 'imperial_chief_tea_officer') {
      nextLevel = 'tea_king_confidant';
      experienceNeeded = levelThresholds.tea_king_confidant - stats.experiencePoints;
    } else if (currentLevel === 'tea_king_confidant') {
      nextLevel = 'tea_king_personal_selection';
      experienceNeeded = levelThresholds.tea_king_personal_selection - stats.experiencePoints;
    } else if (currentLevel === 'tea_king_personal_selection') {
      nextLevel = 'imperial_golden_seal_tea_officer';
      experienceNeeded = levelThresholds.imperial_golden_seal_tea_officer - stats.experiencePoints;
    } else if (currentLevel === 'imperial_golden_seal_tea_officer') {
      nextLevel = 'national_master_tea_officer';
      experienceNeeded = levelThresholds.national_master_tea_officer - stats.experiencePoints;
    }
    
    const currentThreshold = levelThresholds[currentLevel];
    const nextThreshold = nextLevel ? levelThresholds[nextLevel as keyof typeof levelThresholds] : currentThreshold;
    const progressInLevel = nextLevel ? stats.experiencePoints - currentThreshold : 0;
    const progressRange = nextThreshold - currentThreshold;
    const progressPercent = nextLevel && progressRange > 0 
      ? (progressInLevel / progressRange) * 100 
      : 100;
    
    res.json({
      stats,
      currentLevel,
      nextLevel,
      experienceNeeded,
      progress: Math.min(progressPercent, 100),
      isVip,
      vipSubscription: isVip ? activeSubscription : null,
    });
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: error.message || '獲取統計失敗' });
  }
});

export default router;

