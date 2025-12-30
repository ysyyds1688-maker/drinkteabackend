import { query } from '../db/database.js';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsCost: number;
  category: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  badgeName: string;
  badgeIcon?: string;
  pointsCost: number;
  unlockedAt: string;
}

// 可兌換的勳章定義
export const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'first_post',
    name: '首次發帖',
    description: '發表第一篇帖子',
    icon: '📝',
    pointsCost: 50,
    category: 'forum',
  },
  {
    id: 'popular_author',
    name: '熱門作者',
    description: '獲得100個點讚',
    icon: '🔥',
    pointsCost: 200,
    category: 'forum',
  },
  {
    id: 'helpful_member',
    name: '熱心會員',
    description: '回覆50個帖子',
    icon: '💬',
    pointsCost: 150,
    category: 'forum',
  },
  {
    id: 'early_adopter',
    name: '早期用戶',
    description: '註冊後30天內達到銅牌等級',
    icon: '⭐',
    pointsCost: 100,
    category: 'general',
  },
  {
    id: 'social_butterfly',
    name: '社交達人',
    description: '獲得500個點讚',
    icon: '🦋',
    pointsCost: 500,
    category: 'social',
  },
  {
    id: 'dedicated_user',
    name: '忠實用戶',
    description: '連續登入30天',
    icon: '📅',
    pointsCost: 300,
    category: 'general',
  },
];

export const badgeModel = {
  // 獲取所有可兌換的勳章
  getAvailableBadges: (): Badge[] => {
    return AVAILABLE_BADGES;
  },

  // 獲取用戶已擁有的勳章
  getUserBadges: async (userId: string): Promise<UserBadge[]> => {
    const result = await query(`
      SELECT * FROM user_badges 
      WHERE user_id = $1 
      ORDER BY unlocked_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      badgeName: row.badge_name,
      badgeIcon: row.badge_icon || undefined,
      pointsCost: row.points_cost,
      unlockedAt: row.unlocked_at,
    }));
  },

  // 檢查用戶是否擁有特定勳章
  hasBadge: async (userId: string, badgeId: string): Promise<boolean> => {
    const result = await query(`
      SELECT id FROM user_badges 
      WHERE user_id = $1 AND badge_id = $2
    `, [userId, badgeId]);

    return result.rows.length > 0;
  },

  // 兌換勳章（扣除積分）
  purchaseBadge: async (userId: string, badgeId: string): Promise<UserBadge> => {
    const badge = AVAILABLE_BADGES.find(b => b.id === badgeId);
    if (!badge) {
      throw new Error('勳章不存在');
    }

    // 檢查是否已擁有
    const hasBadge = await badgeModel.hasBadge(userId, badgeId);
    if (hasBadge) {
      throw new Error('您已經擁有此勳章');
    }

    // 檢查積分是否足夠
    const { userStatsModel } = await import('./UserStats.js');
    const stats = await userStatsModel.getOrCreate(userId);
    if (stats.currentPoints < badge.pointsCost) {
      throw new Error('積分不足，無法兌換此勳章');
    }

    // 扣除積分
    await userStatsModel.deductPoints(userId, badge.pointsCost);

    // 創建勳章記錄
    const { v4: uuidv4 } = await import('uuid');
    const id = `badge_${Date.now()}_${uuidv4().substring(0, 9)}`;

    await query(`
      INSERT INTO user_badges (id, user_id, badge_id, badge_name, badge_icon, points_cost)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, userId, badge.id, badge.name, badge.icon, badge.pointsCost]);

    const result = await query('SELECT * FROM user_badges WHERE id = $1', [id]);
    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      badgeName: row.badge_name,
      badgeIcon: row.badge_icon || undefined,
      pointsCost: row.points_cost,
      unlockedAt: row.unlocked_at,
    };
  },
};


