import { query } from '../db/database.js';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  role: 'provider' | 'client' | 'admin';
  membershipLevel: 'free' | 'subscribed';
  membershipExpiresAt?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CreateUserData {
  email?: string;
  phoneNumber?: string;
  password: string;
  userName?: string;
  role?: 'provider' | 'client' | 'admin';
}

export const userModel = {
  // 根据 Email 或手机号查找用户
  findByEmailOrPhone: async (email?: string, phoneNumber?: string): Promise<User | null> => {
    if (!email && !phoneNumber) return null;
    
    let sql = 'SELECT * FROM users WHERE ';
    const params: any[] = [];
    
    if (email && phoneNumber) {
      sql += '("email" = $1 OR "phone_number" = $2)';
      params.push(email, phoneNumber);
    } else if (email) {
      sql += '"email" = $1';
      params.push(email);
    } else {
      sql += '"phone_number" = $1';
      params.push(phoneNumber);
    }
    
    const result = await query(sql, params);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      password: row.password,
      role: row.role,
      membershipLevel: row.membership_level,
      membershipExpiresAt: row.membership_expires_at || undefined,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
    };
  },

  // 根据 ID 查找用户
  findById: async (id: string): Promise<User | null> => {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      password: row.password,
      role: row.role,
      membershipLevel: row.membership_level,
      membershipExpiresAt: row.membership_expires_at || undefined,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
    };
  },

  // 创建用户
  create: async (userData: CreateUserData): Promise<User> => {
    const { v4: uuidv4 } = await import('uuid');
    const id = `user_${Date.now()}_${uuidv4().substring(0, 9)}`;
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await query(`
      INSERT INTO users (id, email, phone_number, password, role)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      userData.email || null,
      userData.phoneNumber || null,
      hashedPassword,
      userData.role || 'client'
    ]);
    
    const user = await userModel.findById(id);
    if (!user) throw new Error('Failed to create user');
    return user;
  },

  // 验证密码
  verifyPassword: async (user: User, password: string): Promise<boolean> => {
    const result = await query('SELECT password FROM users WHERE id = $1', [user.id]);
    if (result.rows.length === 0) return false;
    return await bcrypt.compare(password, result.rows[0].password);
  },

  // 更新最后登录时间
  updateLastLogin: async (userId: string): Promise<void> => {
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  },

  // 更新订阅状态
  updateMembership: async (userId: string, level: 'free' | 'subscribed', expiresAt?: Date): Promise<void> => {
    await query(`
      UPDATE users 
      SET membership_level = $1, membership_expires_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [level, expiresAt || null, userId]);
  },

  // 获取所有用户（管理员）
  getAll: async (): Promise<User[]> => {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      password: row.password,
      role: row.role,
      membershipLevel: row.membership_level,
      membershipExpiresAt: row.membership_expires_at || undefined,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
    }));
  },
};

