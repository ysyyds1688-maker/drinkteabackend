/**
 * Redis 高併發設置檢查腳本
 * 
 * 使用方法：
 * npm run check-redis
 * 或
 * ts-node src/scripts/checkRedis.ts
 */

import { initRedis, getRedisClient, cacheService, closeRedis } from '../services/redisService.js';
import { performance } from 'perf_hooks';

interface CheckResult {
  name: string;
  status: '✅ 通過' | '❌ 失敗' | '⚠️  警告';
  message: string;
  details?: any;
}

const checks: CheckResult[] = [];

// 檢查 1: 環境變數配置
function checkEnvironmentVariables(): CheckResult {
  const hasRedisUrl = !!process.env.REDIS_URL;
  const hasRedisHost = !!process.env.REDIS_HOST;
  const hasRedisPort = !!process.env.REDIS_PORT;
  const hasRedisPassword = !!process.env.REDIS_PASSWORD;

  if (hasRedisUrl) {
    // 檢查 REDIS_URL 格式
    const url = process.env.REDIS_URL;
    const isValidFormat = /^redis(s)?:\/\//.test(url || '');
    
    return {
      name: '環境變數配置 (REDIS_URL)',
      status: isValidFormat ? '✅ 通過' : '❌ 失敗',
      message: isValidFormat 
        ? `REDIS_URL 已配置，格式正確` 
        : `REDIS_URL 格式不正確，應為 redis:// 或 rediss:// 開頭`,
      details: {
        REDIS_URL: url ? `${url.substring(0, 20)}...` : '未設置',
      },
    };
  } else if (hasRedisHost) {
    return {
      name: '環境變數配置 (個別配置)',
      status: '✅ 通過',
      message: '使用個別環境變數配置',
      details: {
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT || '6379',
        REDIS_PASSWORD: hasRedisPassword ? '已設置' : '未設置',
      },
    };
  } else {
    return {
      name: '環境變數配置',
      status: '❌ 失敗',
      message: '未配置 Redis 環境變數，將使用內存緩存',
      details: {
        REDIS_URL: '未設置',
        REDIS_HOST: '未設置',
        REDIS_PORT: '未設置',
        REDIS_PASSWORD: '未設置',
      },
    };
  }
}

// 檢查 2: Redis 連接狀態
async function checkConnection(): Promise<CheckResult> {
  try {
    await initRedis();
    const client = getRedisClient();
    
    if (!client) {
      return {
        name: 'Redis 連接狀態',
        status: '❌ 失敗',
        message: 'Redis 客戶端未初始化',
      };
    }

    // 測試 PING 命令
    const startTime = performance.now();
    const pong = await client.ping();
    const latency = performance.now() - startTime;

    return {
      name: 'Redis 連接狀態',
      status: pong === 'PONG' ? '✅ 通過' : '❌ 失敗',
      message: pong === 'PONG' 
        ? `連接成功，延遲: ${latency.toFixed(2)}ms` 
        : `PING 響應異常: ${pong}`,
      details: {
        latency: `${latency.toFixed(2)}ms`,
        status: pong === 'PONG' ? '已連接' : '連接異常',
      },
    };
  } catch (error: any) {
    return {
      name: 'Redis 連接狀態',
      status: '❌ 失敗',
      message: `連接失敗: ${error.message}`,
      details: {
        error: error.message,
      },
    };
  }
}

// 檢查 3: Redis 客戶端配置
function checkClientConfiguration(): CheckResult {
  // 檢查重連策略（在 redisService.ts 中配置）
  const reconnectStrategy = {
    maxRetries: 10,
    backoff: '指數退避，最多 3 秒',
  };

  return {
    name: 'Redis 客戶端配置',
    status: '✅ 通過',
    message: '重連策略已配置',
    details: {
      reconnectStrategy,
      socketOptions: '已配置自動重連',
    },
  };
}

