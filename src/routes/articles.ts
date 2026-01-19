import { Router } from 'express';
import { articleModel } from '../models/Article.js';
import { v4 as uuidv4 } from 'uuid';
import { Article } from '../types.js';
import { articlesCache, articleDetailCache } from '../middleware/cacheMiddleware.js';
import { queryLimiter } from '../middleware/queryLimiter.js';

const router = Router();

// GET /api/articles - Get all articles (支持分頁，帶緩存和查詢限制)
router.get('/', queryLimiter, articlesCache, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
    
    const result = await articleModel.getAll({ limit, offset });
    
    // 返回分頁結果
    res.json({
      articles: result.articles,
      total: result.total,
      limit: limit || result.total,
      offset: offset || 0,
      hasMore: offset !== undefined && limit !== undefined ? (offset + limit) < result.total : false
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/articles/:id - Get article by ID (帶緩存)
router.get('/:id', articleDetailCache, async (req, res) => {
  try {
    const article = await articleModel.getById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Increment views when viewing article
    await articleModel.incrementViews(req.params.id);
    article.views += 1;
    
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/articles - Create new article
router.post('/', async (req, res) => {
  try {
    const articleData: Article = {
      id: req.body.id || uuidv4(),
      ...req.body,
    };

    // Validate required fields
    if (!articleData.title || !articleData.summary || !articleData.imageUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const article = await articleModel.create(articleData);
    res.status(201).json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/articles/:id - Update article
router.put('/:id', async (req, res) => {
  try {
    const article = await articleModel.update(req.params.id, req.body);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await articleModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
