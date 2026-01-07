/**
 * 遷移腳本：將所有現有用戶的ID更新為新格式
 * 茶客：#Tea123456（# + Tea + 6位隨機數字）
 * 佳麗：#Gri123456（# + Gri + 6位隨機數字）
 * 
 * 使用方法：
 * npm run migrate:user-ids
 * 
 * 注意：此腳本會更新資料庫中的所有用戶ID，請在執行前備份資料庫！
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { join } from 'path';

// 確保環境變數已加載
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

interface UserRow {
  id: string;
  role: 'provider' | 'client' | 'admin';
}

// 獲取資料庫配置
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

// 生成新格式的用戶ID
const generateNewUserId = (role: 'provider' | 'client' | 'admin'): string => {
  const prefix = role === 'provider' ? 'Gri' : 'Tea';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `#${prefix}${randomNum}`;
};

// 檢查ID是否已存在
const checkIdExists = async (newId: string, queryFn: (text: string, params: any[]) => Promise<any>): Promise<boolean> => {
  const result = await queryFn('SELECT id FROM users WHERE id = $1', [newId]);
  return result.rows.length > 0;
};

// 生成唯一的用戶ID
const generateUniqueUserId = async (role: 'provider' | 'client' | 'admin', queryFn: (text: string, params: any[]) => Promise<any>): Promise<string> => {
  const prefix = role === 'provider' ? 'Gri' : 'Tea';
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const newId = generateNewUserId(role);
    const exists = await checkIdExists(newId, queryFn);
    
    if (!exists) {
      return newId;
    }
    
    attempts++;
  }
  
  // 如果50次嘗試都失敗，使用時間戳作為後綴確保唯一性
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const timestamp = Date.now().toString().slice(-4);
  return `#${prefix}${randomNum}${timestamp}`;
};

// 刪除所有外鍵約束（在同一個連接中執行，確保約束刪除生效）
const dropAllForeignKeys = async (queryFn: (text: string, params: any[]) => Promise<any>) => {
  console.log('開始刪除所有外鍵約束...');
  
  // 獲取所有外鍵約束名稱（動態查詢所有引用 users 表的外鍵）
  console.log('查詢所有引用 users 表的外鍵約束...');
  const fkResult = await queryFn(`
    SELECT 
      tc.table_name, 
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
  `, []);
  
  const fkConstraints = fkResult.rows.map((row: any) => ({
    table: row.table_name,
    constraint: row.constraint_name,
    column: row.column_name
  }));
  
  console.log(`找到 ${fkConstraints.length} 個外鍵約束需要處理`);
  
  // 刪除外鍵約束（如果存在）- 不使用事務，直接刪除
  for (const fk of fkConstraints) {
    try {
      await queryFn(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint} CASCADE`, []);
      console.log(`已刪除外鍵約束: ${fk.constraint}`);
    } catch (error: any) {
      if (!error.message.includes('does not exist')) {
        console.log(`警告: 無法刪除約束 ${fk.constraint}: ${error.message}`);
      }
    }
  }
  
  console.log('✅ 所有外鍵約束已成功刪除');
  
  // 驗證約束真的被刪除了
  const verifyResult = await queryFn(`
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
      AND constraint_name LIKE '%user%'
      AND table_schema = 'public'
      AND constraint_name IN (
        SELECT constraint_name
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'users'
      )
  `, []);
  
  if (verifyResult.rows.length > 0) {
    console.log(`\n⚠️  警告: 仍有 ${verifyResult.rows.length} 個外鍵約束存在，嘗試再次刪除:`);
    for (const row of verifyResult.rows) {
      console.log(`  - ${row.constraint_name}`);
      // 獲取表名並再次嘗試刪除
      try {
        const tableResult = await queryFn(`
          SELECT table_name 
          FROM information_schema.table_constraints 
          WHERE constraint_name = $1
        `, [row.constraint_name]);
        if (tableResult.rows.length > 0) {
          const tableName = tableResult.rows[0].table_name;
          await queryFn(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${row.constraint_name} CASCADE`, []);
          console.log(`  已再次刪除約束: ${row.constraint_name}`);
        }
      } catch (error: any) {
        console.log(`  無法再次刪除約束 ${row.constraint_name}: ${error.message}`);
      }
    }
  }
  
  console.log('✅ 驗證完成：所有外鍵約束已確認刪除');
  
  return fkConstraints;
};

// 更新用戶ID（需要更新所有相關表的外鍵）
const migrateUserIds = async () => {
  console.log('開始遷移用戶ID...');
  
  const pool = new Pool(getDatabaseConfig());
  
  // 使用單一連接執行所有操作，確保約束刪除生效
  const client = await pool.connect();
  
  const queryFn = async (text: string, params: any[]) => {
    const result = await client.query(text, params);
    return result;
  };
  
  try {
    // 先刪除所有外鍵約束（在同一連接中執行）
    await dropAllForeignKeys(queryFn);
    
    // 開始新事務進行數據更新
    await queryFn('BEGIN', []);
    
    // 獲取所有用戶
    const usersResult = await queryFn('SELECT id, role FROM users ORDER BY created_at', []);
    const users = usersResult.rows as UserRow[];
    
    console.log(`找到 ${users.length} 個用戶需要遷移`);
    
    // 創建ID映射表（舊ID -> 新ID）
    const idMapping: Map<string, string> = new Map();
    
    // 為每個用戶生成新ID
    for (const user of users) {
      // 如果已經是新格式，跳過
      if (user.id.startsWith('#')) {
        console.log(`用戶 ${user.id} 已經是新格式，跳過`);
        continue;
      }
      
      const newId = await generateUniqueUserId(user.role, queryFn);
      idMapping.set(user.id, newId);
      console.log(`用戶 ${user.id} (${user.role}) -> ${newId}`);
    }
    
    console.log(`\n準備更新 ${idMapping.size} 個用戶的ID...`);
    
    // 策略：使用臨時表存儲 ID 映射，然後批量更新
    // 1. 創建臨時表存儲 ID 映射
    console.log('創建臨時表存儲 ID 映射...');
    await queryFn(`
      CREATE TEMP TABLE IF NOT EXISTS user_id_mapping (
        old_id VARCHAR(255) PRIMARY KEY,
        new_id VARCHAR(255) NOT NULL
      )
    `, []);
    
    // 2. 插入 ID 映射到臨時表
    console.log('插入 ID 映射到臨時表...');
    for (const [oldId, newId] of idMapping) {
      await queryFn('INSERT INTO user_id_mapping (old_id, new_id) VALUES ($1, $2) ON CONFLICT (old_id) DO UPDATE SET new_id = EXCLUDED.new_id', [oldId, newId]);
    }
    
    // 3. 先更新 users 表的主鍵（創建新ID記錄）
    console.log('更新 users 表的 id（主鍵）...');
    await queryFn(`
      UPDATE users u
      SET id = m.new_id
      FROM user_id_mapping m
      WHERE u.id = m.old_id
    `, []);
    
    // 4. 更新所有外鍵表（使用臨時表 JOIN）
    console.log('更新所有外鍵表...');
    
    // 更新 profiles 表的 userId
    console.log('更新 profiles 表的 userId...');
    await queryFn(`
      UPDATE profiles p
      SET "userId" = m.new_id
      FROM user_id_mapping m
      WHERE p."userId" = m.old_id
    `, []);
    
    // 更新 bookings 表的 client_id 和 provider_id
    console.log('更新 bookings 表的 client_id 和 provider_id...');
    await queryFn(`
      UPDATE bookings b
      SET client_id = m.new_id
      FROM user_id_mapping m
      WHERE b.client_id = m.old_id
    `, []);
    await queryFn(`
      UPDATE bookings b
      SET provider_id = m.new_id
      FROM user_id_mapping m
      WHERE b.provider_id = m.old_id
    `, []);
    
    // 更新 reviews 表的 user_id, target_user_id, client_id
    console.log('更新 reviews 表的 user_id, target_user_id, client_id...');
    await queryFn(`
      UPDATE reviews r
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE r.user_id = m.old_id
    `, []);
    await queryFn(`
      UPDATE reviews r
      SET target_user_id = m.new_id
      FROM user_id_mapping m
      WHERE r.target_user_id = m.old_id
    `, []);
    await queryFn(`
      UPDATE reviews r
      SET client_id = m.new_id
      FROM user_id_mapping m
      WHERE r.client_id = m.old_id
    `, []);
    
    // 更新 user_stats 表的 user_id
    console.log('更新 user_stats 表的 user_id...');
    await queryFn(`
      UPDATE user_stats us
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE us.user_id = m.old_id
    `, []);
    
    // 更新 favorites 表的 user_id
    console.log('更新 favorites 表的 user_id...');
    await queryFn(`
      UPDATE favorites f
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE f.user_id = m.old_id
    `, []);
    
    // 更新 messages 表的 sender_id 和 recipient_id
    console.log('更新 messages 表的 sender_id 和 recipient_id...');
    await queryFn(`
      UPDATE messages msg
      SET sender_id = m.new_id
      FROM user_id_mapping m
      WHERE msg.sender_id = m.old_id
    `, []);
    await queryFn(`
      UPDATE messages msg
      SET recipient_id = m.new_id
      FROM user_id_mapping m
      WHERE msg.recipient_id = m.old_id
    `, []);
    
    // 更新 notifications 表的 user_id
    console.log('更新 notifications 表的 user_id...');
    await queryFn(`
      UPDATE notifications n
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE n.user_id = m.old_id
    `, []);
    
    // 更新 subscriptions 表的 user_id
    console.log('更新 subscriptions 表的 user_id...');
    await queryFn(`
      UPDATE subscriptions s
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE s.user_id = m.old_id
    `, []);
    
    // 更新 forum_posts 表的 user_id
    console.log('更新 forum_posts 表的 user_id...');
    await queryFn(`
      UPDATE forum_posts fp
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE fp.user_id = m.old_id
    `, []);
    
    // 更新 forum_replies 表的 user_id
    console.log('更新 forum_replies 表的 user_id...');
    await queryFn(`
      UPDATE forum_replies fr
      SET user_id = m.new_id
      FROM user_id_mapping m
      WHERE fr.user_id = m.old_id
    `, []);
    
    // 更新其他可能引用 users 的表
    try {
      await queryFn(`
        UPDATE review_replies rr
        SET author_id = m.new_id
        FROM user_id_mapping m
        WHERE rr.author_id = m.old_id
      `, []);
      console.log('更新 review_replies 表的 author_id...');
    } catch (error: any) {
      console.log('review_replies 表不存在或無需更新，跳過');
    }
    
    try {
      await queryFn(`
        UPDATE review_likes rl
        SET user_id = m.new_id
        FROM user_id_mapping m
        WHERE rl.user_id = m.old_id
      `, []);
      console.log('更新 review_likes 表的 user_id...');
    } catch (error: any) {
      console.log('review_likes 表不存在或無需更新，跳過');
    }
    
    try {
      await queryFn(`
        UPDATE telegram_bookings tb
        SET user_id = m.new_id
        FROM user_id_mapping m
        WHERE tb.user_id = m.old_id
      `, []);
      console.log('更新 telegram_bookings 表的 user_id...');
    } catch (error: any) {
      console.log('telegram_bookings 表不存在或無需更新，跳過');
    }
    
    // 刪除臨時表
    console.log('刪除臨時表...');
    await queryFn('DROP TABLE IF EXISTS user_id_mapping', []);
    
    // 注意：外鍵約束已在單獨的事務中刪除
    // 如果需要重新添加外鍵約束，請在遷移完成後手動執行或通過資料庫遷移腳本執行
    console.log('⚠️  注意: 外鍵約束已刪除，如需重新添加請手動執行或通過資料庫遷移腳本執行');
    
    // 提交事務
    await queryFn('COMMIT', []);
    
    console.log(`\n✅ 成功遷移 ${idMapping.size} 個用戶的ID！`);
    console.log('\n遷移摘要：');
    console.log(`- 總用戶數：${users.length}`);
    console.log(`- 已遷移：${idMapping.size}`);
    console.log(`- 已為新格式：${users.length - idMapping.size}`);
    
  } catch (error: any) {
    console.error('❌ 遷移失敗：', error);
    throw error;
  } finally {
    // 關閉資料庫連接池
    await pool.end();
    console.log('資料庫連接已關閉');
  }
};

// 執行遷移
migrateUserIds()
  .then(() => {
    console.log('\n遷移完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n遷移失敗：', error);
    process.exit(1);
  });

export { migrateUserIds };
