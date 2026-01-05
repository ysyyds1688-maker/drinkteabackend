import { Router } from 'express';
import { favoriteModel } from '../models/Favorite.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 获取用户信息（用于权限检查）
const getUserFromRequest = async (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return payload;
};

// 添加收藏（已經是繁體）
router.post('/', async (req, res) => {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: '请提供 Profile ID' });
    }
    
    const favorite = await favoriteModel.create(payload.userId, profileId);
    res.status(201).json(favorite);
  } catch (error: any) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: error.message || '添加收藏失敗' });
  }
});

// 删除收藏
router.delete('/:profileId', async (req, res) => {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const { profileId } = req.params;
    const success = await favoriteModel.delete(payload.userId, profileId);
    
    if (!success) {
      return res.status(404).json({ error: '收藏不存在' });
    }
    
    res.json({ message: '取消收藏成功' });
  } catch (error: any) {
    console.error('Delete favorite error:', error);
    res.status(500).json({ error: error.message || '取消收藏失敗' });
  }
});

// 检查是否已收藏
router.get('/check/:profileId', async (req, res) => {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return res.json({ isFavorited: false });
    }
    
    const { profileId } = req.params;
    const isFavorited = await favoriteModel.isFavorited(payload.userId, profileId);
    res.json({ isFavorited });
  } catch (error: any) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: error.message || '檢查收藏失敗' });
  }
});

// 获取我的收藏列表
router.get('/my', async (req, res) => {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    const favorites = await favoriteModel.getByUserId(payload.userId);
    
    // 获取每个收藏的 profile 信息
    const { profileModel } = await import('../models/Profile.js');
    const profiles = await Promise.all(
      favorites.map(fav => profileModel.getById(fav.profileId))
    );
    
    res.json({
      favorites: favorites.filter((_, i) => profiles[i] !== null),
      profiles: profiles.filter(p => p !== null),
    });
  } catch (error: any) {
    console.error('Get my favorites error:', error);
    res.status(500).json({ error: error.message || '获取收藏列表失败' });
  }
});

export default router;

