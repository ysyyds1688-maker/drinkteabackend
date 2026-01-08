import { logger } from '../middleware/logger.js';

// 錯誤追蹤服務配置
let isSentryInitialized = false;
let Sentry: any = null;

// 嘗試載入 Sentry（可選依賴）
try {
  Sentry = require('@sentry/node');
} catch (error) {
  // Sentry 未安裝，使用本地錯誤追蹤
  logger.info('Sentry 未安裝，使用本地錯誤追蹤');
}

// 初始化 Sentry（如果配置了 DSN）
export const initErrorTracking = (): void => {
  if (!Sentry) {
    logger.info('Sentry 未安裝，使用本地錯誤追蹤');
    return;
  }

  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.info('Sentry DSN 未配置，使用本地錯誤追蹤');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% 的請求追蹤
      beforeSend(event: any, hint: any) {
        // 過濾敏感信息
        if (event.request) {
          // 移除可能的敏感 headers
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
        }

        // 開發環境可以記錄更詳細的錯誤
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Sentry Event', event);
        }

        return event;
      },
    });

    isSentryInitialized = true;
    logger.info('✅ Sentry 錯誤追蹤已初始化');
  } catch (error: any) {
    logger.error('初始化 Sentry 失敗', error);
  }
};

// 手動報告錯誤
export const captureException = (error: Error, context?: Record<string, any>): void => {
  logger.error('捕獲異常', { error: error.message, context });

  if (isSentryInitialized && Sentry) {
    if (context) {
      Sentry.withScope((scope: any) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }
};

// 報告訊息（非錯誤）
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  if (isSentryInitialized && Sentry) {
    Sentry.captureMessage(message, level);
  } else {
    logger[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'](message);
  }
};

// 設置用戶上下文
export const setUserContext = (user: { id: string; email?: string; role?: string }): void => {
  if (isSentryInitialized && Sentry) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
};

// 清除用戶上下文
export const clearUserContext = (): void => {
  if (isSentryInitialized && Sentry) {
    Sentry.setUser(null);
  }
};

// 錯誤追蹤中間件
export const errorTrackingMiddleware = (error: Error, req: any, res: any, next: any): void => {
  captureException(error, {
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      body: req.body,
      ip: req.ip,
    },
  });

  next(error);
};

