import { query } from '../db/database.js';
import bcrypt from 'bcrypt';

// 品茶客等級
export type MembershipLevel = 'tea_guest' | 'tea_scholar' | 'royal_tea_scholar' | 'royal_tea_officer' | 'tea_king_attendant' | 'imperial_chief_tea_officer' | 'tea_king_confidant' | 'tea_king_personal_selection' | 'imperial_golden_seal_tea_officer' | 'national_master_tea_officer';

// 後宮佳麗等級
export type LadyMembershipLevel = 'lady_trainee' | 'lady_apprentice' | 'lady_junior' | 'lady_senior' | 'lady_expert' | 'lady_master' | 'lady_elite' | 'lady_premium' | 'lady_royal' | 'lady_empress';

// 聯合等級類型（用於通用函數）
export type AnyMembershipLevel = MembershipLevel | LadyMembershipLevel;

export interface User {
  id: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  userName?: string;
  avatarUrl?: string;
  role: 'provider' | 'client' | 'admin';
  membershipLevel: MembershipLevel;
  membershipExpiresAt?: string;
  verificationBadges?: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  registeredAt?: string; // 註冊時間（用於成就計算）
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  nicknameChangedAt?: string; // 暱稱最後修改時間
  bookingCancellationCount?: number; // 預約取消次數
  bookingWarning?: boolean; // 預約警告狀態（超過3次取消）
  noShowCount?: number; // 放鳥次數
  violationLevel?: number; // 違規級別：0=無, 1=初次, 2=累犯1, 3=累犯2, 4=嚴重
  warningBadge?: boolean; // 警示戶頭標記
  noShowBadge?: boolean; // 放鳥標記徽章
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
    let verificationBadges: string[] = [];
    if (row.verification_badges) {
      try {
        verificationBadges = JSON.parse(row.verification_badges);
      } catch (e) {
        verificationBadges = [];
      }
    }
    return {
      id: row.id,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      password: row.password,
      userName: row.user_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      role: row.role,
      membershipLevel: row.membership_level as MembershipLevel,
      membershipExpiresAt: row.membership_expires_at || undefined,
      verificationBadges: verificationBadges.length > 0 ? verificationBadges : undefined,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      registeredAt: row.registered_at || row.created_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
      nicknameChangedAt: row.nickname_changed_at || undefined,
      bookingCancellationCount: row.booking_cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 0,
      warningBadge: Boolean(row.warning_badge),
      noShowBadge: Boolean(row.no_show_badge),
      bookingWarning: Boolean(row.booking_warning),
    };
  },

  // 根据 ID 查找用户
  findById: async (id: string): Promise<User | null> => {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    let verificationBadges: string[] = [];
    if (row.verification_badges) {
      try {
        verificationBadges = JSON.parse(row.verification_badges);
      } catch (e) {
        verificationBadges = [];
      }
    }
    return {
      id: row.id,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      password: row.password,
      userName: row.user_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      role: row.role,
      membershipLevel: row.membership_level as MembershipLevel,
      membershipExpiresAt: row.membership_expires_at || undefined,
      verificationBadges: verificationBadges.length > 0 ? verificationBadges : undefined,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      registeredAt: row.registered_at || row.created_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
      nicknameChangedAt: row.nickname_changed_at || undefined,
      bookingCancellationCount: row.booking_cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 0,
      warningBadge: Boolean(row.warning_badge),
      noShowBadge: Boolean(row.no_show_badge),
      bookingWarning: Boolean(row.booking_warning),
    };
  },

  // 创建用户
  create: async (userData: CreateUserData): Promise<User> => {
    const { v4: uuidv4 } = await import('uuid');
    const id = `user_${Date.now()}_${uuidv4().substring(0, 9)}`;
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await query(`
      INSERT INTO users (id, email, phone_number, password, user_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      userData.email || null,
      userData.phoneNumber || null,
      hashedPassword,
      userData.userName || null,
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

  // 更新最後登入時間
  updateLastLogin: async (userId: string): Promise<void> => {
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  },

  // 更新訂閱狀態（支援品茶客和後宮佳麗等級）
  updateMembership: async (userId: string, level: AnyMembershipLevel, expiresAt?: Date): Promise<void> => {
    await query(`
      UPDATE users 
      SET membership_level = $1, membership_expires_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [level, expiresAt || null, userId]);
  },

  // 獲取會員等級權益
    getMembershipBenefits: (level: MembershipLevel) => {
      const benefits: Record<MembershipLevel, string[]> = {
        tea_guest: ['基本功能'],
        tea_scholar: ['基本功能', '解鎖部分內容', '優先客服'],
        royal_tea_scholar: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤'],
        royal_tea_officer: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章'],
        tea_king_attendant: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章', '最高權限', '專屬服務'],
        imperial_chief_tea_officer: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章', '最高權限', '專屬服務', '御前特權', '專屬顧問'],
        tea_king_confidant: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章', '最高權限', '專屬服務', '御前特權', '專屬顧問', '心腹特權', '優先預約'],
        tea_king_personal_selection: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章', '最高權限', '專屬服務', '御前特權', '專屬顧問', '心腹特權', '優先預約', '茶王親選', '獨家內容'],
        imperial_golden_seal_tea_officer: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章', '最高權限', '專屬服務', '御前特權', '專屬顧問', '心腹特權', '優先預約', '茶王親選', '獨家內容', '金印特權', '尊貴服務'],
        national_master_tea_officer: ['基本功能', '解鎖部分內容', '優先客服', '更多內容', '專屬標籤', '全部內容', '專屬徽章', '最高權限', '專屬服務', '御前特權', '專屬顧問', '心腹特權', '優先預約', '茶王親選', '獨家內容', '金印特權', '尊貴服務', '國師級特權', '至尊服務', '無限權限'],
      };
      return benefits[level] || benefits.tea_guest;
    },

    // 獲取後宮佳麗會員等級權益
    getLadyMembershipBenefits: (level: LadyMembershipLevel) => {
      const benefits: Record<LadyMembershipLevel, string[]> = {
        lady_trainee: ['基本功能'],
        lady_apprentice: ['基本功能', '上架管理', '優先客服'],
        lady_junior: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤'],
        lady_senior: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章'],
        lady_expert: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章', '優先推薦', '專屬服務'],
        lady_master: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章', '優先推薦', '專屬服務', '御前特權', '專屬顧問'],
        lady_elite: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章', '優先推薦', '專屬服務', '御前特權', '專屬顧問', '金牌特權', '優先曝光'],
        lady_premium: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章', '優先推薦', '專屬服務', '御前特權', '專屬顧問', '金牌特權', '優先曝光', '鑽石推薦', '獨家展示'],
        lady_royal: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章', '優先推薦', '專屬服務', '御前特權', '專屬顧問', '金牌特權', '優先曝光', '鑽石推薦', '獨家展示', '皇家特權', '尊貴服務'],
        lady_empress: ['基本功能', '上架管理', '優先客服', '更多展示位', '專屬標籤', '數據分析', '專屬徽章', '優先推薦', '專屬服務', '御前特權', '專屬顧問', '金牌特權', '優先曝光', '鑽石推薦', '獨家展示', '皇家特權', '尊貴服務', '皇后級特權', '至尊服務', '無限權限'],
      };
      return benefits[level] || benefits.lady_trainee;
    },

  // 更新驗證勳章
  updateVerificationBadge: async (userId: string, badge: string, add: boolean = true): Promise<void> => {
    const user = await userModel.findById(userId);
    if (!user) throw new Error('用戶不存在');

    let badges = user.verificationBadges || [];
    if (add) {
      if (!badges.includes(badge)) {
        badges.push(badge);
      }
    } else {
      badges = badges.filter(b => b !== badge);
    }

    await query(`
      UPDATE users 
      SET verification_badges = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(badges), userId]);
  },

  // 获取所有用户（管理员）
  getAll: async (): Promise<User[]> => {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows.map(row => {
      let verificationBadges: string[] = [];
      if (row.verification_badges) {
        try {
          verificationBadges = JSON.parse(row.verification_badges);
        } catch (e) {
          verificationBadges = [];
        }
      }
      return {
        id: row.id,
        email: row.email || undefined,
        phoneNumber: row.phone_number || undefined,
        password: row.password,
        userName: row.user_name || undefined,
        avatarUrl: row.avatar_url || undefined,
        role: row.role,
        membershipLevel: row.membership_level as MembershipLevel,
        membershipExpiresAt: row.membership_expires_at || undefined,
        verificationBadges: verificationBadges.length > 0 ? verificationBadges : undefined,
        emailVerified: Boolean(row.email_verified),
        phoneVerified: Boolean(row.phone_verified),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at || undefined,
        nicknameChangedAt: row.nickname_changed_at || undefined,
      };
    });
  },

  // 更新用户信息
  update: async (id: string, userData: Partial<Omit<User, 'id' | 'password' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>>): Promise<User | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 检查是否需要更新昵称，如果需要则检查是否在1个月内修改过
    if (userData.userName !== undefined) {
      // 先获取当前用户信息
      const currentUser = await userModel.findById(id);
      if (currentUser && currentUser.userName && currentUser.userName !== userData.userName) {
        // 昵称有变化，检查是否在1个月内修改过
        if (currentUser.nicknameChangedAt) {
          const lastChangeDate = new Date(currentUser.nicknameChangedAt);
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          
          if (lastChangeDate > oneMonthAgo) {
            throw new Error('暱稱1個月內只能修改一次，請稍後再試');
          }
        }
        // 更新昵称修改时间
        fields.push(`nickname_changed_at = CURRENT_TIMESTAMP`);
      }
      fields.push(`user_name = $${paramIndex++}`);
      values.push(userData.userName || null);
    }
    if (userData.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(userData.avatarUrl || null);
    }
    if (userData.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(userData.email || null);
      // 當 email 改變時，重置 email 驗證狀態
      fields.push(`email_verified = FALSE`);
    }
    if (userData.phoneNumber !== undefined) {
      fields.push(`phone_number = $${paramIndex++}`);
      values.push(userData.phoneNumber || null);
      // 當手機號碼改變時，重置手機驗證狀態
      fields.push(`phone_verified = FALSE`);
    }

    if (fields.length === 0) {
      return userModel.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    let verificationBadges: string[] = [];
    if (row.verification_badges) {
      try {
        verificationBadges = JSON.parse(row.verification_badges);
      } catch (e) {
        verificationBadges = [];
      }
    }
    return {
      id: row.id,
      email: row.email || undefined,
      phoneNumber: row.phone_number || undefined,
      password: row.password,
      userName: row.user_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      role: row.role,
      membershipLevel: row.membership_level as MembershipLevel,
      membershipExpiresAt: row.membership_expires_at || undefined,
      verificationBadges: verificationBadges.length > 0 ? verificationBadges : undefined,
      emailVerified: Boolean(row.email_verified),
      phoneVerified: Boolean(row.phone_verified),
      registeredAt: row.registered_at || row.created_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at || undefined,
      nicknameChangedAt: row.nickname_changed_at || undefined,
    };
  },

  // 更新邮箱验证状态
  updateEmailVerified: async (id: string, verified: boolean): Promise<User | null> => {
    // 先獲取當前用戶信息
    const user = await userModel.findById(id);
    if (!user) return null;
    
    // 更新驗證狀態
    await query(`
      UPDATE users
      SET email_verified = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [verified, id]);
    
    // 更新驗證勳章
    let badges = user.verificationBadges || [];
    if (verified) {
      // 添加 email_verified 勳章（如果還沒有）
      if (!badges.includes('email_verified')) {
        badges.push('email_verified');
      }
    } else {
      // 移除 email_verified 勳章
      badges = badges.filter(b => b !== 'email_verified');
    }
    
    // 更新驗證勳章到資料庫
    await query(`
      UPDATE users
      SET verification_badges = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(badges), id]);
    
    return userModel.findById(id);
  },

  // 更新手機驗證狀態
  updatePhoneVerified: async (id: string, verified: boolean): Promise<User | null> => {
    // 先獲取當前用戶信息
    const user = await userModel.findById(id);
    if (!user) return null;
    
    // 更新驗證狀態
    await query(`
      UPDATE users
      SET phone_verified = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [verified, id]);
    
    // 更新驗證勳章
    let badges = user.verificationBadges || [];
    if (verified) {
      // 添加 phone_verified 勳章（如果還沒有）
      if (!badges.includes('phone_verified')) {
        badges.push('phone_verified');
      }
    } else {
      // 移除 phone_verified 勳章
      badges = badges.filter(b => b !== 'phone_verified');
    }
    
    // 更新驗證勳章到資料庫
    await query(`
      UPDATE users
      SET verification_badges = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(badges), id]);
    
    return userModel.findById(id);
  },

  // 增加預約取消次數並檢查是否需要警告
  incrementCancellationCount: async (userId: string): Promise<{ count: number; warning: boolean }> => {
    // 先獲取當前次數
    const user = await userModel.findById(userId);
    if (!user) throw new Error('用戶不存在');
    
    const currentCount = user.bookingCancellationCount || 0;
    const newCount = currentCount + 1;
    const shouldWarn = newCount >= 3;
    
    // 更新次數和警告狀態
    await query(`
      UPDATE users
      SET booking_cancellation_count = $1,
          booking_warning = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newCount, shouldWarn, userId]);
    
    return { count: newCount, warning: shouldWarn };
  },

  // 增加放鳥次數
  incrementNoShowCount: async (userId: string): Promise<{ count: number }> => {
    const user = await userModel.findById(userId);
    if (!user) throw new Error('用戶不存在');
    
    const currentCount = user.noShowCount || 0;
    const newCount = currentCount + 1;
    
    // 更新次數
    await query(`
      UPDATE users
      SET no_show_count = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newCount, userId]);
    
    return { count: newCount };
  },

  // 更新違規級別和標記
  updateViolationLevel: async (userId: string, level: number, warningBadge?: boolean, noShowBadge?: boolean): Promise<void> => {
    const updates: string[] = ['violation_level = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [level];
    
    if (warningBadge !== undefined) {
      updates.push(`warning_badge = $${params.length + 1}`);
      params.push(warningBadge);
    }
    
    if (noShowBadge !== undefined) {
      updates.push(`no_show_badge = $${params.length + 1}`);
      params.push(noShowBadge);
    }
    
    params.push(userId);
    
    await query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
    `, params);
  },
};

