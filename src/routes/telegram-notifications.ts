/**
 * Telegram 通知路由
 * 每 5 分鐘檢查並發送統計報告
 */

import { Router } from 'express';
import { telegramService } from '../services/telegramService.js';
import { bookingModel } from '../models/Booking.js';
import { query } from '../db/database.js';
import { getUserFromRequest } from '../middleware/auth.js';
import { userModel } from '../models/User.js';
import axios from 'axios';
import axios from 'axios';

const router = Router();

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
 * 檢查並發送統計報告（每 5 分鐘）
 */
router.post('/check-and-report', async (req, res) => {
  try {
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }

    if (!telegramService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Telegram Bot 未配置',
        message: '請設置環境變數 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID'
      });
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
          fp.author_id,
          fp.category,
          fp.created_at,
          u.user_name as author_name
        FROM forum_posts fp
        LEFT JOIN users u ON fp.author_id = u.id
        WHERE fp.created_at > $1
        ORDER BY fp.created_at DESC
      `, [checkTime.toISOString()]);
      
      newPosts = newPostsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        authorId: row.author_id,
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

    // 只有在有變化時才發送統計報告
    if (newUsersCount > 0 || newBookingsCount > 0 || newPostsCount > 0 || 
        Math.abs(onlineStats.onlineCount - lastStats.onlineCount) > 2) { // 在線人數變化超過 2 才發送
      await telegramService.sendNotification(
        telegramService.formatMessage('📊 網站統計報告', [
          `👥 <b>在線人數：</b>${stats.onlineCount}`,
          `   ├─ 已登入：${stats.loggedInCount}`,
          `   └─ 訪客：${stats.guestCount}`,
          '',
          `👤 <b>新註冊會員：</b>${stats.newUsersCount}`,
          `📅 <b>新預約：</b>${stats.newBookingsCount}`,
          `📝 <b>新論壇發文：</b>${stats.newPostsCount}`,
        ])
      );
    }

    // 更新上次檢查時間和統計
    lastCheckTime = now;
    lastStats = {
      onlineCount: onlineStats.onlineCount,
      loggedInCount: onlineStats.loggedInCount,
      guestCount: onlineStats.guestCount,
    };

    res.json({
      success: true,
      message: '檢查完成並已發送通知',
      stats,
      details: {
        newUsers: newUsers.length,
        newBookings: newBookings.length,
        newPosts: newPosts.length,
      },
    });
  } catch (error: any) {
    console.error('[Telegram] 檢查並發送報告失敗:', error);
    res.status(500).json({ 
      error: error.message || '檢查並發送報告失敗',
      details: error.stack 
    });
  }
});

/**
 * 測試 Telegram 連接
 */
router.post('/test', async (req, res) => {
  try {
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
    }

    if (!telegramService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Telegram Bot 未配置',
        message: '請設置環境變數 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID'
      });
    }

    // 發送測試消息，包含所有類型的通知格式示例
    const testMessage = `🤖 <b>稟報茶王：Telegram Bot 測試</b>

✅ <b>配置狀態</b>
   └─ Bot 連接成功，通知系統已就緒

📊 <b>測試數據示例</b>
   ├─ 在線人數：15 人（已登入：10，訪客：5）
   ├─ 新註冊會員：2 位
   ├─ 新預約：1 筆
   └─ 新論壇發文：3 篇

💡 <b>提示</b>
   如果您收到此消息，說明 Telegram Bot 配置成功！
   所有通知將發送到此話題中。`;

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

/**
 * 檢查 Telegram 配置狀態
 */
router.get('/config', async (req, res) => {
  try {
    const adminUser = await getUserFromRequest(req);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: '無權訪問' });
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

