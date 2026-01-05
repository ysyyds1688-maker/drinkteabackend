import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface ProviderRestriction {
  id: string;
  userId: string;
  restrictionType: 'report_limit' | 'severe_violation' | 'manual';
  reason?: string;
  reportCount?: number;
  scamReportCount?: number;
  notRealPersonCount?: number;
  fakeProfileCount?: number;
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

export interface CreateProviderRestrictionData {
  userId: string;
  restrictionType: 'report_limit' | 'severe_violation' | 'manual';
  reason?: string;
  reportCount?: number;
  scamReportCount?: number;
  notRealPersonCount?: number;
  fakeProfileCount?: number;
  violationLevel?: number;
  autoUnfreezeAt?: Date;
  notes?: string;
}

// 計算凍結期限（天數）
export const calculateProviderFreezeDuration = (violationLevel: number, restrictionType: 'report_limit' | 'severe_violation' | 'manual'): number => {
  if (restrictionType === 'report_limit') {
    // 檢舉次數規則
    if (violationLevel === 1) return 30; // 初次：1個月
    if (violationLevel === 2) return 180; // 累犯1：6個月
    if (violationLevel === 3) return 365; // 累犯2：1年
    if (violationLevel === 4) return -1; // 嚴重：永久（-1表示永久）
  } else if (restrictionType === 'severe_violation') {
    // 嚴重違規：直接永久凍結
    return -1; // 永久
  } else if (restrictionType === 'manual') {
    // 手動凍結：根據違規級別決定
    if (violationLevel === 4) return -1; // 永久
    if (violationLevel === 3) return 365; // 1年
    if (violationLevel === 2) return 180; // 6個月
    if (violationLevel === 1) return 30; // 1個月
  }
  return 30; // 預設1個月
};

// 計算違規級別（基於檢舉次數）
export const calculateProviderViolationLevel = (
  currentCount: number,
  previousViolationLevel: number = 0
): number => {
  // 檢舉次數規則：3-5次初次，6-8次累犯1，9-11次累犯2，12次以上嚴重
  if (currentCount >= 12) return 4; // 嚴重
  if (currentCount >= 9 && previousViolationLevel >= 2) return 3; // 累犯2
  if (currentCount >= 6 && previousViolationLevel >= 1) return 2; // 累犯1
  if (currentCount >= 3) return 1; // 初次
  return 0;
};

export const providerRestrictionModel = {
  // 創建凍結記錄
  create: async (data: CreateProviderRestrictionData): Promise<ProviderRestriction> => {
    const id = uuidv4();
    const autoUnfreezeAt = data.autoUnfreezeAt || (() => {
      if (data.violationLevel === 4) return null; // 永久凍結
      const duration = calculateProviderFreezeDuration(data.violationLevel || 1, data.restrictionType);
      if (duration === -1) return null; // 永久凍結
      const date = new Date();
      date.setDate(date.getDate() + duration);
      return date;
    })();
    
    await query(`
      INSERT INTO provider_restrictions (
        id, user_id, restriction_type, reason, report_count, scam_report_count,
        not_real_person_count, fake_profile_count, violation_level, is_frozen,
        auto_unfreeze_at, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id,
      data.userId,
      data.restrictionType,
      data.reason || null,
      data.reportCount || 0,
      data.scamReportCount || 0,
      data.notRealPersonCount || 0,
      data.fakeProfileCount || 0,
      data.violationLevel || 1,
      true, // is_frozen
      autoUnfreezeAt || null,
      data.notes || null,
    ]);
    
    return await providerRestrictionModel.getById(id) as ProviderRestriction;
  },

  // 根據ID獲取凍結記錄
  getById: async (id: string): Promise<ProviderRestriction | null> => {
    const result = await query(`
      SELECT * FROM provider_restrictions WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      reportCount: row.report_count || 0,
      scamReportCount: row.scam_report_count || 0,
      notRealPersonCount: row.not_real_person_count || 0,
      fakeProfileCount: row.fake_profile_count || 0,
      violationLevel: row.violation_level,
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

  // 獲取用戶的活躍凍結記錄
  getActiveByUserId: async (userId: string): Promise<ProviderRestriction | null> => {
    const result = await query(`
      SELECT * FROM provider_restrictions 
      WHERE user_id = $1 AND is_frozen = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      restrictionType: row.restriction_type,
      reason: row.reason || undefined,
      reportCount: row.report_count || 0,
      scamReportCount: row.scam_report_count || 0,
      notRealPersonCount: row.not_real_person_count || 0,
      fakeProfileCount: row.fake_profile_count || 0,
      violationLevel: row.violation_level,
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

  // 檢查用戶是否被凍結
  isUserFrozen: async (userId: string): Promise<boolean> => {
    const restriction = await providerRestrictionModel.getActiveByUserId(userId);
    if (!restriction) return false;
    
    // 如果是永久凍結，直接返回 true
    if (!restriction.autoUnfreezeAt) return true;
    
    // 檢查是否已過自動解凍時間
    const now = new Date();
    const unfreezeAt = new Date(restriction.autoUnfreezeAt);
    
    if (now >= unfreezeAt) {
      // 自動解凍
      await providerRestrictionModel.unfreeze(userId, 'system');
      return false;
    }
    
    return true;
  },

  // 解凍用戶
  unfreeze: async (userId: string, unfrozenBy: string = 'system'): Promise<void> => {
    await query(`
      UPDATE provider_restrictions 
      SET is_frozen = FALSE,
          unfrozen_at = CURRENT_TIMESTAMP,
          unfrozen_by = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND is_frozen = TRUE
    `, [unfrozenBy, userId]);
    
    // 更新 users 表的凍結狀態
    await query(`
      UPDATE users 
      SET provider_frozen = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);
  },
};