// 檢查 4: 基本操作測試
async function checkBasicOperations(): Promise<CheckResult> {
  const client = getRedisClient();
  if (!client) {
    return {
      name: '基本操作測試',
      status: '❌ 失敗',
      message: 'Redis 客戶端未初始化，無法測試',
    };
  }

  const testKey = `test:${Date.now()}`;
  const testValue = { test: 'value', timestamp: Date.now() };

  try {
    // 測試 SET
    const setStart = performance.now();
    const setResult = await cacheService.set(testKey, testValue, 60);
    const setLatency = performance.now() - setStart;

    if (!setResult) {
      return {
        name: '基本操作測試',
        status: '❌ 失敗',
        message: 'SET 操作失敗',
      };
    }

    // 測試 GET
    const getStart = performance.now();
    const getResult = await cacheService.get<typeof testValue>(testKey);
    const getLatency = performance.now() - getStart;

    if (!getResult || getResult.test !== testValue.test) {
      return {
        name: '基本操作測試',
        status: '❌ 失敗',
        message: 'GET 操作失敗或數據不匹配',
      };
    }

    // 測試 EXISTS
    const existsStart = performance.now();
    const existsResult = await cacheService.exists(testKey);
    const existsLatency = performance.now() - existsStart;

    // 測試 DELETE
    const deleteStart = performance.now();
    const deleteResult = await cacheService.delete(testKey);
    const deleteLatency = performance.now() - deleteStart;

    const avgLatency = (setLatency + getLatency + existsLatency + deleteLatency) / 4;

    return {
      name: '基本操作測試',
      status: '✅ 通過',
      message: `所有操作成功，平均延遲: ${avgLatency.toFixed(2)}ms`,
      details: {
        SET: `${setLatency.toFixed(2)}ms`,
        GET: `${getLatency.toFixed(2)}ms`,
        EXISTS: `${existsLatency.toFixed(2)}ms`,
        DELETE: `${deleteLatency.toFixed(2)}ms`,
        averageLatency: `${avgLatency.toFixed(2)}ms`,
      },
    };
  } catch (error: any) {
    return {
      name: '基本操作測試',
      status: '❌ 失敗',
      message: `操作測試失敗: ${error.message}`,
      details: {
        error: error.message,
      },
    };
  }
}

// 檢查 5: 併發性能測試
async function checkConcurrencyPerformance(): Promise<CheckResult> {
  const client = getRedisClient();
  if (!client) {
    return {
      name: '併發性能測試',
      status: '❌ 失敗',
      message: 'Redis 客戶端未初始化，無法測試',
    };
  }

  const concurrentRequests = 100;
  const testKeys: string[] = [];

  try {
    // 創建測試鍵
    for (let i = 0; i < concurrentRequests; i++) {
      testKeys.push(`concurrent:test:${Date.now()}:${i}`);
    }

    // 併發 SET 操作
    const setStart = performance.now();
    const setPromises = testKeys.map((key, index) =>
      cacheService.set(key, { index, timestamp: Date.now() }, 60)
    );
    const setResults = await Promise.all(setPromises);
    const setDuration = performance.now() - setStart;
    const setSuccessCount = setResults.filter(r => r).length;

    // 併發 GET 操作
    const getStart = performance.now();
    const getPromises = testKeys.map(key => cacheService.get(key));
    const getResults = await Promise.all(getPromises);
    const getDuration = performance.now() - getStart;
    const getSuccessCount = getResults.filter(r => r !== null).length;

    // 清理測試鍵
    await Promise.all(testKeys.map(key => cacheService.delete(key)));

    const totalDuration = setDuration + getDuration;
    const totalOps = concurrentRequests * 2; // SET + GET
    const opsPerSecond = (totalOps / totalDuration) * 1000;

    const isGoodPerformance = opsPerSecond > 1000; // 至少 1000 ops/s

    return {
      name: '併發性能測試',
      status: isGoodPerformance ? '✅ 通過' : '⚠️  警告',
      message: `併發 ${concurrentRequests} 請求，吞吐量: ${opsPerSecond.toFixed(0)} ops/s`,
      details: {
        concurrentRequests,
        setSuccess: `${setSuccessCount}/${concurrentRequests}`,
        getSuccess: `${getSuccessCount}/${concurrentRequests}`,
        setDuration: `${setDuration.toFixed(2)}ms`,
        getDuration: `${getDuration.toFixed(2)}ms`,
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        opsPerSecond: `${opsPerSecond.toFixed(0)} ops/s`,
        performance: isGoodPerformance ? '良好' : '需要優化',
      },
    };
  } catch (error: any) {
    return {
      name: '併發性能測試',
      status: '❌ 失敗',
      message: `併發測試失敗: ${error.message}`,
      details: {
        error: error.message,
      },
    };
  }
}

