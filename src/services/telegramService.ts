/**
 * Telegram 通知服務
 * 用於發送通知到 Telegram 群組
 * 兼容現有實現並添加新功能
 */

import axios from 'axios';
import { logger } from '../middleware/logger.js';
import { cacheService } from './redisService.js';
import { userModel } from '../models/User.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || TELEGRAM_GROUP_ID; // 支持兩種環境變數名稱
const TELEGRAM_MESSAGE_THREAD_ID = process.env.TELEGRAM_MESSAGE_THREAD_ID ? parseInt(process.env.TELEGRAM_MESSAGE_THREAD_ID, 10) : undefined; // 論壇話題 ID（可選）
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

class TelegramService {
  /**
   * 檢查配置是否完整
   */
  isConfigured(): boolean {
    return !!(TELEGRAM_BOT_TOKEN && (TELEGRAM_CHAT_ID || TELEGRAM_GROUP_ID));
  }

  /**
   * 發送消息到 Telegram（兼容兩種方法簽名）
   * 1. sendMessage(chatId, message, options) - 現有方法
   * 2. sendMessage(message, parseMode) - 新方法（使用默認 chatId）
   */
  async sendMessage(
    chatIdOrMessage: string | number,
    messageOrParseMode?: string | 'HTML' | 'Markdown' | 'MarkdownV2',
    optionsOrUndefined?: any
  ): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.warn('Telegram Bot Token 未配置，無法發送訊息');
      return false;
    }

    let chatId: string | number;
    let message: string;
    let options: any = {};

    // 判斷是哪種方法簽名
    if (typeof chatIdOrMessage === 'string' && messageOrParseMode === undefined) {
      // 新方法：sendMessage(message, parseMode?)
      message = chatIdOrMessage;
      chatId = TELEGRAM_CHAT_ID || TELEGRAM_GROUP_ID || '';
      if (typeof messageOrParseMode === 'string' && ['HTML', 'Markdown', 'MarkdownV2'].includes(messageOrParseMode)) {
        options.parseMode = messageOrParseMode;
      } else {
        options.parseMode = 'HTML'; // 默認使用 HTML
      }
    } else {
      // 現有方法：sendMessage(chatId, message, options)
      chatId = chatIdOrMessage;
      message = messageOrParseMode as string;
      options = optionsOrUndefined || {};
    }

    if (!chatId || !message) {
      logger.warn('Telegram 發送消息失敗：缺少 chatId 或 message');
      return false;
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text: message,
      };
      
      if (options?.parseMode) {
        payload.parse_mode = options.parseMode;
      }
      if (options?.disableNotification) {
        payload.disable_notification = options.disableNotification;
      }
      // 如果指定了 message_thread_id（論壇話題），添加到 payload
      if (options?.messageThreadId !== undefined) {
        payload.message_thread_id = options.messageThreadId;
      } else if (TELEGRAM_MESSAGE_THREAD_ID !== undefined) {
        // 如果環境變數中設置了默認的 message_thread_id，使用它
        payload.message_thread_id = TELEGRAM_MESSAGE_THREAD_ID;
      }

      const response = await axios.post(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/sendMessage`, payload);
      
      if (response.data.ok) {
        logger.info(`Telegram 訊息已發送到 ${chatId}`);
        return true;
      }
      
      throw new Error('Telegram API 返回錯誤');
    } catch (error: any) {
      logger.error('發送 Telegram 訊息失敗', {
        error: error.message,
        chatId,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * 發送通知到管理群組（使用 TELEGRAM_CHAT_ID 或 TELEGRAM_GROUP_ID）
   * 如果群組是論壇類型，會自動使用 TELEGRAM_MESSAGE_THREAD_ID
   */
  async sendNotification(message: string, messageThreadId?: number): Promise<boolean> {
    const chatId = TELEGRAM_CHAT_ID || TELEGRAM_GROUP_ID || TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) {
      logger.warn('Telegram Chat ID 未配置，無法發送管理通知');
      return false;
    }
    return this.sendMessage(chatId, message, { 
      parseMode: 'HTML',
      messageThreadId: messageThreadId !== undefined ? messageThreadId : TELEGRAM_MESSAGE_THREAD_ID
    });
  }

  /**
   * 格式化消息（HTML）
   */
  formatMessage(title: string, content: string[]): string {
    const lines = [
      `<b>${title}</b>`,
      '',
      ...content,
    ];
    return lines.join('\n');
  }

  /**
   * 發送統計報告
   */
  async sendStatsReport(stats: {
    onlineCount: number;
    loggedInCount: number;
    guestCount: number;
    newUsersCount: number;
    newBookingsCount: number;
    newPostsCount: number;
  }): Promise<boolean> {
    const timestamp = new Date().toLocaleString('zh-TW', { 
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 根據活動情況選擇不同的開場白
    let opening = '';
    if (stats.newUsersCount > 0 || stats.newBookingsCount > 0 || stats.newPostsCount > 0) {
      opening = '🎉 <b>啟稟茶王，皇朝有喜！</b>';
    } else {
      opening = '📊 <b>啟稟茶王，臣等謹奏：</b>';
    }

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

    const message = content.join('\n');
    return await this.sendNotification(message);
  }

  /**
   * 發送新註冊通知
   */
  async sendNewUserNotification(user: {
    id: string;
    publicId?: string;
    email?: string;
    phoneNumber?: string;
    role: string;
    userName?: string;
  }): Promise<boolean> {
    const roleText = user.role === 'client' ? '👤 品茶客' : user.role === 'provider' ? '👩 後宮佳麗' : '👑 管理員';
    const roleEmoji = user.role === 'client' ? '👤' : user.role === 'provider' ? '👩' : '👑';
    const roleTitle = user.role === 'client' ? '品茶客' : user.role === 'provider' ? '後宮佳麗' : '管理員';
    
    // 根據角色選擇不同的開場白
    let opening = '';
    if (user.role === 'provider') {
      opening = '🎊 <b>啟稟茶王，後宮添新佳麗！</b>';
    } else if (user.role === 'client') {
      opening = '🎉 <b>啟稟茶王，有品茶客加入皇朝！</b>';
    } else {
      opening = '👑 <b>啟稟茶王，管理層有新成員！</b>';
    }
    
    const content = [
      opening,
      '',
      `📋 <b>臣等謹報新成員資訊</b>`,
      `   ├─ 公開身份：<code>${user.publicId || user.id}</code>`,
      `   ├─ 身份等級：${roleText}`,
    ];

    if (user.userName) {
      content.push(`   ├─ 暱稱：${user.userName}`);
    }
    if (user.email) {
      content.push(`   ├─ 聯絡方式：${user.email}`);
    }
    if (user.phoneNumber) {
      content.push(`   └─ 手機號碼：${user.phoneNumber}`);
    } else if (!user.userName && user.email) {
      const lastIndex = content.length - 1;
      content[lastIndex] = content[lastIndex].replace('├─', '└─');
    } else if (!user.userName && !user.email) {
      const lastIndex = content.length - 1;
      content[lastIndex] = content[lastIndex].replace('├─', '└─');
    }

    content.push('');
    if (user.role === 'provider') {
      content.push('💝 <i>恭賀茶王，後宮陣容再添新力！</i>');
    } else {
      content.push('🙏 <i>臣等謹此稟報，恭請茶王知悉</i>');
    }

    const message = content.join('\n');
    return await this.sendNotification(message);
  }

  /**
   * 發送新預約通知
   */
  async sendNewBookingNotification(booking: {
    id: string;
    profileId: string;
    profileName?: string;
    clientId: string;
    clientName?: string;
    bookingDate: string;
    bookingTime: string;
    serviceType?: string;
  }): Promise<boolean> {
    const content = [
      '📅 <b>啟稟茶王，有新的預約訂單！</b>',
      '',
      '📋 <b>臣等謹報預約詳情</b>',
      `   ├─ 訂單編號：<code>${booking.id}</code>`,
    ];

    if (booking.profileName) {
      content.push(`   ├─ 佳麗名稱：<b>${booking.profileName}</b>`);
    } else {
      content.push(`   ├─ 佳麗ID：<code>${booking.profileId}</code>`);
    }

    if (booking.clientName) {
      content.push(`   ├─ 品茶客：<b>${booking.clientName}</b>`);
    } else {
      content.push(`   ├─ 客戶ID：<code>${booking.clientId}</code>`);
    }

    content.push(`   ├─ 預約日期：${booking.bookingDate}`);
    content.push(`   ├─ 預約時辰：${booking.bookingTime}`);

    if (booking.serviceType) {
      content.push(`   └─ 服務類型：${booking.serviceType}`);
    } else {
      content.push(`   └─ 服務類型：待確認`);
    }

    content.push('');
    content.push('💰 <i>恭賀茶王，皇朝生意興隆！</i>');

    const message = content.join('\n');
    return await this.sendNotification(message);
  }

  /**
   * 發送新論壇發文通知
   */
  async sendNewPostNotification(post: {
    id: string;
    title: string;
    authorId: string;
    authorName?: string;
    category: string;
  }): Promise<boolean> {
    const categoryMap: Record<string, string> = {
      general: '📝 綜合討論',
      premium_tea: '🍵 嚴選好茶',
      fish_market: '🐟 特選魚市',
      booking: '📅 預約交流',
      experience: '💬 經驗分享',
      question: '❓ 問題求助',
      chat: '💭 閒聊區',
      lady_promotion: '👑 佳麗御選名鑑',
      announcement: '📢 官方公告',
    };

    const categoryText = categoryMap[post.category] || `📌 ${post.category}`;
    
    const content = [
      '📝 <b>啟稟茶王，論壇有新動態！</b>',
      '',
      '📋 <b>臣等謹報發文詳情</b>',
      `   ├─ 文章標題：<b>${post.title}</b>`,
      `   ├─ 所屬版塊：${categoryText}`,
    ];

    if (post.authorName) {
      content.push(`   └─ 發文者：${post.authorName}`);
    } else {
      content.push(`   └─ 發文者ID：<code>${post.authorId}</code>`);
    }

    content.push('');
    content.push('💬 <i>恭賀茶王，論壇人氣旺盛！</i>');

    const message = content.join('\n');
    return await this.sendNotification(message);
  }

  // ==================== 現有方法（向後兼容）====================
  
  /**
   * 生成 Telegram 綁定權杖 (Token)
   */
  async generateLinkingToken(userId: string): Promise<string> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // 權杖有效期 10 分鐘
    await cacheService.set(`tg_link:${token}`, userId, 600);
    return token;
  }

  /**
   * 獲取綁定 URL
   */
  async getBotLinkingUrl(userId: string): Promise<string | null> {
    if (!TELEGRAM_BOT_TOKEN) return null;
    
    try {
      // 獲取 Bot 用戶名
      const response = await axios.get(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/getMe`);
      if (response.data.ok) {
        const botUsername = response.data.result.username;
        const token = await this.generateLinkingToken(userId);
        return `https://t.me/${botUsername}?start=${token}`;
      }
      return null;
    } catch (error: any) {
      logger.error('獲取 Bot 資訊失敗', error);
      return null;
    }
  }

  /**
   * 處理 Telegram 傳來的消息 (Webhook 或 Polling)
   */
  async handleUpdate(update: any): Promise<void> {
    if (update.message?.text?.startsWith('/start ')) {
      const chatId = update.message.chat.id;
      const telegramUserId = update.message.from.id.toString();
      const telegramUsername = update.message.from.username;
      const token = update.message.text.split(' ')[1];
      const userId = await cacheService.get<string>(`tg_link:${token}`);
      
      if (userId) {
        // 綁定帳號
        await userModel.linkTelegram(userId, telegramUserId, telegramUsername);
        await cacheService.delete(`tg_link:${token}`);
        await this.sendMessage(chatId, '✅ 帳號綁定成功！您現在可以接收相關通知並進入專屬群組。');
        
        // 發送群組邀請連結
        const inviteLink = await this.generateOneTimeInviteLink();
        if (inviteLink) {
          await this.sendMessage(chatId, `這是您的專屬群組邀請連結：\n${inviteLink}\n請點擊加入（連結僅可使用一次，24小時內有效）。`);
        }
      } else {
        await this.sendMessage(chatId, '❌ 綁定失敗或權杖已過期，請回到網站重新獲取綁定連結。');
      }
    }
  }

  /**
   * 生成 Telegram 群組邀請連結
   */
  async generateInviteLink(options?: { memberLimit?: number; expireDate?: number }): Promise<string | null> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
      logger.warn('Telegram Bot Token 或 Group ID 未配置，無法生成邀請連結');
      return null;
    }
    
    try {
      const payload: any = {
        chat_id: TELEGRAM_GROUP_ID,
      };
      
      if (options?.memberLimit) {
        payload.member_limit = options.memberLimit;
      }
      if (options?.expireDate) {
        payload.expire_date = options.expireDate;
      }
      
      const response = await axios.post(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/createChatInviteLink`, payload);
      
      if (response.data.ok && response.data.result) {
        logger.info('Telegram 邀請連結生成成功');
        return response.data.result.invite_link;
      }
      
      throw new Error('Telegram API 返回錯誤');
    } catch (error: any) {
      logger.error('生成 Telegram 邀請連結失敗', {
        error: error.message,
        response: error.response?.data,
      });
      return null;
    }
  }

  /**
   * 生成一次性邀請連結（每個連結只能使用一次，24小時後過期）
   */
  async generateOneTimeInviteLink(): Promise<string | null> {
    const expireDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24小時後過期
    return this.generateInviteLink({
      memberLimit: 1,
      expireDate,
    });
  }

  /**
   * 檢查用戶是否在群組中（需要用戶先與 Bot 互動）
   */
  async checkUserInGroup(telegramUserId: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
      return false;
    }
    
    try {
      const response = await axios.get(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/getChatMember`, {
        params: {
          chat_id: TELEGRAM_GROUP_ID,
          user_id: telegramUserId,
        },
      });
      
      if (response.data.ok && response.data.result) {
        const status = response.data.result.status;
        return status === 'member' || status === 'administrator' || status === 'creator';
      }
      
      return false;
    } catch (error: any) {
      logger.debug('檢查用戶是否在群組中失敗', {
        error: error.message,
        telegramUserId,
      });
      return false;
    }
  }

  /**
   * 設置 Webhook（在伺服器啟動時調用一次）
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.warn('Telegram Bot Token 未配置，無法設置 Webhook');
      return false;
    }
    
    try {
      const response = await axios.post(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        url: webhookUrl,
      });
      
      if (response.data.ok) {
        logger.info('Telegram Webhook 設置成功', { webhookUrl });
        return true;
      }
      
      throw new Error('Telegram API 返回錯誤');
    } catch (error: any) {
      logger.error('設置 Telegram Webhook 失敗', {
        error: error.message,
        webhookUrl,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * 刪除 Webhook
   */
  async deleteWebhook(): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
      return false;
    }
    
    try {
      const response = await axios.post(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
      if (response.data.ok) {
        logger.info('Telegram Webhook 已刪除');
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error('刪除 Telegram Webhook 失敗', error);
      return false;
    }
  }
}

export const telegramService = new TelegramService();
