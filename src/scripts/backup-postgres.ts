#!/usr/bin/env tsx
/**
 * PostgreSQL 数据库备份脚本
 * 
 * 使用方法:
 * OLD_DATABASE_URL="postgresql://..." tsx src/scripts/backup-postgres.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL;

if (!OLD_DATABASE_URL) {
  console.error('❌ 错误: 请设置 OLD_DATABASE_URL 环境变量');
  console.log('使用方法:');
  console.log('  OLD_DATABASE_URL="postgresql://user:pass@host:port/db" tsx src/scripts/backup-postgres.ts');
  process.exit(1);
}

async function backupPostgres() {
  try {
    console.log('📥 开始备份 PostgreSQL 数据库...');
    console.log('连接:', OLD_DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // 隐藏密码

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, `postgres-backup-${timestamp}.dump`);

    // 创建备份目录
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 使用 pg_dump 备份（自定义格式）
    console.log('正在导出数据库...');
    await execAsync(`pg_dump "${OLD_DATABASE_URL}" -F c -f "${backupFile}"`);

    // 检查文件大小
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ 备份完成!');
    console.log(`📁 备份文件: ${backupFile}`);
    console.log(`📊 文件大小: ${fileSizeMB} MB`);

    // 同时创建一个 SQL 格式的备份（作为备用）
    const sqlBackupFile = path.join(backupDir, `postgres-backup-${timestamp}.sql`);
    console.log('正在创建 SQL 格式备份...');
    await execAsync(`pg_dump "${OLD_DATABASE_URL}" -F p -f "${sqlBackupFile}"`);
    
    const sqlStats = fs.statSync(sqlBackupFile);
    const sqlFileSizeMB = (sqlStats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ SQL 备份完成: ${sqlBackupFile} (${sqlFileSizeMB} MB)`);

    console.log('\n📋 备份信息:');
    console.log(`  - 自定义格式: ${backupFile}`);
    console.log(`  - SQL 格式: ${sqlBackupFile}`);
    console.log('\n💡 提示: 请妥善保管这些备份文件！');

  } catch (error: any) {
    console.error('❌ 备份失败:', error.message);
    if (error.message.includes('pg_dump')) {
      console.error('\n💡 提示: 请确保已安装 PostgreSQL 客户端工具');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
    }
    process.exit(1);
  }
}

backupPostgres();
