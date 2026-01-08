// 性能監控和日誌收集服務
// 提供更全面的系統監控和日誌聚合功能

import { cacheService } from './redisService.js';
import { logger } from '../middleware/logger.js';
import os from 'os';

// 系統指標接口
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number; // CPU 使用率 (%)
    loadAverage: number[]; // 系統負載
  };
  memory: {
    total: number; // 總內存 (bytes)
    free: number; // 空閒內存 (bytes)
    used: number; // 已使用內存 (bytes)
    usage: number; // 內存使用率 (%)
  };
  process: {
    uptime: number; // 進程運行時間 (seconds)
    memoryUsage: NodeJS.MemoryUsage; // Node.js 內存使用
  };
}

// API 性能指標接口
export interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  dbQueries?: number;
  dbQueryTime?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

// 獲取系統指標
export const getSystemMetrics = (): SystemMetrics => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // 計算 CPU 使用率（簡化版本，實際應該計算一段時間內的變化）
  const cpuUsage = process.cpuUsage();
  const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / 1000000; // 轉換為秒

  return {
    timestamp: new Date(),
    cpu: {
      usage: cpuUsagePercent,
      loadAverage: os.loadavg(),
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usage: (usedMem / totalMem) * 100,
    },
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
  };
};

// 存儲性能指標到 Redis（如果可用）
export const storeMetrics = async (metrics: APIMetrics): Promise<void> => {
  try {
    // 存儲到 Redis（保留最近 1 小時的數據）
    const key = `metrics:api:${new Date().toISOString().split('T')[0]}`; // 按日期分組
    await cacheService.set(`${key}:${Date.now()}`, metrics, 3600); // 1小時過期

    // 同時更新統計數據
    const statsKey = `metrics:stats:${metrics.method}:${metrics.endpoint}`;
    const existingStats = await cacheService.get<{
      count: number;
      totalTime: number;
      errorCount: number;
    }>(statsKey) || { count: 0, totalTime: 0, errorCount: 0 };

    existingStats.count++;
    existingStats.totalTime += metrics.responseTime;
    if (metrics.statusCode >= 400) {
      existingStats.errorCount++;
    }

    await cacheService.set(statsKey, existingStats, 86400); // 24小時過期
  } catch (error) {
    // 如果 Redis 不可用，只記錄到日誌
    logger.debug('存儲性能指標失敗（Redis 不可用）', { error });
  }
};

// 獲取聚合的性能統計
export const getAggregatedMetrics = async (timeRange: '1h' | '24h' | '7d' = '24h'): Promise<{
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; method: string; count: number; avgTime: number }>;
  systemMetrics: SystemMetrics;
}> => {
  const systemMetrics = getSystemMetrics();
  
  try {
    // 從 Redis 獲取統計數據（簡化版本）
    // 實際應該聚合多個時間段的數據
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `metrics:stats:*`;
    
    // 這裡簡化處理，實際應該掃描所有相關的鍵
    return {
      totalRequests: 0, // 需要從實際數據計算
      averageResponseTime: 0,
      errorRate: 0,
      topEndpoints: [],
      systemMetrics,
    };
  } catch (error) {
    logger.error('獲取聚合指標失敗', error);
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topEndpoints: [],
      systemMetrics,
    };
  }
};

// 健康檢查指標
export const getHealthMetrics = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{ name: string; status: 'ok' | 'warning' | 'error'; message: string }>;
  metrics: SystemMetrics;
}> => {
  const metrics = getSystemMetrics();
  const checks: Array<{ name: string; status: 'ok' | 'warning' | 'error'; message: string }> = [];

  // 檢查內存使用
  if (metrics.memory.usage > 90) {
    checks.push({
      name: '內存使用',
      status: 'error',
      message: `內存使用率過高: ${metrics.memory.usage.toFixed(2)}%`,
    });
  } else if (metrics.memory.usage > 75) {
    checks.push({
      name: '內存使用',
      status: 'warning',
      message: `內存使用率較高: ${metrics.memory.usage.toFixed(2)}%`,
    });
  } else {
    checks.push({
      name: '內存使用',
      status: 'ok',
      message: `內存使用率正常: ${metrics.memory.usage.toFixed(2)}%`,
    });
  }

  // 檢查系統負載
  const loadAvg = metrics.cpu.loadAverage[0];
  const cpuCount = os.cpus().length;
  if (loadAvg > cpuCount * 2) {
    checks.push({
      name: '系統負載',
      status: 'error',
      message: `系統負載過高: ${loadAvg.toFixed(2)} (CPU核心數: ${cpuCount})`,
    });
  } else if (loadAvg > cpuCount) {
    checks.push({
      name: '系統負載',
      status: 'warning',
      message: `系統負載較高: ${loadAvg.toFixed(2)} (CPU核心數: ${cpuCount})`,
    });
  } else {
    checks.push({
      name: '系統負載',
      status: 'ok',
      message: `系統負載正常: ${loadAvg.toFixed(2)}`,
    });
  }

  // 檢查 Redis 連接
  const redisClient = await import('./redisService.js').then(m => m.getRedisClient());
  if (redisClient) {
    try {
      await redisClient.ping();
      checks.push({
        name: 'Redis 連接',
        status: 'ok',
        message: 'Redis 連接正常',
      });
    } catch (error) {
      checks.push({
        name: 'Redis 連接',
        status: 'error',
        message: 'Redis 連接失敗',
      });
    }
  } else {
    checks.push({
      name: 'Redis 連接',
      status: 'warning',
      message: 'Redis 未配置',
    });
  }

  // 檢查數據庫連接池
  try {
    // 通過簡單查詢來檢查數據庫連接
    const { query } = await import('../db/database.js');
    const startTime = Date.now();
    await query('SELECT 1'); // 簡單的連接測試
    const queryTime = Date.now() - startTime;
    
    if (queryTime > 1000) {
      checks.push({
        name: '數據庫連接池',
        status: 'warning',
        message: `數據庫查詢較慢: ${queryTime}ms`,
      });
    } else {
      checks.push({
        name: '數據庫連接池',
        status: 'ok',
        message: `數據庫連接正常 (查詢時間: ${queryTime}ms)`,
      });
    }
  } catch (error: any) {
    checks.push({
      name: '數據庫連接池',
      status: 'error',
      message: `數據庫連接失敗: ${error.message}`,
    });
  }

  // 確定整體狀態
  const hasError = checks.some(c => c.status === 'error');
  const hasWarning = checks.some(c => c.status === 'warning');
  const status = hasError ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

  return {
    status,
    checks,
    metrics,
  };
};

