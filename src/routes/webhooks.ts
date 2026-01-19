import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/database.js';
import { importService } from '../services/importService.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../types.js';

const router = Router();

// POST /api/webhooks/:id - 接收 Webhook 请求
router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找 webhook 配置
    const webhookResult = await query(
      'SELECT * FROM webhooks WHERE id = $1 AND is_active = 1',
      [id]
    );

    if (webhookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found or inactive' });
    }

    const webhook = webhookResult.rows[0];

    // 验证签名（如果配置了 secret）
    if (webhook.secret) {
      const signature = req.headers['x-webhook-signature'] as string;
      const bodyString = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhook.secret)
        .update(bodyString)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // 根据 source_type 解析数据
    let profiles: Partial<Profile>[] = [];
    
    switch (webhook.source_type) {
      case 'line':
        if (req.body.message) {
          // 尝试使用 Gemini API 解析
          try {
            const geminiRes = await fetch(`${req.protocol}://${req.get('host')}/api/gemini/parse-profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: req.body.message })
            });
            
            if (geminiRes.ok) {
              const parsedProfile = await geminiRes.json() as Partial<Profile>;
              profiles.push(parsedProfile);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        break;
      case 'telegram':
        profiles = importService.parseTelegramMessage(req.body);
        if (profiles.length === 0 && req.body.message?.text) {
          // 尝试使用 Gemini API 解析
          try {
            const geminiRes = await fetch(`${req.protocol}://${req.get('host')}/api/gemini/parse-profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: req.body.message.text })
            });
            
            if (geminiRes.ok) {
              const parsedProfile = await geminiRes.json() as Partial<Profile>;
              profiles.push(parsedProfile);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        break;
      case 'custom':
        // 自定义格式，直接使用 req.body.profiles
        profiles = Array.isArray(req.body.profiles) ? req.body.profiles : [req.body];
        break;
      default:
        profiles = Array.isArray(req.body.profiles) ? req.body.profiles : [req.body];
    }

    if (profiles.length === 0) {
      return res.status(400).json({ error: 'No profiles found in webhook data' });
    }

    // 导入 profiles（根据 webhook 配置决定是否自动批准）
    const autoApprove = req.body.autoApprove !== false; // 默认自动批准
    const force = req.body.force === true;
    const result = await importService.importProfiles(profiles, {
      autoApprove,
      force,
      sourceType: `webhook:${webhook.source_type}`
    });

    // 更新 webhook 统计
    await query(
      `UPDATE webhooks 
       SET last_triggered = CURRENT_TIMESTAMP, 
           trigger_count = trigger_count + 1 
       WHERE id = $1`,
      [id]
    );

    // 记录导入历史
    await query(`
      INSERT INTO import_history (id, source_type, source_data, profiles_count, 
                                  success_count, duplicate_count, error_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      `webhook:${webhook.source_type}`,
      JSON.stringify(req.body),
      profiles.length,
      result.success.length,
      result.duplicates.length,
      result.errors.length,
      'completed'
    ]);

    res.json({
      success: true,
      total: profiles.length,
      imported: result.success.length,
      duplicates: result.duplicates.length,
      errors: result.errors.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/webhooks - 获取所有 webhooks
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM webhooks ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks - 创建 webhook
router.post('/', async (req, res) => {
  try {
    const { name, url, secret, sourceType } = req.body;
    
    if (!name || !url || !sourceType) {
      return res.status(400).json({ error: 'name, url, and sourceType are required' });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO webhooks (id, name, url, secret, source_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name, url, secret || null, sourceType]
    );

    res.json({
      id,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/${id}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

