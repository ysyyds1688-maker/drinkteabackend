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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
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
};

