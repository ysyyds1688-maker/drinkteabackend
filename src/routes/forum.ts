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
    
    const { title, content, category, tags } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ error: '標題、內容和分類為必填項' });
    }
    
    const post = await forumModel.createPost({
      userId: payload.userId,
      title,
      content,
      category,
      tags,
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
    
    // 如果任務完成，添加積分和經驗值
    let pointsResult = null;
    if (taskResult.completed) {
      pointsResult = await userStatsModel.addPoints(
        payload.userId,
        taskResult.pointsEarned,
        taskResult.experienceEarned
      );
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
    
    const liked = await forumModel.toggleLike(payload.userId, targetType, targetId);
    
    // 更新任務進度（如果是點讚）
    if (liked) {
      await tasksModel.updateTaskProgress(payload.userId, 'like_content');
      
      // 如果是點讚帖子或回覆，需要更新被點讚者的統計
      // 注意：這裡需要獲取帖子或回覆的作者ID來更新統計
      // 暫時跳過，因為Forum模型可能需要擴展以返回作者ID
    }
    
    res.json({ liked });
  } catch (error: any) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: error.message || '操作失敗' });
  }
});

export default router;

