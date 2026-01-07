import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface Booking {
  id: string;
  providerId?: string;
  clientId: string;
  profileId: string;
  serviceType?: string;
  bookingDate: string;
  bookingTime: string;
  location?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  notes?: string;
  clientReviewed?: boolean; // 茶客是否已評論
  providerReviewed?: boolean; // 佳麗是否已評論
  noShow?: boolean; // 是否被回報為放鳥
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  providerId?: string;
  clientId: string;
  profileId: string;
  serviceType?: string;
  bookingDate: string;
  bookingTime: string;
  location?: string;
  notes?: string;
}

export const bookingModel = {
  // 创建预约
  create: async (data: CreateBookingData): Promise<Booking> => {
    const id = `booking_${Date.now()}_${uuidv4().substring(0, 9)}`;
    
    await query(`
      INSERT INTO bookings (id, provider_id, client_id, profile_id, service_type, booking_date, booking_time, location, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id,
      data.providerId || null,
      data.clientId,
      data.profileId,
      data.serviceType || null,
      data.bookingDate,
      data.bookingTime,
      data.location || null,
      data.notes || null,
    ]);
    
    const booking = await bookingModel.getById(id);
    if (!booking) throw new Error('Failed to create booking');
    return booking;
  },

  // 根据 ID 获取预约
  getById: async (id: string): Promise<Booking | null> => {
    const result = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      providerId: row.provider_id || undefined,
      clientId: row.client_id,
      profileId: row.profile_id,
      serviceType: row.service_type || undefined,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      location: row.location || undefined,
      status: row.status,
      notes: row.notes || undefined,
      clientReviewed: row.client_reviewed || false,
      providerReviewed: row.provider_reviewed || false,
      noShow: Boolean(row.no_show),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 根据 Provider ID 获取预约
  getByProviderId: async (providerId: string): Promise<Booking[]> => {
    const result = await query(`
      SELECT * FROM bookings 
      WHERE provider_id = $1 
      ORDER BY booking_date DESC, booking_time DESC
    `, [providerId]);
    
    return result.rows.map(row => ({
      id: row.id,
      providerId: row.provider_id || undefined,
      clientId: row.client_id,
      profileId: row.profile_id,
      serviceType: row.service_type || undefined,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      location: row.location || undefined,
      status: row.status,
      notes: row.notes || undefined,
      clientReviewed: row.client_reviewed || false,
      providerReviewed: row.provider_reviewed || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 根据 Client ID 获取预约
  getByClientId: async (clientId: string): Promise<Booking[]> => {
    const result = await query(`
      SELECT * FROM bookings 
      WHERE client_id = $1 
      ORDER BY booking_date DESC, booking_time DESC
    `, [clientId]);
    
    return result.rows.map(row => ({
      id: row.id,
      providerId: row.provider_id || undefined,
      clientId: row.client_id,
      profileId: row.profile_id,
      serviceType: row.service_type || undefined,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      location: row.location || undefined,
      status: row.status,
      notes: row.notes || undefined,
      clientReviewed: row.client_reviewed || false,
      providerReviewed: row.provider_reviewed || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 获取所有预约（管理员）
  getAll: async (): Promise<Booking[]> => {
    const result = await query(`
      SELECT * FROM bookings 
      ORDER BY booking_date DESC, booking_time DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      providerId: row.provider_id || undefined,
      clientId: row.client_id,
      profileId: row.profile_id,
      serviceType: row.service_type || undefined,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      location: row.location || undefined,
      status: row.status,
      notes: row.notes || undefined,
      clientReviewed: row.client_reviewed || false,
      providerReviewed: row.provider_reviewed || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 获取24小时内未确认的预约（用于自动取消）
  getPendingExpired: async (): Promise<Booking[]> => {
    const result = await query(`
      SELECT * FROM bookings 
      WHERE status = 'pending' 
      AND created_at < NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      providerId: row.provider_id || undefined,
      clientId: row.client_id,
      profileId: row.profile_id,
      serviceType: row.service_type || undefined,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      location: row.location || undefined,
      status: row.status,
      notes: row.notes || undefined,
      clientReviewed: row.client_reviewed || false,
      providerReviewed: row.provider_reviewed || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // 更新评论状态
  updateReviewStatus: async (id: string, userRole: 'client' | 'provider', reviewed: boolean): Promise<Booking | null> => {
    const field = userRole === 'client' ? 'client_reviewed' : 'provider_reviewed';
    await query(`
      UPDATE bookings 
      SET ${field} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [reviewed, id]);
    
    return await bookingModel.getById(id);
  },

  // 更新预约状态
  updateStatus: async (id: string, status: Booking['status'], userId: string, userRole: string): Promise<Booking | null> => {
    // 检查权限：Provider只能更新自己的预约，Client只能更新自己的预约，Admin可以更新所有
    const existing = await bookingModel.getById(id);
    if (!existing) return null;
    
    if (userRole !== 'admin') {
      if (userRole === 'provider' && existing.providerId !== userId) {
        return null; // Provider只能更新自己的预约
      }
      if (userRole === 'client' && existing.clientId !== userId) {
        return null; // Client只能更新自己的预约
      }
    }
    
    await query(`
      UPDATE bookings 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status, id]);
    
    return await bookingModel.getById(id);
  },

  // 删除预约
  delete: async (id: string, userId: string, userRole: string): Promise<boolean> => {
    const existing = await bookingModel.getById(id);
    if (!existing) return false;
    
    if (userRole !== 'admin') {
      if (userRole === 'provider' && existing.providerId !== userId) {
        return false;
      }
      if (userRole === 'client' && existing.clientId !== userId) {
        return false;
      }
    }
    
    const result = await query('DELETE FROM bookings WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },

  // 獲取某個 profile 在特定日期的已預約時間
  getBookedTimesByProfileAndDate: async (profileId: string, bookingDate: string): Promise<string[]> => {
    const result = await query(`
      SELECT booking_time 
      FROM bookings 
      WHERE profile_id = $1 
        AND booking_date = $2 
        AND status IN ('pending', 'accepted', 'completed')
      ORDER BY booking_time
    `, [profileId, bookingDate]);
    
    return result.rows.map(row => row.booking_time);
  },

  // 獲取茶客在特定日期的預約數量（特選魚市）
  getClientBookingsCountByDate: async (clientId: string, bookingDate: string): Promise<number> => {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM bookings 
      WHERE client_id = $1 
        AND booking_date = $2
        AND provider_id IS NOT NULL
        AND status IN ('pending', 'accepted', 'completed')
    `, [clientId, bookingDate]);
    
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  // 獲取茶客在一週內的預約數量（特選魚市）
  // 獲取客戶當月嚴選好茶預約次數（每月刷新）
  getClientPremiumTeaBookingsCountThisMonth: async (clientId: string): Promise<number> => {
    // 獲取當月第一天和最後一天（台灣時區）
    // 使用台灣時區來計算當月的開始和結束日期
    const now = new Date();
    
    // 獲取台灣時區的當前日期
    const taiwanDateStr = now.toLocaleDateString('en-CA', { 
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [year, month] = taiwanDateStr.split('-').map(Number);
    
    // 創建台灣時區的當月第一天 00:00:00
    const monthStartTaiwan = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`);
    // 創建台灣時區的當月最後一天 23:59:59
    const monthEndTaiwan = new Date(year, month, 0, 23, 59, 59, 999);
    // 轉換為台灣時區的日期字符串（YYYY-MM-DD）
    const monthEndTaiwanStr = monthEndTaiwan.toLocaleDateString('en-CA', { 
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // 使用日期字符串進行查詢（booking_date 是 DATE 類型，不包含時間）
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // 查詢當月嚴選好茶的預約（providerId為空或null的預約）
    const result = await query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE client_id = $1
      AND (provider_id IS NULL OR provider_id = '')
      AND booking_date >= $2
      AND booking_date <= $3
      AND status IN ('pending', 'accepted', 'completed')
    `, [clientId, monthStartStr, monthEndTaiwanStr]);
    
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  getClientBookingsCountByWeek: async (clientId: string, startDate: string, endDate: string): Promise<number> => {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM bookings 
      WHERE client_id = $1 
        AND booking_date >= $2
        AND booking_date <= $3
        AND provider_id IS NOT NULL
        AND status IN ('pending', 'accepted', 'completed')
    `, [clientId, startDate, endDate]);
    
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  // 檢查是否在短時間內重複預約同一佳麗
  checkRecentDuplicateBooking: async (clientId: string, providerId: string, hours: number = 24): Promise<Booking | null> => {
    const result = await query(`
      SELECT * FROM bookings 
      WHERE client_id = $1 
        AND provider_id = $2
        AND created_at >= NOW() - INTERVAL '${hours} hours'
        AND status IN ('pending', 'accepted')
      ORDER BY created_at DESC
      LIMIT 1
    `, [clientId, providerId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      providerId: row.provider_id || undefined,
      clientId: row.client_id,
      profileId: row.profile_id,
      serviceType: row.service_type || undefined,
      bookingDate: row.booking_date,
      bookingTime: row.booking_time,
      location: row.location || undefined,
      status: row.status,
      notes: row.notes || undefined,
      clientReviewed: row.client_reviewed || false,
      providerReviewed: row.provider_reviewed || false,
      noShow: Boolean(row.no_show),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  // 獲取用戶在短時間內的取消次數
  getRecentCancellationCount: async (clientId: string, hours: number = 1): Promise<number> => {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM bookings 
      WHERE client_id = $1
        AND status = 'cancelled'
        AND updated_at >= NOW() - INTERVAL '${hours} hours'
    `, [clientId]);
    
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  // 回報放鳥（佳麗回報茶客沒有到場）
  reportNoShow: async (id: string, providerId: string): Promise<Booking | null> => {
    const existing = await bookingModel.getById(id);
    if (!existing) return null;
    
    // 檢查權限：只有該預約的 provider 可以回報
    if (existing.providerId !== providerId) {
      return null;
    }
    
    // 只有 accepted 或 pending 狀態的預約可以回報放鳥
    if (existing.status !== 'accepted' && existing.status !== 'pending') {
      return null;
    }
    
    // 更新 no_show 狀態並將預約狀態改為 cancelled
    await query(`
      UPDATE bookings 
      SET no_show = TRUE,
          status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    // 增加茶客的放鳥次數（放鳥和取消分開計算）
    const { userModel } = await import('./User.js');
    await userModel.incrementNoShowCount(existing.clientId);
    
    return await bookingModel.getById(id);
  },
};

