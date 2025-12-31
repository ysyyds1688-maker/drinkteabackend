import { query } from '../db/database.js';

export type BadgeUnlockType = 'purchasable' | 'auto_unlock' | 'admin_granted';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsCost: number;
  category: string;
  unlockType: BadgeUnlockType; // 解鎖類型
  unlockCondition?: (stats: any, user?: any) => boolean; // 自動解鎖條件（僅用於 auto_unlock 類型）
  requireCondition?: (stats: any, user?: any) => boolean; // 購買前置條件（僅用於 purchasable 類型）
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
  // 🟨 身分稱號（可購買）
  {
    id: 'badge_guest',
    name: '茶客',
    description: '基本茶王身分',
    icon: 'badge_guest',
    pointsCost: 50,
    category: 'identity',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_elegant_guest',
    name: '雅客',
    description: '懂茶識禮',
    icon: 'badge_elegant_guest',
    pointsCost: 150,
    category: 'identity',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_noble_guest',
    name: '貴客',
    description: '高級消費者識別',
    icon: 'badge_noble_guest',
    pointsCost: 300,
    category: 'identity',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_selected_guest',
    name: '御選貴客',
    description: '官方認證身分',
    icon: 'badge_selected_guest',
    pointsCost: 800,
    category: 'identity',
    unlockType: 'purchasable',
  },
  
  // 🟨 品味風格（可購買）
  {
    id: 'badge_taste_master',
    name: '品茶行家',
    description: '懂茶派',
    icon: 'badge_taste_master',
    pointsCost: 200,
    category: 'taste',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_night_tea',
    name: '夜茶派',
    description: '夜間常客',
    icon: 'badge_night_tea',
    pointsCost: 200,
    category: 'taste',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_silent_taster',
    name: '靜品派',
    description: '低調沉穩',
    icon: 'badge_silent_taster',
    pointsCost: 200,
    category: 'taste',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_royal_taster',
    name: '御茶鑑賞',
    description: '高端品味',
    icon: 'badge_royal_taster',
    pointsCost: 500,
    category: 'taste',
    unlockType: 'purchasable',
  },
  
  // 🟨 座上地位
  {
    id: 'badge_tea_regular',
    name: '御茶常客',
    description: '高級茶熟客',
    icon: 'badge_tea_regular',
    pointsCost: 400,
    category: 'status',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_lady_regular',
    name: '專屬座上',
    description: '個人小姐熟客',
    icon: 'badge_lady_regular',
    pointsCost: 400,
    category: 'status',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_royal_seat',
    name: '座上之賓',
    description: '高頻消費者',
    icon: 'badge_royal_seat',
    pointsCost: 800,
    category: 'status',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_tea_king_seat',
    name: '茶王座上',
    description: '頂級尊榮',
    icon: 'badge_tea_king_seat',
    pointsCost: 1500,
    category: 'status',
    unlockType: 'purchasable',
  },
  
  // 🟨 皇室御印
  {
    id: 'badge_tea_king_confidant',
    name: '茶王心腹',
    description: '核心身分象徵',
    icon: 'badge_tea_king_confidant',
    pointsCost: 2000,
    category: 'royal',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_imperial_seal',
    name: '御賜金印',
    description: '官方背書',
    icon: 'badge_imperial_seal',
    pointsCost: 3000,
    category: 'royal',
    unlockType: 'purchasable',
  },
  {
    id: 'badge_national_master',
    name: '國師級茶官',
    description: '茶王世界最高榮銜',
    icon: 'badge_national_master',
    pointsCost: 5000,
    category: 'royal',
    unlockType: 'purchasable',
  },
];

