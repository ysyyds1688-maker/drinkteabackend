import { query } from '../db/database.js';
import { MembershipLevel } from './User.js';
import { clearProfileCachesAndRefreshView } from './Profile.js'; // 導入緩存清理和視圖刷新工具

export interface Subscription {
  id: string;
  userId: string;
  membershipLevel: MembershipLevel;
  startedAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSubscriptionData {
  userId: string;
  membershipLevel: MembershipLevel;
  expiresAt?: Date;
}

export const subscriptionModel = {
  // 創建訂閱記錄
  create: async (data: CreateSubscriptionData): Promise<Subscription> => {
    const { v4: uuidv4 } = await import('uuid');
    const id = `sub_${Date.now()}_${uuidv4().substring(0, 9)}`;

    await query(`
      INSERT INTO subscriptions (id, user_id, membership_level, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      data.userId,
      data.membershipLevel,
      data.expiresAt || null,
      true
    ]);

    const subscription = await subscriptionModel.findById(id);
    if (!subscription) throw new Error('Failed to create subscription');
    const { cacheService } = await import('../services/redisService.js');
    await cacheService.delete(`cache:subscription:${id}`);
    await cacheService.delete(`cache:subscription:active:user:${data.userId}`);
    await cacheService.delete(`cache:subscription:history:user:${data.userId}`);
    await clearProfileCachesAndRefreshView(); // 清除 profiles 列表緩存並刷新物化視圖
    return subscription;
  },

  // 根據 ID 查找訂閱
  findById: async (id: string): Promise<Subscription | null> => {
    const cacheKey = `cache:subscription:${id}`;
    const cachedSubscription = await import('../services/redisService.js').then(m => m.cacheService.get<Subscription>(cacheKey));
    if (cachedSubscription) {
      console.log(`[Cache Hit] Subscription.findById: ${id}`);
      return cachedSubscription;
    }

    const result = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const subscription = {
      id: row.id,
      userId: row.user_id,
      membershipLevel: row.membership_level as MembershipLevel,
      startedAt: row.started_at,
      expiresAt: row.expires_at || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
    await import('../services/redisService.js').then(m => m.cacheService.set(cacheKey, subscription, 3600)); // 緩存 1 小時
    return subscription;
  },

  // 獲取用戶的活躍訂閱
  getActiveByUserId: async (userId: string): Promise<Subscription | null> => {
    const cacheKey = `cache:subscription:active:user:${userId}`;
    const cachedSubscription = await import('../services/redisService.js').then(m => m.cacheService.get<Subscription>(cacheKey));
    if (cachedSubscription) {
      console.log(`[Cache Hit] Subscription.getActiveByUserId: ${userId}`);
      return cachedSubscription;
    }

    const result = await query(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND is_active = TRUE 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY started_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const subscription = {
      id: row.id,
      userId: row.user_id,
      membershipLevel: row.membership_level as MembershipLevel,
      startedAt: row.started_at,
      expiresAt: row.expires_at || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
    await import('../services/redisService.js').then(m => m.cacheService.set(cacheKey, subscription, 300)); // 緩存 5 分鐘
    return subscription;
  },

  // 獲取用戶的訂閱歷史
  getHistoryByUserId: async (userId: string): Promise<Subscription[]> => {
    const cacheKey = `cache:subscription:history:user:${userId}`;
    const cachedHistory = await import('../services/redisService.js').then(m => m.cacheService.get<Subscription[]>(cacheKey));
    if (cachedHistory) {
      console.log(`[Cache Hit] Subscription.getHistoryByUserId: ${userId}`);
      return cachedHistory;
    }

    const result = await query(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 
      ORDER BY started_at DESC
    `, [userId]);

    const history = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      membershipLevel: row.membership_level as MembershipLevel,
      startedAt: row.started_at,
      expiresAt: row.expires_at || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));
    await import('../services/redisService.js').then(m => m.cacheService.set(cacheKey, history, 600)); // 緩存 10 分鐘
    return history;
  },

  // 取消訂閱
  cancel: async (subscriptionId: string): Promise<void> => {
    // 獲取訂閱信息以獲取 userId
    const subscription = await subscriptionModel.findById(subscriptionId);
    if (!subscription) return; // 訂閱不存在則不處理

    await query(`
      UPDATE subscriptions 
      SET is_active = FALSE, expires_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [subscriptionId]);
    
    const { cacheService } = await import('../services/redisService.js');
    await cacheService.delete(`cache:subscription:${subscriptionId}`);
    await cacheService.delete(`cache:subscription:active:user:${subscription.userId}`);
    await cacheService.delete(`cache:subscription:history:user:${subscription.userId}`);
    await clearProfileCachesAndRefreshView(); // 清除 profiles 列表緩存並刷新物化視圖
  },

  // 續訂
  renew: async (subscriptionId: string, expiresAt: Date): Promise<Subscription> => {
    await query(`
      UPDATE subscriptions 
      SET expires_at = $1, is_active = TRUE
      WHERE id = $2
    `, [expiresAt, subscriptionId]);

    const subscription = await subscriptionModel.findById(subscriptionId);
    if (!subscription) throw new Error('Failed to renew subscription');
    
    const { cacheService } = await import('../services/redisService.js');
    await cacheService.delete(`cache:subscription:${subscriptionId}`);
    await cacheService.delete(`cache:subscription:active:user:${subscription.userId}`);
    await cacheService.delete(`cache:subscription:history:user:${subscription.userId}`);
    await clearProfileCachesAndRefreshView(); // 清除 profiles 列表緩存並刷新物化視圖
    return subscription;
  },

  // 獲取所有過期的訂閱（用於定時任務）
  getExpiredSubscriptions: async (): Promise<Subscription[]> => {
    // 不緩存過期訂閱，因為它用於定時任務，需要最新數據
    const result = await query(`
      SELECT * FROM subscriptions 
      WHERE is_active = TRUE 
      AND expires_at IS NOT NULL 
      AND expires_at <= CURRENT_TIMESTAMP
    `);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      membershipLevel: row.membership_level as MembershipLevel,
      startedAt: row.started_at,
      expiresAt: row.expires_at || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));
  },
};

