import { Pool, QueryResult } from 'pg';

// 從環境變數獲取資料庫連接資訊
const getDatabaseConfig = () => {
  // 優先使用 DATABASE_URL（PostgreSQL 連接字串）
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
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
    };
  }

  // 如果都沒有設定，拋出錯誤
  throw new Error('Database configuration not found. Please set DATABASE_URL or PostgreSQL environment variables.');
}

// 創建 PostgreSQL 連接池
const pool = new Pool(getDatabaseConfig());

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
        membership_level VARCHAR(20) DEFAULT 'tea_guest' CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant')),
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
      // 添加新的 CHECK 約束支持 5 個等級
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_membership_level_check 
        CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant'))
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
        membership_level VARCHAR(20) NOT NULL CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant')),
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
        CHECK(membership_level IN ('tea_guest', 'tea_scholar', 'royal_tea_scholar', 'royal_tea_officer', 'tea_king_attendant'))
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
        profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        client_id VARCHAR(255) NOT NULL REFERENCES users(id),
        client_name VARCHAR(100),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        service_type VARCHAR(50),
        is_verified BOOLEAN DEFAULT FALSE,
        is_visible BOOLEAN DEFAULT TRUE,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      CREATE INDEX IF NOT EXISTS idx_profiles_available ON profiles("isAvailable")
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Forum posts table (論壇帖子表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        tags TEXT,
        views INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

// 導出查詢函數
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
};

// 導出連接池（用於需要直接訪問的情況）
export default pool;
