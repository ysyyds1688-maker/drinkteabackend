import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface Review {
  id: string;
  profileId?: string;
  clientId: string;
  clientName?: string;
  clientAvatarUrl?: string; // 评论者头像
  targetUserId?: string; // 被評論的用戶ID（當 reviewType = 'client' 時）
  reviewType?: 'profile' | 'client'; // 評論類型：'profile' = 茶客評論佳麗, 'client' = 佳麗評論茶客
  rating: number;
  comment: string;
  serviceType?: string;
  bookingId?: string; // 關聯的預約ID
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
  profileId?: string;
  clientId: string;
  clientName?: string;
  targetUserId?: string; // 被評論的用戶ID（當 reviewType = 'client' 時）
  reviewType?: 'profile' | 'client'; // 評論類型
  rating: number;
  comment: string;
  serviceType?: string;
  bookingId?: string; // 關聯的預約ID
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
      WHERE r.profile_id = $1 
        AND r.review_type = 'profile'
        AND r.is_visible = TRUE
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
        profileId: row.profile_id || undefined,
        clientId: row.client_id,
        clientName: row.client_name || undefined,
        clientAvatarUrl: row.client_avatar_url || undefined,
        targetUserId: row.target_user_id || undefined,
        reviewType: row.review_type || 'profile',
        rating: row.rating,
        comment: row.comment,
        serviceType: row.service_type || undefined,
        bookingId: row.booking_id || undefined,
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

  // 根據用戶ID獲取評論（顯示其他用戶對該用戶的評論）
  // 對於provider：獲取其他人對該provider的profile的評論
  // 對於client：獲取其他人對該client的評論（通過profile關聯，但評論的client_id不等於該client）
  getByUserId: async (userId: string, userRole: 'provider' | 'client', currentUserId?: string): Promise<Review[]> => {
    if (userRole === 'provider') {
      // 如果是provider，獲取其他人對該provider的profile的評論
      // 即：profile屬於該provider，但client_id不等於該provider（其他人評論該provider）
      const { profileModel } = await import('./Profile.js');
      const profilesResult = await profileModel.getAll(userId);
      const profileIds = profilesResult.profiles.map(p => p.id);
      
      if (profileIds.length === 0) return [];
      
      // 獲取所有這些profile的評論，但排除該provider自己給出的評論（如果有的話）
      const result = await query(`
        SELECT r.*, 
          u.avatar_url as client_avatar_url,
          COUNT(rl.id) as likes_count,
          CASE WHEN EXISTS (
            SELECT 1 FROM review_likes rl2 
            WHERE rl2.review_id = r.id AND rl2.user_id = $3
          ) THEN TRUE ELSE FALSE END as user_liked
        FROM reviews r
        LEFT JOIN users u ON r.client_id = u.id
        LEFT JOIN review_likes rl ON r.id = rl.review_id
        WHERE r.profile_id = ANY($1::text[]) 
          AND r.is_visible = TRUE
          AND r.client_id != $2
        GROUP BY r.id, u.avatar_url
        ORDER BY r.created_at DESC
      `, [profileIds, userId, currentUserId || null]);
      
      const reviews: Review[] = [];
      for (const row of result.rows) {
        const repliesResult = await query(`
          SELECT * FROM review_replies 
          WHERE review_id = $1 
          ORDER BY created_at ASC
        `, [row.id]);
        
        reviews.push({
          id: row.id,
          profileId: row.profile_id || undefined,
          clientId: row.client_id,
          clientName: row.client_name || undefined,
          clientAvatarUrl: row.client_avatar_url || undefined,
          targetUserId: row.target_user_id || undefined,
          reviewType: row.review_type || 'profile',
          rating: row.rating,
          comment: row.comment,
          serviceType: row.service_type || undefined,
          bookingId: row.booking_id || undefined,
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
    } else {
      // 如果是client，獲取其他人對該client的評論
      // 查找 review_type = 'client' 且 target_user_id = userId 的評論（佳麗評論茶客）
      const result = await query(`
        SELECT r.*, 
          u.avatar_url as client_avatar_url,
          u.user_name as client_name,
          COUNT(rl.id) as likes_count,
          CASE WHEN EXISTS (
            SELECT 1 FROM review_likes rl2 
            WHERE rl2.review_id = r.id AND rl2.user_id = $2
          ) THEN TRUE ELSE FALSE END as user_liked
        FROM reviews r
        LEFT JOIN users u ON r.client_id = u.id
        LEFT JOIN review_likes rl ON r.id = rl.review_id
        WHERE r.review_type = 'client'
          AND r.target_user_id = $1
          AND r.is_visible = TRUE
        GROUP BY r.id, u.avatar_url, u.user_name
        ORDER BY r.created_at DESC
      `, [userId, currentUserId || null]);
      
      const reviews: Review[] = [];
      for (const row of result.rows) {
        const repliesResult = await query(`
          SELECT * FROM review_replies 
          WHERE review_id = $1 
          ORDER BY created_at ASC
        `, [row.id]);
        
        reviews.push({
          id: row.id,
          profileId: row.profile_id || undefined,
          clientId: row.client_id,
          clientName: row.client_name || undefined,
          clientAvatarUrl: row.client_avatar_url || undefined,
          targetUserId: row.target_user_id || undefined,
          reviewType: row.review_type || 'profile',
          rating: row.rating,
          comment: row.comment,
          serviceType: row.service_type || undefined,
          bookingId: row.booking_id || undefined,
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
    }
  },

  // 创建评论
  create: async (data: CreateReviewData): Promise<Review> => {
    const id = `review_${Date.now()}_${uuidv4().substring(0, 9)}`;
    const reviewType = data.reviewType || 'profile';
    
    await query(`
      INSERT INTO reviews (id, profile_id, client_id, client_name, target_user_id, review_type, rating, comment, service_type, booking_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id,
      data.profileId || null,
      data.clientId,
      data.clientName || null,
      data.targetUserId || null,
      reviewType,
      data.rating,
      data.comment,
      data.serviceType || null,
      data.bookingId || null,
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
      profileId: row.profile_id || undefined,
      clientId: row.client_id,
      clientName: row.client_name || undefined,
      clientAvatarUrl: row.client_avatar_url || undefined,
      targetUserId: row.target_user_id || undefined,
      reviewType: row.review_type || 'profile',
      rating: row.rating,
      comment: row.comment,
      serviceType: row.service_type || undefined,
      bookingId: row.booking_id || undefined,
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

