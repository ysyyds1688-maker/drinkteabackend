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
  // 對外顯示用的用戶ID（例如 #Tea123456 / #Gri123456），不一定等於資料庫主鍵 id
  publicId?: string;
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
  nicknameChangeCount?: number; // 暱稱修改次數（從第一次修改開始計算）
  bookingCancellationCount?: number; // 預約取消次數
  bookingWarning?: boolean; // 預約警告狀態（超過3次取消）
  noShowCount?: number; // 放鳥次數
  violationLevel?: number; // 違規級別：0=無, 1=初次, 2=累犯1, 3=累犯2, 4=嚴重
  warningBadge?: boolean; // 警示戶頭標記
  noShowBadge?: boolean; // 放鳥標記徽章
  // 佳麗檢舉相關欄位
  providerReportCount?: number; // 被檢舉次數
  providerScamReportCount?: number; // 詐騙檢舉次數
  providerNotRealPersonCount?: number; // 非本人檢舉次數
  providerFakeProfileCount?: number; // 假檔案檢舉次數
  providerViolationLevel?: number; // 違規級別（0-4）
  providerWarningBadge?: boolean; // 警示標記
  providerFrozen?: boolean; // 是否被凍結
  providerFrozenAt?: string; // 凍結時間
  providerAutoUnfreezeAt?: string; // 自動解凍時間
  telegramUserId?: string; // Telegram 用戶 ID
  telegramUsername?: string; // Telegram 用戶名
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
      publicId: row.public_id || undefined,
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
      nicknameChangeCount: row.nickname_change_count || 0,
      bookingCancellationCount: row.booking_cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 0,
      warningBadge: Boolean(row.warning_badge),
      noShowBadge: Boolean(row.no_show_badge),
      bookingWarning: Boolean(row.booking_warning),
      providerReportCount: row.provider_report_count || 0,
      providerScamReportCount: row.provider_scam_report_count || 0,
      providerNotRealPersonCount: row.provider_not_real_person_count || 0,
      providerFakeProfileCount: row.provider_fake_profile_count || 0,
      providerViolationLevel: row.provider_violation_level || 0,
      providerWarningBadge: Boolean(row.provider_warning_badge),
      providerFrozen: Boolean(row.provider_frozen),
      providerFrozenAt: row.provider_frozen_at || undefined,
      providerAutoUnfreezeAt: row.provider_auto_unfreeze_at || undefined,
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
      publicId: row.public_id || undefined,
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
      nicknameChangeCount: row.nickname_change_count || 0,
      bookingCancellationCount: row.booking_cancellation_count || 0,
      noShowCount: row.no_show_count || 0,
      violationLevel: row.violation_level || 0,
      warningBadge: Boolean(row.warning_badge),
      noShowBadge: Boolean(row.no_show_badge),
      bookingWarning: Boolean(row.booking_warning),
      providerReportCount: row.provider_report_count || 0,
      providerScamReportCount: row.provider_scam_report_count || 0,
      providerNotRealPersonCount: row.provider_not_real_person_count || 0,
      providerFakeProfileCount: row.provider_fake_profile_count || 0,
      providerViolationLevel: row.provider_violation_level || 0,
      providerWarningBadge: Boolean(row.provider_warning_badge),
      providerFrozen: Boolean(row.provider_frozen),
      providerFrozenAt: row.provider_frozen_at || undefined,
      providerAutoUnfreezeAt: row.provider_auto_unfreeze_at || undefined,
    };
  },

  // 生成新格式的用戶ID
  // 茶客：#Tea123456（# + Tea + 6位隨機數字）
  // 佳麗：#Gri123456（# + Gri + 6位隨機數字）
  generateUserId: async (role: 'provider' | 'client' | 'admin' = 'client'): Promise<string> => {
    const prefix = role === 'provider' ? 'Gri' : 'Tea';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      // 生成6位隨機數字（100000-999999）
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const id = `#${prefix}${randomNum}`;
      
      // 檢查ID是否已存在
      const existingUser = await userModel.findById(id);
      if (!existingUser) {
        return id;
      }
      
      attempts++;
    }
    
    // 如果10次嘗試都失敗，使用時間戳作為後綴確保唯一性
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const timestamp = Date.now().toString().slice(-4);
    return `#${prefix}${randomNum}${timestamp}`;
  },

  // 创建用户
  create: async (userData: CreateUserData): Promise<User> => {
    const role = userData.role || 'client';
    const id = await userModel.generateUserId(role);
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // 加密存儲原始密碼（用於密碼提示功能）
    let encryptedPassword: string | null = null;
    try {
      const { encryptPassword } = await import('../services/passwordEncryption.js');
      encryptedPassword = encryptPassword(userData.password);
    } catch (error) {
      console.warn('加密密碼失敗（用於密碼提示功能）:', error);
      // 不影響用戶創建，繼續執行
    }
    
    // 檢查是否存在 password_encrypted 欄位
    let hasEncryptedColumn = false;
    try {
      const checkResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_encrypted'
      `);
      hasEncryptedColumn = checkResult.rows.length > 0;
    } catch (error) {
      // 忽略錯誤
    }
    
    if (hasEncryptedColumn) {
      await query(`
        INSERT INTO users (id, email, phone_number, password, password_encrypted, user_name, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        userData.email || null,
        userData.phoneNumber || null,
        hashedPassword,
        encryptedPassword,
        userData.userName || null,
        userData.role || 'client'
      ]);
    } else {
      // 如果欄位不存在，先創建欄位
      try {
        await query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS password_encrypted TEXT
        `);
        
        // 然後插入數據
        await query(`
          INSERT INTO users (id, email, phone_number, password, password_encrypted, user_name, role)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          userData.email || null,
          userData.phoneNumber || null,
          hashedPassword,
          encryptedPassword,
          userData.userName || null,
          userData.role || 'client'
        ]);
      } catch (error: any) {
        // 如果添加欄位失敗，使用舊的方式插入（不包含 password_encrypted）
        console.warn('無法添加 password_encrypted 欄位，使用舊方式插入:', error.message);
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
      }
    }
    
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
        tea_scholar: ['基本功能', '解鎖部分內容'],
        royal_tea_scholar: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤'],
        royal_tea_officer: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章'],
        tea_king_attendant: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章'],
        imperial_chief_tea_officer: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章', '御前特權'],
        tea_king_confidant: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章', '御前特權', '心腹特權'],
        tea_king_personal_selection: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章', '御前特權', '心腹特權', '茶王親選', '獨家內容'],
        imperial_golden_seal_tea_officer: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章', '御前特權', '心腹特權', '茶王親選', '獨家內容', '金印特權', '尊貴服務'],
        national_master_tea_officer: ['基本功能', '解鎖部分內容', '更多內容', '專屬標籤', '專屬徽章', '御前特權', '心腹特權', '茶王親選', '獨家內容', '金印特權', '尊貴服務', '國師級特權', '至尊服務', '無限權限'],
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
        publicId: row.public_id || undefined,
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

    // 检查是否需要更新昵称，如果需要则检查修改限制
    if (userData.userName !== undefined) {
      // 先获取当前用户信息
      const currentUser = await userModel.findById(id);
      if (currentUser && currentUser.userName && currentUser.userName !== userData.userName) {
        // 昵称有变化，检查修改限制
        const changeCount = currentUser.nicknameChangeCount || 0;
        
        // 檢查是否有活躍的VIP訂閱
        const { subscriptionModel } = await import('./Subscription.js');
        const activeSubscription = await subscriptionModel.getActiveByUserId(id);
        const isVip = activeSubscription !== null && 
          activeSubscription.isActive && 
          (!activeSubscription.expiresAt || new Date(activeSubscription.expiresAt) > new Date());
        
        if (currentUser.nicknameChangedAt) {
          const lastChangeDate = new Date(currentUser.nicknameChangedAt);
          const now = new Date();
          
          // VIP用戶：每7天可以修改一次
          if (isVip) {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (lastChangeDate > sevenDaysAgo) {
              const daysLeft = Math.ceil((lastChangeDate.getTime() + 7 * 24 * 60 * 60 * 1000 - now.getTime()) / (24 * 60 * 60 * 1000));
              throw new Error(`VIP會員每7天可以修改一次暱稱，距離上次修改還需等待 ${daysLeft} 天`);
            }
          } else {
            // 非VIP用戶：根據修改次數決定冷卻時間
            let cooldownDays = 0;
            if (changeCount === 0) {
              // 第一次修改：7天後才能改
              cooldownDays = 7;
            } else if (changeCount === 1) {
              // 第二次修改：30天後才能改
              cooldownDays = 30;
            } else {
              // 第三次以後：每30天後才能改
              cooldownDays = 30;
            }
            
            const cooldownDate = new Date(lastChangeDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
            if (now < cooldownDate) {
              const daysLeft = Math.ceil((cooldownDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
              throw new Error(`暱稱修改冷卻時間未到，還需等待 ${daysLeft} 天`);
            }
          }
        }
        
        // 更新昵称修改时间和次數
        fields.push(`nickname_changed_at = CURRENT_TIMESTAMP`);
        // VIP用戶不增加修改次數，非VIP用戶增加修改次數
        if (!isVip) {
          fields.push(`nickname_change_count = COALESCE(nickname_change_count, 0) + 1`);
        }
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
      publicId: row.public_id || undefined,
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

  // 增加佳麗檢舉次數（根據檢舉類型）
  incrementProviderReportCount: async (userId: string, reportType: 'scam' | 'not_real_person' | 'fake_profile' | 'other'): Promise<{ totalCount: number; scamCount: number; notRealPersonCount: number; fakeProfileCount: number }> => {
    const user = await userModel.findById(userId);
    if (!user) throw new Error('用戶不存在');
    
    const currentTotal = user.providerReportCount || 0;
    const currentScam = user.providerScamReportCount || 0;
    const currentNotRealPerson = user.providerNotRealPersonCount || 0;
    const currentFakeProfile = user.providerFakeProfileCount || 0;
    
    const newTotal = currentTotal + 1;
    const newScam = reportType === 'scam' ? currentScam + 1 : currentScam;
    const newNotRealPerson = reportType === 'not_real_person' ? currentNotRealPerson + 1 : currentNotRealPerson;
    const newFakeProfile = reportType === 'fake_profile' ? currentFakeProfile + 1 : currentFakeProfile;
    
    // 更新次數
    await query(`
      UPDATE users
      SET provider_report_count = $1,
          provider_scam_report_count = $2,
          provider_not_real_person_count = $3,
          provider_fake_profile_count = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [newTotal, newScam, newNotRealPerson, newFakeProfile, userId]);
    
    return {
      totalCount: newTotal,
      scamCount: newScam,
      notRealPersonCount: newNotRealPerson,
      fakeProfileCount: newFakeProfile,
    };
  },

  // 更新佳麗違規級別和標記
  updateProviderViolationLevel: async (userId: string, level: number, warningBadge?: boolean): Promise<void> => {
    const updates: string[] = ['provider_violation_level = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [level];
    
    if (warningBadge !== undefined) {
      updates.push(`provider_warning_badge = $${params.length + 1}`);
      params.push(warningBadge);
    }
    
    params.push(userId);
    
    await query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
    `, params);
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

  // 綁定 Telegram 帳號
  linkTelegram: async (userId: string, telegramUserId: string, telegramUsername?: string): Promise<void> => {
    await query(`
      UPDATE users 
      SET telegram_user_id = $1, telegram_username = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [telegramUserId, telegramUsername || null, userId]);
  },

  // 根據 Telegram ID 查找用戶
  findByTelegramId: async (telegramUserId: string): Promise<User | null> => {
    const result = await query('SELECT * FROM users WHERE telegram_user_id = $1', [telegramUserId]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return userModel.findById(row.id);
  },
};

