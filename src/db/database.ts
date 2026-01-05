import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import { join } from 'path';

// 確保環境變數已加載（在模塊加載時執行）
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

// 從環境變數獲取資料庫連接資訊
const getDatabaseConfig = () => {
  const baseConfig: any = {
    // 連接池配置 - 優化以支持高並發
    max: parseInt(process.env.DB_POOL_MAX || '100', 10), // 最大連接數：支持1000+並發用戶
    min: parseInt(process.env.DB_POOL_MIN || '10', 10), // 最小連接數：保持基本連接
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10), // 空閒連接超時：30秒
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000', 10), // 連接超時：10秒
    // 允許連接池在需要時創建新連接
    allowExitOnIdle: false,
  };

  // 優先使用 DATABASE_URL（PostgreSQL 連接字串）
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ...baseConfig,
    };
  }

  // 如果沒有 DATABASE_URL，嘗試使用個別環境變數
  if (process.env.PGHOST) {
    return {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
      ...baseConfig,
    };
  }

  // 如果都沒有設定，拋出錯誤
  throw new Error('Database configuration not found. Please set DATABASE_URL or PostgreSQL environment variables.');
}

// 創建 PostgreSQL 連接池
const pool = new Pool(getDatabaseConfig());

// 連接池監控（用於調試和優化）
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    console.log('📊 連接池狀態:', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  }, 30000); // 每30秒記錄一次
}

