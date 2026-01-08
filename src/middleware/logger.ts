import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// 日誌級別
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// 日誌配置
const LOG_LEVEL = (process.env.LOG_LEVEL || 'INFO').toUpperCase() as LogLevel;
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// 確保日誌目錄存在
if (LOG_TO_FILE && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 獲取日誌文件路徑
const getLogFilePath = (level: LogLevel): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}-${level.toLowerCase()}.log`);
};

// 格式化日誌訊息
const formatLogMessage = (level: LogLevel, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
};

// 日誌函數
export const logger = {
  debug: (message: string, data?: any) => {
    if (shouldLog(LogLevel.DEBUG)) {
      const logMessage = formatLogMessage(LogLevel.DEBUG, message, data);
      console.debug(logMessage.trim());
      if (LOG_TO_FILE) {
        appendToFile(getLogFilePath(LogLevel.DEBUG), logMessage);
      }
    }
  },

  info: (message: string, data?: any) => {
    if (shouldLog(LogLevel.INFO)) {
      const logMessage = formatLogMessage(LogLevel.INFO, message, data);
      console.log(logMessage.trim());
      if (LOG_TO_FILE) {
        appendToFile(getLogFilePath(LogLevel.INFO), logMessage);
      }
    }
  },

  warn: (message: string, data?: any) => {
    if (shouldLog(LogLevel.WARN)) {
      const logMessage = formatLogMessage(LogLevel.WARN, message, data);
      console.warn(logMessage.trim());
      if (LOG_TO_FILE) {
        appendToFile(getLogFilePath(LogLevel.WARN), logMessage);
        // 警告也寫入錯誤日誌
        appendToFile(getLogFilePath(LogLevel.ERROR), logMessage);
      }
    }
  },

  error: (message: string, error?: any) => {
    if (shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error;
      const logMessage = formatLogMessage(LogLevel.ERROR, message, errorData);
      console.error(logMessage.trim());
      if (LOG_TO_FILE) {
        appendToFile(getLogFilePath(LogLevel.ERROR), logMessage);
      }
    }
  },
};

// 檢查是否應該記錄此級別的日誌
const shouldLog = (level: LogLevel): boolean => {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const messageLevelIndex = levels.indexOf(level);
  return messageLevelIndex >= currentLevelIndex;
};

// 寫入文件
const appendToFile = (filePath: string, message: string): void => {
  try {
    fs.appendFileSync(filePath, message, 'utf8');
  } catch (error) {
    console.error('寫入日誌文件失敗:', error);
  }
};

// HTTP 請求日誌中間件
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.debug('HTTP Request', logData);
    }
  });

  next();
};

// 清理舊日誌文件（保留最近 N 天）
export const cleanupOldLogs = (daysToKeep: number = 7): void => {
  if (!LOG_TO_FILE || !fs.existsSync(LOG_DIR)) {
    return;
  }

  try {
    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // 轉換為毫秒

    files.forEach((file) => {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`已刪除舊日誌文件: ${file}`);
      }
    });
  } catch (error) {
    logger.error('清理舊日誌文件失敗', error);
  }
};


