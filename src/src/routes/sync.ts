import { Router } from 'express';
import { profileModel } from '../models/Profile.js';
import { articleModel } from '../models/Article.js';
import { Profile, Article } from '../types.js';

const router = Router();

// POST /api/sync/profiles - 從前端同步 Profiles
router.post('/profiles', async (req, res) => {
  try {
    const profiles: Profile[] = req.body.profiles || [];
    
    if (!Array.isArray(profiles)) {
      return res.status(400).json({ error: 'profiles must be an array' });
    }

    let added = 0;
    let updated = 0;

    for (const profile of profiles) {
      if (!profile.id) {
        return res.status(400).json({ error: 'Profile must have an id' });
      }

      const existing = await profileModel.getById(profile.id);
      if (existing) {
        await profileModel.update(profile.id, profile);
        updated++;
      } else {
        await profileModel.create(profile);
        added++;
      }
    }

    res.json({
      success: true,
      added,
      updated,
      total: profiles.length,
      message: `成功同步 ${added} 筆新增, ${updated} 筆更新`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sync/articles - 從前端同步 Articles
router.post('/articles', async (req, res) => {
  try {
    const articles: Article[] = req.body.articles || [];
    
    if (!Array.isArray(articles)) {
      return res.status(400).json({ error: 'articles must be an array' });
    }

    let added = 0;
    let updated = 0;

    for (const article of articles) {
      if (!article.id) {
        return res.status(400).json({ error: 'Article must have an id' });
      }

      const existing = await articleModel.getById(article.id);
      if (existing) {
        await articleModel.update(article.id, article);
        updated++;
      } else {
        await articleModel.create(article);
        added++;
      }
    }

    res.json({
      success: true,
      added,
      updated,
      total: articles.length,
      message: `成功同步 ${added} 筆新增, ${updated} 筆更新`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sync/all - 同步所有資料
router.post('/all', async (req, res) => {
  try {
    const { profiles = [], articles = [] } = req.body;
    
    let profilesAdded = 0;
    let profilesUpdated = 0;
    let articlesAdded = 0;
    let articlesUpdated = 0;

    // 同步 Profiles
    for (const profile of profiles) {
      if (!profile.id) continue;
      const existing = await profileModel.getById(profile.id);
      if (existing) {
        await profileModel.update(profile.id, profile);
        profilesUpdated++;
      } else {
        await profileModel.create(profile);
        profilesAdded++;
      }
    }

    // 同步 Articles
    for (const article of articles) {
      if (!article.id) continue;
      const existing = await articleModel.getById(article.id);
      if (existing) {
        await articleModel.update(article.id, article);
        articlesUpdated++;
      } else {
        await articleModel.create(article);
        articlesAdded++;
      }
    }

    res.json({
      success: true,
      profiles: {
        added: profilesAdded,
        updated: profilesUpdated,
        total: profiles.length
      },
      articles: {
        added: articlesAdded,
        updated: articlesUpdated,
        total: articles.length
      },
      message: `成功同步 Profiles: ${profilesAdded} 新增, ${profilesUpdated} 更新 | Articles: ${articlesAdded} 新增, ${articlesUpdated} 更新`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