// 連接池錯誤處理
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 初始化資料庫 schema
export const initDatabase = async () => {
  try {
    // 先檢查並刪除舊表（如果結構不對）
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // 檢查欄位名稱
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name IN ('imageUrl', 'imageurl')
      `);
      
      // 如果欄位名稱是小寫（舊結構），刪除重建
      if (columnCheck.rows.length > 0 && columnCheck.rows[0].column_name === 'imageurl') {
        console.log('⚠️  發現舊表結構，正在重建...');
        await pool.query('DROP TABLE IF EXISTS profiles CASCADE');
        await pool.query('DROP TABLE IF EXISTS articles CASCADE');
      }
    }

    // Profiles table（使用 TEXT 以支援 base64 圖片等長字串）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        nationality VARCHAR(50) NOT NULL,
        age INTEGER NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        cup VARCHAR(10) NOT NULL,
        location VARCHAR(255) NOT NULL,
        district VARCHAR(255),
        type VARCHAR(20) NOT NULL CHECK(type IN ('outcall', 'incall')),
        "imageUrl" TEXT NOT NULL,
        gallery TEXT, -- JSON array
        albums TEXT, -- JSON array
        price INTEGER NOT NULL,
        prices TEXT NOT NULL, -- JSON object
        tags TEXT, -- JSON array
        "basicServices" TEXT, -- JSON array
        "addonServices" TEXT, -- JSON array
        "contactInfo" TEXT, -- JSON object {line, phone, email, telegram, socialAccounts, preferredMethod, contactInstructions}
        remarks TEXT, -- 備註
        videos TEXT, -- JSON array [{url, code, title}]
        "bookingProcess" TEXT, -- 預約流程說明
        "isNew" INTEGER DEFAULT 0,
        "isAvailable" INTEGER DEFAULT 1,
        "availableTimes" TEXT, -- JSON object
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 如果表已存在，添加新欄位（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 userId 欄位時出現警告:', error.message);
      }
    }
    
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS "contactInfo" TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 contactInfo 欄位時出現警告:', error.message);
      }
    }
    
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS remarks TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 remarks 欄位時出現警告:', error.message);
      }
    }
    
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS videos TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 videos 欄位時出現警告:', error.message);
      }
    }
    
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS "bookingProcess" TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 bookingProcess 欄位時出現警告:', error.message);
      }
    }
    
    // 添加 views 欄位（用於追蹤 profile 瀏覽次數）
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 views 欄位時出現警告:', error.message);
      }
    }
    
    // 創建表來追蹤佳麗連續天數獲得好評
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS provider_quality_streaks (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          last_good_review_date DATE NOT NULL,
          consecutive_days INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);
    } catch (error: any) {
      console.warn('創建 provider_quality_streaks 表時出現警告:', error.message);
    }

    // 創建索引以優化查詢
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles("userId")
    `);

    // Articles table（封面圖改用 TEXT，避免 URL 過長）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT NOT NULL,
        "imageUrl" TEXT NOT NULL,
        tag VARCHAR(100) NOT NULL,
        date VARCHAR(50) NOT NULL,
        views INTEGER DEFAULT 0,
        content TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 確保既有資料庫的欄位型別也放寬為 TEXT（如果之前是 VARCHAR(500)）
    await pool.query(`ALTER TABLE profiles ALTER COLUMN "imageUrl" TYPE TEXT`);
    await pool.query(`ALTER TABLE articles ALTER COLUMN "imageUrl" TYPE TEXT`);

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        phone_number VARCHAR(20) UNIQUE,
        password VARCHAR(255) NOT NULL,
        user_name VARCHAR(100),
        avatar_url TEXT,
        nickname_changed_at TIMESTAMP,
        role VARCHAR(20) DEFAULT 'client' CHECK(role IN ('provider', 'client', 'admin')),
        membership_level VARCHAR(50) DEFAULT 'tea_guest' CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant', 'imperial_chief_tea_officer', 'tea_king_confidant', 'tea_king_personal_selection', 'imperial_golden_seal_tea_officer', 'national_master_tea_officer', 'lady_trainee', 'lady_apprentice', 'lady_junior', 'lady_senior', 'lady_expert', 'lady_master', 'lady_elite', 'lady_premium', 'lady_royal', 'lady_empress')),
        membership_expires_at TIMESTAMP,
        verification_badges TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        CONSTRAINT check_email_or_phone CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
      )
    `);

    // 如果表已存在，添加新欄位（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS user_name VARCHAR(100)
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 user_name 欄位時出現警告:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS avatar_url TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 avatar_url 欄位時出現警告:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS nickname_changed_at TIMESTAMP
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 nickname_changed_at 欄位時出現警告:', error.message);
      }
    }

    // 擴展 membership_level 支持多級會員（如果表已存在）
    try {
      // 先移除舊的 CHECK 約束（如果存在）
      await pool.query(`
        ALTER TABLE users 
        DROP CONSTRAINT IF EXISTS users_membership_level_check
      `);
      // 添加新的 CHECK 約束支持 10 個等級
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_membership_level_check 
        CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant', 'imperial_chief_tea_officer', 'tea_king_confidant', 'tea_king_personal_selection', 'imperial_golden_seal_tea_officer', 'national_master_tea_officer'))
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.warn('更新 membership_level 約束時出現警告:', error.message);
      }
    }

    // 添加 verification_badges 欄位
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS verification_badges TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 verification_badges 欄位時出現警告:', error.message);
      }
    }

    // 添加預約取消次數和警告狀態欄位（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS booking_cancellation_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS booking_warning BOOLEAN DEFAULT FALSE
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS violation_level INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS warning_badge BOOLEAN DEFAULT FALSE
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS no_show_badge BOOLEAN DEFAULT FALSE
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加預約取消相關欄位時出現警告:', error.message);
      }
    }

    // 添加佳麗檢舉相關欄位（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_report_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_scam_report_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_not_real_person_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_fake_profile_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_violation_level INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_warning_badge BOOLEAN DEFAULT FALSE
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_frozen BOOLEAN DEFAULT FALSE
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_frozen_at TIMESTAMP
      `);
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider_auto_unfreeze_at TIMESTAMP
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加佳麗檢舉相關欄位時出現警告:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      // 如果 registered_at 為 NULL，使用 created_at 的值
      await pool.query(`
        UPDATE users 
        SET registered_at = created_at 
        WHERE registered_at IS NULL
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 registered_at 欄位時出現警告:', error.message);
      }
    }

    // 數據遷移：將現有的 'subscribed' 用戶遷移為 'bronze'
    try {
      await pool.query(`
        UPDATE users 
        SET membership_level = 'bronze' 
        WHERE membership_level = 'subscribed'
      `);
    } catch (error: any) {
      console.warn('遷移 subscribed 用戶時出現警告:', error.message);
    }

    // Subscriptions table (訂閱記錄表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        membership_level VARCHAR(20) NOT NULL CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant', 'imperial_chief_tea_officer', 'tea_king_confidant', 'tea_king_personal_selection', 'imperial_golden_seal_tea_officer', 'national_master_tea_officer')),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 更新 subscriptions 表的 membership_level 約束（如果表已存在）
    try {
      await pool.query(`
        ALTER TABLE subscriptions
        DROP CONSTRAINT IF EXISTS subscriptions_membership_level_check
      `);
      await pool.query(`
        ALTER TABLE subscriptions
        ADD CONSTRAINT subscriptions_membership_level_check
        CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant', 'imperial_chief_tea_officer', 'tea_king_confidant', 'tea_king_personal_selection', 'imperial_golden_seal_tea_officer', 'national_master_tea_officer'))
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.warn('更新 subscriptions membership_level 約束時出現警告:', error.message);
      }
    }

    // 創建 subscriptions 表的索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active, expires_at)
    `);

    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        profile_id VARCHAR(255) REFERENCES profiles(id) ON DELETE CASCADE,
        client_id VARCHAR(255) NOT NULL REFERENCES users(id),
        client_name VARCHAR(100),
        target_user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        review_type VARCHAR(20) DEFAULT 'profile' CHECK(review_type IN ('profile', 'client')),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        service_type VARCHAR(50),
        booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE SET NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        is_visible BOOLEAN DEFAULT TRUE,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK((review_type = 'profile' AND profile_id IS NOT NULL) OR (review_type = 'client' AND target_user_id IS NOT NULL))
      )
    `);

    // Review replies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_replies (
        id VARCHAR(255) PRIMARY KEY,
        review_id VARCHAR(255) NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        reply_type VARCHAR(20) NOT NULL CHECK(reply_type IN ('provider', 'admin')),
        author_id VARCHAR(255) REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Review likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_likes (
        id VARCHAR(255) PRIMARY KEY,
        review_id VARCHAR(255) NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(review_id, user_id)
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_available ON profiles("isAvailable");
      
      -- 優化排序查詢的索引
      CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles("updatedAt" DESC);
      
      -- 複合索引優化常用查詢
      CREATE INDEX IF NOT EXISTS idx_profiles_available_created ON profiles("isAvailable", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS idx_profiles_type_available ON profiles(type, "isAvailable", "createdAt" DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_profile ON reviews(profile_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews(client_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC)
    `);
    
    // 添加新字段以支持 provider 評論 client
    try {
      await pool.query(`
        ALTER TABLE reviews 
        ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE
      `);
      await pool.query(`
        ALTER TABLE reviews 
        ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'profile' CHECK(review_type IN ('profile', 'client'))
      `);
      await pool.query(`
        ALTER TABLE reviews 
        ADD COLUMN IF NOT EXISTS booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE SET NULL
      `);
      // 修改 profile_id 為可選（因為 provider 評論 client 時可能不需要 profile_id）
      await pool.query(`
        ALTER TABLE reviews 
        ALTER COLUMN profile_id DROP NOT NULL
      `).catch(() => {
        // 如果已經是可選的，忽略錯誤
      });
      // 添加索引
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reviews_target_user ON reviews(target_user_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id)
      `);
    } catch (error: any) {
      console.warn('添加評論新字段時出現警告:', error.message);
    }

    // Bookings table (预约表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) REFERENCES users(id),
        client_id VARCHAR(255) NOT NULL REFERENCES users(id),
        profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id),
        service_type VARCHAR(50),
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        location VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
        notes TEXT,
        client_reviewed BOOLEAN DEFAULT FALSE,
        provider_reviewed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 添加评论状态字段（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE bookings 
        ADD COLUMN IF NOT EXISTS client_reviewed BOOLEAN DEFAULT FALSE
      `);
      await pool.query(`
        ALTER TABLE bookings 
        ADD COLUMN IF NOT EXISTS provider_reviewed BOOLEAN DEFAULT FALSE
      `);
      await pool.query(`
        ALTER TABLE bookings 
        ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT FALSE
      `);
    } catch (error: any) {
      console.warn('添加评论状态字段时出现警告:', error.message);
    }

    // Create indexes for bookings
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_profile ON bookings(profile_id)
    `);

    // Booking Restrictions table (預約凍結權限表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booking_restrictions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        restriction_type VARCHAR(50) NOT NULL CHECK(restriction_type IN ('cancellation_limit', 'no_show', 'manual')),
        reason TEXT,
        cancellation_count INTEGER DEFAULT 0,
        no_show_count INTEGER DEFAULT 0,
        violation_level INTEGER DEFAULT 1 CHECK(violation_level IN (1, 2, 3, 4)),
        is_frozen BOOLEAN DEFAULT TRUE,
        frozen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        auto_unfreeze_at TIMESTAMP,
        unfrozen_at TIMESTAMP,
        unfrozen_by VARCHAR(255) REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 添加新欄位（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE booking_restrictions 
        ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE booking_restrictions 
        ADD COLUMN IF NOT EXISTS violation_level INTEGER DEFAULT 1
      `);
      await pool.query(`
        ALTER TABLE booking_restrictions 
        ADD COLUMN IF NOT EXISTS auto_unfreeze_at TIMESTAMP
      `);
    } catch (error: any) {
      console.warn('添加 booking_restrictions 欄位時出現警告:', error.message);
    }

    // Provider restrictions table (佳麗凍結表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_restrictions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        restriction_type VARCHAR(50) NOT NULL CHECK(restriction_type IN ('report_limit', 'severe_violation', 'manual')),
        reason TEXT,
        report_count INTEGER DEFAULT 0,
        scam_report_count INTEGER DEFAULT 0,
        not_real_person_count INTEGER DEFAULT 0,
        fake_profile_count INTEGER DEFAULT 0,
        violation_level INTEGER DEFAULT 1 CHECK(violation_level IN (1, 2, 3, 4)),
        is_frozen BOOLEAN DEFAULT TRUE,
        frozen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        auto_unfreeze_at TIMESTAMP,
        unfrozen_at TIMESTAMP,
        unfrozen_by VARCHAR(255) REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for booking_restrictions
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_restrictions_user ON booking_restrictions(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_restrictions_frozen ON booking_restrictions(is_frozen)
    `);
    
    // Create indexes for provider_restrictions
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_restrictions_user_id ON provider_restrictions(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_restrictions_frozen ON provider_restrictions(is_frozen, user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)
    `);

    // Favorites table (收藏表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, profile_id)
      )
    `);

    // Create indexes for favorites
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_favorites_profile ON favorites(profile_id)
    `);

    // Import history table (导入历史表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS import_history (
        id VARCHAR(255) PRIMARY KEY,
        source_type VARCHAR(50) NOT NULL,
        source_data TEXT,
        profiles_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        duplicate_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_by VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Webhooks table (Webhook 配置表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        secret VARCHAR(255),
        source_type VARCHAR(50) NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_triggered TIMESTAMP,
        trigger_count INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scheduled tasks table (定时任务表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        cron_expression VARCHAR(100) NOT NULL,
        config TEXT,
        is_active INTEGER DEFAULT 1,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        run_count INTEGER DEFAULT 0,
        error_message TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for new tables
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_import_history_source ON import_history(source_type)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_import_history_created ON import_history("createdAt" DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_active ON scheduled_tasks(is_active)
    `);

    // User stats table (用戶統計表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_points INTEGER DEFAULT 0,
        current_points INTEGER DEFAULT 0,
        experience_points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        posts_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        likes_received INTEGER DEFAULT 0,
        premium_tea_bookings_count INTEGER DEFAULT 0,
        lady_bookings_count INTEGER DEFAULT 0,
        repeat_lady_bookings_count INTEGER DEFAULT 0,
        consecutive_login_days INTEGER DEFAULT 0,
        last_login_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 添加新字段（如果表已存在）
    try {
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS premium_tea_bookings_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS lady_bookings_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS repeat_lady_bookings_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS consecutive_login_days INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS last_login_date DATE
      `);
      // 後宮佳麗專屬統計字段
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS completed_bookings_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS accepted_bookings_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS five_star_reviews_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS four_star_reviews_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS total_reviews_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS repeat_client_bookings_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS unique_returning_clients_count INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS cancellation_rate DECIMAL(5, 2) DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS average_response_time INTEGER DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE user_stats 
        ADD COLUMN IF NOT EXISTS consecutive_completed_bookings INTEGER DEFAULT 0
      `);
    } catch (error: any) {
      console.warn('添加 user_stats 新字段時出現警告:', error.message);
    }

    // Forum posts table (論壇帖子表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        tags TEXT,
        images TEXT, -- JSON array of image URLs
        views INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 添加新欄位到 forum_posts 表（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE forum_posts 
        ADD COLUMN IF NOT EXISTS related_profile_id VARCHAR(255) REFERENCES profiles(id) ON DELETE SET NULL
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 related_profile_id 欄位時出錯:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE forum_posts 
        ADD COLUMN IF NOT EXISTS related_review_id VARCHAR(255) REFERENCES reviews(id) ON DELETE SET NULL
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 related_review_id 欄位時出錯:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE forum_posts 
        ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 is_featured 欄位時出錯:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE forum_posts 
        ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 favorites_count 欄位時出錯:', error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE forum_posts 
        ADD COLUMN IF NOT EXISTS videos TEXT
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 videos 欄位時出錯:', error.message);
      }
    }

    // Forum replies table (論壇回覆表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id VARCHAR(255) PRIMARY KEY,
        post_id VARCHAR(255) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_reply_id VARCHAR(255) REFERENCES forum_replies(id),
        content TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Forum likes table (論壇點讚表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_likes (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) NOT NULL CHECK(target_type IN ('post', 'reply')),
        target_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, target_type, target_id)
      )
    `);

    // Forum favorites table (論壇收藏表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_favorites (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id VARCHAR(255) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);

    // Forum reports table (論壇舉報表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_reports (
        id VARCHAR(255) PRIMARY KEY,
        reporter_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id VARCHAR(255) REFERENCES forum_posts(id) ON DELETE CASCADE,
        reply_id VARCHAR(255) REFERENCES forum_replies(id) ON DELETE CASCADE,
        reason VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK((post_id IS NOT NULL AND reply_id IS NULL) OR (post_id IS NULL AND reply_id IS NOT NULL))
      )
    `);

    // Reports table (預約檢舉表 - 支持雙向檢舉：佳麗檢舉茶客，茶客檢舉佳麗)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(255) PRIMARY KEY,
        reporter_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reporter_role VARCHAR(20) CHECK(reporter_role IN ('client', 'provider')),
        target_role VARCHAR(20) CHECK(target_role IN ('client', 'provider')),
        booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE SET NULL,
        report_type VARCHAR(50) NOT NULL CHECK(report_type IN ('solicitation', 'scam', 'harassment', 'no_show', 'not_real_person', 'service_mismatch', 'fake_profile', 'other')),
        reason VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        attachments TEXT,
        dialogue_history TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'resolved', 'rejected')),
        admin_notes TEXT,
        resolved_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 添加新欄位（如果表已存在）
    try {
      await pool.query(`
        ALTER TABLE reports 
        ADD COLUMN IF NOT EXISTS reporter_role VARCHAR(20) CHECK(reporter_role IN ('client', 'provider'))
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 reporter_role 欄位時出現警告:', error.message);
      }
    }
    
    try {
      await pool.query(`
        ALTER TABLE reports 
        ADD COLUMN IF NOT EXISTS target_role VARCHAR(20) CHECK(target_role IN ('client', 'provider'))
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.warn('添加 target_role 欄位時出現警告:', error.message);
      }
    }
    
    // 更新 report_type 的 CHECK 約束以支持新的檢舉類型
    try {
      // 先刪除舊的約束（如果存在）
      await pool.query(`
        ALTER TABLE reports 
        DROP CONSTRAINT IF EXISTS reports_report_type_check
      `);
      // 添加新的約束
      await pool.query(`
        ALTER TABLE reports 
        ADD CONSTRAINT reports_report_type_check 
        CHECK(report_type IN ('solicitation', 'scam', 'harassment', 'no_show', 'not_real_person', 'service_mismatch', 'fake_profile', 'other'))
      `);
    } catch (error: any) {
      if (!error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.warn('更新 report_type 約束時出現警告:', error.message);
      }
    }

    // Create indexes for reports
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_booking ON reports(booking_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC)
    `);

    // Daily tasks table (每日任務表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_type VARCHAR(50) NOT NULL,
        task_date DATE NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        progress INTEGER DEFAULT 0,
        target INTEGER NOT NULL,
        points_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_type, task_date)
      )
    `);

    // Achievements table (成就表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_type VARCHAR(50) NOT NULL,
        achievement_name VARCHAR(255) NOT NULL,
        points_earned INTEGER DEFAULT 0,
        experience_earned INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_type)
      )
    `);

    // Badges table (勳章表 - 用戶擁有的勳章)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id VARCHAR(255) NOT NULL,
        badge_name VARCHAR(255) NOT NULL,
        badge_icon VARCHAR(100),
        points_cost INTEGER NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_id)
      )
    `);

    // Notifications table (通知表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK(type IN ('achievement', 'task', 'system', 'message', 'booking', 'review')),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        link VARCHAR(500),
        metadata TEXT
      )
    `);

    // Create indexes for notifications
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
    `);

    // Create indexes for forum and gamification tables
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_likes_target ON forum_likes(target_type, target_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_profile ON forum_posts(related_profile_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_featured ON forum_posts(is_featured)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_favorites_user ON forum_favorites(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_favorites_post ON forum_favorites(post_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_reports_created ON forum_reports(created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, task_date)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id)
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// 導出查詢函數（優化以支持高並發）
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // 只在開發環境或查詢時間超過1秒時記錄（減少日誌開銷）
    if (process.env.NODE_ENV === 'development' || duration > 1000) {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error', { text: text.substring(0, 100), error });
    throw error;
  }
};

// 導出連接池（用於需要直接訪問的情況）
export default pool;
