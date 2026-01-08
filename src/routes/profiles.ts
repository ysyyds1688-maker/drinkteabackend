import { Router } from 'express';
import { profileModel } from '../models/Profile.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../types.js';
import { verifyToken } from '../services/authService.js';
import { tasksModel } from '../models/Tasks.js';
import { userStatsModel } from '../models/UserStats.js';
import { profilesCache, profileDetailCache } from '../middleware/cacheMiddleware.js';
import { queryLimiter } from '../middleware/queryLimiter.js';
import { userModel } from '../models/User.js';
import { notificationModel } from '../models/Notification.js';
import { query } from '../db/database.js';
import { telegramService } from '../services/telegramService.js';

const router = Router();

// 處理 lady_boost_exposure 任務的輔助函數
const handleLadyBoostExposureTask = async (profile: Profile, shouldIncrementViews: boolean) => {
  try {
    const provider = await userModel.findById(profile.userId!);
    if (provider && provider.role === 'provider') {
      const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_boost_exposure');
      if (definition) {
        const date = tasksModel.getLocalDateString();
        const task = await tasksModel.getOrCreateDailyTask(profile.userId!, 'lady_boost_exposure', date);
        
        if (!task.isCompleted && profile.views !== undefined && profile.views >= definition.target) {
          await query(
            `UPDATE daily_tasks SET progress = $1, is_completed = TRUE, points_earned = $2 WHERE id = $3`,
            [definition.target, definition.pointsReward, task.id]
          );
          
          await userStatsModel.addPoints(
            profile.userId!,
            definition.pointsReward,
            definition.experienceReward
          );
          
          await notificationModel.create({
            userId: profile.userId!,
            type: 'task',
            title: '任務完成',
            content: `恭喜您完成了「${definition.name}」任務！獲得 ${definition.pointsReward} 積分和 ${definition.experienceReward} 經驗值。`,
            link: `/user-profile?tab=points`,
            metadata: {
              taskType: 'lady_boost_exposure',
              taskName: definition.name,
              pointsEarned: definition.pointsReward,
              experienceEarned: definition.experienceReward,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('更新 lady_boost_exposure 任務失敗:', error);
  }
};

// 處理 browse_provider_profiles 任務的輔助函數
const handleBrowseProviderProfilesTask = async (userId: string) => {
  try {
    const currentUser = await userModel.findById(userId);
    if (currentUser && currentUser.role === 'client') {
      const taskResult = await tasksModel.updateTaskProgress(userId, 'browse_provider_profiles');
      if (taskResult.completed) {
        await userStatsModel.addPoints(
          userId,
          taskResult.pointsEarned,
          taskResult.experienceEarned
        );
        
        const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'browse_provider_profiles');
        if (definition) {
          await notificationModel.create({
            userId: userId,
            type: 'task',
            title: '任務完成',
            content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
            link: `/user-profile?tab=points`,
            metadata: {
              taskType: 'browse_provider_profiles',
              taskName: definition.name,
              pointsEarned: taskResult.pointsEarned,
              experienceEarned: taskResult.experienceEarned,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('更新瀏覽佳麗資料任務失敗:', error);
  }
};

// GET /api/profiles - Get all profiles (支持分頁，帶緩存和查詢限制)
router.get('/', queryLimiter, profilesCache, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    
    console.log('[Profiles] 開始獲取 profiles...', { limit, offset });
    const startTime = Date.now();
    const result = await profileModel.getAll(undefined, { limit, offset });
    const duration = Date.now() - startTime;
    console.log(`[Profiles] 成功獲取 ${result.profiles.length} 個 profiles（總共 ${result.total} 個），耗時 ${duration}ms`);
    
    // 返回分頁結果
    res.json({
      profiles: result.profiles,
      total: result.total,
      limit: limit || result.total,
      offset: offset || 0,
      hasMore: offset !== undefined && limit !== undefined ? (offset + limit) < result.total : false
    });
  } catch (error: any) {
    console.error('[Profiles] 獲取 profiles 失敗:', error);
    res.status(500).json({ error: error.message || '獲取 Profiles 失敗' });
  }
});

// GET /api/profiles/:id - Get profile by ID (帶緩存)
router.get('/:id', profileDetailCache, async (req, res) => {
  try {
    // 增加瀏覽次數（只有非本人瀏覽時才增加）
    const authHeader = req.headers.authorization;
    let shouldIncrementViews = true;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload && payload.userId) {
          const profile = await profileModel.getById(req.params.id, false);
          // 如果是佳麗本人瀏覽自己的資料，不增加瀏覽次數
          if (profile && profile.userId === payload.userId) {
            shouldIncrementViews = false;
          }
        }
      } catch (error) {
        // 忽略驗證錯誤，繼續增加瀏覽次數
      }
    }
    
    const profile = await profileModel.getById(req.params.id, shouldIncrementViews);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // 如果是佳麗的資料且瀏覽次數達到 50，檢查並觸發 lady_boost_exposure 任務
    if (profile.userId && shouldIncrementViews && profile.views !== undefined && profile.views >= 50) {
      await handleLadyBoostExposureTask(profile, shouldIncrementViews);
    }
    
    // 如果用户已登录且是茶客，更新瀏覽佳麗資料任務進度（僅限茶客）
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload && payload.userId) {
          await handleBrowseProviderProfilesTask(payload.userId);
        }
      } catch (error) {
        // 忽略验证错误，不影响返回profile
        console.error('更新瀏覽佳麗資料任務失敗:', error);
      }
    }
    
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles - Create new profile
router.post('/', async (req, res) => {
  try {
    const profileData: Profile = {
      id: req.body.id || uuidv4(),
      ...req.body,
    };

    // Validate required fields
    if (!profileData.name || !profileData.nationality || !profileData.location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profile = await profileModel.create(profileData);
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profiles/:id - Update profile
router.put('/:id', async (req, res) => {
  try {
    // 獲取現有的 profile 以檢查 userId
    const existingProfile = await profileModel.getById(req.params.id);
    if (!existingProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const profile = await profileModel.update(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // 如果這個 profile 有 userId（表示是佳麗自己上架的），更新上架資料任務
    if (profile.userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = verifyToken(token);
          if (payload && payload.userId === profile.userId) {
            // 確認是佳麗本人更新自己的資料
            const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'lady_update_profile');
            
            if (taskResult.completed) {
              await userStatsModel.addPoints(
                payload.userId,
                taskResult.pointsEarned,
                taskResult.experienceEarned
              );
              
              // 創建任務完成通知
              try {
                const { notificationModel } = await import('../models/Notification.js');
                const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'lady_update_profile');
                if (definition) {
                  await notificationModel.create({
                    userId: payload.userId,
                    type: 'task',
                    title: '任務完成',
                    content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
                    link: `/user-profile?tab=points`,
                    metadata: {
                      taskType: 'lady_update_profile',
                      taskName: definition.name,
                      pointsEarned: taskResult.pointsEarned,
                      experienceEarned: taskResult.experienceEarned,
                    },
                  });
                }
              } catch (error) {
                console.error('創建任務完成通知失敗:', error);
              }
            }
          }
        } catch (error) {
          // 忽略验证错误，不影响更新profile
          console.error('更新上架資料任務失敗:', error);
        }
      }
    }
    
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/profiles/:id - Delete profile
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await profileModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profiles/:id/contact - 記錄聯繫客服次數（嚴選好茶）
router.post('/:id/contact', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查 profile 是否存在
    const profile = await profileModel.getById(id);
    if (!profile) {
      return res.status(404).json({ error: '檔案不存在' });
    }
    
    // 只記錄嚴選好茶的聯繫次數（沒有 userId 的才是嚴選好茶）
    if (profile.userId) {
      return res.status(400).json({ error: '此功能僅適用於嚴選好茶' });
    }
    
    // 增加聯繫次數
    await profileModel.incrementContactCount(id);
    
    // 獲取用戶信息（如果有登入）
    let userInfo = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
          const user = await userModel.findById(payload.userId);
          if (user) {
            userInfo = {
              id: user.id,
              publicId: user.publicId || user.id,
              email: user.email,
              userName: user.userName,
            };
          }
        }
      } catch (error) {
        // 忽略驗證錯誤，不影響主流程
      }
    }
    
    // 生成 Telegram 邀請連結（如果配置了 Telegram）
    let telegramInviteLink: string | null = null;
    try {
      if (telegramService.isConfigured()) {
        telegramInviteLink = await telegramService.generateOneTimeInviteLink();
        
        // 發送通知到管理群組（如果配置了管理群組）
        if (userInfo) {
          const notificationMessage = 
            `🔔 新用戶聯繫客服\n\n` +
            `用戶：${userInfo.userName || userInfo.email || '匿名'}\n` +
            `用戶ID：${userInfo.publicId || userInfo.id}\n` +
            `檔案：${profile.name}\n` +
            `時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;
          
          await telegramService.sendNotification(notificationMessage);
        }
      }
    } catch (error: any) {
      // Telegram 服務失敗不影響主流程，只記錄錯誤
      console.error('Telegram 服務錯誤:', error.message);
    }
    
    // 獲取更新後的聯繫次數
    const updatedProfile = await profileModel.getById(id);
    
    res.json({
      message: '聯繫次數已記錄',
      contactCount: updatedProfile?.contactCount || 0,
      telegramInviteLink, // 返回 Telegram 邀請連結（如果有的話）
    });
  } catch (error: any) {
    console.error('記錄聯繫次數失敗:', error);
    res.status(500).json({ error: error.message || '記錄聯繫次數失敗' });
  }
});

export default router;