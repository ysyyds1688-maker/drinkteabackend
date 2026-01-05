import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface Report {
  id: string;
  reporterId: string; // 檢舉人ID（可以是佳麗或茶客）
  targetUserId: string; // 被檢舉人ID（可以是茶客或佳麗）
  reporterRole?: 'client' | 'provider'; // 檢舉人角色
  targetRole?: 'client' | 'provider'; // 被檢舉人角色
  bookingId?: string; // 相關預約ID（如果有）
  reportType: 'solicitation' | 'scam' | 'harassment' | 'no_show' | 'not_real_person' | 'service_mismatch' | 'fake_profile' | 'other'; // 檢舉類型
  reason: string; // 檢舉原因
  description: string; // 詳細描述
  attachments?: string[]; // 附件（圖片URL數組）
  dialogueHistory?: string; // 互動對話記錄（JSON格式）
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected'; // 處理狀態
  adminNotes?: string; // 管理員備註
  resolvedBy?: string; // 處理人ID（管理員）
  resolvedAt?: string; // 處理時間
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportData {
  reporterId: string;
  targetUserId: string;
  reporterRole?: 'client' | 'provider'; // 檢舉人角色
  targetRole?: 'client' | 'provider'; // 被檢舉人角色
  bookingId?: string;
  reportType: 'solicitation' | 'scam' | 'harassment' | 'no_show' | 'not_real_person' | 'service_mismatch' | 'fake_profile' | 'other';
  reason: string;
  description: string;
  attachments?: string[];
  dialogueHistory?: string;
}

export const reportModel = {
  // 創建檢舉記錄
  create: async (data: CreateReportData): Promise<Report> => {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await query(`
      INSERT INTO reports (
        id, reporter_id, target_user_id, reporter_role, target_role, booking_id, report_type,
        reason, description, attachments, dialogue_history,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      id,
      data.reporterId,
      data.targetUserId,
      data.reporterRole || null,
      data.targetRole || null,
      data.bookingId || null,
      data.reportType,
      data.reason,
      data.description,
      data.attachments ? JSON.stringify(data.attachments) : null,
      data.dialogueHistory || null,
      'pending',
      now,
      now,
    ]);
    
    return await reportModel.getById(id) as Report;
  },

  // 根據ID獲取檢舉記錄
  getById: async (id: string): Promise<Report | null> => {
    const result = await query(`
      SELECT * FROM reports WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      reporterId: row.reporter_id,
      targetUserId: row.target_user_id,
      reporterRole: row.reporter_role || undefined,
      targetRole: row.target_role || undefined,
      bookingId: row.booking_id || undefined,
      reportType: row.report_type,
      reason: row.reason,
      description: row.description,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      dialogueHistory: row.dialogue_history || undefined,
      status: row.status,
      adminNotes: row.admin_notes || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 獲取檢舉人的所有檢舉記錄
  getByReporterId: async (reporterId: string): Promise<Report[]> => {
    const result = await query(`
      SELECT * FROM reports 
      WHERE reporter_id = $1
      ORDER BY created_at DESC
    `, [reporterId]);
    
    return result.rows.map(row => ({
      id: row.id,
      reporterId: row.reporter_id,
      targetUserId: row.target_user_id,
      reporterRole: row.reporter_role || undefined,
      targetRole: row.target_role || undefined,
      bookingId: row.booking_id || undefined,
      reportType: row.report_type,
      reason: row.reason,
      description: row.description,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      dialogueHistory: row.dialogue_history || undefined,
      status: row.status,
      adminNotes: row.admin_notes || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 檢查是否在短時間內重複檢舉同一目標
  checkRecentDuplicateReport: async (reporterId: string, targetUserId: string, hours: number = 24): Promise<Report | null> => {
    const result = await query(`
      SELECT * FROM reports 
      WHERE reporter_id = $1 
        AND target_user_id = $2
        AND created_at >= NOW() - INTERVAL '${hours} hours'
        AND status != 'rejected'
      ORDER BY created_at DESC
      LIMIT 1
    `, [reporterId, targetUserId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      reporterId: row.reporter_id,
      targetUserId: row.target_user_id,
      reporterRole: row.reporter_role || undefined,
      targetRole: row.target_role || undefined,
      bookingId: row.booking_id || undefined,
      reportType: row.report_type,
      reason: row.reason,
      description: row.description,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      dialogueHistory: row.dialogue_history || undefined,
      status: row.status,
      adminNotes: row.admin_notes || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 獲取用戶在短時間內的檢舉次數
  getRecentReportCount: async (reporterId: string, hours: number = 1): Promise<number> => {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM reports 
      WHERE reporter_id = $1
        AND created_at >= NOW() - INTERVAL '${hours} hours'
    `, [reporterId]);
    
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  // 獲取被檢舉人的所有檢舉記錄（管理員用）
  getByTargetUserId: async (targetUserId: string): Promise<Report[]> => {
    const result = await query(`
      SELECT * FROM reports 
      WHERE target_user_id = $1
      ORDER BY created_at DESC
    `, [targetUserId]);
    
    return result.rows.map(row => ({
      id: row.id,
      reporterId: row.reporter_id,
      targetUserId: row.target_user_id,
      reporterRole: row.reporter_role || undefined,
      targetRole: row.target_role || undefined,
      bookingId: row.booking_id || undefined,
      reportType: row.report_type,
      reason: row.reason,
      description: row.description,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      dialogueHistory: row.dialogue_history || undefined,
      status: row.status,
      adminNotes: row.admin_notes || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 獲取所有檢舉記錄（管理員用）
  getAll: async (status?: string, limit?: number, offset?: number): Promise<{ reports: Report[]; total: number }> => {
    let sql = 'SELECT * FROM reports WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    // 獲取總數
    const countResult = await query(sql.replace('SELECT *', 'SELECT COUNT(*) as count'), params);
    const total = parseInt(countResult.rows[0].count);
    
    sql += ' ORDER BY created_at DESC';
    
    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }
    
    if (offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(offset);
    }
    
    const result = await query(sql, params);
    
    return {
      reports: result.rows.map(row => ({
        id: row.id,
        reporterId: row.reporter_id,
        targetUserId: row.target_user_id,
        bookingId: row.booking_id || undefined,
        reportType: row.report_type,
        reason: row.reason,
        description: row.description,
        attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
        dialogueHistory: row.dialogue_history || undefined,
        status: row.status,
        adminNotes: row.admin_notes || undefined,
        resolvedBy: row.resolved_by || undefined,
        resolvedAt: row.resolved_at || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      total,
    };
  },

  // 更新檢舉狀態（管理員用）
  updateStatus: async (
    id: string,
    status: 'pending' | 'reviewing' | 'resolved' | 'rejected',
    adminNotes?: string,
    resolvedBy?: string
  ): Promise<Report | null> => {
    const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [status];
    let paramIndex = 2;
    
    if (adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramIndex++}`);
      values.push(adminNotes);
    }
    
    if (status === 'resolved' || status === 'rejected') {
      updates.push(`resolved_by = $${paramIndex++}`);
      values.push(resolvedBy || null);
      updates.push(`resolved_at = CURRENT_TIMESTAMP`);
    }
    
    values.push(id);
    
    await query(`
      UPDATE reports 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values);
    
    return await reportModel.getById(id);
  },
};


