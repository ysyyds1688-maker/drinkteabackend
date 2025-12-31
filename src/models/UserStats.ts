import { query } from '../db/database.js';
import { MembershipLevel, LadyMembershipLevel } from './User.js';
import { userModel } from './User.js';

export interface UserStats {
  userId: string;
  totalPoints: number;
  currentPoints: number;
  experiencePoints: number;
  level: number;
  postsCount: number;
  repliesCount: number;
  likesReceived: number;
  premiumTeaBookingsCount: number;
  ladyBookingsCount: number;
  repeatLadyBookingsCount: number;
  consecutiveLoginDays: number;
  lastLoginDate: string | null;
  // 後宮佳麗專屬統計字段
  completedBookingsCount?: number; // 完成預約次數
  acceptedBookingsCount?: number; // 接受預約次數
  fiveStarReviewsCount?: number; // 5星評價數量
  fourStarReviewsCount?: number; // 4星評價數量
  totalReviewsCount?: number; // 總評價數量
  averageRating?: number; // 平均評分
  repeatClientBookingsCount?: number; // 回頭客預約次數
  uniqueReturningClientsCount?: number; // 不重複回頭客數量
  cancellationRate?: number; // 取消率
  averageResponseTime?: number; // 平均回應時間（分鐘）
  consecutiveCompletedBookings?: number; // 連續完成預約次數
  createdAt: string;
  updatedAt: string;
}

// 品茶客等級對應經驗值門檻
const CLIENT_LEVEL_THRESHOLDS: Record<MembershipLevel, number> = {
  tea_guest: 0,
  tea_scholar: 100,
  royal_tea_scholar: 500,
  royal_tea_officer: 2000,
  tea_king_attendant: 10000,
  imperial_chief_tea_officer: 50000,
  tea_king_confidant: 100000,
  tea_king_personal_selection: 200000,
  imperial_golden_seal_tea_officer: 500000,
  national_master_tea_officer: 1000000,
};

// 後宮佳麗等級對應經驗值門檻
const LADY_LEVEL_THRESHOLDS: Record<LadyMembershipLevel, number> = {
  lady_trainee: 0,
  lady_apprentice: 100,
  lady_junior: 500,
  lady_senior: 2000,
  lady_expert: 10000,
  lady_master: 50000,
  lady_elite: 100000,
  lady_premium: 200000,
  lady_royal: 500000,
  lady_empress: 1000000,
};

// 品茶客等級中文名稱映射
export const CLIENT_LEVEL_NAMES: Record<MembershipLevel, string> = {
  tea_guest: '茶客',
  tea_scholar: '入門茶士',
  royal_tea_scholar: '御前茶士',
  royal_tea_officer: '御用茶官',
  tea_king_attendant: '茶王近侍',
  imperial_chief_tea_officer: '御前總茶官',
  tea_king_confidant: '茶王心腹',
  tea_king_personal_selection: '茶王親選',
  imperial_golden_seal_tea_officer: '御賜金印茶官',
  national_master_tea_officer: '國師級茶官',
};

// 後宮佳麗等級中文名稱映射
export const LADY_LEVEL_NAMES: Record<LadyMembershipLevel, string> = {
  lady_trainee: '初級佳麗',
  lady_apprentice: '見習佳麗',
  lady_junior: '中級佳麗',
  lady_senior: '高級佳麗',
  lady_expert: '資深佳麗',
  lady_master: '御用佳麗',
  lady_elite: '金牌佳麗',
  lady_premium: '鑽石佳麗',
  lady_royal: '皇家佳麗',
  lady_empress: '皇后級佳麗',
};

// 保持向後兼容
export const LEVEL_NAMES = CLIENT_LEVEL_NAMES;

