import { Router } from 'express';
import { verifyToken } from '../services/authService.js';
import { userModel } from '../models/User.js';
import { query } from '../db/database.js';

const router = Router();

interface AuthenticatedRequest extends Express.Request {
  userId?: string;
}

// 所有路由都需要認證
router.use(async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }

    (req as AuthenticatedRequest).userId = payload.userId;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || '未授權' });
  }
});

// POST /api/messages/send - 發送訊息
router.post('/send', async (req: any, res) => {
  try {
    const senderId = (req as AuthenticatedRequest).userId as string;
    const { profileId, recipientUserId, message, parentMessageId } = req.body;

    if (!profileId || !recipientUserId || !message) {
      return res.status(400).json({ error: '請提供必要的訊息資訊' });
    }

    // 獲取發送者資訊
    const sender = await userModel.findById(senderId);
    if (!sender) {
      return res.status(404).json({ error: '發送者不存在' });
    }

    // 檢查發送者是否完成 Email 驗證
    if (!sender.emailVerified) {
      return res.status(403).json({
        error: '發送訊息需要先完成 Email 驗證',
        requiresVerification: 'email',
      });
    }

    // 獲取收件者資訊
    const recipient = await userModel.findById(recipientUserId);
    if (!recipient) {
      return res.status(404).json({ error: '收件者不存在' });
    }

    // 如果是回覆訊息，檢查 parentMessageId
    let threadId: string | null = null;
    if (parentMessageId) {
      const parentResult = await query(
        `SELECT thread_id, sender_id, recipient_id FROM messages WHERE id = $1`,
        [parentMessageId]
      );
      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: '原始訊息不存在' });
      }
      const parent = parentResult.rows[0];
      // 確保回覆的對象正確
      if (sender.role === 'client') {
        // 茶客回覆：必須是發送給該佳麗的訊息
        if (parent.recipient_id !== recipientUserId) {
          return res.status(403).json({ error: '無法回覆此訊息' });
        }
      } else if (sender.role === 'provider') {
        // 佳麗回覆：必須是該佳麗收到的訊息
        if (parent.sender_id !== senderId && parent.recipient_id !== senderId) {
          return res.status(403).json({ error: '無法回覆此訊息' });
        }
      }
      threadId = parent.thread_id || parentMessageId;
    } else {
      // 新訊息：檢查角色限制
      if (sender.role !== 'client') {
        return res.status(403).json({ error: '只有茶客可以發送新訊息給佳麗' });
      }
      if (recipient.role !== 'provider') {
        return res.status(403).json({ error: '只能發送訊息給佳麗' });
      }
    }

    // 檢查訊息長度
    if (message.length > 1000) {
      return res.status(400).json({ error: '訊息長度不能超過 1000 字' });
    }

    // 創建訊息
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    
    // 如果沒有 threadId，使用 messageId 作為 threadId（新對話）
    if (!threadId) {
      threadId = messageId;
    }

    await query(
      `INSERT INTO messages (id, sender_id, recipient_id, profile_id, parent_message_id, thread_id, message, created_at, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [messageId, senderId, recipientUserId, profileId, parentMessageId || null, threadId, message.trim(), createdAt, false]
    );

    // 獲取 Profile 資訊（用於返回聯絡資訊）
    let profile = null;
    try {
      const { profileModel } = await import('../models/Profile.js');
      profile = await profileModel.getById(profileId);
    } catch (error) {
      console.error('獲取 Profile 資訊失敗:', error);
      // 不阻止訊息發送，只記錄錯誤
    }

    // 創建通知給收件者（僅新訊息時通知，回覆不通知）
    if (!parentMessageId) {
      try {
        const { notificationModel } = await import('../models/Notification.js');
        const senderName = sender.userName || sender.email || sender.phoneNumber || '一位茶客';
        
        await notificationModel.create({
          userId: recipientUserId,
          type: 'message',
          title: '新的訊息',
          content: `${senderName} 發送了訊息給您\n\n訊息內容：${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\n請登入查看完整訊息並回覆。`,
          link: `/user-profile?tab=messages`,
          metadata: {
            messageId: messageId,
            senderId: senderId,
            profileId: profileId,
            senderName: senderName,
          },
        });
        console.log(`已發送訊息通知給佳麗 ${recipientUserId}`);
      } catch (error) {
        console.error('發送訊息通知失敗:', error);
        // 不阻止訊息發送，只記錄錯誤
      }
    }

    res.status(201).json({
      success: true,
      message: {
        id: messageId,
        senderId,
        recipientId: recipientUserId,
        profileId,
        parentMessageId: parentMessageId || null,
        threadId,
        message: message.trim(),
        createdAt,
        isRead: false,
      },
      // 返回聯絡資訊（僅新訊息時返回，讓茶客知道如何進一步聯繫）
      contactInfo: !parentMessageId && profile?.contactInfo ? profile.contactInfo : null,
    });
  } catch (error: any) {
    console.error('發送訊息失敗:', error);
    res.status(500).json({ error: error.message || '發送訊息失敗' });
  }
});

// GET /api/messages/my - 獲取我的訊息（收件箱）
router.get('/my', async (req: any, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // 獲取用戶資訊以判斷角色
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 根據角色決定查詢條件：
    // - 佳麗（provider）：查看收到的訊息（recipient_id = userId）
    // - 茶客（client）：查看發送的訊息（sender_id = userId）
    const isProvider = user.role === 'provider';
    const whereCondition = isProvider 
      ? 'm.recipient_id = $1' 
      : 'm.sender_id = $1';

    // 獲取訊息（按 thread_id 分組，只返回每個對話串的最新訊息）
    // 使用子查詢獲取每個對話串的最新訊息
    const result = await query(
      `SELECT 
        m.id,
        m.sender_id as "senderId",
        m.recipient_id as "recipientId",
        m.profile_id as "profileId",
        m.parent_message_id as "parentMessageId",
        m.thread_id as "threadId",
        m.message,
        m.is_read as "isRead",
        m.created_at as "createdAt",
        u.user_name as "senderName",
        u.email as "senderEmail",
        u.avatar_url as "senderAvatarUrl",
        r.user_name as "recipientName",
        r.email as "recipientEmail",
        r.avatar_url as "recipientAvatarUrl",
        p.name as "profileName",
        p."imageUrl" as "profileImageUrl",
        (SELECT COUNT(*) FROM messages WHERE thread_id = m.thread_id) as "threadCount"
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN users r ON m.recipient_id = r.id
       LEFT JOIN profiles p ON m.profile_id = p.id
       WHERE ${whereCondition}
         AND m.id = (
           SELECT id FROM messages 
           WHERE thread_id = m.thread_id 
           ORDER BY created_at DESC 
           LIMIT 1
         )
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const messages = result.rows.map((row: any) => ({
      id: row.id,
      senderId: row.senderId,
      recipientId: row.recipientId,
      profileId: row.profileId,
      parentMessageId: row.parentMessageId,
      threadId: row.threadId,
      message: row.message,
      isRead: row.isRead,
      createdAt: row.createdAt,
      threadCount: parseInt(row.threadCount, 10),
      sender: {
        id: row.senderId,
        name: row.senderName,
        email: row.senderEmail,
        avatarUrl: row.senderAvatarUrl,
      },
      recipient: {
        id: row.recipientId,
        name: row.recipientName,
        email: row.recipientEmail,
        avatarUrl: row.recipientAvatarUrl,
      },
      profile: {
        id: row.profileId,
        name: row.profileName,
        imageUrl: row.profileImageUrl,
      },
    }));

    // 獲取未讀訊息數量（僅佳麗有未讀概念，茶客發送的訊息不計算未讀）
    let unreadCount = 0;
    if (isProvider) {
      const unreadResult = await query(
        `SELECT COUNT(*) as count
         FROM messages
         WHERE recipient_id = $1 AND is_read = FALSE`,
        [userId]
      );
      unreadCount = parseInt(unreadResult.rows[0].count, 10);
    }

    res.json({
      messages,
      unreadCount,
      total: messages.length,
    });
  } catch (error: any) {
    console.error('獲取訊息失敗:', error);
    res.status(500).json({ error: error.message || '獲取訊息失敗' });
  }
});

