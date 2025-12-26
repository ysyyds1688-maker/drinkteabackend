import { Router } from 'express';
import multer from 'multer';
import { importService } from '../services/importService.js';
import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../types.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/import/line - Line 消息导入
router.post('/line', async (req, res) => {
  try {
    const { message, autoApprove = false, force = false } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // 解析 Line 消息（这里需要调用 Gemini API 或实现具体解析逻辑）
    // 暂时使用 Gemini API 解析
    try {
      const geminiRes = await fetch(`${req.protocol}://${req.get('host')}/api/gemini/parse-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
      });
      
      if (!geminiRes.ok) {
        throw new Error('Failed to parse Line message');
      }
      
      const parsedProfile = await geminiRes.json() as Partial<Profile>;
      const profiles: Partial<Profile>[] = [parsedProfile];
      
      if (profiles.length === 0) {
        return res.status(400).json({ error: 'No profiles found in message' });
      }

      // 导入
      const result = await importService.importProfiles(profiles, {
        autoApprove,
        force,
        sourceType: 'line'
      });

      // 记录导入历史
      await query(`
        INSERT INTO import_history (id, source_type, source_data, profiles_count, 
                                    success_count, duplicate_count, error_count, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        'line',
        JSON.stringify({ message }),
        profiles.length,
        result.success.length,
        result.duplicates.length,
        result.errors.length,
        'completed'
      ]);

      res.json({
        total: profiles.length,
        success: result.success.length,
        duplicates: result.duplicates.length,
        errors: result.errors.length,
        details: result
      });
    } catch (parseError: any) {
      return res.status(500).json({ error: `Failed to parse message: ${parseError.message}` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/csv - CSV 文件导入
router.post('/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const autoApprove = req.body.autoApprove === 'true';
    const force = req.body.force === 'true';

    // 解析 CSV
    const profiles = importService.parseCSV(csvText);
    
    if (profiles.length === 0) {
      return res.status(400).json({ error: 'No profiles found in CSV' });
    }

    // 导入
    const result = await importService.importProfiles(profiles, {
      autoApprove,
      force,
      sourceType: 'csv'
    });

    // 记录导入历史
    await query(`
      INSERT INTO import_history (id, source_type, source_data, profiles_count, 
                                  success_count, duplicate_count, error_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      'csv',
      JSON.stringify({ filename: req.file.originalname }),
      profiles.length,
      result.success.length,
      result.duplicates.length,
      result.errors.length,
      'completed'
    ]);

    res.json({
      total: profiles.length,
      success: result.success.length,
      duplicates: result.duplicates.length,
      errors: result.errors.length,
      details: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/telegram - Telegram 消息导入
router.post('/telegram', async (req, res) => {
  try {
    const { data, autoApprove = false, force = false } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Telegram data is required' });
    }

    // 解析 Telegram 消息
    const profiles = importService.parseTelegramMessage(data);
    
    if (profiles.length === 0) {
      // 如果没有解析到，尝试使用 Gemini API 解析文本
      if (data.message?.text) {
        try {
          const geminiRes = await fetch(`${req.protocol}://${req.get('host')}/api/gemini/parse-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: data.message.text })
          });
          
            if (geminiRes.ok) {
              const parsedProfile = await geminiRes.json() as Partial<Profile>;
              profiles.push(parsedProfile);
            }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    if (profiles.length === 0) {
      return res.status(400).json({ error: 'No profiles found in Telegram message' });
    }

    // 导入
    const result = await importService.importProfiles(profiles, {
      autoApprove,
      force,
      sourceType: 'telegram'
    });

    // 记录导入历史
    await query(`
      INSERT INTO import_history (id, source_type, source_data, profiles_count, 
                                  success_count, duplicate_count, error_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      'telegram',
      JSON.stringify(data),
      profiles.length,
      result.success.length,
      result.duplicates.length,
      result.errors.length,
      'completed'
    ]);

    res.json({
      total: profiles.length,
      success: result.success.length,
      duplicates: result.duplicates.length,
      errors: result.errors.length,
      details: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/batch - 批量导入（通用接口）
router.post('/batch', async (req, res) => {
  try {
    const { profiles, autoApprove = false, force = false, sourceType = 'manual' } = req.body;
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({ error: 'profiles must be a non-empty array' });
    }

    // 导入
    const result = await importService.importProfiles(profiles, {
      autoApprove,
      force,
      sourceType
    });

    // 记录导入历史
    await query(`
      INSERT INTO import_history (id, source_type, source_data, profiles_count, 
                                  success_count, duplicate_count, error_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      uuidv4(),
      sourceType,
      JSON.stringify({ profiles }),
      profiles.length,
      result.success.length,
      result.duplicates.length,
      result.errors.length,
      'completed'
    ]);

    res.json({
      total: profiles.length,
      success: result.success.length,
      duplicates: result.duplicates.length,
      errors: result.errors.length,
      details: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

