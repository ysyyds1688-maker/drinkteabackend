import { query } from '../db/database.js';
import { userStatsModel } from './UserStats.js';

export interface Achievement {
  id: string;
  userId: string;
  achievementType: string;
  achievementName: string;
  pointsEarned: number;
  experienceEarned: number;
  unlockedAt: string;
}

// 成就定義
export interface AchievementDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: any) => boolean;
  pointsReward: number;
  experienceReward: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_post',
    name: '首次發帖',
    description: '發表第一篇帖子',
    icon: '📝',
    condition: (stats) => stats.postsCount >= 1,
    pointsReward: 50,
    experienceReward: 20,
  },
  {
    type: 'ten_posts',
    name: '活躍作者',
    description: '發表10篇帖子',
    icon: '✍️',
    condition: (stats) => stats.postsCount >= 10,
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'hundred_likes',
    name: '人氣之星',
    description: '獲得100個點讚',
    icon: '⭐',
    condition: (stats) => stats.likesReceived >= 100,
    pointsReward: 200,
    experienceReward: 100,
  },
  {
    type: 'fifty_replies',
    name: '熱心會員',
    description: '回覆50個帖子',
    icon: '💬',
    condition: (stats) => stats.repliesCount >= 50,
    pointsReward: 150,
    experienceReward: 75,
  },
];

export const achievementModel = {
  // 獲取用戶的成就
  getUserAchievements: async (userId: string): Promise<Achievement[]> => {
    const result = await query(`
      SELECT * FROM achievements 
      WHERE user_id = $1 
      ORDER BY unlocked_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      achievementType: row.achievement_type,
      achievementName: row.achievement_name,
      pointsEarned: row.points_earned || 0,
      experienceEarned: row.experience_earned || 0,
      unlockedAt: row.unlocked_at,
    }));
  },

  // 檢查並解鎖成就
  checkAndUnlockAchievements: async (userId: string): Promise<Achievement[]> => {
    const stats = await userStatsModel.getOrCreate(userId);
    const unlocked: Achievement[] = [];

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      // 檢查是否已擁有此成就
      const existing = await query(`
        SELECT id FROM achievements 
        WHERE user_id = $1 AND achievement_type = $2
      `, [userId, definition.type]);

      if (existing.rows.length > 0) {
        continue; // 已擁有，跳過
      }

      // 檢查是否達成條件
      if (definition.condition(stats)) {
        // 解鎖成就
        const { v4: uuidv4 } = await import('uuid');
        const id = `ach_${Date.now()}_${uuidv4().substring(0, 9)}`;

        await query(`
          INSERT INTO achievements (id, user_id, achievement_type, achievement_name, points_earned, experience_earned)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, userId, definition.type, definition.name, definition.pointsReward, definition.experienceReward]);

        // 發放獎勵
        await userStatsModel.addPoints(userId, definition.pointsReward, definition.experienceReward);

        const newAchievement: Achievement = {
          id,
          userId,
          achievementType: definition.type,
          achievementName: definition.name,
          pointsEarned: definition.pointsReward,
          experienceEarned: definition.experienceReward,
          unlockedAt: new Date().toISOString(),
        };

        unlocked.push(newAchievement);
      }
    }

    return unlocked;
  },
};



