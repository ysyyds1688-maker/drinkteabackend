/**
 * 遷移腳本：為所有用戶填入 public_id（對外顯示的用戶ID）
 * - 不再修改資料庫主鍵 `users.id`，僅新增並回填 `users.public_id`
 * - 茶客：#Tea123456（# + Tea + 6位隨機數字）
 * - 佳麗：#Gri123456（# + Gri + 6位隨機數字）
 *
 * 使用方法：
 *   npm run migrate:user-public-ids
 *
 * 此腳本是「安全版本」：
 * - 不會動到任何外鍵或主鍵
 * - 只是在 users 表多一個欄位，並為每個用戶填上對外顯示的 ID
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { join } from 'path';

// 確保環境變數已加載
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

type UserRole = 'provider' | 'client' | 'admin';

interface UserRow {
  id: string;
  role: UserRole;
  public_id: string | null;
}

// 獲取資料庫配置（與現有腳本保持一致）
const getDatabaseConfig = () => {
  const baseConfig: any = {
    max: parseInt(process.env.DB_POOL_MAX || '300', 10),
    min: parseInt(process.env.DB_POOL_MIN || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000', 10),
    allowExitOnIdle: false,
  };

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ...baseConfig,
    };
  }

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

  throw new Error('Database configuration not found. Please set DATABASE_URL or PostgreSQL environment variables.');
};

// 生成新格式的用戶 public_id
const generateNewPublicId = (role: UserRole): string => {
  const prefix = role === 'provider' ? 'Gri' : 'Tea';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `#${prefix}${randomNum}`;
};

// 檢查 public_id 是否已存在
const checkPublicIdExists = async (pool: Pool, publicId: string): Promise<boolean> => {
  const result = await pool.query('SELECT 1 FROM users WHERE public_id = $1 LIMIT 1', [publicId]);
  return result.rows.length > 0;
};

// 生成唯一的 public_id
const generateUniquePublicId = async (pool: Pool, role: UserRole): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const newId = generateNewPublicId(role);
    const exists = await checkPublicIdExists(pool, newId);

    if (!exists) {
      return newId;
    }

    attempts++;
  }

  // 如果 50 次嘗試都失敗，使用時間戳作為後綴確保唯一性
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const timestamp = Date.now().toString().slice(-4);
  const prefix = role === 'provider' ? 'Gri' : 'Tea';
  return `#${prefix}${randomNum}${timestamp}`;
};

const migrateUserPublicIds = async () => {
  console.log('開始為用戶填入 public_id（對外顯示用戶ID）...');

  const pool = new Pool(getDatabaseConfig());

  try {
    // 1. 確保 users 表已存在 public_id 欄位
    console.log('檢查並新增 users.public_id 欄位...');
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS public_id VARCHAR(255)
    `);

    // 2. 為 public_id 建立唯一索引（如果尚未存在）
    console.log('檢查並新增 users_public_id_key 唯一索引...');
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE schemaname = 'public' 
            AND indexname = 'users_public_id_key'
        ) THEN
          CREATE UNIQUE INDEX users_public_id_key ON users(public_id);
        END IF;
      END $$;
    `);

    // 3. 讀取所有用戶
    const result = await pool.query<UserRow>('SELECT id, role, public_id FROM users ORDER BY created_at');
    const users = result.rows;

    console.log(`找到 ${users.length} 個用戶，開始處理 public_id...`);

    let updatedCount = 0;
    let skippedAlreadyHasPublicId = 0;

    for (const user of users) {
      // 已經有合法的 public_id（以 # 開頭），就跳過
      if (user.public_id && user.public_id.startsWith('#')) {
        skippedAlreadyHasPublicId++;
        continue;
      }

      let newPublicId: string;

      // 如果主鍵 id 本身已經是 #Tea 或 #Gri 格式，直接複用作為 public_id
      if (user.id.startsWith('#') && /^#(Tea|Gri)\d+/.test(user.id)) {
        newPublicId = user.id;
      } else {
        // 舊格式（例如 user_xxx），為它產生一個新的 public_id
        newPublicId = await generateUniquePublicId(pool, user.role);
      }

      await pool.query(
        'UPDATE users SET public_id = $1 WHERE id = $2',
        [newPublicId, user.id]
      );

      updatedCount++;
      console.log(`用戶 ${user.id} (${user.role}) -> public_id: ${newPublicId}`);
    }

    console.log('\n✅ public_id 遷移完成！');
    console.log(`- 總用戶數：${users.length}`);
    console.log(`- 已更新 public_id：${updatedCount}`);
    console.log(`- 原本就有合法 public_id（跳過）：${skippedAlreadyHasPublicId}`);

  } catch (error: any) {
    console.error('❌ 遷移 public_id 失敗：', error);
    throw error;
  } finally {
    await pool.end();
    console.log('資料庫連接已關閉');
  }
};

migrateUserPublicIds()
  .then(() => {
    console.log('\n遷移完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n遷移失敗：', error);
    process.exit(1);
  });

export { migrateUserPublicIds };



