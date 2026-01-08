import { Router } from 'express';
import { telegramService } from '../services/telegramService.js';
import { getUserFromRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/telegram/config - 檢查 Telegram 配置狀態（僅管理員）
router.get('/config', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可查看 Telegram 配置' });
    }

    res.json({
      configured: telegramService.isConfigured(),
      hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasGroupId: !!process.env.TELEGRAM_GROUP_ID,
      hasAdminChatId: !!process.env.TELEGRAM_ADMIN_CHAT_ID,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '檢查配置失敗' });
  }
});

// POST /api/telegram/invite-link - 生成邀請連結（僅管理員）
router.post('/invite-link', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可生成邀請連結' });
    }

    const { memberLimit, expireHours } = req.body;
    
    let options: any = {};
    if (memberLimit) {
      options.memberLimit = parseInt(memberLimit, 10);
    }
    if (expireHours) {
      options.expireDate = Math.floor(Date.now() / 1000) + (parseInt(expireHours, 10) * 60 * 60);
    }

    const inviteLink = await telegramService.generateInviteLink(options);

    if (!inviteLink) {
      return res.status(500).json({ error: '生成邀請連結失敗，請檢查 Telegram 配置' });
    }

    res.json({ inviteLink });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '生成邀請連結失敗' });
  }
});

// POST /api/telegram/send-message - 發送訊息（僅管理員）
router.post('/send-message', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '僅管理員可發送訊息' });
    }

    const { chatId, message, parseMode, disableNotification } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ error: '缺少必要參數：chatId 和 message' });
    }

    const success = await telegramService.sendMessage(chatId, message, {
      parseMode,
      disableNotification,
    });

    if (!success) {
      return res.status(500).json({ error: '發送訊息失敗，請檢查 Telegram 配置' });
    }

    res.json({ message: '訊息已發送' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '發送訊息失敗' });
  }
});

// POST /api/telegram/webhook - 接收 Telegram Webhook（公開端點，但需要驗證）
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    // 處理新成員加入群組
    if (update.message?.new_chat_members) {
      const newMembers = update.message.new_chat_members;
      for (const member of newMembers) {
        // 可以在這裡記錄用戶加入群組的資訊
        console.log(`新成員加入群組: ${member.id} - ${member.first_name} (@${member.username || 'N/A'})`);
      }
    }

    // 處理回調查詢（按鈕點擊等）
    if (update.callback_query) {
      // 可以在這裡處理按鈕回調
      console.log('收到回調查詢:', update.callback_query);
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error('處理 Telegram Webhook 失敗:', error);
    res.status(500).json({ error: '處理失敗' });
  }
});

export default router;