// PUT /api/messages/:id/read - 標記訊息為已讀
router.put('/:id/read', async (req: any, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const messageId = req.params.id;

    await query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE id = $1 AND recipient_id = $2`,
      [messageId, userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('標記已讀失敗:', error);
    res.status(500).json({ error: error.message || '標記已讀失敗' });
  }
});

// PUT /api/messages/read-all - 標記所有訊息為已讀
router.put('/read-all', async (req: any, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;

    await query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('全部標記已讀失敗:', error);
    res.status(500).json({ error: error.message || '全部標記已讀失敗' });
  }
});

// GET /api/messages/thread/:threadId - 獲取對話串的所有訊息
router.get('/thread/:threadId', async (req: any, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const threadId = req.params.threadId;

    // 驗證用戶有權限查看此對話串
    const checkResult = await query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE thread_id = $1 AND (sender_id = $2 OR recipient_id = $2)`,
      [threadId, userId]
    );

    if (parseInt(checkResult.rows[0].count, 10) === 0) {
      return res.status(403).json({ error: '無權限查看此對話串' });
    }

    // 獲取對話串的所有訊息
    const result = await query(
      `SELECT 
        m.id,
        m.sender_id as "senderId",
        m.recipient_id as "recipientId",
        m.profile_id as "profileId",
        m.parent_message_id as "parentMessageId",
        m.thread_id as "threadId",
        m.message,
        m.is_read as "isRead",
        m.created_at as "createdAt",
        u.user_name as "senderName",
        u.email as "senderEmail",
        u.avatar_url as "senderAvatarUrl",
        r.user_name as "recipientName",
        r.email as "recipientEmail",
        r.avatar_url as "recipientAvatarUrl",
        p.name as "profileName",
        p."imageUrl" as "profileImageUrl"
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN users r ON m.recipient_id = r.id
       LEFT JOIN profiles p ON m.profile_id = p.id
       WHERE m.thread_id = $1
       ORDER BY m.created_at ASC`,
      [threadId]
    );

    const messages = result.rows.map((row: any) => ({
      id: row.id,
      senderId: row.senderId,
      recipientId: row.recipientId,
      profileId: row.profileId,
      parentMessageId: row.parentMessageId,
      threadId: row.threadId,
      message: row.message,
      isRead: row.isRead,
      createdAt: row.createdAt,
      sender: {
        id: row.senderId,
        name: row.senderName,
        email: row.senderEmail,
        avatarUrl: row.senderAvatarUrl,
      },
      recipient: {
        id: row.recipientId,
        name: row.recipientName,
        email: row.recipientEmail,
        avatarUrl: row.recipientAvatarUrl,
      },
      profile: {
        id: row.profileId,
        name: row.profileName,
        imageUrl: row.profileImageUrl,
      },
    }));

    res.json({ messages });
  } catch (error: any) {
    console.error('獲取對話串失敗:', error);
    res.status(500).json({ error: error.message || '獲取對話串失敗' });
  }
});

// DELETE /api/messages/:id - 刪除訊息
router.delete('/:id', async (req: any, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId as string;
    const messageId = req.params.id;

    // 只能刪除自己收到的訊息或發送的訊息
    await query(
      `DELETE FROM messages
       WHERE id = $1 AND (recipient_id = $2 OR sender_id = $2)`,
      [messageId, userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('刪除訊息失敗:', error);
    res.status(500).json({ error: error.message || '刪除訊息失敗' });
  }
});

export default router;

