import { Router } from 'express';
import { profileModel } from '../models/Profile.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../types.js';
import { verifyToken } from '../services/authService.js';
import { tasksModel } from '../models/Tasks.js';
import { userStatsModel } from '../models/UserStats.js';

const router = Router();

// GET /api/profiles - Get all profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await profileModel.getAll();
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles/:id - Get profile by ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await profileModel.getById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // 如果用户已登录，更新浏览任务进度（浏览个人资料）
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload && payload.userId) {
          // 更新浏览任务进度
          const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'browse_profiles');
          // 如果任务完成，添加积分和经验值
          if (taskResult.completed) {
            await userStatsModel.addPoints(
              payload.userId,
              taskResult.pointsEarned,
              taskResult.experienceEarned
            );
            
            // 創建任務完成通知
            try {
              const { notificationModel } = await import('../models/Notification.js');
              const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'browse_profiles');
              if (definition) {
                await notificationModel.create({
                  userId: payload.userId,
                  type: 'task',
                  title: '任務完成',
                  content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
                  link: `/user-profile?tab=points`,
                  metadata: {
                    taskType: 'browse_profiles',
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
        // 忽略验证错误，不影响返回profile
        console.error('更新浏览任务失败:', error);
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
    const profile = await profileModel.update(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
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

export default router;
