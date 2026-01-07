import { Router } from 'express';
import { query } from '../db/database.js';
import { getGuestOnlineCount } from '../middleware/updateUserActivity.js';

const router = Router();

// 簡單的在線人數追蹤（基於最近活躍的用戶和訪客）
// 這裡使用一個簡單的方法：統計最近5分鐘內有活動的用戶數和訪客數
// 實際應用中可以通過 Redis 或其他方式來追蹤

// GET /api/stats/online - 獲取在線人數（包含已登入用戶和訪客）
router.get('/online', async (req, res) => {
  try {
    // 查詢最近5分鐘內有活動的已登入用戶（通過 last_login_at）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const result = await query(
      `SELECT COUNT(DISTINCT id) as count
       FROM users
       WHERE last_login_at IS NOT NULL
       AND last_login_at > $1`,
      [fiveMinutesAgo]
    );

    const loggedInCount = parseInt(result.rows[0]?.count || '0', 10);
    
    // 獲取訪客在線人數
    const guestCount = getGuestOnlineCount();
    
    // 總在線人數 = 已登入用戶 + 訪客
    const onlineCount = loggedInCount + guestCount;

    res.json({
      onlineCount: onlineCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('GET /api/stats/online error:', error);
    // 如果出錯，返回0
    res.json({
      onlineCount: 0,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

