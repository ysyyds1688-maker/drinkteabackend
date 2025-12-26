import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface Review {
  id: string;
  profileId: string;
  clientId: string;
  clientName?: string;
  clientAvatarUrl?: string; // 评论者头像
  rating: number;
  comment: string;
  serviceType?: string;
  isVerified: boolean;
  isVisible: boolean;
  likes: number;
  createdAt: string;
  updatedAt: string;
  replies?: ReviewReply[];
  userLiked?: boolean;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  replyType: 'provider' | 'admin';
  authorId?: string;
  content: string;
  createdAt: string;
}

export interface CreateReviewData {
  profileId: string;
  clientId: string;
  clientName?: string;
  rating: number;
  comment: string;
  serviceType?: string;
}

export const reviewModel = {
  // 根据 profile_id 获取所有评论
  getByProfileId: async (profileId: string, userId?: string): Promise<Review[]> => {
    const result = await query(`
      SELECT r.*, 
        u.avatar_url as client_avatar_url,
        COUNT(rl.id) as likes_count,
        CASE WHEN EXISTS (
          SELECT 1 FROM review_likes rl2 
          WHERE rl2.review_id = r.id AND rl2.user_id = $2
        ) THEN TRUE ELSE FALSE END as user_liked
      FROM reviews r
      LEFT JOIN users u ON r.client_id = u.id
      LEFT JOIN review_likes rl ON r.id = rl.review_id
      WHERE r.profile_id = $1 AND r.is_visible = TRUE
      GROUP BY r.id, u.avatar_url
      ORDER BY r.created_at DESC
    `, [profileId, userId || null]);
    
    const reviews: Review[] = [];
    for (const row of result.rows) {
      // 获取回复
      const repliesResult = await query(`
        SELECT * FROM review_replies 
        WHERE review_id = $1 
        ORDER BY created_at ASC
      `, [row.id]);
      
      reviews.push({
        id: row.id,
        profileId: row.profile_id,
        clientId: row.client_id,
        clientName: row.client_name || undefined,
        clientAvatarUrl: row.client_avatar_url || undefined,
        rating: row.rating,
        comment: row.comment,
        serviceType: row.service_type || undefined,
        isVerified: Boolean(row.is_verified),
        isVisible: Boolean(row.is_visible),
        likes: parseInt(row.likes_count) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userLiked: Boolean(row.user_liked),
        replies: repliesResult.rows.map(rr => ({
          id: rr.id,
          reviewId: rr.review_id,
          replyType: rr.reply_type,
          authorId: rr.author_id || undefined,
          content: rr.content,
          createdAt: rr.created_at,
        })),
      });
    }
    
    return reviews;
  },

  // 创建评论
  create: async (data: CreateReviewData): Promise<Review> => {
    const id = `review_${Date.now()}_${uuidv4().substring(0, 9)}`;
    
    await query(`
      INSERT INTO reviews (id, profile_id, client_id, client_name, rating, comment, service_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      data.profileId,
      data.clientId,
      data.clientName || null,
      data.rating,
      data.comment,
      data.serviceType || null,
    ]);
    
    const review = await reviewModel.getById(id, data.clientId);
    if (!review) throw new Error('Failed to create review');
    return review;
  },

  // 根据 ID 获取评论
  getById: async (id: string, userId?: string): Promise<Review | null> => {
    const result = await query(`
      SELECT r.*,
        u.avatar_url as client_avatar_url,
        COUNT(rl.id) as likes_count,
        CASE WHEN EXISTS (
          SELECT 1 FROM review_likes rl2 
          WHERE rl2.review_id = r.id AND rl2.user_id = $2
        ) THEN TRUE ELSE FALSE END as user_liked
      FROM reviews r
      LEFT JOIN users u ON r.client_id = u.id
      LEFT JOIN review_likes rl ON r.id = rl.review_id
      WHERE r.id = $1
      GROUP BY r.id, u.avatar_url
    `, [id, userId || null]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    
    // 获取回复
    const repliesResult = await query(`
      SELECT * FROM review_replies 
      WHERE review_id = $1 
      ORDER BY created_at ASC
    `, [id]);
    
    return {
      id: row.id,
      profileId: row.profile_id,
      clientId: row.client_id,
      clientName: row.client_name || undefined,
      clientAvatarUrl: row.client_avatar_url || undefined,
      rating: row.rating,
      comment: row.comment,
      serviceType: row.service_type || undefined,
      isVerified: Boolean(row.is_verified),
      isVisible: Boolean(row.is_visible),
      likes: parseInt(row.likes_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userLiked: Boolean(row.user_liked),
      replies: repliesResult.rows.map(rr => ({
        id: rr.id,
        reviewId: rr.review_id,
        replyType: rr.reply_type,
        authorId: rr.author_id || undefined,
        content: rr.content,
        createdAt: rr.created_at,
      })),
    };
  },

  // 更新评论
  update: async (id: string, clientId: string, data: Partial<CreateReviewData>): Promise<Review | null> => {
    // 检查是否是评论所有者
    const existing = await reviewModel.getById(id);
    if (!existing || existing.clientId !== clientId) {
      return null;
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (data.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`);
      params.push(data.rating);
    }
    if (data.comment !== undefined) {
      updates.push(`comment = $${paramIndex++}`);
      params.push(data.comment);
    }
    if (data.serviceType !== undefined) {
      updates.push(`service_type = $${paramIndex++}`);
      params.push(data.serviceType);
    }
    
    if (updates.length === 0) {
      return await reviewModel.getById(id, clientId);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    await query(`
      UPDATE reviews 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, params);
    
    return await reviewModel.getById(id, clientId);
  },

  // 删除评论
  delete: async (id: string, clientId: string): Promise<boolean> => {
    // 检查是否是评论所有者
    const existing = await reviewModel.getById(id);
    if (!existing || existing.clientId !== clientId) {
      return false;
    }
    
    const result = await query('DELETE FROM reviews WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },

  // 点赞/取消点赞
  toggleLike: async (reviewId: string, userId: string): Promise<boolean> => {
    // 检查是否已点赞
    const existing = await query(
      'SELECT id FROM review_likes WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );
    
    if (existing.rows.length > 0) {
      // 取消点赞
      await query(
        'DELETE FROM review_likes WHERE review_id = $1 AND user_id = $2',
        [reviewId, userId]
      );
      return false;
    } else {
      // 点赞
      const likeId = `like_${Date.now()}_${uuidv4().substring(0, 9)}`;
      await query(
        'INSERT INTO review_likes (id, review_id, user_id) VALUES ($1, $2, $3)',
        [likeId, reviewId, userId]
      );
      return true;
    }
  },

  // 添加回复
  addReply: async (reviewId: string, replyType: 'provider' | 'admin', authorId: string, content: string): Promise<ReviewReply> => {
    const id = `reply_${Date.now()}_${uuidv4().substring(0, 9)}`;
    
    await query(`
      INSERT INTO review_replies (id, review_id, reply_type, author_id, content)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, reviewId, replyType, authorId, content]);
    
    const result = await query('SELECT * FROM review_replies WHERE id = $1', [id]);
    const row = result.rows[0];
    
    return {
      id: row.id,
      reviewId: row.review_id,
      replyType: row.reply_type,
      authorId: row.author_id || undefined,
      content: row.content,
      createdAt: row.created_at,
    };
  },

  // 获取平均评分
  getAverageRating: async (profileId: string): Promise<number> => {
    const result = await query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as count
      FROM reviews
      WHERE profile_id = $1 AND is_visible = TRUE
    `, [profileId]);
    
    if (result.rows.length === 0 || !result.rows[0].avg_rating) {
      return 0;
    }
    
    return parseFloat(result.rows[0].avg_rating);
  },
};

