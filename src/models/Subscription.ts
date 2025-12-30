import { query } from '../db/database.js';
import { MembershipLevel } from './User.js';

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
    return subscription;
  },

  // 根據 ID 查找訂閱
  findById: async (id: string): Promise<Subscription | null> => {
    const result = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      membershipLevel: row.membership_level as MembershipLevel,
      startedAt: row.started_at,
      expiresAt: row.expires_at || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
  },

  // 獲取用戶的活躍訂閱
  getActiveByUserId: async (userId: string): Promise<Subscription | null> => {
    const result = await query(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND is_active = TRUE 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY started_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      membershipLevel: row.membership_level as MembershipLevel,
      startedAt: row.started_at,
      expiresAt: row.expires_at || undefined,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    };
  },

  // 獲取用戶的訂閱歷史
  getHistoryByUserId: async (userId: string): Promise<Subscription[]> => {
    const result = await query(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 
      ORDER BY started_at DESC
    `, [userId]);

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

  // 取消訂閱
  cancel: async (subscriptionId: string): Promise<void> => {
    await query(`
      UPDATE subscriptions 
      SET is_active = FALSE, expires_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [subscriptionId]);
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
    return subscription;
  },

  // 獲取所有過期的訂閱（用於定時任務）
  getExpiredSubscriptions: async (): Promise<Subscription[]> => {
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

