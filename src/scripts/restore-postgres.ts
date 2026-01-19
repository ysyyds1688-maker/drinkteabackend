#!/usr/bin/env tsx
/**
 * PostgreSQL 数据库恢复脚本
 * 
 * 使用方法:
 * NEW_DATABASE_URL="postgresql://..." BACKUP_FILE="backups/postgres-backup-xxx.dump" tsx src/scripts/restore-postgres.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;
const BACKUP_FILE = process.env.BACKUP_FILE;

if (!NEW_DATABASE_URL) {
  console.error('❌ 错误: 请设置 NEW_DATABASE_URL 环境变量');
  process.exit(1);
}

if (!BACKUP_FILE) {
  console.error('❌ 错误: 请设置 BACKUP_FILE 环境变量');
  console.log('使用方法:');
  console.log('  NEW_DATABASE_URL="postgresql://..." BACKUP_FILE="backups/postgres-backup-xxx.dump" tsx src/scripts/restore-postgres.ts');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌ 错误: 备份文件不存在: ${BACKUP_FILE}`);
  process.exit(1);
}

async function restorePostgres() {
  try {
    console.log('📤 开始恢复 PostgreSQL 数据库...');
    console.log('目标数据库:', NEW_DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // 隐藏密码
    console.log('备份文件:', BACKUP_FILE);

    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 备份文件大小: ${fileSizeMB} MB`);

    // 检查文件格式
    const isDumpFormat = BACKUP_FILE.endsWith('.dump');
    const isSqlFormat = BACKUP_FILE.endsWith('.sql');

    if (!isDumpFormat && !isSqlFormat) {
      console.error('❌ 错误: 不支持的备份文件格式（需要 .dump 或 .sql）');
      process.exit(1);
    }

    if (isDumpFormat) {
      // 使用 pg_restore 恢复自定义格式
      console.log('正在恢复数据库（自定义格式）...');
      await execAsync(
        `pg_restore -d "${NEW_DATABASE_URL}" --clean --if-exists --verbose "${BACKUP_FILE}"`
      );
    } else {
      // 使用 psql 恢复 SQL 格式
      console.log('正在恢复数据库（SQL 格式）...');
      await execAsync(`psql "${NEW_DATABASE_URL}" < "${BACKUP_FILE}"`);
    }

    console.log('✅ 恢复完成!');

    // 验证恢复结果
    console.log('\n🔍 验证数据...');
    const { stdout } = await execAsync(
      `psql "${NEW_DATABASE_URL}" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"`
    );
    console.log(stdout);

    console.log('\n✅ 数据库恢复成功！');
    console.log('💡 提示: 请运行验证脚本确认数据完整性');

  } catch (error: any) {
    console.error('❌ 恢复失败:', error.message);
    if (error.message.includes('pg_restore') || error.message.includes('psql')) {
      console.error('\n💡 提示: 请确保已安装 PostgreSQL 客户端工具');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
    }
    process.exit(1);
  }
}

restorePostgres();
