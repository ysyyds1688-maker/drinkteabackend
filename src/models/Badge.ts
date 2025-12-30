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
  // 🟨 身分稱號
  {
    id: 'badge_guest',
    name: '茶客',
    description: '基本茶王身分',
    icon: 'badge_guest',
    pointsCost: 50,
    category: 'identity',
  },
  {
    id: 'badge_elegant_guest',
    name: '雅客',
    description: '懂茶識禮',
    icon: 'badge_elegant_guest',
    pointsCost: 150,
    category: 'identity',
  },
  {
    id: 'badge_noble_guest',
    name: '貴客',
    description: '高級消費者識別',
    icon: 'badge_noble_guest',
    pointsCost: 300,
    category: 'identity',
  },
  {
    id: 'badge_selected_guest',
    name: '御選貴客',
    description: '官方認證身分',
    icon: 'badge_selected_guest',
    pointsCost: 800,
    category: 'identity',
  },
  
  // 🟨 品味風格
  {
    id: 'badge_taste_master',
    name: '品茶行家',
    description: '懂茶派',
    icon: 'badge_taste_master',
    pointsCost: 200,
    category: 'taste',
  },
  {
    id: 'badge_night_tea',
    name: '夜茶派',
    description: '夜間常客',
    icon: 'badge_night_tea',
    pointsCost: 200,
    category: 'taste',
  },
  {
    id: 'badge_silent_taster',
    name: '靜品派',
    description: '低調沉穩',
    icon: 'badge_silent_taster',
    pointsCost: 200,
    category: 'taste',
  },
  {
    id: 'badge_royal_taster',
    name: '御茶鑑賞',
    description: '高端品味',
    icon: 'badge_royal_taster',
    pointsCost: 500,
    category: 'taste',
  },
  
  // 🟨 座上地位
  {
    id: 'badge_tea_regular',
    name: '御茶常客',
    description: '高級茶熟客',
    icon: 'badge_tea_regular',
    pointsCost: 400,
    category: 'status',
  },
  {
    id: 'badge_lady_regular',
    name: '專屬座上',
    description: '個人小姐熟客',
    icon: 'badge_lady_regular',
    pointsCost: 400,
    category: 'status',
  },
  {
    id: 'badge_royal_seat',
    name: '座上之賓',
    description: '高頻消費者',
    icon: 'badge_royal_seat',
    pointsCost: 800,
    category: 'status',
  },
  {
    id: 'badge_tea_king_seat',
    name: '茶王座上',
    description: '頂級尊榮',
    icon: 'badge_tea_king_seat',
    pointsCost: 1500,
    category: 'status',
  },
  
  // 🟨 皇室御印
  {
    id: 'badge_tea_king_confidant',
    name: '茶王心腹',
    description: '核心身分象徵',
    icon: 'badge_tea_king_confidant',
    pointsCost: 2000,
    category: 'royal',
  },
  {
    id: 'badge_imperial_seal',
    name: '御賜金印',
    description: '官方背書',
    icon: 'badge_imperial_seal',
    pointsCost: 3000,
    category: 'royal',
  },
  {
    id: 'badge_national_master',
    name: '國師級茶官',
    description: '茶王世界最高榮銜',
    icon: 'badge_national_master',
    pointsCost: 5000,
    category: 'royal',
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



