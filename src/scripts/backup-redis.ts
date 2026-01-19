#!/usr/bin/env tsx
/**
 * Redis 数据备份脚本
 * 
 * 使用方法:
 * OLD_REDIS_URL="redis://..." tsx src/scripts/backup-redis.ts
 */

import { createClient } from 'redis';
import fs from 'fs';
import path from 'path';

const OLD_REDIS_URL = process.env.OLD_REDIS_URL || 
  (process.env.REDIS_HOST 
    ? `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
    : process.env.REDIS_URL);

if (!OLD_REDIS_URL && !process.env.REDIS_HOST) {
  console.error('❌ 错误: 请设置 OLD_REDIS_URL 或 REDIS_HOST 环境变量');
  console.log('使用方法:');
  console.log('  OLD_REDIS_URL="redis://password@host:port" tsx src/scripts/backup-redis.ts');
  process.exit(1);
}

async function backupRedis() {
  let client: ReturnType<typeof createClient> | null = null;

  try {
    console.log('📥 开始备份 Redis 数据...');
    console.log('连接:', OLD_REDIS_URL?.replace(/:[^:@]+@/, ':****@') || '使用环境变量');

    client = createClient({
      url: OLD_REDIS_URL || undefined,
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

    // 获取所有键
    console.log('正在扫描键...');
    const keys = await client.keys('*');
    console.log(`找到 ${keys.length} 个键`);

    if (keys.length === 0) {
      console.log('⚠️  没有数据需要备份');
      return;
    }

    // 创建备份目录
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `redis-backup-${timestamp}.json`);
    const backup: Record<string, any> = {};

    // 备份每个键
    console.log('正在备份数据...');
    let processed = 0;
    for (const key of keys) {
      try {
        const type = await client.type(key);
        let value: any;
        let ttl = -1;

        switch (type) {
          case 'string':
            value = await client.get(key);
            ttl = await client.ttl(key);
            break;
          case 'hash':
            value = await client.hGetAll(key);
            ttl = await client.ttl(key);
            break;
          case 'list':
            value = await client.lRange(key, 0, -1);
            ttl = await client.ttl(key);
            break;
          case 'set':
            value = await client.sMembers(key);
            ttl = await client.ttl(key);
            break;
          case 'zset':
            const zsetData = await client.zRangeWithScores(key, 0, -1);
            value = zsetData.map(item => ({ value: item.value, score: item.score }));
            ttl = await client.ttl(key);
            break;
          default:
            value = await client.get(key);
            ttl = await client.ttl(key);
        }

        backup[key] = {
          type,
          value,
          ttl: ttl > 0 ? ttl : null,
        };

        processed++;
        if (processed % 100 === 0) {
          console.log(`  已处理 ${processed}/${keys.length} 个键...`);
        }
      } catch (error: any) {
        console.warn(`⚠️  跳过键 ${key}: ${error.message}`);
      }
    }

    // 保存备份文件
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ 备份完成!');
    console.log(`📁 备份文件: ${backupFile}`);
    console.log(`📊 文件大小: ${fileSizeMB} MB`);
    console.log(`📊 键数量: ${Object.keys(backup).length}`);
    console.log('\n💡 提示: 请妥善保管这个备份文件！');

  } catch (error: any) {
    console.error('❌ 备份失败:', error.message);
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

backupRedis();
