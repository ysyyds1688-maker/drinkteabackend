import { Router } from 'express';
import { forumModel } from '../models/Forum.js';
import { userStatsModel } from '../models/UserStats.js';
import { tasksModel } from '../models/Tasks.js';
import { achievementModel } from '../models/Achievement.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 獲取帖子列表
router.get('/posts', async (req, res) => {
  try {
    const { category, sortBy = 'latest', limit, offset } = req.query;
    
    const posts = await forumModel.getPosts({
      category: category as string,
      sortBy: sortBy as 'latest' | 'hot' | 'replies' | 'views',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    
    res.json({ posts });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: error.message || '獲取帖子失敗' });
  }
});

// 獲取單個帖子
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await forumModel.getPostById(id);
    
    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    // 獲取回覆
    const replies = await forumModel.getRepliesByPostId(id);
    
    // 檢查是否已點讚（如果已登入）
    let isLiked = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        isLiked = await forumModel.isLiked(payload.userId, 'post', id);
      }
    }
    
    res.json({ post, replies, isLiked });
  } catch (error: any) {
    console.error('Get post error:', error);
    res.status(500).json({ error: error.message || '獲取帖子失敗' });
  }
});

// 創建帖子
router.post('/posts', async (req, res) => {
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
    
    const { title, content, category, tags, images } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ error: '標題、內容和分類為必填項' });
    }
    
    const post = await forumModel.createPost({
      userId: payload.userId,
      title,
      content,
      category,
      tags,
      images,
    });
    
    // 更新統計和任務
    await userStatsModel.updateCounts(payload.userId, { postsCount: 1 });
    const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'create_post');
    
    // 如果任務完成，添加積分和經驗值
    let pointsResult = null;
    if (taskResult.completed) {
      pointsResult = await userStatsModel.addPoints(
        payload.userId,
        taskResult.pointsEarned,
        taskResult.experienceEarned
      );
      
      // 創建任務完成通知
      try {
        const { notificationModel } = await import('../models/Notification.js');
        const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'create_post');
        if (definition) {
          await notificationModel.create({
            userId: payload.userId,
            type: 'task',
            title: '任務完成',
            content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
            link: `/user-profile?tab=points`,
            metadata: {
              taskType: 'create_post',
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
    
    // 檢查並解鎖成就
    const unlockedAchievements = await achievementModel.checkAndUnlockAchievements(payload.userId);
    
    res.status(201).json({
      post,
      taskCompleted: taskResult.completed,
      pointsEarned: taskResult.completed ? taskResult.pointsEarned : 0,
      experienceEarned: taskResult.completed ? taskResult.experienceEarned : 0,
      levelUp: pointsResult?.levelUp || false,
      newLevel: pointsResult?.newLevel,
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined,
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || '創建帖子失敗' });
  }
});

// 創建回覆
router.post('/posts/:postId/replies', async (req, res) => {
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
    
    const { postId } = req.params;
    const { content, parentReplyId } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '回覆內容不能為空' });
    }
    
    const reply = await forumModel.createReply({
      postId,
      userId: payload.userId,
      content: content.trim(),
      parentReplyId,
    });
    
    // 更新統計和任務
    await userStatsModel.updateCounts(payload.userId, { repliesCount: 1 });
    const taskResult = await tasksModel.updateTaskProgress(payload.userId, 'reply_post');
    
    // 發表評論直接給經驗值獎勵（+8經驗值/次）
    let pointsResult = null;
    try {
      pointsResult = await userStatsModel.addPoints(payload.userId, 0, 8); // 只給經驗值，不給積分
    } catch (error) {
      console.error('給評論者經驗值失敗:', error);
    }
    
    // 如果任務完成，添加任務積分和經驗值
    if (taskResult.completed) {
      const taskPointsResult = await userStatsModel.addPoints(
        payload.userId,
        taskResult.pointsEarned,
        taskResult.experienceEarned
      );
      // 如果任務完成導致升級，使用任務的升級結果
      if (taskPointsResult.levelUp) {
        pointsResult = taskPointsResult;
      }
      
      // 創建任務完成通知
      try {
        const { notificationModel } = await import('../models/Notification.js');
        const definition = tasksModel.getTaskDefinitions().find(d => d.type === 'reply_post');
        if (definition) {
          await notificationModel.create({
            userId: payload.userId,
            type: 'task',
            title: '任務完成',
            content: `恭喜您完成了「${definition.name}」任務！獲得 ${taskResult.pointsEarned} 積分和 ${taskResult.experienceEarned} 經驗值。`,
            link: `/user-profile?tab=points`,
            metadata: {
              taskType: 'reply_post',
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
    
    // 檢查並解鎖成就
    const unlockedAchievements = await achievementModel.checkAndUnlockAchievements(payload.userId);
    
    res.status(201).json({
      reply,
      taskCompleted: taskResult.completed,
      pointsEarned: taskResult.completed ? taskResult.pointsEarned : 0,
      experienceEarned: taskResult.completed ? taskResult.experienceEarned : 0,
      levelUp: pointsResult?.levelUp || false,
      newLevel: pointsResult?.newLevel,
      unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined,
    });
  } catch (error: any) {
    console.error('Create reply error:', error);
    res.status(500).json({ error: error.message || '創建回覆失敗' });
  }
});

// 點讚/取消點讚
router.post('/likes', async (req, res) => {
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
    
    const { targetType, targetId } = req.body;
    
    if (!targetType || !targetId || !['post', 'reply'].includes(targetType)) {
      return res.status(400).json({ error: '無效的參數' });
    }
    
    const likeResult = await forumModel.toggleLike(payload.userId, targetType, targetId);
    
    // 更新任務進度（如果是點讚）
    if (likeResult.liked) {
      await tasksModel.updateTaskProgress(payload.userId, 'like_content');
      
      // 給被點讚者經驗值獎勵（+2經驗值/次）
      if (likeResult.authorId && likeResult.authorId !== payload.userId) {
        try {
          await userStatsModel.addPoints(likeResult.authorId, 0, 2); // 只給經驗值，不給積分
          await userStatsModel.updateCounts(likeResult.authorId, { likesReceived: 1 });
        } catch (error) {
          console.error('給被點讚者經驗值失敗:', error);
        }
      }
    }
    
    res.json({ liked: likeResult.liked });
  } catch (error: any) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: error.message || '操作失敗' });
  }
});

// 刪除帖子（僅管理員）
router.delete('/posts/:id', async (req, res) => {
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

    // 檢查是否為管理員
    const { userModel } = await import('../models/User.js');
    const user = await userModel.findById(payload.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可執行此操作' });
    }
    
    const { id } = req.params;
    const deleted = await forumModel.deletePost(id);
    
    if (!deleted) {
      return res.status(404).json({ error: '帖子不存在' });
    }
    
    res.json({ success: true, message: '帖子已刪除' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message || '刪除帖子失敗' });
  }
});

// 刪除回覆（僅管理員）
router.delete('/replies/:id', async (req, res) => {
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

    // 檢查是否為管理員
    const { userModel } = await import('../models/User.js');
    const user = await userModel.findById(payload.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可執行此操作' });
    }
    
    const { id } = req.params;
    const deleted = await forumModel.deleteReply(id);
    
    if (!deleted) {
      return res.status(404).json({ error: '回覆不存在' });
    }
    
    res.json({ success: true, message: '回覆已刪除' });
  } catch (error: any) {
    console.error('Delete reply error:', error);
    res.status(500).json({ error: error.message || '刪除回覆失敗' });
  }
});

export default router;

