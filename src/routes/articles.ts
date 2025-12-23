import { Router } from 'express';
import { articleModel } from '../models/Article.js';
import { v4 as uuidv4 } from 'uuid';
import { Article } from '../types.js';

const router = Router();

// GET /api/articles - Get all articles
router.get('/', async (req, res) => {
  try {
    const articles = await articleModel.getAll();
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/articles/:id - Get article by ID
router.get('/:id', async (req, res) => {
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
