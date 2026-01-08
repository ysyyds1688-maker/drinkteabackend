import axios from 'axios';
import { logger } from '../middleware/logger.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

// Telegram 服務
export const telegramService = {
  // 檢查 Telegram 是否已配置
  isConfigured: (): boolean => {
    return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_GROUP_ID);
  },

  // 生成 Telegram 群組邀請連結
  generateInviteLink: async (options?: {
    memberLimit?: number;
    expireDate?: number; // Unix timestamp (seconds)
  }): Promise<string | null> => {
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

      const response = await axios.post(
        `${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
        payload
      );

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
  },

  // 生成一次性邀請連結（每個連結只能使用一次，24小時後過期）
  generateOneTimeInviteLink: async (): Promise<string | null> => {
    const expireDate = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24小時後過期
    return telegramService.generateInviteLink({
      memberLimit: 1,
      expireDate,
    });
  },

  // 發送訊息到指定聊天室
  sendMessage: async (
    chatId: string,
    message: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
    }
  ): Promise<boolean> => {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.warn('Telegram Bot Token 未配置，無法發送訊息');
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

      const response = await axios.post(
        `${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/sendMessage`,
        payload
      );

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
  },

  // 發送通知到管理群組
  sendNotification: async (message: string): Promise<boolean> => {
    if (!TELEGRAM_ADMIN_CHAT_ID) {
      logger.warn('Telegram Admin Chat ID 未配置，無法發送管理通知');
      return false;
    }

    return telegramService.sendMessage(TELEGRAM_ADMIN_CHAT_ID, message, {
      parseMode: 'HTML',
    });
  },

  // 檢查用戶是否在群組中（需要用戶先與 Bot 互動）
  checkUserInGroup: async (telegramUserId: number): Promise<boolean> => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
      return false;
    }

    try {
      const response = await axios.get(
        `${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/getChatMember`,
        {
          params: {
            chat_id: TELEGRAM_GROUP_ID,
            user_id: telegramUserId,
          },
        }
      );

      if (response.data.ok && response.data.result) {
        const status = response.data.result.status;
        return status === 'member' || status === 'administrator' || status === 'creator';
      }

      return false;
    } catch (error: any) {
      // 如果用戶不在群組中，API 會返回錯誤
      logger.debug('檢查用戶是否在群組中失敗', {
        error: error.message,
        telegramUserId,
      });
      return false;
    }
  },

  // 設置 Webhook（在伺服器啟動時調用一次）
  setWebhook: async (webhookUrl: string): Promise<boolean> => {
    if (!TELEGRAM_BOT_TOKEN) {
      logger.warn('Telegram Bot Token 未配置，無法設置 Webhook');
      return false;
    }

    try {
      const response = await axios.post(
        `${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/setWebhook`,
        {
          url: webhookUrl,
        }
      );

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
  },

  // 刪除 Webhook
  deleteWebhook: async (): Promise<boolean> => {
    if (!TELEGRAM_BOT_TOKEN) {
      return false;
    }

    try {
      const response = await axios.post(
        `${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/deleteWebhook`
      );

      if (response.data.ok) {
        logger.info('Telegram Webhook 已刪除');
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('刪除 Telegram Webhook 失敗', error);
      return false;
    }
  },
};


