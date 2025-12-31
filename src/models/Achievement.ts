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
  category: 'forum' | 'premium_tea' | 'lady_booking' | 'loyalty' | 'all';
  condition: (stats: any) => boolean;
  pointsReward: number;
  experienceReward: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // 🟦 茶席互動（論壇成就）
  {
    type: 'forum_first_post',
    name: '初次獻帖',
    description: '發表第一篇貼文',
    icon: '📝',
    category: 'forum',
    condition: (stats) => stats.postsCount >= 1,
    pointsReward: 50,
    experienceReward: 20,
  },
  {
    type: 'forum_active_writer',
    name: '活躍作者',
    description: '發表 10 篇貼文',
    icon: '✍️',
    category: 'forum',
    condition: (stats) => stats.postsCount >= 10,
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'forum_popular_star',
    name: '人望之星',
    description: '獲得 100 讚',
    icon: '⭐',
    category: 'forum',
    condition: (stats) => stats.likesReceived >= 100,
    pointsReward: 200,
    experienceReward: 100,
  },
  {
    type: 'forum_core_member',
    name: '茶會核心',
    description: '獲得 500 讚',
    icon: '🏆',
    category: 'forum',
    condition: (stats) => stats.likesReceived >= 500,
    pointsReward: 500,
    experienceReward: 250,
  },
  
  // 🟦 嚴選好茶（預約/消費成就 - 高級茶）
  {
    type: 'tea_first_booking',
    name: '初嚐御茶',
    description: '首次預約高級茶',
    icon: '🍵',
    category: 'premium_tea',
    condition: (stats) => (stats.premiumTeaBookingsCount || 0) >= 1,
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'tea_regular_guest',
    name: '御茶常客',
    description: '預約高級茶 5 次',
    icon: '👑',
    category: 'premium_tea',
    condition: (stats) => (stats.premiumTeaBookingsCount || 0) >= 5,
    pointsReward: 300,
    experienceReward: 150,
  },
  {
    type: 'tea_master_taster',
    name: '品鑑達人',
    description: '預約高級茶 20 次',
    icon: '🎖️',
    category: 'premium_tea',
    condition: (stats) => (stats.premiumTeaBookingsCount || 0) >= 20,
    pointsReward: 800,
    experienceReward: 400,
  },
  
  // 🟦 特選魚市（預約/消費成就 - 後宮佳麗）
  {
    type: 'lady_first_booking',
    name: '初次入席',
    description: '首次預約後宮佳麗',
    icon: '💃',
    category: 'lady_booking',
    condition: (stats) => (stats.ladyBookingsCount || 0) >= 1,
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'lady_loyal_guest',
    name: '專屬熟客',
    description: '重複預約同一位 5 次',
    icon: '💎',
    category: 'lady_booking',
    condition: (stats) => (stats.repeatLadyBookingsCount || 0) >= 5,
    pointsReward: 300,
    experienceReward: 150,
  },
  {
    type: 'lady_royal_guest',
    name: '茶王座上賓',
    description: '累積預約 20 次',
    icon: '👸',
    category: 'lady_booking',
    condition: (stats) => (stats.ladyBookingsCount || 0) >= 20,
    pointsReward: 1000,
    experienceReward: 500,
  },
  
  // 🟦 茶客資歷（忠誠/時間成就）
  {
    type: 'loyalty_30_days',
    name: '守席之人',
    description: '連續登入 30 天',
    icon: '📅',
    category: 'loyalty',
    condition: (stats) => (stats.consecutiveLoginDays || 0) >= 30,
    pointsReward: 200,
    experienceReward: 100,
  },
  {
    type: 'loyalty_180_days',
    name: '老茶客',
    description: '註冊滿 180 天',
    icon: '⏰',
    category: 'loyalty',
    condition: (stats) => {
      if (!stats.registeredAt) return false;
      const daysSinceRegistration = Math.floor((Date.now() - new Date(stats.registeredAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceRegistration >= 180;
    },
    pointsReward: 500,
    experienceReward: 250,
  },
  {
    type: 'loyalty_1_year',
    name: '茶王舊識',
    description: '註冊滿 1 年',
    icon: '🎂',
    category: 'loyalty',
    condition: (stats) => {
      if (!stats.registeredAt) return false;
      const daysSinceRegistration = Math.floor((Date.now() - new Date(stats.registeredAt).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceRegistration >= 365;
    },
    pointsReward: 1000,
    experienceReward: 500,
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
    
    // 獲取用戶註冊時間（用於忠誠成就）
    const { userModel } = await import('./User.js');
    const user = await userModel.findById(userId);
    const registeredAt = user?.createdAt || user?.registeredAt || stats.createdAt;
    
    // 將 registeredAt 添加到 stats 對象中，供成就條件檢查使用
    const statsWithRegisteredAt = {
      ...stats,
      registeredAt,
    };
    
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

      // 檢查是否達成條件（使用包含 registeredAt 的 stats）
      if (definition.condition(statsWithRegisteredAt)) {
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



