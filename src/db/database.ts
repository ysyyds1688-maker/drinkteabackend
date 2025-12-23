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
    // Profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nationality TEXT NOT NULL,
        age INTEGER NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        cup TEXT NOT NULL,
        location TEXT NOT NULL,
        district TEXT,
        type TEXT NOT NULL CHECK(type IN ('outcall', 'incall')),
        imageUrl TEXT NOT NULL,
        gallery TEXT, -- JSON array
        albums TEXT, -- JSON array
        price INTEGER NOT NULL,
        prices TEXT NOT NULL, -- JSON object
        tags TEXT, -- JSON array
        basicServices TEXT, -- JSON array
        addonServices TEXT, -- JSON array
        isNew INTEGER DEFAULT 0,
        isAvailable INTEGER DEFAULT 1,
        availableTimes TEXT, -- JSON object
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT NOT NULL,
        "imageUrl" VARCHAR(500) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        date VARCHAR(50) NOT NULL,
        views INTEGER DEFAULT 0,
        content TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
