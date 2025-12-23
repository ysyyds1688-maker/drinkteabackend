import { Router } from 'express';
import { profileModel } from '../models/Profile.js';
import { articleModel } from '../models/Article.js';
import { v4 as uuidv4 } from 'uuid';
import { Profile, Article } from '../types.js';

const router = Router();

// ==================== 統計資訊 ====================
// GET /api/admin/stats - 取得後台統計資訊
router.get('/stats', (req, res) => {
  try {
    const profiles = profileModel.getAll();
    const articles = articleModel.getAll();
    
    const stats = {
      profiles: {
        total: profiles.length,
        available: profiles.filter(p => p.isAvailable).length,
        unavailable: profiles.filter(p => !p.isAvailable).length,
        new: profiles.filter(p => p.isNew).length,
        byType: {
          outcall: profiles.filter(p => p.type === 'outcall').length,
          incall: profiles.filter(p => p.type === 'incall').length,
        },
        byLocation: profiles.reduce((acc, p) => {
          acc[p.location] = (acc[p.location] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      articles: {
        total: articles.length,
        totalViews: articles.reduce((sum, a) => sum + (a.views || 0), 0),
        byTag: articles.reduce((acc, a) => {
          acc[a.tag] = (acc[a.tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      updatedAt: new Date().toISOString(),
    };
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Profile 管理 ====================
// GET /api/admin/profiles - 取得所有 profiles（管理用，包含更多資訊）
router.get('/profiles', (req, res) => {
  try {
    const profiles = profileModel.getAll();
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/profiles/:id - 取得單一 profile
router.get('/profiles/:id', (req, res) => {
  try {
    const profile = profileModel.getById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/profiles - 建立新 profile（上架新茶）
router.post('/profiles', (req, res) => {
  try {
    const profileData: Profile = {
      id: req.body.id || uuidv4(),
      ...req.body,
    };

    // Validate required fields
    if (!profileData.name || !profileData.nationality || !profileData.location) {
      return res.status(400).json({ error: 'Missing required fields: name, nationality, location' });
    }

    // Set defaults
    if (!profileData.imageUrl && profileData.gallery && profileData.gallery.length > 0) {
      profileData.imageUrl = profileData.gallery[0];
    }

    if (!profileData.prices) {
      profileData.prices = {
        oneShot: { price: profileData.price || 3000, desc: '一節/50min/1S' },
        twoShot: { price: (profileData.price || 3000) * 2 - 500, desc: '兩節/100min/2S' }
      };
    }

    if (!profileData.availableTimes) {
      profileData.availableTimes = {
        today: '12:00~02:00',
        tomorrow: '12:00~02:00'
      };
    }

    const profile = profileModel.create(profileData);
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/profiles/:id - 更新 profile（編輯茶茶）
router.put('/profiles/:id', (req, res) => {
  try {
    const profile = profileModel.update(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/profiles/:id - 部分更新 profile（例如只更新可用狀態）
router.patch('/profiles/:id', (req, res) => {
  try {
    const existing = profileModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const updated = { ...existing, ...req.body };
    const profile = profileModel.update(req.params.id, updated);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/profiles/:id - 刪除 profile（下架）
router.delete('/profiles/:id', (req, res) => {
  try {
    const deleted = profileModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/profiles/batch - 批量操作 profiles
router.post('/profiles/batch', (req, res) => {
  try {
    const { action, ids, data } = req.body;
    
    if (!action || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: action and ids array required' });
    }

    const results: any[] = [];
    
    switch (action) {
      case 'delete':
        ids.forEach((id: string) => {
          const deleted = profileModel.delete(id);
          results.push({ id, success: deleted });
        });
        break;
        
      case 'update':
        if (!data) {
          return res.status(400).json({ error: 'Data required for update action' });
        }
        ids.forEach((id: string) => {
          const updated = profileModel.update(id, data);
          results.push({ id, success: !!updated, data: updated });
        });
        break;
        
      case 'toggle-availability':
        ids.forEach((id: string) => {
          const existing = profileModel.getById(id);
          if (existing) {
            const updated = profileModel.update(id, { isAvailable: !existing.isAvailable });
            results.push({ id, success: !!updated, isAvailable: updated?.isAvailable });
          } else {
            results.push({ id, success: false });
          }
        });
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action. Supported: delete, update, toggle-availability' });
    }
    
    res.json({ results, total: results.length, success: results.filter(r => r.success).length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Article 管理 ====================
// GET /api/admin/articles - 取得所有 articles（管理用）
router.get('/articles', (req, res) => {
  try {
    const articles = articleModel.getAll();
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/articles/:id - 取得單一 article
router.get('/articles/:id', (req, res) => {
  try {
    const article = articleModel.getById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/articles - 建立新 article（發布新文章）
router.post('/articles', (req, res) => {
  try {
    const articleData: Article = {
      id: req.body.id || uuidv4(),
      ...req.body,
    };

    // Validate required fields
    if (!articleData.title || !articleData.summary || !articleData.imageUrl) {
      return res.status(400).json({ error: 'Missing required fields: title, summary, imageUrl' });
    }

    // Set defaults
    if (!articleData.date) {
      articleData.date = new Date().toISOString().split('T')[0];
    }
    if (articleData.views === undefined) {
      articleData.views = 0;
    }
    if (!articleData.tag) {
      articleData.tag = '外送茶';
    }

    const article = articleModel.create(articleData);
    res.status(201).json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/articles/:id - 更新 article（編輯文章）
router.put('/articles/:id', (req, res) => {
  try {
    const article = articleModel.update(req.params.id, req.body);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/articles/:id - 刪除 article
router.delete('/articles/:id', (req, res) => {
  try {
    const deleted = articleModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/articles/batch - 批量操作 articles
router.post('/articles/batch', (req, res) => {
  try {
    const { action, ids, data } = req.body;
    
    if (!action || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: action and ids array required' });
    }

    const results: any[] = [];
    
    switch (action) {
      case 'delete':
        ids.forEach((id: string) => {
          const deleted = articleModel.delete(id);
          results.push({ id, success: deleted });
        });
        break;
        
      case 'update':
        if (!data) {
          return res.status(400).json({ error: 'Data required for update action' });
        }
        ids.forEach((id: string) => {
          const updated = articleModel.update(id, data);
          results.push({ id, success: !!updated, data: updated });
        });
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action. Supported: delete, update' });
    }
    
    res.json({ results, total: results.length, success: results.filter(r => r.success).length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

