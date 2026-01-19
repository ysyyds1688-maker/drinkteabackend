import { Router } from 'express';
import cron from 'node-cron';
import { schedulerService } from '../services/schedulerService.js';
import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/scheduler/tasks - 获取所有定时任务
router.get('/tasks', async (req, res) => {
  try {
    const result = await query('SELECT * FROM scheduled_tasks ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scheduler/tasks - 创建定时任务
router.post('/tasks', async (req, res) => {
  try {
    const { name, taskType, cronExpression, config } = req.body;
    
    if (!name || !taskType || !cronExpression) {
      return res.status(400).json({ 
        error: 'name, taskType, and cronExpression are required' 
      });
    }

    // 验证 cron 表达式
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO scheduled_tasks (id, name, task_type, cron_expression, config, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, taskType, cronExpression, JSON.stringify(config || {}), 1]
    );

    // 启动任务
    const task = await query('SELECT * FROM scheduled_tasks WHERE id = $1', [id]);
    if (task.rows.length > 0) {
      schedulerService.startTask(task.rows[0]);
    }

    res.json({ id, message: 'Task created and started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/scheduler/tasks/:id - 更新任务
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cronExpression, config, isActive } = req.body;

    // 如果更新了 cron 表达式，验证它
    if (cronExpression && !cron.validate(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    await query(
      `UPDATE scheduled_tasks 
       SET name = COALESCE($1, name),
           cron_expression = COALESCE($2, cron_expression),
           config = COALESCE($3, config),
           is_active = COALESCE($4, is_active),
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        name || null,
        cronExpression || null,
        config ? JSON.stringify(config) : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        id
      ]
    );

    // 重启任务
    const task = await query('SELECT * FROM scheduled_tasks WHERE id = $1', [id]);
    if (task.rows.length > 0) {
      schedulerService.stopTask(id);
      if (task.rows[0].is_active) {
        schedulerService.startTask(task.rows[0]);
      }
    }

    res.json({ message: 'Task updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/scheduler/tasks/:id - 删除任务
router.delete('/tasks/:id', async (req, res) => {
  try {
    schedulerService.stopTask(req.params.id);
    await query('DELETE FROM scheduled_tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

