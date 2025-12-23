import { Router } from 'express';
import { articleModel } from '../models/Article.js';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
// GET /api/articles - Get all articles
router.get('/', (req, res) => {
    try {
        const articles = articleModel.getAll();
        res.json(articles);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/articles/:id - Get article by ID
router.get('/:id', (req, res) => {
    try {
        const article = articleModel.getById(req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        // Increment views when viewing article
        articleModel.incrementViews(req.params.id);
        article.views += 1;
        res.json(article);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/articles - Create new article
router.post('/', (req, res) => {
    try {
        const articleData = {
            id: req.body.id || uuidv4(),
            ...req.body,
        };
        // Validate required fields
        if (!articleData.title || !articleData.summary || !articleData.imageUrl) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const article = articleModel.create(articleData);
        res.status(201).json(article);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/articles/:id - Update article
router.put('/:id', (req, res) => {
    try {
        const article = articleModel.update(req.params.id, req.body);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        res.json(article);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/articles/:id - Delete article
router.delete('/:id', (req, res) => {
    try {
        const deleted = articleModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Article not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=articles.js.map