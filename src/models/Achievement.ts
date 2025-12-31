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
  category: 'forum' | 'premium_tea' | 'lady_booking' | 'loyalty' | 'all' | 'service_tenure' | 'service_quality' | 'client_loyalty' | 'service_efficiency' | 'platform_engagement';
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

// 後宮佳麗專屬成就定義
export const LADY_ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // 🟦 服務資歷（Service Experience）
  {
    type: 'lady_first_booking',
    name: '初入宮廷',
    description: '完成首次預約服務',
    icon: '💃',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 1,
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'lady_newbie',
    name: '服務新手',
    description: '完成 5 次預約服務',
    icon: '🌸',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 5,
    pointsReward: 200,
    experienceReward: 100,
  },
  {
    type: 'lady_stable',
    name: '穩定服務',
    description: '完成 20 次預約服務',
    icon: '⭐',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 20,
    pointsReward: 500,
    experienceReward: 250,
  },
  {
    type: 'lady_veteran',
    name: '資深服務',
    description: '完成 50 次預約服務',
    icon: '👑',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 50,
    pointsReward: 1000,
    experienceReward: 500,
  },
  {
    type: 'lady_master',
    name: '服務大師',
    description: '完成 100 次預約服務',
    icon: '🏆',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 100,
    pointsReward: 2000,
    experienceReward: 1000,
  },
  
  // 🟦 品質保證（Quality Assurance）
  {
    type: 'lady_first_good_review',
    name: '初次好評',
    description: '獲得第一個 5 星評價',
    icon: '✨',
    category: 'service_quality',
    condition: (stats) => (stats.fiveStarReviewsCount || 0) >= 1,
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'lady_highly_rated',
    name: '好評如潮',
    description: '獲得 10 個 5 星評價',
    icon: '🌟',
    category: 'service_quality',
    condition: (stats) => (stats.fiveStarReviewsCount || 0) >= 10,
    pointsReward: 300,
    experienceReward: 150,
  },
  {
    type: 'lady_perfect',
    name: '完美評價',
    description: '獲得 50 個 5 星評價',
    icon: '💎',
    category: 'service_quality',
    condition: (stats) => (stats.fiveStarReviewsCount || 0) >= 50,
    pointsReward: 800,
    experienceReward: 400,
  },
  {
    type: 'lady_quality_assured',
    name: '品質保證',
    description: '平均評價達到 4.5 星以上（至少 20 個評價）',
    icon: '🎖️',
    category: 'service_quality',
    condition: (stats) => {
      const avgRating = stats.averageRating || 0;
      const totalReviews = stats.totalReviewsCount || 0;
      return avgRating >= 4.5 && totalReviews >= 20;
    },
    pointsReward: 500,
    experienceReward: 250,
  },
  
  // 🟦 忠誠客戶（Loyal Clients）
  {
    type: 'lady_returning_client',
    name: '回頭客',
    description: '同一位客戶回顧 3 次',
    icon: '🔄',
    category: 'client_loyalty',
    condition: (stats) => (stats.repeatClientBookingsCount || 0) >= 3,
    pointsReward: 200,
    experienceReward: 100,
  },
  {
    type: 'lady_regular_clients',
    name: '熟客成群',
    description: '擁有 10 位以上的回頭客',
    icon: '👥',
    category: 'client_loyalty',
    condition: (stats) => (stats.uniqueReturningClientsCount || 0) >= 10,
    pointsReward: 500,
    experienceReward: 250,
  },
  
  // 🟦 服務表現（Service Performance）
  {
    type: 'lady_efficient',
    name: '效率之星',
    description: '當日回應所有預約請求（響應時間 < 1 小時）',
    icon: '⚡',
    category: 'service_efficiency',
    condition: (stats) => {
      const responseTime = stats.averageResponseTime || 999;
      return responseTime < 60; // 60 分鐘
    },
    pointsReward: 100,
    experienceReward: 50,
  },
  {
    type: 'lady_punctual',
    name: '準時達人',
    description: '連續 10 次預約都準時完成（無取消記錄）',
    icon: '⏰',
    category: 'service_efficiency',
    condition: (stats) => {
      const consecutive = stats.consecutiveCompletedBookings || 0;
      const cancelRate = stats.cancellationRate || 1;
      return consecutive >= 10 && cancelRate === 0;
    },
    pointsReward: 300,
    experienceReward: 150,
  },
  
  // 🟦 平台互動（Platform Engagement）
  {
    type: 'lady_forum_newbie',
    name: '論壇新人',
    description: '在論壇發表第一篇帖子',
    icon: '📝',
    category: 'platform_engagement',
    condition: (stats) => (stats.postsCount || 0) >= 1,
    pointsReward: 50,
    experienceReward: 20,
  },
  {
    type: 'lady_active',
    name: '活躍佳麗',
    description: '連續登入 7 天',
    icon: '🔥',
    category: 'platform_engagement',
    condition: (stats) => (stats.consecutiveLoginDays || 0) >= 7,
    pointsReward: 100,
    experienceReward: 50,
  },
  
  // 🟦 服務品質成就（從勳章系統移過來）
  {
    type: 'lady_quality_service_achievement',
    name: '優質服務',
    description: '平均評價 4.5 星以上（至少 10 個評價）',
    icon: 'lady_quality_service',
    category: 'service_quality',
    condition: (stats) => {
      const avgRating = stats.averageRating || 0;
      const totalReviews = stats.totalReviewsCount || 0;
      return avgRating >= 4.5 && totalReviews >= 10;
    },
    pointsReward: 200,
    experienceReward: 100,
  },
  {
    type: 'lady_perfect_service_achievement',
    name: '完美服務',
    description: '平均評價 4.8 星以上（至少 50 個評價）',
    icon: 'lady_perfect_service',
    category: 'service_quality',
    condition: (stats) => {
      const avgRating = stats.averageRating || 0;
      const totalReviews = stats.totalReviewsCount || 0;
      return avgRating >= 4.8 && totalReviews >= 50;
    },
    pointsReward: 500,
    experienceReward: 250,
  },
  
  // 🟦 服務資歷成就（從勳章系統移過來）
  {
    type: 'lady_veteran_achievement',
    name: '資深佳麗',
    description: '完成 100 次以上預約',
    icon: 'lady_veteran_badge',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 100,
    pointsReward: 300,
    experienceReward: 150,
  },
  {
    type: 'lady_gold_achievement',
    name: '金牌佳麗',
    description: '完成 500 次以上預約',
    icon: 'lady_gold_badge',
    category: 'service_tenure',
    condition: (stats) => (stats.completedBookingsCount || 0) >= 500,
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

    // 根據用戶角色選擇對應的成就定義
    const definitions = user?.role === 'provider' ? LADY_ACHIEVEMENT_DEFINITIONS : ACHIEVEMENT_DEFINITIONS;

    for (const definition of definitions) {
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

        // 創建成就解鎖通知
        try {
          const { notificationModel } = await import('./Notification.js');
          await notificationModel.create({
            userId,
            type: 'achievement',
            title: '成就解鎖',
            content: `恭喜您解鎖了「${definition.name}」成就！${definition.pointsReward > 0 ? `獲得 ${definition.pointsReward} 積分，` : ''}${definition.experienceReward > 0 ? `獲得 ${definition.experienceReward} 經驗值。` : ''}`,
            link: `/user-profile?tab=achievements`,
            metadata: {
              achievementId: id,
              achievementType: definition.type,
              achievementName: definition.name,
            },
          });
        } catch (error) {
          console.error('創建成就解鎖通知失敗:', error);
          // 不影響主流程，僅記錄錯誤
        }
      }
    }

    return unlocked;
  },
};



