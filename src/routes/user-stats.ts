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
    
    // 獲取用戶信息以確定角色
    const { userModel } = await import('../models/User.js');
    const user = await userModel.findById(payload.userId);
    
    const currentLevel = await getLevelFromExperience(payload.userId, stats.experiencePoints);
    console.log(`[user-stats] 用戶 ${payload.userId} (角色: ${user?.role}) 經驗值: ${stats.experiencePoints}, 計算等級: ${currentLevel}`);
    
    // 檢查是否有活躍的付費訂閱（VIP狀態）
    const activeSubscription = await subscriptionModel.getActiveByUserId(payload.userId);
    const isVip = activeSubscription !== null && 
      activeSubscription.isActive && 
      (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
    
    // 根據角色選擇對應的等級門檻
    const isProvider = user?.role === 'provider';
    
    const clientLevelThresholds = {
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
    
    const ladyLevelThresholds = {
      lady_trainee: 0,
      lady_apprentice: 100,
      lady_junior: 500,
      lady_senior: 2000,
      lady_expert: 10000,
      lady_master: 50000,
      lady_elite: 100000,
      lady_premium: 200000,
      lady_royal: 500000,
      lady_empress: 1000000,
    };
    
    const levelThresholds = isProvider ? ladyLevelThresholds : clientLevelThresholds;
    
    let nextLevel: string | null = null;
    let experienceNeeded = 0;
    
    if (isProvider) {
      // 後宮佳麗等級邏輯
      if (currentLevel === 'lady_trainee') {
        nextLevel = 'lady_apprentice';
        experienceNeeded = ladyLevelThresholds.lady_apprentice - stats.experiencePoints;
      } else if (currentLevel === 'lady_apprentice') {
        nextLevel = 'lady_junior';
        experienceNeeded = ladyLevelThresholds.lady_junior - stats.experiencePoints;
      } else if (currentLevel === 'lady_junior') {
        nextLevel = 'lady_senior';
        experienceNeeded = ladyLevelThresholds.lady_senior - stats.experiencePoints;
      } else if (currentLevel === 'lady_senior') {
        nextLevel = 'lady_expert';
        experienceNeeded = ladyLevelThresholds.lady_expert - stats.experiencePoints;
      } else if (currentLevel === 'lady_expert') {
        nextLevel = 'lady_master';
        experienceNeeded = ladyLevelThresholds.lady_master - stats.experiencePoints;
      } else if (currentLevel === 'lady_master') {
        nextLevel = 'lady_elite';
        experienceNeeded = ladyLevelThresholds.lady_elite - stats.experiencePoints;
      } else if (currentLevel === 'lady_elite') {
        nextLevel = 'lady_premium';
        experienceNeeded = ladyLevelThresholds.lady_premium - stats.experiencePoints;
      } else if (currentLevel === 'lady_premium') {
        nextLevel = 'lady_royal';
        experienceNeeded = ladyLevelThresholds.lady_royal - stats.experiencePoints;
      } else if (currentLevel === 'lady_royal') {
        nextLevel = 'lady_empress';
        experienceNeeded = ladyLevelThresholds.lady_empress - stats.experiencePoints;
      }
    } else {
      // 品茶客等級邏輯
      if (currentLevel === 'tea_guest') {
        nextLevel = 'tea_scholar';
        experienceNeeded = clientLevelThresholds.tea_scholar - stats.experiencePoints;
      } else if (currentLevel === 'tea_scholar') {
        nextLevel = 'royal_tea_scholar';
        experienceNeeded = clientLevelThresholds.royal_tea_scholar - stats.experiencePoints;
      } else if (currentLevel === 'royal_tea_scholar') {
        nextLevel = 'royal_tea_officer';
        experienceNeeded = clientLevelThresholds.royal_tea_officer - stats.experiencePoints;
      } else if (currentLevel === 'royal_tea_officer') {
        nextLevel = 'tea_king_attendant';
        experienceNeeded = clientLevelThresholds.tea_king_attendant - stats.experiencePoints;
      } else if (currentLevel === 'tea_king_attendant') {
        nextLevel = 'imperial_chief_tea_officer';
        experienceNeeded = clientLevelThresholds.imperial_chief_tea_officer - stats.experiencePoints;
      } else if (currentLevel === 'imperial_chief_tea_officer') {
        nextLevel = 'tea_king_confidant';
        experienceNeeded = clientLevelThresholds.tea_king_confidant - stats.experiencePoints;
      } else if (currentLevel === 'tea_king_confidant') {
        nextLevel = 'tea_king_personal_selection';
        experienceNeeded = clientLevelThresholds.tea_king_personal_selection - stats.experiencePoints;
      } else if (currentLevel === 'tea_king_personal_selection') {
        nextLevel = 'imperial_golden_seal_tea_officer';
        experienceNeeded = clientLevelThresholds.imperial_golden_seal_tea_officer - stats.experiencePoints;
      } else if (currentLevel === 'imperial_golden_seal_tea_officer') {
        nextLevel = 'national_master_tea_officer';
        experienceNeeded = clientLevelThresholds.national_master_tea_officer - stats.experiencePoints;
      }
    }
    
    const currentThreshold = levelThresholds[currentLevel as keyof typeof levelThresholds];
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

