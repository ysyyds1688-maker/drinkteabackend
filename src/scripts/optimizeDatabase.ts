// 數據庫查詢優化腳本
// 檢查並添加缺失的索引，優化慢查詢

import { query } from '../db/database.js';
import { logger } from '../middleware/logger.js';

interface IndexInfo {
  tableName: string;
  indexName: string;
  columns: string[];
  unique?: boolean;
  description: string;
}

// 需要創建的索引列表
const recommendedIndexes: IndexInfo[] = [
  // Forum 優化索引
  {
    tableName: 'forum_posts',
    indexName: 'idx_forum_posts_pinned_created',
    columns: ['is_pinned', 'created_at DESC'],
    description: '優化置頂和最新排序查詢',
  },
  {
    tableName: 'forum_posts',
    indexName: 'idx_forum_posts_category_pinned',
    columns: ['category', 'is_pinned', 'created_at DESC'],
    description: '優化分類查詢和排序',
  },
  {
    tableName: 'forum_posts',
    indexName: 'idx_forum_posts_hot_score',
    columns: ['likes_count DESC', 'replies_count DESC', 'created_at DESC'],
    description: '優化熱門排序查詢',
  },
  
  // Reviews 優化索引
  {
    tableName: 'reviews',
    indexName: 'idx_reviews_profile_visible_created',
    columns: ['profile_id', 'is_visible', 'created_at DESC'],
    description: '優化 Profile 評論查詢',
  },
  {
    tableName: 'review_likes',
    indexName: 'idx_review_likes_review_user',
    columns: ['review_id', 'user_id'],
    unique: true,
    description: '優化評論點讚查詢（防止重複點讚）',
  },
  
  // Bookings 優化索引
  {
    tableName: 'bookings',
    indexName: 'idx_bookings_status_date',
    columns: ['status', 'booking_date'],
    description: '優化預約狀態和日期查詢',
  },
  {
    tableName: 'bookings',
    indexName: 'idx_bookings_client_status',
    columns: ['client_id', 'status', 'booking_date DESC'],
    description: '優化客戶預約查詢',
  },
  
  // Notifications 優化索引
  {
    tableName: 'notifications',
    indexName: 'idx_notifications_user_read_created',
    columns: ['user_id', 'is_read', 'created_at DESC'],
    description: '優化通知查詢（未讀優先）',
  },
  
  // Messages 優化索引
  {
    tableName: 'messages',
    indexName: 'idx_messages_thread_created',
    columns: ['thread_id', 'created_at DESC'],
    description: '優化訊息線程查詢',
  },
  
  // User Stats 優化索引
  {
    tableName: 'user_stats',
    indexName: 'idx_user_stats_user_id',
    columns: ['user_id'],
    unique: true,
    description: '優化用戶統計查詢',
  },
];

// 檢查索引是否存在
const checkIndexExists = async (indexName: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = $1
      )`,
      [indexName]
    );
    return result.rows[0].exists;
  } catch (error) {
    logger.error('檢查索引失敗', error);
    return false;
  }
};

// 創建索引
const createIndex = async (index: IndexInfo): Promise<boolean> => {
  try {
    const uniqueClause = index.unique ? 'UNIQUE' : '';
    const columnsStr = index.columns.join(', ');
    const sql = `
      CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.indexName}
      ON ${index.tableName}(${columnsStr})
    `;
    
    await query(sql);
    logger.info(`✅ 創建索引: ${index.indexName} - ${index.description}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ 創建索引失敗: ${index.indexName}`, error);
    return false;
  }
};

// 分析表統計信息（幫助查詢優化器）
const analyzeTable = async (tableName: string): Promise<void> => {
  try {
    await query(`ANALYZE ${tableName}`);
    logger.info(`✅ 分析表: ${tableName}`);
  } catch (error: any) {
    logger.warn(`⚠️  分析表失敗: ${tableName}`, error);
  }
};

// 檢查慢查詢（需要啟用 pg_stat_statements 擴展）
const checkSlowQueries = async (): Promise<void> => {
  try {
    // 檢查是否啟用了 pg_stat_statements
    const extensionCheck = await query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      )
    `);
    
    if (!extensionCheck.rows[0].exists) {
      logger.warn('⚠️  pg_stat_statements 擴展未啟用，無法分析慢查詢');
      logger.info('💡 要啟用慢查詢分析，請在數據庫中運行: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
      return;
    }
    
    // 獲取最慢的查詢（前 10 個）
    const slowQueries = await query(`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);
    
    if (slowQueries.rows.length > 0) {
      logger.info('📊 最慢的查詢（前 10 個）:');
      slowQueries.rows.forEach((row, index) => {
        logger.info(`${index + 1}. 平均執行時間: ${parseFloat(row.mean_exec_time).toFixed(2)}ms, 調用次數: ${row.calls}`);
        logger.info(`   查詢: ${row.query.substring(0, 200)}...`);
      });
    }
  } catch (error: any) {
    logger.warn('⚠️  檢查慢查詢失敗（可能需要啟用 pg_stat_statements）', error);
  }
};

// 主函數
const optimizeDatabase = async (): Promise<void> => {
  logger.info('🚀 開始數據庫優化...');
  
  // 1. 創建推薦的索引
  logger.info('📝 檢查並創建推薦的索引...');
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const index of recommendedIndexes) {
    const exists = await checkIndexExists(index.indexName);
    if (exists) {
      logger.info(`⏭️  索引已存在: ${index.indexName}`);
      skippedCount++;
    } else {
      const created = await createIndex(index);
      if (created) {
        createdCount++;
      }
    }
  }
  
  logger.info(`✅ 索引創建完成: 新建 ${createdCount} 個，跳過 ${skippedCount} 個`);
  
  // 2. 分析主要表
  logger.info('📊 分析表統計信息...');
  const tablesToAnalyze = [
    'profiles',
    'articles',
    'users',
    'reviews',
    'bookings',
    'forum_posts',
    'forum_replies',
    'notifications',
    'messages',
  ];
  
  for (const table of tablesToAnalyze) {
    await analyzeTable(table);
  }
  
  // 3. 檢查慢查詢
  logger.info('🔍 檢查慢查詢...');
  await checkSlowQueries();
  
  logger.info('✅ 數據庫優化完成！');
};

// 如果直接運行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeDatabase()
    .then(() => {
      logger.info('✅ 優化腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ 優化腳本執行失敗', error);
      process.exit(1);
    });
}

export { optimizeDatabase, recommendedIndexes };

