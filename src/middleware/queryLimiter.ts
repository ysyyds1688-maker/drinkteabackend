import { Request, Response, NextFunction } from 'express';

// 查詢限制配置
const QUERY_LIMITS = {
  MAX_LIMIT: parseInt(process.env.MAX_QUERY_LIMIT || '100', 10), // 最大查詢數量（默認 100）
  DEFAULT_LIMIT: parseInt(process.env.DEFAULT_QUERY_LIMIT || '20', 10), // 默認查詢數量
  QUERY_TIMEOUT: parseInt(process.env.QUERY_TIMEOUT || '10000', 10), // 查詢超時（毫秒，默認 10 秒）
};

// 查詢限制中間件
export const queryLimiter = (req: Request, res: Response, next: NextFunction) => {
  // 只處理 GET 請求
  if (req.method !== 'GET') {
    return next();
  }

  // 處理 limit 參數
  if (req.query.limit) {
    const limit = parseInt(req.query.limit as string, 10);
    
    // 驗證 limit 是否為有效數字
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ 
        error: 'limit 參數必須是大於 0 的數字',
        maxLimit: QUERY_LIMITS.MAX_LIMIT 
      });
    }
    
    // 限制最大查詢數量
    if (limit > QUERY_LIMITS.MAX_LIMIT) {
      req.query.limit = QUERY_LIMITS.MAX_LIMIT.toString();
      // 不返回錯誤，而是自動限制到最大值
      console.warn(`查詢 limit 超過最大值 ${QUERY_LIMITS.MAX_LIMIT}，已自動限制為 ${QUERY_LIMITS.MAX_LIMIT}`);
    }
  } else {
    // 如果沒有指定 limit，設置默認值
    req.query.limit = QUERY_LIMITS.DEFAULT_LIMIT.toString();
  }

  // 處理 offset 參數
  if (req.query.offset) {
    const offset = parseInt(req.query.offset as string, 10);
    
    // 驗證 offset 是否為有效數字
    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({ 
        error: 'offset 參數必須是大於等於 0 的數字' 
      });
    }
  }

  next();
};

// 查詢超時中間件（用於數據庫查詢）
export const createQueryTimeout = (timeoutMs: number = QUERY_LIMITS.QUERY_TIMEOUT) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 設置查詢超時
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ 
          error: '查詢超時，請稍後再試',
          timeout: timeoutMs 
        });
      }
    }, timeoutMs);

    // 當響應完成時清除超時
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

// 導出配置
export { QUERY_LIMITS };


