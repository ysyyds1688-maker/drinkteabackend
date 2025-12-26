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
        "isNew" INTEGER DEFAULT 0,
        "isAvailable" INTEGER DEFAULT 1,
        "availableTimes" TEXT, -- JSON object
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 如果表已存在，添加 userId 欄位（如果不存在）
    try {
      await pool.query(`
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS "userId" VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      // 如果欄位已存在，忽略錯誤
      if (!error.message.includes('already exists')) {
        console.warn('添加 userId 欄位時出現警告:', error.message);
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
        membership_level VARCHAR(20) DEFAULT 'free' CHECK(membership_level IN ('free', 'subscribed')),
        membership_expires_at TIMESTAMP,
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
