/**
 * Telegram 通知路由
 * 每 5 分鐘檢查並發送統計報告
 */

import { Router, Request, Response } from 'express';
import { telegramService } from '../services/telegramService.js';
import { bookingModel } from '../models/Booking.js';
import { query } from '../db/database.js';
import { getUserFromRequest } from '../middleware/auth.js';
import { userModel } from '../models/User.js';

// 存儲上次檢查的時間戳
let lastCheckTime: Date = new Date();
let lastStats: {
  onlineCount: number;
  loggedInCount: number;
  guestCount: number;
  lastUserId?: string;
  lastBookingId?: string;
  lastPostId?: string;
} = {
  onlineCount: 0,
  loggedInCount: 0,
  guestCount: 0,
};

/**
 * 執行檢查並發送統計報告（內部函數，可被定時任務和 API 調用）
 */
async function checkAndReportTelegram(requireAdmin: boolean = false): Promise<{ success: boolean; stats?: any; error?: string }> {
  try {
    if (!telegramService.isConfigured()) {
      return { 
        success: false,
        error: 'Telegram Bot 未配置，請設置環境變數 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID'
      };
    }

    const now = new Date();
    const checkTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 分鐘前

    // 1. 獲取在線人數統計
    let onlineStats = { onlineCount: 0, loggedInCount: 0, guestCount: 0 };
    try {
      // 獲取最近 5 分鐘內活躍的用戶（有 session 或最近登入）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const activeUsersResult = await query(`
        SELECT COUNT(DISTINCT id) as count
        FROM users
        WHERE last_login_at IS NOT NULL
        AND last_login_at > $1
      `, [fiveMinutesAgo]);
      onlineStats.loggedInCount = parseInt(activeUsersResult.rows[0]?.count || '0', 10);
      
      // 獲取訪客在線人數（從 updateUserActivity 中間件）
      const { getGuestOnlineCount } = await import('../middleware/updateUserActivity.js');
      onlineStats.guestCount = getGuestOnlineCount();
      onlineStats.onlineCount = onlineStats.loggedInCount + onlineStats.guestCount;
    } catch (error) {
      console.error('[Telegram] 獲取在線人數失敗:', error);
    }

    // 2. 檢查新註冊會員（最近 5 分鐘）
    let newUsersCount = 0;
    let newUsers: any[] = [];
    try {
      const newUsersResult = await query(`
        SELECT id, public_id, email, phone_number, role, user_name, created_at
        FROM users
        WHERE created_at > $1
        ORDER BY created_at DESC
      `, [checkTime.toISOString()]);
      
      newUsers = newUsersResult.rows.map(row => ({
        id: row.id,
        publicId: row.public_id || row.id,
        email: row.email,
        phoneNumber: row.phone_number,
        role: row.role,
        userName: row.user_name,
        createdAt: row.created_at,
      }));
      newUsersCount = newUsers.length;

      // 發送新註冊用戶通知
      for (const user of newUsers) {
        await telegramService.sendNewUserNotification(user);
        // 避免發送太快，每個通知之間延遲 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('[Telegram] 檢查新註冊會員失敗:', error);
    }

    // 3. 檢查新預約（最近 5 分鐘）
    let newBookingsCount = 0;
    let newBookings: any[] = [];
    try {
      const newBookingsResult = await query(`
        SELECT 
          b.id,
          b.profile_id,
          b.client_id,
          b.booking_date,
          b.booking_time,
          b.service_type,
          b.created_at,
          p.name as profile_name,
          u.user_name as client_name
        FROM bookings b
        LEFT JOIN profiles p ON b.profile_id = p.id
        LEFT JOIN users u ON b.client_id = u.id
        WHERE b.created_at > $1
        ORDER BY b.created_at DESC
      `, [checkTime.toISOString()]);
      
      newBookings = newBookingsResult.rows.map(row => ({
        id: row.id,
        profileId: row.profile_id,
        profileName: row.profile_name,
        clientId: row.client_id,
        clientName: row.client_name,
        bookingDate: row.booking_date,
        bookingTime: row.booking_time,
        serviceType: row.service_type,
        createdAt: row.created_at,
      }));
      newBookingsCount = newBookings.length;

      // 發送新預約通知
      for (const booking of newBookings) {
        await telegramService.sendNewBookingNotification(booking);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('[Telegram] 檢查新預約失敗:', error);
    }

    // 4. 檢查新論壇發文（最近 5 分鐘）
    let newPostsCount = 0;
    let newPosts: any[] = [];
    try {
      const newPostsResult = await query(`
        SELECT 
          fp.id,
          fp.title,
          fp.user_id,
          fp.category,
          fp.created_at,
          u.user_name as author_name
        FROM forum_posts fp
        LEFT JOIN users u ON fp.user_id = u.id
        WHERE fp.created_at > $1
        ORDER BY fp.created_at DESC
      `, [checkTime.toISOString()]);
      
      newPosts = newPostsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        authorId: row.user_id,
        authorName: row.author_name,
        category: row.category,
        createdAt: row.created_at,
      }));
      newPostsCount = newPosts.length;

      // 發送新論壇發文通知
      for (const post of newPosts) {
        await telegramService.sendNewPostNotification(post);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('[Telegram] 檢查新論壇發文失敗:', error);
    }

    // 5. 發送統計報告
    const stats = {
      onlineCount: onlineStats.onlineCount,
      loggedInCount: onlineStats.loggedInCount,
      guestCount: onlineStats.guestCount,
      newUsersCount,
      newBookingsCount,
      newPostsCount,
    };

    // 計算距離上次檢查的時間（分鐘）
    const minutesSinceLastCheck = Math.floor((now.getTime() - lastCheckTime.getTime()) / (1000 * 60));
    
    // 每 5 分鐘發送一次統計報告（即使沒有變化）
    // 或者如果有新活動，立即發送
    const shouldSendReport = minutesSinceLastCheck >= 5 || 
                             newUsersCount > 0 || 
                             newBookingsCount > 0 || 
                             newPostsCount > 0 || 
                             Math.abs(onlineStats.onlineCount - lastStats.onlineCount) > 2;

    if (shouldSendReport) {
      console.log(`[Telegram] 準備發送統計報告 - 在線: ${stats.onlineCount}, 新用戶: ${stats.newUsersCount}, 新預約: ${stats.newBookingsCount}, 新發文: ${stats.newPostsCount}`);
      
      // 根據活動情況選擇不同的開場白
      let opening = '';
      if (stats.newUsersCount > 0 || stats.newBookingsCount > 0 || stats.newPostsCount > 0) {
        opening = '🎉 <b>啟稟茶王，皇朝有喜！</b>';
      } else {
        opening = '📊 <b>啟稟茶王，臣等謹奏：</b>';
      }

      const timestamp = new Date().toLocaleString('zh-TW', { 
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const content = [
        opening,
        '',
        `⏰ <b>奏報時辰：</b>${timestamp}`,
        '',
        `👥 <b>皇朝人氣</b>`,
        `   ├─ 總在線人數：<b>${stats.onlineCount}</b> 位`,
        `   ├─ 已登入臣民：${stats.loggedInCount} 位`,
        `   └─ 訪客遊人：${stats.guestCount} 位`,
        '',
        `📈 <b>近期動態（過去 5 分鐘）</b>`,
      ];

      if (stats.newUsersCount > 0) {
        content.push(`   ├─ 🎊 新加入臣民：<b>${stats.newUsersCount}</b> 位`);
      } else {
        content.push(`   ├─ 新加入臣民：0 位`);
      }

      if (stats.newBookingsCount > 0) {
        content.push(`   ├─ 📅 新預約訂單：<b>${stats.newBookingsCount}</b> 筆`);
      } else {
        content.push(`   ├─ 新預約訂單：0 筆`);
      }

      if (stats.newPostsCount > 0) {
        content.push(`   └─ 📝 新論壇發文：<b>${stats.newPostsCount}</b> 篇`);
      } else {
        content.push(`   └─ 新論壇發文：0 篇`);
      }

      content.push('');
      content.push('🙏 <i>臣等謹此稟報，恭請茶王聖裁</i>');

      await telegramService.sendNotification(content.join('\n'));
      
      console.log('[Telegram] 統計報告已發送');
    } else {
      console.log(`[Telegram] 跳過發送報告 - 距離上次檢查僅 ${minutesSinceLastCheck} 分鐘，且無新活動`);
    }

    // 更新上次檢查時間和統計
    lastCheckTime = now;
    lastStats = {
      onlineCount: onlineStats.onlineCount,
      loggedInCount: onlineStats.loggedInCount,
      guestCount: onlineStats.guestCount,
    };

    return {
      success: true,
      stats,
    };
  } catch (error: any) {
    console.error('[Telegram] 檢查並發送報告失敗:', error);
    return {
      success: false,
      error: error.message || '檢查並發送報告失敗',
    };
  }
}

// 導出函數供其他模塊使用
export { checkAndReportTelegram };

// 創建 router
const router: Router = Router();

// 定義路由
router.post('/check-and-report', async (req: Request, res: Response) => {
  try {
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }

    const result = await checkAndReportTelegram(true);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error || '檢查失敗',
        message: result.error
      });
    }

    res.json({
      success: true,
      message: '檢查完成並已發送通知',
      stats: result.stats,
    });
  } catch (error: any) {
    console.error('[Telegram] API 端點錯誤:', error);
    res.status(500).json({ 
      error: error.message || '檢查並發送報告失敗',
      details: error.stack 
    });
  }
});

router.post('/test', async (req: Request, res: Response) => {
  try {
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser) {
      return res.status(401).json({ 
        error: '未授權',
        message: '請先登入後台管理系統'
      });
    }
    
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ 
        error: '無權訪問',
        message: '僅管理員可查看 Telegram 配置'
      });
    }

    if (!telegramService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Telegram Bot 未配置',
        message: '請設置環境變數 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID'
      });
    }

    // 獲取實際的當前統計數據
    let onlineStats = { onlineCount: 0, loggedInCount: 0, guestCount: 0 };
    let totalUsers = 0;
    let totalProviders = 0;
    let totalClients = 0;
    let pendingBookings = 0;
    
    try {
      // 獲取在線人數
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const activeUsersResult = await query(`
        SELECT COUNT(DISTINCT id) as count
        FROM users
        WHERE last_login_at IS NOT NULL
        AND last_login_at > $1
      `, [fiveMinutesAgo]);
      onlineStats.loggedInCount = parseInt(activeUsersResult.rows[0]?.count || '0', 10);
      
      const { getGuestOnlineCount } = await import('../middleware/updateUserActivity.js');
      onlineStats.guestCount = getGuestOnlineCount();
      onlineStats.onlineCount = onlineStats.loggedInCount + onlineStats.guestCount;

      // 獲取總用戶數
      const usersResult = await query(`SELECT COUNT(*) as count FROM users`);
      totalUsers = parseInt(usersResult.rows[0]?.count || '0', 10);

      // 獲取佳麗人數
      const providersResult = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'provider'`);
      totalProviders = parseInt(providersResult.rows[0]?.count || '0', 10);

      // 獲取品茶客人數
      const clientsResult = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'client'`);
      totalClients = parseInt(clientsResult.rows[0]?.count || '0', 10);

      // 獲取待處理預約數
      const bookingsResult = await query(`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE status IN ('pending', 'confirmed')
      `);
      pendingBookings = parseInt(bookingsResult.rows[0]?.count || '0', 10);
    } catch (error) {
      console.error('[Telegram] 獲取統計數據失敗:', error);
    }

    // 發送測試消息，包含實際的當前數據
    const timestamp = new Date().toLocaleString('zh-TW', { 
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const testMessage = `🤖 <b>啟稟茶王，臣等測試通報系統！</b>

✅ <b>系統狀態</b>
   └─ Bot 連接成功，通報系統已就緒

⏰ <b>測試時辰：</b>${timestamp}

📊 <b>臣等謹報當前皇朝數據</b>
   ├─ <b>在線人數：</b>${onlineStats.onlineCount} 位
   │  ├─ 已登入臣民：${onlineStats.loggedInCount} 位
   │  └─ 訪客遊人：${onlineStats.guestCount} 位
   ├─ <b>總用戶數：</b>${totalUsers} 位
   ├─ <b>後宮佳麗：</b>${totalProviders} 位
   ├─ <b>品茶客數：</b>${totalClients} 位
   └─ <b>待處理預約：</b>${pendingBookings} 筆

💡 <b>通報系統說明</b>
   若茶王收到此消息，說明 Telegram Bot 配置成功！
   所有通報將發送到此話題中。
   
   📅 <b>自動通報機制（每 5 分鐘）</b>
   • 🎊 新註冊會員通報
   • 📅 新預約訂單通報
   • 📝 新論壇發文通報
   • 📊 定期統計報告

🙏 <i>臣等謹此測試，恭請茶王確認系統運作正常</i>`;

    const success = await telegramService.sendNotification(testMessage);

    if (success) {
      res.json({ 
        success: true, 
        message: '測試消息已發送，請檢查 Telegram 群組' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: '發送測試消息失敗，請檢查配置' 
      });
    }
  } catch (error: any) {
    console.error('[Telegram] 測試失敗:', error);
    res.status(500).json({ 
      error: error.message || '測試失敗',
      details: error.stack 
    });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser) {
      return res.status(401).json({ 
        error: '未授權',
        message: '請先登入後台管理系統'
      });
    }
    
    if (adminUser.role !== 'admin') {
      return res.status(403).json({ 
        error: '無權訪問',
        message: '僅管理員可查看 Telegram 配置'
      });
    }

    const isConfigured = telegramService.isConfigured();
    const hasBotToken = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasGroupId = !!process.env.TELEGRAM_GROUP_ID;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;
    const hasAdminChatId = !!process.env.TELEGRAM_ADMIN_CHAT_ID;
    const hasMessageThreadId = !!process.env.TELEGRAM_MESSAGE_THREAD_ID;

    res.json({
      configured: isConfigured,
      hasBotToken,
      hasGroupId,
      hasChatId,
      hasAdminChatId,
      hasMessageThreadId,
      message: isConfigured 
        ? 'Telegram 配置完整' 
        : '請設置環境變數 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID'
    });
  } catch (error: any) {
    console.error('[Telegram] 配置檢查失敗:', error);
    res.status(500).json({ 
      error: error.message || '檢查配置失敗'
    });
  }
});

export default router;

