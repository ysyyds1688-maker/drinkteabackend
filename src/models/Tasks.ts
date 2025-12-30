import { query } from '../db/database.js';

export interface DailyTask {
  id: string;
  userId: string;
  taskType: string;
  taskDate: string;
  isCompleted: boolean;
  progress: number;
  target: number;
  pointsEarned: number;
  createdAt: string;
}

export interface TaskDefinition {
  type: string;
  name: string;
  description: string;
  target: number;
  pointsReward: number;
  experienceReward: number;
  category: 'daily' | 'weekly' | 'achievement';
}

// 任務定義
// 設計原則：經驗值比積分更容易獲得（經驗是積分的 1.5 倍）
// 積分用於兌換勳章，經驗值用於升級會員等級
export const TASK_DEFINITIONS: Record<string, TaskDefinition> = {
  daily_login: {
    type: 'daily_login',
    name: '每日登入',
    description: '登入網站',
    target: 1,
    pointsReward: 10,        // 積分：較難獲得
    experienceReward: 15,    // 經驗：較容易獲得（積分的 1.5 倍）
    category: 'daily',
  },
  create_post: {
    type: 'create_post',
    name: '發表帖子',
    description: '在論壇發表 1 篇帖子',
    target: 1,
    pointsReward: 20,        // 積分：較難獲得
    experienceReward: 30,    // 經驗：較容易獲得（積分的 1.5 倍）
    category: 'daily',
  },
  reply_post: {
    type: 'reply_post',
    name: '回覆帖子',
    description: '在論壇回覆 3 篇帖子',
    target: 3,
    pointsReward: 30,        // 積分：較難獲得
    experienceReward: 45,    // 經驗：較容易獲得（積分的 1.5 倍）
    category: 'daily',
  },
  like_content: {
    type: 'like_content',
    name: '互動任務',
    description: '點讚 5 個帖子/回覆',
    target: 5,
    pointsReward: 25,        // 積分：較難獲得
    experienceReward: 37,    // 經驗：較容易獲得（積分的 1.5 倍，四捨五入）
    category: 'daily',
  },
  browse_profiles: {
    type: 'browse_profiles',
    name: '瀏覽任務',
    description: '瀏覽 10 個個人資料',
    target: 10,
    pointsReward: 20,        // 積分：較難獲得
    experienceReward: 30,    // 經驗：較容易獲得（積分的 1.5 倍）
    category: 'daily',
  },
};

export const tasksModel = {
  // 獲取或創建每日任務
  getOrCreateDailyTask: async (userId: string, taskType: string, date: string = new Date().toISOString().split('T')[0]): Promise<DailyTask> => {
    let result = await query(`
      SELECT * FROM daily_tasks 
      WHERE user_id = $1 AND task_type = $2 AND task_date = $3
    `, [userId, taskType, date]);
    
    if (result.rows.length === 0) {
      const definition = TASK_DEFINITIONS[taskType];
      if (!definition) {
        throw new Error(`Unknown task type: ${taskType}`);
      }
      
      const { v4: uuidv4 } = await import('uuid');
      const id = `task_${Date.now()}_${uuidv4().substring(0, 9)}`;
      
      await query(`
        INSERT INTO daily_tasks (id, user_id, task_type, task_date, target, progress, is_completed)
        VALUES ($1, $2, $3, $4, $5, 0, FALSE)
      `, [id, userId, taskType, date, definition.target]);
      
      result = await query(`
        SELECT * FROM daily_tasks 
        WHERE user_id = $1 AND task_type = $2 AND task_date = $3
      `, [userId, taskType, date]);
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      taskType: row.task_type,
      taskDate: row.task_date,
      isCompleted: Boolean(row.is_completed),
      progress: row.progress || 0,
      target: row.target,
      pointsEarned: row.points_earned || 0,
      createdAt: row.created_at,
    };
  },

  // 更新任務進度
  updateTaskProgress: async (userId: string, taskType: string, increment: number = 1): Promise<{ task: DailyTask; completed: boolean; pointsEarned: number; experienceEarned: number }> => {
    const date = new Date().toISOString().split('T')[0];
    const task = await tasksModel.getOrCreateDailyTask(userId, taskType, date);
    
    if (task.isCompleted) {
      return { task, completed: false, pointsEarned: 0, experienceEarned: 0 };
    }
    
    const newProgress = task.progress + increment;
    const definition = TASK_DEFINITIONS[taskType];
    const completed = newProgress >= task.target;
    
    await query(`
      UPDATE daily_tasks 
      SET progress = $1, 
          is_completed = $2,
          points_earned = CASE WHEN $2 THEN $3 ELSE points_earned END
      WHERE id = $4
    `, [newProgress, completed, definition.pointsReward, task.id]);
    
    const updatedTask = await tasksModel.getOrCreateDailyTask(userId, taskType, date);
    
    return {
      task: updatedTask,
      completed,
      pointsEarned: completed ? definition.pointsReward : 0,
      experienceEarned: completed ? definition.experienceReward : 0,
    };
  },

  // 獲取用戶的每日任務
  getDailyTasks: async (userId: string, date: string = new Date().toISOString().split('T')[0]): Promise<DailyTask[]> => {
    const tasks: DailyTask[] = [];
    
    for (const taskType of Object.keys(TASK_DEFINITIONS)) {
      const definition = TASK_DEFINITIONS[taskType];
      if (definition.category === 'daily') {
        const task = await tasksModel.getOrCreateDailyTask(userId, taskType, date);
        tasks.push(task);
      }
    }
    
    return tasks;
  },

  // 獲取任務定義
  getTaskDefinitions: (): TaskDefinition[] => {
    return Object.values(TASK_DEFINITIONS);
  },
};



