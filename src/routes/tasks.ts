import { Router } from 'express';
import { tasksModel } from '../models/Tasks.js';
import { userStatsModel } from '../models/UserStats.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 獲取每日任務
router.get('/daily', async (req, res) => {
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
    
    const { date } = req.query;
    const tasks = await tasksModel.getDailyTasks(
      payload.userId,
      date as string || new Date().toISOString().split('T')[0]
    );
    
    const definitions = tasksModel.getTaskDefinitions();
    const taskMap = new Map(definitions.map(d => [d.type, d]));
    
    const tasksWithInfo = tasks.map(task => ({
      ...task,
      name: taskMap.get(task.taskType)?.name || task.taskType,
      description: taskMap.get(task.taskType)?.description || '',
      pointsReward: taskMap.get(task.taskType)?.pointsReward || 0,
      experienceReward: taskMap.get(task.taskType)?.experienceReward || 0,
    }));
    
    res.json({ tasks: tasksWithInfo });
  } catch (error: any) {
    console.error('Get daily tasks error:', error);
    res.status(500).json({ error: error.message || '獲取任務失敗' });
  }
});

// 獲取任務定義
router.get('/definitions', async (req, res) => {
  try {
    const definitions = tasksModel.getTaskDefinitions();
    res.json({ definitions });
  } catch (error: any) {
    console.error('Get task definitions error:', error);
    res.status(500).json({ error: error.message || '獲取任務定義失敗' });
  }
});

export default router;



