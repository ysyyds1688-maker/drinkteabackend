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
// 積分獎勵已調降，使勳章更有價值
export const TASK_DEFINITIONS: Record<string, TaskDefinition> = {
  daily_login: {
    type: 'daily_login',
    name: '每日登入',
    description: '登入網站',
    target: 1,
    pointsReward: 5,         // 積分：調降（原 10）
    experienceReward: 8,     // 經驗：調降（原 15）
    category: 'daily',
  },
  create_post: {
    type: 'create_post',
    name: '發表帖子',
    description: '在論壇發表 1 篇帖子',
    target: 1,
    pointsReward: 10,        // 積分：調降（原 20）
    experienceReward: 15,    // 經驗：調降（原 30）
    category: 'daily',
  },
  reply_post: {
    type: 'reply_post',
    name: '回覆帖子',
    description: '在論壇回覆 3 篇帖子',
    target: 3,
    pointsReward: 15,        // 積分：調降（原 30）
    experienceReward: 23,    // 經驗：調降（原 45）
    category: 'daily',
  },
  like_content: {
    type: 'like_content',
    name: '互動任務',
    description: '點讚 5 個帖子/回覆',
    target: 5,
    pointsReward: 10,        // 積分：調降（原 25）
    experienceReward: 15,    // 經驗：調降（原 37）
    category: 'daily',
  },
  browse_profiles: {
    type: 'browse_profiles',
    name: '瀏覽任務',
    description: '瀏覽 10 個個人資料',
    target: 10,
    pointsReward: 10,        // 積分：調降（原 20）
    experienceReward: 15,    // 經驗：調降（原 30）
    category: 'daily',
  },
  book_premium_tea: {
    type: 'book_premium_tea',
    name: '預約高級茶',
    description: '預約嚴選好茶 1 次（需管理員確認赴約並評論）',
    target: 1,
    pointsReward: 30,        // 積分：調降（原 50）
    experienceReward: 45,    // 經驗：調降（原 75）
    category: 'daily',       // 保持 daily，但可在 UI 上分類到「其他任務」
  },
  book_lady_booking: {
    type: 'book_lady_booking',
    name: '預約後宮佳麗',
    description: '預約特選魚市後宮佳麗 1 次（需預約成功並評論）',
    target: 1,
    pointsReward: 30,        // 積分：調降（原 50）
    experienceReward: 45,    // 經驗：調降（原 75）
    category: 'daily',       // 保持 daily，但可在 UI 上分類到「其他任務」
  },
  // 後宮佳麗專屬任務
  lady_complete_booking: {
    type: 'lady_complete_booking',
    name: '完成預約',
    description: '完成 1 次預約服務（預約狀態變為 completed）',
    target: 1,
    pointsReward: 25,        // 積分：調降（原 50）
    experienceReward: 38,    // 經驗：調降（原 75）
    category: 'daily',
  },
  lady_receive_good_review: {
    type: 'lady_receive_good_review',
    name: '獲得好評',
    description: '獲得 1 個 4-5 星評價',
    target: 1,
    pointsReward: 25,        // 積分：調降（原 50）
    experienceReward: 38,    // 經驗：調降（原 75）
    category: 'daily',
  },
  lady_respond_booking: {
    type: 'lady_respond_booking',
    name: '回應預約',
    description: '回應 3 個預約請求（接受或拒絕）',
    target: 3,
    pointsReward: 15,        // 積分：調降（原 30）
    experienceReward: 23,    // 經驗：調降（原 45）
    category: 'daily',
  },
  lady_update_profile: {
    type: 'lady_update_profile',
    name: '更新資料',
    description: '更新個人上架資料 1 次',
    target: 1,
    pointsReward: 10,        // 積分：調降（原 20）
    experienceReward: 15,    // 經驗：調降（原 30）
    category: 'daily',
  },
  lady_forum_interaction: {
    type: 'lady_forum_interaction',
    name: '論壇互動',
    description: '在論壇發表 1 篇帖子或回覆 3 篇',
    target: 1, // 1 篇帖子 或 3 篇回覆（需要特殊處理）
    pointsReward: 12,        // 積分：調降（原 25）
    experienceReward: 18,    // 經驗：調降（原 37）
    category: 'daily',
  },
  lady_maintain_quality: {
    type: 'lady_maintain_quality',
    name: '維護品質',
    description: '連續 3 天都有獲得好評（4-5 星）',
    target: 3,
    pointsReward: 50,        // 積分：調降（原 100）
    experienceReward: 75,    // 經驗：調降（原 150）
    category: 'daily',
  },
  lady_boost_exposure: {
    type: 'lady_boost_exposure',
    name: '提升曝光',
    description: '個人資料被瀏覽 50 次',
    target: 50,
    pointsReward: 15,        // 積分：調降（原 30）
    experienceReward: 23,    // 經驗：調降（原 45）
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

  // 獲取用戶的每日任務（根據角色過濾）
  getDailyTasks: async (userId: string, date: string = new Date().toISOString().split('T')[0]): Promise<DailyTask[]> => {
    // 獲取用戶角色
    const { userModel } = await import('./User.js');
    const user = await userModel.findById(userId);
    if (!user) return [];
    
    const tasks: DailyTask[] = [];
    
    // 根據角色定義可用的任務類型
    const clientTaskTypes = [
      'daily_login',
      'create_post',
      'reply_post',
      'like_content',
      'browse_profiles',
      'book_premium_tea',
      'book_lady_booking',
    ];
    
    const providerTaskTypes = [
      'daily_login',
      'lady_complete_booking',
      'lady_receive_good_review',
      'lady_respond_booking',
      'lady_update_profile',
      'lady_forum_interaction',
      'lady_maintain_quality',
      'lady_boost_exposure',
    ];
    
    const availableTaskTypes = user.role === 'provider' ? providerTaskTypes : clientTaskTypes;
    
    for (const taskType of availableTaskTypes) {
      const definition = TASK_DEFINITIONS[taskType];
      if (definition && definition.category === 'daily') {
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



