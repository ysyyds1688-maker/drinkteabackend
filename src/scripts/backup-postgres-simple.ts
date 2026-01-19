#!/usr/bin/env tsx
/**
 * 简单的 PostgreSQL 备份脚本（使用 Node.js，不需要 psql）
 * 
 * 使用方法:
 * DATABASE_URL="postgresql://..." tsx src/scripts/backup-postgres-simple.ts
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
  process.exit(1);
}

async function backupPostgres() {
  let pool: Pool | null = null;

  try {
    console.log('📥 开始备份 PostgreSQL 数据库...');
    console.log('连接:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

    pool = new Pool({ connectionString: DATABASE_URL });

    // 测试连接
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功');

    // 创建备份目录
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const sqlFile = path.join(backupDir, `postgres-backup-${timestamp}.sql`);
    const metadataFile = path.join(backupDir, `postgres-metadata-${timestamp}.json`);

    console.log('\n📊 正在收集数据库信息...');

    // 获取所有表
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`找到 ${tables.length} 个表`);

    // 获取表结构
    const schema: Record<string, any> = {};
    for (const table of tables) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      schema[table] = columnsResult.rows;
    }

    // 保存元数据
    fs.writeFileSync(metadataFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      tables: tables,
      schema: schema,
      tableCount: tables.length
    }, null, 2));

    console.log('✅ 元数据已保存');

    // 开始导出数据
    console.log('\n📤 正在导出数据...');
    const sqlStatements: string[] = [];

    // 添加注释
    sqlStatements.push(`-- PostgreSQL 备份`);
    sqlStatements.push(`-- 备份时间: ${new Date().toISOString()}`);
    sqlStatements.push(`-- 数据库: ${DATABASE_URL.split('@')[1]?.split('/')[1] || 'unknown'}`);
    sqlStatements.push('');

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      console.log(`  [${i + 1}/${tables.length}] 导出表: ${table}`);

      try {
        // 获取表数据
        const dataResult = await pool.query(`SELECT * FROM "${table}"`);

        if (dataResult.rows.length > 0) {
          sqlStatements.push(`\n-- 表: ${table} (${dataResult.rows.length} 行)`);
          sqlStatements.push(`TRUNCATE TABLE "${table}" CASCADE;`);

          // 为每行生成 INSERT 语句
          for (const row of dataResult.rows) {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (typeof value === 'object') {
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              }
              return String(value);
            });

            sqlStatements.push(
              `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`
            );
          }
        } else {
          sqlStatements.push(`\n-- 表: ${table} (空表)`);
        }
      } catch (error: any) {
        console.warn(`  ⚠️  导出表 ${table} 时出错: ${error.message}`);
        sqlStatements.push(`\n-- 表: ${table} (导出失败: ${error.message})`);
      }
    }

    // 写入 SQL 文件
    fs.writeFileSync(sqlFile, sqlStatements.join('\n'));
    const stats = fs.statSync(sqlFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n✅ 备份完成!');
    console.log(`📁 SQL 文件: ${sqlFile}`);
    console.log(`📁 元数据文件: ${metadataFile}`);
    console.log(`📊 SQL 文件大小: ${fileSizeMB} MB`);
    console.log(`📊 表数量: ${tables.length}`);

    // 统计总行数
    let totalRows = 0;
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
        totalRows += parseInt(countResult.rows[0].count);
      } catch (e) {
        // 忽略错误
      }
    }
    console.log(`📊 总数据行数: ${totalRows.toLocaleString()}`);

    console.log('\n💡 提示: 请妥善保管这些备份文件！');

  } catch (error: any) {
    console.error('❌ 备份失败:', error.message);
    if (error.message.includes('connect')) {
      console.error('\n💡 提示: 请检查数据库连接信息是否正确');
      console.error('   确保网络可以访问数据库服务器');
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

backupPostgres();
