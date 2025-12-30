import { query } from '../db/database.js';
import { MembershipLevel } from './User.js';

export interface UserStats {
  userId: string;
  totalPoints: number;
  currentPoints: number;
  experiencePoints: number;
  level: number;
  postsCount: number;
  repliesCount: number;
  likesReceived: number;
  createdAt: string;
  updatedAt: string;
}

// 等級對應經驗值門檻
const LEVEL_THRESHOLDS: Record<MembershipLevel, number> = {
  tea_guest: 0,
  tea_scholar: 100,
  royal_tea_scholar: 500,
  royal_tea_officer: 2000,
  tea_king_attendant: 10000,
};

// 等級中文名稱映射
export const LEVEL_NAMES: Record<MembershipLevel, string> = {
  tea_guest: '茶客',
  tea_scholar: '入門茶士',
  royal_tea_scholar: '御前茶士',
  royal_tea_officer: '御用茶官',
  tea_king_attendant: '茶王近侍',
};

// 根據經驗值獲取等級
export const getLevelFromExperience = (experience: number): MembershipLevel => {
  if (experience >= LEVEL_THRESHOLDS.tea_king_attendant) return 'tea_king_attendant';
  if (experience >= LEVEL_THRESHOLDS.royal_tea_officer) return 'royal_tea_officer';
  if (experience >= LEVEL_THRESHOLDS.royal_tea_scholar) return 'royal_tea_scholar';
  if (experience >= LEVEL_THRESHOLDS.tea_scholar) return 'tea_scholar';
  return 'tea_guest';
};

export const userStatsModel = {
  // 獲取或創建用戶統計
  getOrCreate: async (userId: string): Promise<UserStats> => {
    let result = await query('SELECT * FROM user_stats WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      // 創建新的統計記錄
      await query(`
        INSERT INTO user_stats (user_id, total_points, current_points, experience_points, level)
        VALUES ($1, 0, 0, 0, 1)
      `, [userId]);
      result = await query('SELECT * FROM user_stats WHERE user_id = $1', [userId]);
    }
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      totalPoints: row.total_points || 0,
      currentPoints: row.current_points || 0,
      experiencePoints: row.experience_points || 0,
      level: row.level || 1,
      postsCount: row.posts_count || 0,
      repliesCount: row.replies_count || 0,
      likesReceived: row.likes_received || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 添加積分和經驗值（積分用於兌換勳章，經驗值用於升級等級）
  addPoints: async (userId: string, points: number, experience: number = 0): Promise<{ stats: UserStats; levelUp: boolean; newLevel?: MembershipLevel }> => {
    const stats = await userStatsModel.getOrCreate(userId);
    const oldLevel = getLevelFromExperience(stats.experiencePoints);
    
    const newPoints = stats.currentPoints + points;
    const newExperience = stats.experiencePoints + experience;
    const newLevel = getLevelFromExperience(newExperience);
    
    await query(`
      UPDATE user_stats 
      SET current_points = $1, 
          total_points = total_points + $2,
          experience_points = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4
    `, [newPoints, points, newExperience, userId]);
    
    const updatedStats = await userStatsModel.getOrCreate(userId);
    const levelUp = newLevel !== oldLevel;
    
    return {
      stats: updatedStats,
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
    };
  },

  // 扣除積分（用於兌換勳章）
  deductPoints: async (userId: string, points: number): Promise<UserStats> => {
    const stats = await userStatsModel.getOrCreate(userId);
    
    if (stats.currentPoints < points) {
      throw new Error('積分不足');
    }
    
    const newPoints = stats.currentPoints - points;
    
    await query(`
      UPDATE user_stats 
      SET current_points = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [newPoints, userId]);
    
    return await userStatsModel.getOrCreate(userId);
  },

  // 更新統計計數
  updateCounts: async (userId: string, updates: {
    postsCount?: number;
    repliesCount?: number;
    likesReceived?: number;
  }): Promise<void> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.postsCount !== undefined) {
      fields.push(`posts_count = posts_count + $${paramIndex++}`);
      values.push(updates.postsCount);
    }
    if (updates.repliesCount !== undefined) {
      fields.push(`replies_count = replies_count + $${paramIndex++}`);
      values.push(updates.repliesCount);
    }
    if (updates.likesReceived !== undefined) {
      fields.push(`likes_received = likes_received + $${paramIndex++}`);
      values.push(updates.likesReceived);
    }
    
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);
      await query(`
        UPDATE user_stats 
        SET ${fields.join(', ')}
        WHERE user_id = $${paramIndex}
      `, values);
    }
  },

  // 獲取用戶統計
  getByUserId: async (userId: string): Promise<UserStats | null> => {
    const result = await query('SELECT * FROM user_stats WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      totalPoints: row.total_points || 0,
      currentPoints: row.current_points || 0,
      experiencePoints: row.experience_points || 0,
      level: row.level || 1,
      postsCount: row.posts_count || 0,
      repliesCount: row.replies_count || 0,
      likesReceived: row.likes_received || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