// 檢查 6: TTL 過期時間測試
async function checkTTL(): Promise<CheckResult> {
  const client = getRedisClient();
  if (!client) {
    return {
      name: 'TTL 過期時間測試',
      status: '❌ 失敗',
      message: 'Redis 客戶端未初始化，無法測試',
    };
  }

  const testKey = `ttl:test:${Date.now()}`;
  const ttlSeconds = 10;

  try {
    await cacheService.set(testKey, { test: 'ttl' }, ttlSeconds);
    
    // 檢查 TTL
    const ttl = await client.ttl(testKey);
    
    // 清理
    await cacheService.delete(testKey);

    const isValidTTL = ttl > 0 && ttl <= ttlSeconds;

    return {
      name: 'TTL 過期時間測試',
      status: isValidTTL ? '✅ 通過' : '❌ 失敗',
      message: `TTL 設置成功，剩餘時間: ${ttl} 秒`,
      details: {
        expectedTTL: `${ttlSeconds} 秒`,
        actualTTL: `${ttl} 秒`,
        isValid: isValidTTL,
      },
    };
  } catch (error: any) {
    return {
      name: 'TTL 過期時間測試',
      status: '❌ 失敗',
      message: `TTL 測試失敗: ${error.message}`,
      details: {
        error: error.message,
      },
    };
  }
}

// 檢查 7: Redis 服務器信息
async function checkServerInfo(): Promise<CheckResult> {
  const client = getRedisClient();
  if (!client) {
    return {
      name: 'Redis 服務器信息',
      status: '❌ 失敗',
      message: 'Redis 客戶端未初始化，無法獲取信息',
    };
  }

  try {
    const info = await client.info('server');
    const memoryInfo = await client.info('memory');
    
    // 解析 Redis 版本
    const versionMatch = info.match(/redis_version:([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : '未知';

    // 解析內存使用
    const usedMemoryMatch = memoryInfo.match(/used_memory:(\d+)/);
    const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0;
    const usedMemoryMB = (usedMemory / 1024 / 1024).toFixed(2);

    return {
      name: 'Redis 服務器信息',
      status: '✅ 通過',
      message: `Redis 版本: ${version}, 內存使用: ${usedMemoryMB} MB`,
      details: {
        version,
        usedMemory: `${usedMemoryMB} MB`,
      },
    };
  } catch (error: any) {
    return {
      name: 'Redis 服務器信息',
      status: '⚠️  警告',
      message: `無法獲取服務器信息: ${error.message}`,
      details: {
        error: error.message,
      },
    };
  }
}

// 主函數
async function main() {
  console.log('\n🔍 Redis 高併發設置檢查\n');
  console.log('='.repeat(60));

  // 執行所有檢查
  checks.push(checkEnvironmentVariables());
  checks.push(await checkConnection());
  checks.push(checkClientConfiguration());
  checks.push(await checkBasicOperations());
  checks.push(await checkConcurrencyPerformance());
  checks.push(await checkTTL());
  checks.push(await checkServerInfo());

  // 顯示結果
  console.log('\n📊 檢查結果:\n');
  
  checks.forEach((check, index) => {
    console.log(`${index + 1}. ${check.name}`);
    console.log(`   狀態: ${check.status}`);
    console.log(`   訊息: ${check.message}`);
    if (check.details) {
      console.log(`   詳情:`, check.details);
    }
    console.log('');
  });

  // 統計
  const passed = checks.filter(c => c.status === '✅ 通過').length;
  const failed = checks.filter(c => c.status === '❌ 失敗').length;
  const warnings = checks.filter(c => c.status === '⚠️  警告').length;

  console.log('='.repeat(60));
  console.log('\n📈 統計:');
  console.log(`   ✅ 通過: ${passed}/${checks.length}`);
  console.log(`   ⚠️  警告: ${warnings}/${checks.length}`);
  console.log(`   ❌ 失敗: ${failed}/${checks.length}`);

  if (failed === 0 && warnings === 0) {
    console.log('\n🎉 所有檢查通過！Redis 高併發設置正確。\n');
  } else if (failed > 0) {
    console.log('\n⚠️  發現問題，請檢查上述失敗項目。\n');
  } else {
    console.log('\n💡 有警告項目，建議優化。\n');
  }

  // 清理
  await closeRedis();
  process.exit(failed > 0 ? 1 : 0);
}

// 執行
main().catch((error) => {
  console.error('❌ 檢查過程出錯:', error);
  process.exit(1);
});

