import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { query } from '../db/database.js';
import { storeMetrics } from '../services/monitoringService.js';

// 性能指標收集
interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  dbQueries?: number;
  dbQueryTime?: number;
}

// 存儲性能指標（可用 Redis 或數據庫存儲）
const performanceMetrics: PerformanceMetrics[] = [];
const MAX_METRICS = 1000; // 最多保存 1000 條記錄

// 數據庫查詢計數器
let dbQueryCount = 0;
let dbQueryTime = 0;

// 重置查詢計數器
export const resetQueryCounters = () => {
  dbQueryCount = 0;
  dbQueryTime = 0;
};

// 記錄查詢時間
export const recordQueryTime = (time: number) => {
  dbQueryCount++;
  dbQueryTime += time;
};

// 性能監控中間件
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = performance.now();
  resetQueryCounters();

  // 監聽響應結束
  res.on('finish', () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    const metric: PerformanceMetrics = {
      endpoint: req.path,
      method: req.method,
      responseTime: Math.round(responseTime * 100) / 100, // 保留兩位小數
      statusCode: res.statusCode,
      timestamp: new Date(),
      dbQueries: dbQueryCount,
      dbQueryTime: Math.round(dbQueryTime * 100) / 100,
    };

    // 記錄指標
    performanceMetrics.push(metric);

    // 保持記錄數量在限制內
    if (performanceMetrics.length > MAX_METRICS) {
      performanceMetrics.shift();
    }

    // 異步存儲到 Redis（不阻塞請求）
    storeMetrics(metric).catch(err => {
      // 靜默失敗，不影響主流程
      if (process.env.NODE_ENV === 'development') {
        console.debug('存儲性能指標失敗:', err);
      }
    });

    // 如果響應時間過長或狀態碼是錯誤，記錄警告
    if (responseTime > 1000) {
      console.warn(`[性能警告] ${req.method} ${req.path} 響應時間: ${responseTime.toFixed(2)}ms (狀態碼: ${res.statusCode})`);
    }

    if (res.statusCode >= 400) {
      console.warn(`[錯誤] ${req.method} ${req.path} 狀態碼: ${res.statusCode} (響應時間: ${responseTime.toFixed(2)}ms)`);
    }

    // 慢查詢警告
    if (dbQueryTime > 500) {
      console.warn(`[數據庫警告] ${req.method} ${req.path} 數據庫查詢時間: ${dbQueryTime.toFixed(2)}ms (查詢次數: ${dbQueryCount})`);
    }
  });

  next();
};

// 獲取性能統計
export const getPerformanceStats = (): {
  averageResponseTime: number;
  slowEndpoints: Array<{ endpoint: string; method: string; avgTime: number; count: number }>;
  errorRate: number;
  totalRequests: number;
  dbStats: { avgQueryTime: number; avgQueryCount: number };
} => {
  if (performanceMetrics.length === 0) {
    return {
      averageResponseTime: 0,
      slowEndpoints: [],
      errorRate: 0,
      totalRequests: 0,
      dbStats: { avgQueryTime: 0, avgQueryCount: 0 },
    };
  }

  const totalResponseTime = performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0);
  const averageResponseTime = totalResponseTime / performanceMetrics.length;

  // 統計慢端點
  const endpointStats = new Map<string, { totalTime: number; count: number; method: string }>();
  performanceMetrics.forEach((metric) => {
    const key = `${metric.method} ${metric.endpoint}`;
    const existing = endpointStats.get(key);
    if (existing) {
      existing.totalTime += metric.responseTime;
      existing.count++;
    } else {
      endpointStats.set(key, {
        totalTime: metric.responseTime,
        count: 1,
        method: metric.method,
      });
    }
  });

  const slowEndpoints = Array.from(endpointStats.entries())
    .map(([key, stats]) => {
      const [method, endpoint] = key.split(' ', 2);
      return {
        endpoint,
        method,
        avgTime: stats.totalTime / stats.count,
        count: stats.count,
      };
    })
    .filter((e) => e.avgTime > 500) // 只顯示平均響應時間超過 500ms 的端點
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10); // 只返回前 10 個

  // 計算錯誤率
  const errorCount = performanceMetrics.filter((m) => m.statusCode >= 400).length;
  const errorRate = (errorCount / performanceMetrics.length) * 100;

  // 數據庫統計
  const metricsWithDb = performanceMetrics.filter((m) => m.dbQueries && m.dbQueries > 0);
  const avgQueryTime = metricsWithDb.length > 0
    ? metricsWithDb.reduce((sum, m) => sum + (m.dbQueryTime || 0), 0) / metricsWithDb.length
    : 0;
  const avgQueryCount = metricsWithDb.length > 0
    ? metricsWithDb.reduce((sum, m) => sum + (m.dbQueries || 0), 0) / metricsWithDb.length
    : 0;

  return {
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    slowEndpoints,
    errorRate: Math.round(errorRate * 100) / 100,
    totalRequests: performanceMetrics.length,
    dbStats: {
      avgQueryTime: Math.round(avgQueryTime * 100) / 100,
      avgQueryCount: Math.round(avgQueryCount * 100) / 100,
    },
  };
};

// 清空性能指標
export const clearPerformanceMetrics = (): void => {
  performanceMetrics.length = 0;
};


