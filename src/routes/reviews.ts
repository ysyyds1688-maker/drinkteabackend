import { Router } from 'express';
import { reviewModel } from '../models/Review.js';
import { userModel } from '../models/User.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

// 获取用户状态（用于评论权限控制）
const getUserStatus = async (req: any): Promise<'guest' | 'logged_in' | 'subscribed'> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 'guest';
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return 'guest';
  }
  
  const user = await userModel.findById(payload.userId);
  if (!user) {
    return 'guest';
  }
  
  // 检查订阅状态（非免费会员且未过期）
  if (user.membershipLevel !== 'tea_guest') {
    // 检查是否过期
    if (user.membershipExpiresAt) {
      const expiresAt = new Date(user.membershipExpiresAt);
      if (expiresAt > new Date()) {
        return 'subscribed';
      }
    } else {
      // 如果没有到期时间，视为永久订阅
      return 'subscribed';
    }
  }
  
  return 'logged_in';
};

// 获取评论（根据用户权限返回不同数量）
router.get('/profiles/:profileId/reviews', async (req, res) => {
  try {
    const { profileId } = req.params;
    const userStatus = await getUserStatus(req);
    
    // 获取用户ID（如果已登录）
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }
    
    // 获取所有评论
    const allReviews = await reviewModel.getByProfileId(profileId, userId);
    
    // 根据权限返回不同数量
    let visibleReviews: typeof allReviews;
    if (userStatus === 'guest') {
      visibleReviews = [];
    } else if (userStatus === 'logged_in') {
      visibleReviews = allReviews.slice(0, 2); // 只返回2则
    } else {
      visibleReviews = allReviews; // 返回全部
    }
    
    // 获取平均评分
    const averageRating = await reviewModel.getAverageRating(profileId);
    
    res.json({
      reviews: visibleReviews,
      total: allReviews.length,
      visibleCount: visibleReviews.length,
      userStatus,
      canSeeAll: userStatus === 'subscribed',
      averageRating: Math.round(averageRating * 10) / 10, // 四舍五入到小数点后1位
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: error.message || '获取评论失败' });
  }
});

// 创建评论（需要登录）
router.post('/profiles/:profileId/reviews', async (req, res) => {
  try {
    const { profileId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const { rating, comment, serviceType, clientName } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须在1-5之间' });
    }
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: '请输入评论内容' });
    }
    
    const review = await reviewModel.create({
      profileId,
      clientId: payload.userId,
      clientName: clientName || undefined,
      rating,
      comment: comment.trim(),
      serviceType: serviceType || undefined,
    });
    
    res.status(201).json(review);
  } catch (error: any) {
    console.error('Create review error:', error);
    res.status(500).json({ error: error.message || '创建评论失败' });
  }
});

// 更新评论（仅限自己的）
router.put('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const { rating, comment, serviceType } = req.body;
    const updateData: any = {};
    
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    
    const review = await reviewModel.update(reviewId, payload.userId, updateData);
    
    if (!review) {
      return res.status(403).json({ error: '无权修改此评论' });
    }
    
    res.json(review);
  } catch (error: any) {
    console.error('Update review error:', error);
    res.status(500).json({ error: error.message || '更新评论失败' });
  }
});

// 删除评论（仅限自己的）
router.delete('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const success = await reviewModel.delete(reviewId, payload.userId);
    
    if (!success) {
      return res.status(403).json({ error: '无权删除此评论' });
    }
    
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: error.message || '删除评论失败' });
  }
});

// 点赞/取消点赞评论
router.post('/reviews/:reviewId/like', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const liked = await reviewModel.toggleLike(reviewId, payload.userId);
    
    res.json({ liked });
  } catch (error: any) {
    console.error('Like review error:', error);
    res.status(500).json({ error: error.message || '点赞失败' });
  }
});

// 回复评论（Provider 或 Admin）
router.post('/reviews/:reviewId/reply', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ error: 'Token 无效' });
    }
    
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 只有 provider 或 admin 可以回复
    if (user.role !== 'provider' && user.role !== 'admin') {
      return res.status(403).json({ error: '无权回复评论' });
    }
    
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '请输入回复内容' });
    }
    
    const replyType = user.role === 'admin' ? 'admin' : 'provider';
    const reply = await reviewModel.addReply(reviewId, replyType, payload.userId, content.trim());
    
    res.status(201).json(reply);
  } catch (error: any) {
    console.error('Reply review error:', error);
    res.status(500).json({ error: error.message || '回复失败' });
  }
});

export default router;