// 後宮佳麗專屬勳章定義（所有勳章都可以用積分購買）
export const LADY_AVAILABLE_BADGES: Badge[] = [
  // 🟨 服務品質勳章
  {
    id: 'lady_star_service',
    name: '星級服務',
    description: '星級服務品質證明',
    icon: 'lady_star_service',
    pointsCost: 200,
    category: 'quality',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_excellent_service',
    name: '卓越服務',
    description: '卓越服務品質證明',
    icon: 'lady_excellent_service',
    pointsCost: 500,
    category: 'quality',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_diamond_service',
    name: '鑽石服務',
    description: '鑽石級服務品質證明',
    icon: 'lady_diamond_service',
    pointsCost: 800,
    category: 'quality',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_royal_service',
    name: '皇室服務',
    description: '皇室級服務品質證明',
    icon: 'lady_royal_service',
    pointsCost: 1200,
    category: 'quality',
    unlockType: 'purchasable',
  },
  
  // 🟨 服務資歷勳章
  {
    id: 'lady_experienced',
    name: '經驗豐富',
    description: '豐富服務經驗證明',
    icon: 'lady_experienced',
    pointsCost: 300,
    category: 'experience',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_veteran_lady',
    name: '資深佳麗',
    description: '資深服務資歷證明',
    icon: 'lady_veteran_lady',
    pointsCost: 600,
    category: 'experience',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_platinum',
    name: '白金佳麗',
    description: '白金級服務資歷證明',
    icon: 'lady_platinum',
    pointsCost: 1000,
    category: 'experience',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_legendary',
    name: '傳奇佳麗',
    description: '傳奇級服務資歷證明',
    icon: 'lady_legendary',
    pointsCost: 2000,
    category: 'experience',
    unlockType: 'purchasable',
  },
  
  // 🟨 客戶關係勳章
  {
    id: 'lady_popular',
    name: '人氣佳麗',
    description: '深受客戶喜愛證明',
    icon: 'lady_popular',
    pointsCost: 400,
    category: 'client_relation',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_trusted',
    name: '值得信賴',
    description: '客戶信賴度證明',
    icon: 'lady_trusted',
    pointsCost: 600,
    category: 'client_relation',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_beloved',
    name: '深受寵愛',
    description: '深受客戶寵愛證明',
    icon: 'lady_beloved',
    pointsCost: 800,
    category: 'client_relation',
    unlockType: 'purchasable',
  },
  
  // 🟨 專業認證勳章
  {
    id: 'lady_professional',
    name: '專業認證',
    description: '平台專業認證證明',
    icon: 'lady_professional',
    pointsCost: 500,
    category: 'certification',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_recommended',
    name: '茶王愛妻',
    description: '平台推薦佳麗證明',
    icon: 'lady_recommended',
    pointsCost: 1000,
    category: 'certification',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_elite',
    name: '菁英佳麗',
    description: '平台菁英認證證明',
    icon: 'lady_elite',
    pointsCost: 1500,
    category: 'certification',
    unlockType: 'purchasable',
  },
  {
    id: 'lady_crown',
    name: '后冠佳麗',
    description: '平台最高榮譽證明',
    icon: 'lady_crown',
    pointsCost: 3000,
    category: 'certification',
    unlockType: 'purchasable',
  },
];

export const badgeModel = {
  // 獲取所有可兌換的勳章（根據角色）
  getAvailableBadges: (role?: 'provider' | 'client' | 'admin'): Badge[] => {
    if (role === 'provider') {
      return LADY_AVAILABLE_BADGES;
    }
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
  purchaseBadge: async (userId: string, badgeId: string, userRole?: 'provider' | 'client' | 'admin'): Promise<UserBadge> => {
    // 根據用戶角色查找對應的勳章
    const availableBadges = badgeModel.getAvailableBadges(userRole);
    const badge = availableBadges.find(b => b.id === badgeId);
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

  // 管理員授予勳章
  grantBadge: async (userId: string, badgeId: string, adminUserId: string, userRole?: 'provider' | 'client' | 'admin'): Promise<UserBadge> => {
    // 檢查管理員權限
    const { userModel } = await import('./User.js');
    const admin = await userModel.findById(adminUserId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('只有管理員可以授予勳章');
    }

    // 根據用戶角色查找對應的勳章
    const availableBadges = badgeModel.getAvailableBadges(userRole);
    const badge = availableBadges.find(b => b.id === badgeId);
    if (!badge) {
      throw new Error('勳章不存在');
    }

    // 檢查是否為管理員授予類型
    if (badge.unlockType !== 'admin_granted') {
      throw new Error('此勳章不支援管理員授予');
    }

    // 檢查是否已擁有
    const hasBadge = await badgeModel.hasBadge(userId, badgeId);
    if (hasBadge) {
      throw new Error('用戶已經擁有此勳章');
    }

    // 創建勳章記錄
    const { v4: uuidv4 } = await import('uuid');
    const id = `badge_${Date.now()}_${uuidv4().substring(0, 9)}`;

    await query(`
      INSERT INTO user_badges (id, user_id, badge_id, badge_name, badge_icon, points_cost)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, userId, badge.id, badge.name, badge.icon, 0]); // 管理員授予積分成本為0

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