// 根據經驗值和角色獲取等級
export const getLevelFromExperience = async (userId: string, experience: number): Promise<MembershipLevel | LadyMembershipLevel> => {
  const user = await userModel.findById(userId);
  if (!user) {
    console.log(`[getLevelFromExperience] 用戶 ${userId} 不存在，返回默認值 tea_guest`);
    return 'tea_guest'; // 默認值
  }
  
  console.log(`[getLevelFromExperience] 用戶 ${userId} 角色: ${user.role}, 經驗值: ${experience}`);
  
  if (user.role === 'provider') {
    // 後宮佳麗等級
    console.log(`[getLevelFromExperience] 計算後宮佳麗等級，經驗值: ${experience}`);
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_empress) {
      console.log(`[getLevelFromExperience] 返回 lady_empress`);
      return 'lady_empress';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_royal) {
      console.log(`[getLevelFromExperience] 返回 lady_royal`);
      return 'lady_royal';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_premium) {
      console.log(`[getLevelFromExperience] 返回 lady_premium`);
      return 'lady_premium';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_elite) {
      console.log(`[getLevelFromExperience] 返回 lady_elite`);
      return 'lady_elite';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_master) {
      console.log(`[getLevelFromExperience] 返回 lady_master`);
      return 'lady_master';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_expert) {
      console.log(`[getLevelFromExperience] 返回 lady_expert`);
      return 'lady_expert';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_senior) {
      console.log(`[getLevelFromExperience] 返回 lady_senior`);
      return 'lady_senior';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_junior) {
      console.log(`[getLevelFromExperience] 返回 lady_junior`);
      return 'lady_junior';
    }
    if (experience >= LADY_LEVEL_THRESHOLDS.lady_apprentice) {
      console.log(`[getLevelFromExperience] 返回 lady_apprentice`);
      return 'lady_apprentice';
    }
    console.log(`[getLevelFromExperience] 返回默認後宮佳麗等級 lady_trainee`);
    return 'lady_trainee';
  } else {
    // 品茶客等級
    console.log(`[getLevelFromExperience] 計算品茶客等級，經驗值: ${experience}`);
    if (experience >= CLIENT_LEVEL_THRESHOLDS.national_master_tea_officer) return 'national_master_tea_officer';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.imperial_golden_seal_tea_officer) return 'imperial_golden_seal_tea_officer';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.tea_king_personal_selection) return 'tea_king_personal_selection';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.tea_king_confidant) return 'tea_king_confidant';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.imperial_chief_tea_officer) return 'imperial_chief_tea_officer';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.tea_king_attendant) return 'tea_king_attendant';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.royal_tea_officer) return 'royal_tea_officer';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.royal_tea_scholar) return 'royal_tea_scholar';
    if (experience >= CLIENT_LEVEL_THRESHOLDS.tea_scholar) return 'tea_scholar';
    console.log(`[getLevelFromExperience] 返回默認品茶客等級 tea_guest`);
    return 'tea_guest';
  }
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
      premiumTeaBookingsCount: row.premium_tea_bookings_count || 0,
      ladyBookingsCount: row.lady_bookings_count || 0,
      repeatLadyBookingsCount: row.repeat_lady_bookings_count || 0,
      consecutiveLoginDays: row.consecutive_login_days || 0,
      lastLoginDate: row.last_login_date || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 添加積分和經驗值（積分用於兌換勳章，經驗值用於升級等級）
  addPoints: async (userId: string, points: number, experience: number = 0): Promise<{ stats: UserStats; levelUp: boolean; newLevel?: MembershipLevel | LadyMembershipLevel }> => {
    const stats = await userStatsModel.getOrCreate(userId);
    const oldLevel = await getLevelFromExperience(userId, stats.experiencePoints);
    
    const newPoints = stats.currentPoints + points;
    const newExperience = stats.experiencePoints + experience;
    const newLevel = await getLevelFromExperience(userId, newExperience);
    
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
    
    // 如果升級，更新用戶表中的等級
    if (levelUp) {
      const user = await userModel.findById(userId);
      if (user) {
        await userModel.updateMembership(userId, newLevel as any, undefined);
        
        // 創建等級提升通知
        try {
          const { notificationModel } = await import('./Notification.js');
          
          // 等級名稱映射
          const CLIENT_LEVEL_NAMES: Record<string, string> = {
            tea_guest: '茶客',
            tea_scholar: '入門茶士',
            royal_tea_scholar: '御前茶士',
            royal_tea_officer: '御用茶官',
            tea_king_attendant: '茶王近侍',
            imperial_chief_tea_officer: '御前總茶官',
            tea_king_confidant: '茶王心腹',
            tea_king_personal_selection: '茶王親選',
            imperial_golden_seal_tea_officer: '御賜金印茶官',
            national_master_tea_officer: '國師級茶官',
          };
          
          const LADY_LEVEL_NAMES: Record<string, string> = {
            lady_trainee: '初級佳麗',
            lady_apprentice: '見習佳麗',
            lady_junior: '中級佳麗',
            lady_senior: '高級佳麗',
            lady_expert: '資深佳麗',
            lady_master: '御用佳麗',
            lady_elite: '金牌佳麗',
            lady_premium: '鑽石佳麗',
            lady_royal: '皇家佳麗',
            lady_empress: '皇后級佳麗',
          };
          
          const levelName = user.role === 'provider' 
            ? (LADY_LEVEL_NAMES[newLevel] || newLevel)
            : (CLIENT_LEVEL_NAMES[newLevel] || newLevel);
          
          await notificationModel.create({
            userId,
            type: 'system',
            title: '等級提升',
            content: `恭喜您升級到「${levelName}」！繼續努力解鎖更多特權。`,
            link: `/user-profile?tab=points`,
            metadata: {
              oldLevel: oldLevel,
              newLevel: newLevel,
            },
          });
        } catch (error) {
          console.error('創建等級提升通知失敗:', error);
          // 不影響主流程，僅記錄錯誤
        }
      }
    }
    
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
    premiumTeaBookingsCount?: number;
    ladyBookingsCount?: number;
    repeatLadyBookingsCount?: number;
    // 後宮佳麗專屬字段
    completedBookingsCount?: number;
    acceptedBookingsCount?: number;
    fiveStarReviewsCount?: number;
    fourStarReviewsCount?: number;
    totalReviewsCount?: number;
    averageRating?: number;
    repeatClientBookingsCount?: number;
    uniqueReturningClientsCount?: number;
    cancellationRate?: number;
    averageResponseTime?: number;
    consecutiveCompletedBookings?: number;
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
    if (updates.premiumTeaBookingsCount !== undefined) {
      fields.push(`premium_tea_bookings_count = premium_tea_bookings_count + $${paramIndex++}`);
      values.push(updates.premiumTeaBookingsCount);
    }
    if (updates.ladyBookingsCount !== undefined) {
      fields.push(`lady_bookings_count = lady_bookings_count + $${paramIndex++}`);
      values.push(updates.ladyBookingsCount);
    }
    if (updates.repeatLadyBookingsCount !== undefined) {
      fields.push(`repeat_lady_bookings_count = repeat_lady_bookings_count + $${paramIndex++}`);
      values.push(updates.repeatLadyBookingsCount);
    }
    // 後宮佳麗專屬字段
    if (updates.completedBookingsCount !== undefined) {
      fields.push(`completed_bookings_count = completed_bookings_count + $${paramIndex++}`);
      values.push(updates.completedBookingsCount);
    }
    if (updates.acceptedBookingsCount !== undefined) {
      fields.push(`accepted_bookings_count = accepted_bookings_count + $${paramIndex++}`);
      values.push(updates.acceptedBookingsCount);
    }
    if (updates.fiveStarReviewsCount !== undefined) {
      fields.push(`five_star_reviews_count = five_star_reviews_count + $${paramIndex++}`);
      values.push(updates.fiveStarReviewsCount);
    }
    if (updates.fourStarReviewsCount !== undefined) {
      fields.push(`four_star_reviews_count = four_star_reviews_count + $${paramIndex++}`);
      values.push(updates.fourStarReviewsCount);
    }
    if (updates.totalReviewsCount !== undefined) {
      fields.push(`total_reviews_count = total_reviews_count + $${paramIndex++}`);
      values.push(updates.totalReviewsCount);
    }
    if (updates.averageRating !== undefined) {
      fields.push(`average_rating = $${paramIndex++}`);
      values.push(updates.averageRating);
    }
    if (updates.repeatClientBookingsCount !== undefined) {
      fields.push(`repeat_client_bookings_count = repeat_client_bookings_count + $${paramIndex++}`);
      values.push(updates.repeatClientBookingsCount);
    }
    if (updates.uniqueReturningClientsCount !== undefined) {
      fields.push(`unique_returning_clients_count = $${paramIndex++}`);
      values.push(updates.uniqueReturningClientsCount);
    }
    if (updates.cancellationRate !== undefined) {
      fields.push(`cancellation_rate = $${paramIndex++}`);
      values.push(updates.cancellationRate);
    }
    if (updates.averageResponseTime !== undefined) {
      fields.push(`average_response_time = $${paramIndex++}`);
      values.push(updates.averageResponseTime);
    }
    if (updates.consecutiveCompletedBookings !== undefined) {
      fields.push(`consecutive_completed_bookings = $${paramIndex++}`);
      values.push(updates.consecutiveCompletedBookings);
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

  // 更新連續登入天數
  updateLoginStreak: async (userId: string): Promise<void> => {
    const stats = await userStatsModel.getOrCreate(userId);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!stats.lastLoginDate) {
      // 首次登入
      await query(`
        UPDATE user_stats 
        SET consecutive_login_days = 1,
            last_login_date = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `, [today, userId]);
    } else {
      const lastLogin = new Date(stats.lastLoginDate);
      const lastLoginDateStr = lastLogin.toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastLoginDateStr === today) {
        // 今天已經登入過，不更新
        return;
      } else if (lastLoginDateStr === yesterdayStr) {
        // 連續登入
        await query(`
          UPDATE user_stats 
          SET consecutive_login_days = consecutive_login_days + 1,
              last_login_date = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [today, userId]);
      } else {
        // 中斷，重置為 1
        await query(`
          UPDATE user_stats 
          SET consecutive_login_days = 1,
              last_login_date = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `, [today, userId]);
      }
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
      premiumTeaBookingsCount: row.premium_tea_bookings_count || 0,
      ladyBookingsCount: row.lady_bookings_count || 0,
      repeatLadyBookingsCount: row.repeat_lady_bookings_count || 0,
      consecutiveLoginDays: row.consecutive_login_days || 0,
      lastLoginDate: row.last_login_date || null,
      // 後宮佳麗專屬統計字段
      completedBookingsCount: row.completed_bookings_count || 0,
      acceptedBookingsCount: row.accepted_bookings_count || 0,
      fiveStarReviewsCount: row.five_star_reviews_count || 0,
      fourStarReviewsCount: row.four_star_reviews_count || 0,
      totalReviewsCount: row.total_reviews_count || 0,
      averageRating: row.average_rating ? parseFloat(row.average_rating) : undefined,
      repeatClientBookingsCount: row.repeat_client_bookings_count || 0,
      uniqueReturningClientsCount: row.unique_returning_clients_count || 0,
      cancellationRate: row.cancellation_rate ? parseFloat(row.cancellation_rate) : undefined,
      averageResponseTime: row.average_response_time || undefined,
      consecutiveCompletedBookings: row.consecutive_completed_bookings || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

