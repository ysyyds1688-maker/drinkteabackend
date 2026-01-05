import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface BookingRestriction {
  id: string;
  userId: string;
  restrictionType: 'cancellation_limit' | 'no_show' | 'manual';
  reason?: string;
  cancellationCount?: number;
  noShowCount?: number;
  violationLevel: number; // 1:初次, 2:累犯1, 3:累犯2, 4:嚴重
  isFrozen: boolean;
  frozenAt: string;
  autoUnfreezeAt?: string; // 自動解凍時間
  unfrozenAt?: string;
  unfrozenBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRestrictionData {
  userId: string;
  restrictionType: 'cancellation_limit' | 'no_show' | 'manual';
  reason?: string;
  cancellationCount?: number;
  noShowCount?: number;
  violationLevel?: number;
  autoUnfreezeAt?: Date;
  notes?: string;
}

// 計算凍結期限（天數）
export const calculateFreezeDuration = (violationLevel: number, restrictionType: 'cancellation_limit' | 'no_show'): number => {
  if (restrictionType === 'cancellation_limit') {
    // 取消預約規則
    if (violationLevel === 1) return 30; // 初次：1個月
    if (violationLevel === 2) return 180; // 累犯1：6個月
    if (violationLevel === 3) return 365; // 累犯2：1年
    if (violationLevel === 4) return -1; // 嚴重：永久（-1表示永久）
  } else if (restrictionType === 'no_show') {
    // 放鳥規則
    if (violationLevel === 1) return 30; // 初次：1個月
    if (violationLevel === 2) return 365; // 累犯：1年
    if (violationLevel === 4) return -1; // 嚴重：永久
  }
  return 30; // 預設1個月
};

// 計算違規級別
export const calculateViolationLevel = (
  currentCount: number,
  restrictionType: 'cancellation_limit' | 'no_show',
  previousViolationLevel: number = 0
): number => {
  if (restrictionType === 'cancellation_limit') {
    // 取消預約：3次初次，6次累犯1，9次累犯2，10次以上嚴重
    if (currentCount >= 10) return 4; // 嚴重
    if (currentCount >= 9 && previousViolationLevel >= 2) return 3; // 累犯2
    if (currentCount >= 6 && previousViolationLevel >= 1) return 2; // 累犯1
    if (currentCount >= 3) return 1; // 初次
  } else if (restrictionType === 'no_show') {
    // 放鳥：3次初次，5次累犯，6次以上嚴重
    if (currentCount >= 6) return 4; // 嚴重
    if (currentCount >= 5 && previousViolationLevel >= 1) return 2; // 累犯
    if (currentCount >= 3) return 1; // 初次
  }
  return 0;
};

export const bookingRestrictionModel = {
  // 創建凍結記錄
  create: async (data: CreateRestrictionData): Promise<BookingRestriction> => {
    const id = uuidv4();
    const autoUnfreezeAt = data.autoUnfreezeAt || (() => {
      if (data.violationLevel === 4) return null; // 永久凍結
      const duration = calculateFreezeDuration(data.violationLevel || 1, data.restrictionType);
      if (duration === -1) return null; // 永久凍結
      const date = new Date();
      date.setDate(date.getDate() + duration);
      return date;
    })();
    
    await query(`
      INSERT INTO booking_restrictions (
        id, user_id, restriction_type, reason, cancellation_count, no_show_count,
        violation_level, is_frozen, auto_unfreeze_at, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id,
      data.userId,
      data.restrictionType,
      data.reason || null,
      data.cancellationCount || 0,
      data.noShowCount || 0,
      data.violationLevel || 1,
      true, // is_frozen
      autoUnfreezeAt || null,
      data.notes || null,
    ]);

    const restriction = await bookingRestrictionModel.getById(id) as BookingRestriction;

    // 發送凍結通知給用戶（不透露檢舉人資訊）
    try {
      const { notificationModel } = await import('./Notification.js');
      
      // 根據違規級別和類型生成通知內容
      let freezeDuration = '';
      if (restriction.violationLevel === 4) {
        freezeDuration = '永久';
      } else if (restriction.autoUnfreezeAt) {
        const duration = calculateFreezeDuration(restriction.violationLevel, restriction.restrictionType);
        if (duration === 30) {
          freezeDuration = '1個月';
        } else if (duration === 180) {
          freezeDuration = '6個月';
        } else if (duration === 365) {
          freezeDuration = '1年';
        }
      }

      const unfreezeDate = restriction.autoUnfreezeAt 
        ? new Date(restriction.autoUnfreezeAt).toLocaleDateString('zh-TW')
        : null;

      let title = '⚠️ 預約權限已被凍結';
      let content = `您的預約權限已被凍結。`;

      if (restriction.restrictionType === 'cancellation_limit') {
        content += `原因：取消預約次數已達 ${restriction.cancellationCount || 0} 次。`;
        if (restriction.violationLevel >= 2) {
          content += '您的帳號已標記為失信茶客。';
        }
      } else if (restriction.restrictionType === 'no_show') {
        content += `原因：失約次數已達 ${restriction.noShowCount || 0} 次。`;
        content += '您的帳號已標記為失約茶客。';
      } else if (restriction.restrictionType === 'manual') {
        // 手動凍結（可能是因為檢舉）
        content += `原因：${restriction.reason || '違反平台規則'}。`;
        // 不透露檢舉人資訊
      }

      if (restriction.violationLevel === 4) {
        content += `您已被永久除名，驅逐出御茶室，將無法預約嚴選好茶和特選魚市。`;
      } else {
        content += `凍結期限：${freezeDuration || '永久'}${unfreezeDate ? `（預計解凍時間：${unfreezeDate}）` : ''}。您將無法預約嚴選好茶和特選魚市。`;
      }

      await notificationModel.create({
        userId: data.userId,
        type: 'warning',
        title,
        content,
        link: `/user-profile?tab=bookings`,
        metadata: {
          type: 'booking_frozen',
          restrictionId: id,
          restrictionType: restriction.restrictionType,
          violationLevel: restriction.violationLevel,
        },
      });
    } catch (error) {
      console.error('發送凍結通知失敗:', error);
      // 不阻止凍結記錄創建，只記錄錯誤
    }

    return restriction;
  },

  // 根據 ID 獲取凍結記錄
  getById: async (id: string): Promise<BookingRestriction | null> => {
    const result = await query('SELECT * FROM booking_restrictions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      cancellationCount: row.cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 1,
      isFrozen: Boolean(row.is_frozen),
      frozenAt: row.frozen_at,
      autoUnfreezeAt: row.auto_unfreeze_at || undefined,
      unfrozenAt: row.unfrozen_at || undefined,
      unfrozenBy: row.unfrozen_by || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 獲取用戶的有效凍結記錄（is_frozen = true）
  getActiveByUserId: async (userId: string): Promise<BookingRestriction | null> => {
    const result = await query(`
      SELECT * FROM booking_restrictions 
      WHERE user_id = $1 AND is_frozen = TRUE
      ORDER BY frozen_at DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      cancellationCount: row.cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 1,
      isFrozen: Boolean(row.is_frozen),
      frozenAt: row.frozen_at,
      autoUnfreezeAt: row.auto_unfreeze_at || undefined,
      unfrozenAt: row.unfrozen_at || undefined,
      unfrozenBy: row.unfrozen_by || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 獲取用戶的所有凍結記錄
  getByUserId: async (userId: string): Promise<BookingRestriction[]> => {
    const result = await query(`
      SELECT * FROM booking_restrictions 
      WHERE user_id = $1
      ORDER BY frozen_at DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      cancellationCount: row.cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 1,
      isFrozen: Boolean(row.is_frozen),
      frozenAt: row.frozen_at,
      autoUnfreezeAt: row.auto_unfreeze_at || undefined,
      unfrozenAt: row.unfrozen_at || undefined,
      unfrozenBy: row.unfrozen_by || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 獲取用戶的最高違規級別（用於判斷累犯）
  getMaxViolationLevel: async (userId: string, restrictionType: 'cancellation_limit' | 'no_show'): Promise<number> => {
    const result = await query(`
      SELECT MAX(violation_level) as max_level
      FROM booking_restrictions
      WHERE user_id = $1 AND restriction_type = $2
    `, [userId, restrictionType]);
    
    return result.rows[0]?.max_level || 0;
  },

  // 獲取所有凍結記錄（管理員用）
  getAll: async (includeUnfrozen: boolean = false): Promise<BookingRestriction[]> => {
    let sql = 'SELECT * FROM booking_restrictions';
    if (!includeUnfrozen) {
      sql += ' WHERE is_frozen = TRUE';
    }
    sql += ' ORDER BY frozen_at DESC';
    
    const result = await query(sql);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      cancellationCount: row.cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 1,
      isFrozen: Boolean(row.is_frozen),
      frozenAt: row.frozen_at,
      autoUnfreezeAt: row.auto_unfreeze_at || undefined,
      unfrozenAt: row.unfrozen_at || undefined,
      unfrozenBy: row.unfrozen_by || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 解除凍結
  unfreeze: async (id: string, unfrozenBy: string, notes?: string): Promise<BookingRestriction | null> => {
    await query(`
      UPDATE booking_restrictions
      SET is_frozen = FALSE,
          unfrozen_at = CURRENT_TIMESTAMP,
          unfrozen_by = $1,
          notes = COALESCE($2, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [unfrozenBy, notes || null, id]);

    return await bookingRestrictionModel.getById(id);
  },

  // 自動解凍（由 scheduler 調用）
  autoUnfreeze: async (): Promise<number> => {
    const result = await query(`
      UPDATE booking_restrictions
      SET is_frozen = FALSE,
          unfrozen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE is_frozen = TRUE
        AND auto_unfreeze_at IS NOT NULL
        AND auto_unfreeze_at <= CURRENT_TIMESTAMP
    `);
    
    return result.rowCount || 0;
  },

  // 獲取需要自動解凍的記錄（用於通知）
  getPendingAutoUnfreeze: async (daysBefore: number = 3): Promise<BookingRestriction[]> => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    
    const result = await query(`
      SELECT * FROM booking_restrictions
      WHERE is_frozen = TRUE
        AND auto_unfreeze_at IS NOT NULL
        AND auto_unfreeze_at <= $1
        AND auto_unfreeze_at > CURRENT_TIMESTAMP
      ORDER BY auto_unfreeze_at ASC
    `, [targetDate]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      cancellationCount: row.cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 1,
      isFrozen: Boolean(row.is_frozen),
      frozenAt: row.frozen_at,
      autoUnfreezeAt: row.auto_unfreeze_at || undefined,
      unfrozenAt: row.unfrozen_at || undefined,
      unfrozenBy: row.unfrozen_by || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 檢查用戶是否被凍結
  isUserFrozen: async (userId: string): Promise<boolean> => {
    const active = await bookingRestrictionModel.getActiveByUserId(userId);
    return active !== null;
  },
};
