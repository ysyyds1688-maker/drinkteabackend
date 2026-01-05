import { query } from '../db/database.js';

export interface Notification {
  id: string;
  userId: string;
  type: 'achievement' | 'task' | 'system' | 'message' | 'booking' | 'review';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  metadata?: any;
}

export const notificationModel = {
  // 創建通知
  create: async (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    
    await query(
      `INSERT INTO notifications (id, user_id, type, title, content, is_read, created_at, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        notification.userId,
        notification.type,
        notification.title,
        notification.content,
        false,
        createdAt,
        notification.link || null,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
      ]
    );

    return {
      id,
      ...notification,
      isRead: false,
      createdAt,
    };
  },

  // 獲取用戶的所有通知
  getByUserId: async (userId: string, limit: number = 50): Promise<Notification[]> => {
    const result = await query(
      `SELECT id, user_id as "userId", type, title, content, is_read as "isRead", 
              created_at as "createdAt", link, metadata
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row: any) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    }));
  },

  // 獲取未讀通知數量
  getUnreadCount: async (userId: string): Promise<number> => {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  },

  // 標記為已讀
  markAsRead: async (notificationId: string, userId: string): Promise<void> => {
    await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  },

  // 全部標記為已讀
  markAllAsRead: async (userId: string): Promise<void> => {
    await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
  },

  // 刪除通知
  delete: async (notificationId: string, userId: string): Promise<void> => {
    await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  },

  // 批量創建通知（用於系統通知）
  createBatch: async (notifications: Omit<Notification, 'id' | 'createdAt' | 'isRead'>[]): Promise<void> => {
    const createdAt = new Date().toISOString();
    
    for (const notification of notifications) {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO notifications (id, user_id, type, title, content, is_read, created_at, link, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          notification.userId,
          notification.type,
          notification.title,
          notification.content,
          false,
          createdAt,
          notification.link || null,
          notification.metadata ? JSON.stringify(notification.metadata) : null,
        ]
      );
    }
  },
};

