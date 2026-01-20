#!/usr/bin/env tsx
/**
 * Redis 数据恢复脚本
 * 
 * 使用方法:
 * NEW_REDIS_URL="redis://..." BACKUP_FILE="backups/redis-backup-xxx.json" tsx src/scripts/restore-redis.ts
 */

import { createClient } from 'redis';
import fs from 'fs';

const NEW_REDIS_URL = process.env.NEW_REDIS_URL || 
  (process.env.REDIS_HOST 
    ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
    : process.env.REDIS_URL);

const BACKUP_FILE = process.env.BACKUP_FILE;

if (!NEW_REDIS_URL && !process.env.REDIS_HOST) {
  console.error('❌ 错误: 请设置 NEW_REDIS_URL 或 REDIS_HOST 环境变量');
  process.exit(1);
}

if (!BACKUP_FILE) {
  console.error('❌ 错误: 请设置 BACKUP_FILE 环境变量');
  console.log('使用方法:');
  console.log('  NEW_REDIS_URL="redis://..." BACKUP_FILE="backups/redis-backup-xxx.json" tsx src/scripts/restore-redis.ts');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌ 错误: 备份文件不存在: ${BACKUP_FILE}`);
  process.exit(1);
}

// TypeScript 类型守卫：确保 BACKUP_FILE 不为 undefined
const backupFile: string = BACKUP_FILE;

async function restoreRedis() {
  let client: ReturnType<typeof createClient> | null = null;

  try {
    console.log('📤 开始恢复 Redis 数据...');
    console.log('目标 Redis:', NEW_REDIS_URL?.replace(/:[^:@]+@/, ':****@') || '使用环境变量');
    console.log('备份文件:', backupFile);

    // 读取备份文件
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    const backup: Record<string, { type: string; value: any; ttl: number | null }> = JSON.parse(backupContent);

    const keyCount = Object.keys(backup).length;
    console.log(`📊 备份包含 ${keyCount} 个键`);

    // 连接新 Redis
    client = createClient({
      url: NEW_REDIS_URL || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            return new Error('Redis 连接失败');
          }
          return Math.min(retries * 100, 1000);
        },
      },
    });

    await client.connect();
    console.log('✅ Redis 连接成功');

    // 恢复数据
    console.log('正在恢复数据...');
    let restored = 0;
    let failed = 0;

    for (const [key, { type, value, ttl }] of Object.entries(backup)) {
      try {
        switch (type) {
          case 'string':
            await client.set(key, value);
            break;
          case 'hash':
            if (Object.keys(value).length > 0) {
              await client.hSet(key, value);
            }
            break;
          case 'list':
            if (value.length > 0) {
              await client.lPush(key, value);
            }
            break;
          case 'set':
            if (value.length > 0) {
              await client.sAdd(key, value);
            }
            break;
          case 'zset':
            if (value.length > 0) {
              const zsetEntries = value.map((item: any) => ({
                value: item.value,
                score: item.score,
              }));
              await client.zAdd(key, zsetEntries);
            }
            break;
          default:
            await client.set(key, value);
        }

        // 恢复 TTL（如果有）
        if (ttl && ttl > 0) {
          await client.expire(key, ttl);
        }

        restored++;
        if (restored % 100 === 0) {
          console.log(`  已恢复 ${restored}/${keyCount} 个键...`);
        }
      } catch (error: any) {
        console.warn(`⚠️  恢复键 ${key} 失败: ${error.message}`);
        failed++;
      }
    }

    console.log('\n✅ 恢复完成!');
    console.log(`📊 成功恢复: ${restored} 个键`);
    if (failed > 0) {
      console.log(`⚠️  失败: ${failed} 个键`);
    }

    // 验证恢复结果
    const newKeyCount = await client.dbSize();
    console.log(`📊 新 Redis 中的键数量: ${newKeyCount}`);

  } catch (error: any) {
    console.error('❌ 恢复失败:', error.message);
    if (error.message.includes('connect')) {
      console.error('\n💡 提示: 请检查 Redis 连接信息是否正确');
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.quit();
    }
  }
}

restoreRedis();
