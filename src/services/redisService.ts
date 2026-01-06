import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
import { join } from 'path';

// 確保環境變數已加載
if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

let redisClient: RedisClientType | null = null;
let isConnected = false;

// 初始化 Redis 客戶端
// 注意：Redis URL 後續再加入，目前先以內存緩存運行
export const initRedis = async (): Promise<RedisClientType | null> => {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    // 優先使用 REDIS_URL，否則使用個別配置
    const redisUrl = process.env.REDIS_URL || 
      (process.env.REDIS_HOST 
        ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
        : null);

    if (!redisUrl && !process.env.REDIS_HOST) {
      console.warn('⚠️  Redis 未配置，將使用內存緩存（目前設置，後續會加入 Redis URL）');
      return null;
    }

    redisClient = createClient({
      url: redisUrl || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis 連接失敗次數過多，停止重試');
            return new Error('Redis 連接失敗');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis 客戶端錯誤:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis 連接成功');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      console.warn('⚠️  Redis 連接斷開');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error: any) {
    console.warn('⚠️  Redis 連接失敗，將使用內存緩存:', error.message);
    redisClient = null;
    isConnected = false;
    return null;
  }
};

// 獲取 Redis 客戶端（如果已連接）
export const getRedisClient = (): RedisClientType | null => {
  return redisClient && isConnected ? redisClient : null;
};

// 緩存服務
export const cacheService = {
  // 設置緩存
  set: async (key: string, value: any, ttlSeconds?: number): Promise<boolean> => {
    const client = getRedisClient();
    if (!client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Redis SET 錯誤:', error);
      return false;
    }
  },

  // 獲取緩存
  get: async <T>(key: string): Promise<T | null> => {
    const client = getRedisClient();
    if (!client) {
      return null;
    }

    try {
      const value = await client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis GET 錯誤:', error);
      return null;
    }
  },

  // 刪除緩存
  delete: async (key: string): Promise<boolean> => {
    const client = getRedisClient();
    if (!client) {
      return false;
    }

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DELETE 錯誤:', error);
      return false;
    }
  },

  // 批量刪除（使用模式匹配）
  deletePattern: async (pattern: string): Promise<number> => {
    const client = getRedisClient();
    if (!client) {
      return 0;
    }

    try {
      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await client.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Redis DELETE PATTERN 錯誤:', error);
      return 0;
    }
  },

  // 檢查鍵是否存在
  exists: async (key: string): Promise<boolean> => {
    const client = getRedisClient();
    if (!client) {
      return false;
    }

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS 錯誤:', error);
      return false;
    }
  },

  // 設置過期時間
  expire: async (key: string, seconds: number): Promise<boolean> => {
    const client = getRedisClient();
    if (!client) {
      return false;
    }

    try {
      await client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE 錯誤:', error);
      return false;
    }
  },
};

// 關閉 Redis 連接
export const closeRedis = async (): Promise<void> => {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      console.log('✅ Redis 連接已關閉');
    } catch (error) {
      console.error('關閉 Redis 連接時出錯:', error);
    }
    redisClient = null;
    isConnected = false;
  }
};

