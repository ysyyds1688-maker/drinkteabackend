import { query } from '../db/database.js';

export interface ForumPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  images?: string[]; // 圖片 URL 數組
  videos?: string[]; // 影片 URL 數組
  views: number;
  likesCount: number;
  repliesCount: number;
  favoritesCount?: number; // 收藏數
  isPinned: boolean;
  isLocked: boolean;
  isFeatured?: boolean; // 是否為精華帖
  relatedProfileId?: string; // 關聯的 Profile ID
  relatedReviewId?: string; // 關聯的 Review ID
  createdAt: string;
  updatedAt: string;
  userName?: string;
  avatarUrl?: string;
  membershipLevel?: string;
  isVip?: boolean;
  userRole?: 'client' | 'provider' | 'admin'; // 用戶角色
  relatedProfileName?: string; // 關聯的 Profile 名稱（用於顯示）
}

export interface ForumReply {
  id: string;
  postId: string;
  userId: string;
  parentReplyId?: string;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  avatarUrl?: string;
  membershipLevel?: string;
  isVip?: boolean;
  userRole?: 'client' | 'provider' | 'admin'; // 用戶角色
  replies?: ForumReply[];
}

export interface CreatePostData {
  userId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  images?: string[]; // 圖片 URL 數組
  videos?: string[]; // 影片 URL 數組
  relatedProfileId?: string; // 關聯的 Profile ID
  relatedReviewId?: string; // 關聯的 Review ID
}

export interface CreateReplyData {
  postId: string;
  userId: string;
  content: string;
  parentReplyId?: string;
}

export const forumModel = {
  // 創建帖子
  createPost: async (data: CreatePostData): Promise<ForumPost> => {
    const { v4: uuidv4 } = await import('uuid');
    const id = `post_${Date.now()}_${uuidv4().substring(0, 9)}`;
    
    await query(`
      INSERT INTO forum_posts (id, user_id, title, content, category, tags, images, videos, related_profile_id, related_review_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id,
      data.userId,
      data.title,
      data.content,
      data.category,
      data.tags ? JSON.stringify(data.tags) : null,
      data.images && data.images.length > 0 ? JSON.stringify(data.images) : null,
      data.videos && data.videos.length > 0 ? JSON.stringify(data.videos) : null,
      data.relatedProfileId || null,
      data.relatedReviewId || null,
    ]);
    
    const post = await forumModel.getPostById(id);
    if (!post) throw new Error('Failed to create post');
    return post;
  },

  // 更新帖子
  updatePost: async (id: string, data: Partial<CreatePostData>): Promise<ForumPost | null> => {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(data.tags ? JSON.stringify(data.tags) : null);
    }
    if (data.images !== undefined) {
      updates.push(`images = $${paramIndex++}`);
      values.push(data.images && data.images.length > 0 ? JSON.stringify(data.images) : null);
    }
    if (data.videos !== undefined) {
      updates.push(`videos = $${paramIndex++}`);
      values.push(data.videos && data.videos.length > 0 ? JSON.stringify(data.videos) : null);
    }
    if (data.relatedProfileId !== undefined) {
      updates.push(`related_profile_id = $${paramIndex++}`);
      values.push(data.relatedProfileId || null);
    }
    if (data.relatedReviewId !== undefined) {
      updates.push(`related_review_id = $${paramIndex++}`);
      values.push(data.relatedReviewId || null);
    }

    if (updates.length === 0) {
      return await forumModel.getPostById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await query(`
      UPDATE forum_posts 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values);
    
    return await forumModel.getPostById(id);
  },

  // 獲取帖子列表
  getPosts: async (options: {
    category?: string;
    sortBy?: 'latest' | 'hot' | 'replies' | 'views' | 'favorites';
    limit?: number;
    offset?: number;
  } = {}): Promise<ForumPost[]> => {
    // 優化：使用 LEFT JOIN 替代子查詢，大幅提升性能
    // 使用 LATERAL JOIN 獲取每個用戶最新的有效訂閱（比子查詢快很多）
    let sql = `
      SELECT p.*, 
             u.user_name, 
             u.avatar_url, 
             u.membership_level,
             u.role as user_role,
             pr.name as related_profile_name,
             s.is_active as subscription_active,
             s.expires_at as subscription_expires_at
      FROM forum_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles pr ON p.related_profile_id = pr.id
      LEFT JOIN LATERAL (
        SELECT is_active, expires_at 
        FROM subscriptions 
        WHERE user_id = u.id AND is_active = true 
        ORDER BY expires_at DESC NULLS LAST 
        LIMIT 1
      ) s ON true
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (options.category) {
      sql += ` AND p.category = $${paramIndex++}`;
      params.push(options.category);
    }
    
    // 排序
    switch (options.sortBy) {
      case 'hot':
        sql += ` ORDER BY p.likes_count DESC, p.replies_count DESC, p.created_at DESC`;
        break;
      case 'replies':
        sql += ` ORDER BY p.replies_count DESC, p.created_at DESC`;
        break;
      case 'views':
        sql += ` ORDER BY p.views DESC, p.created_at DESC`;
        break;
      case 'favorites':
        sql += ` ORDER BY p.favorites_count DESC, p.created_at DESC`;
        break;
      default:
        sql += ` ORDER BY p.is_pinned DESC, p.is_featured DESC, p.created_at DESC`;
    }
    
    if (options.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
      if (options.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(options.offset);
      }
    }
    
    const result = await query(sql, params);
    return result.rows.map(row => {
      const subscriptionExpiresAt = row.subscription_expires_at ? new Date(row.subscription_expires_at) : null;
      const isVip = row.subscription_active && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date());
      
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        images: row.images ? JSON.parse(row.images) : undefined,
        videos: row.videos ? JSON.parse(row.videos) : undefined,
        views: row.views || 0,
        likesCount: row.likes_count || 0,
        repliesCount: row.replies_count || 0,
        favoritesCount: row.favorites_count || 0,
        isPinned: Boolean(row.is_pinned),
        isLocked: Boolean(row.is_locked),
        isFeatured: Boolean(row.is_featured),
        relatedProfileId: row.related_profile_id || undefined,
        relatedReviewId: row.related_review_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userName: row.user_name || undefined,
        avatarUrl: row.avatar_url || undefined,
        membershipLevel: row.membership_level || 'tea_guest',
        isVip: Boolean(isVip),
        userRole: row.user_role || undefined,
        relatedProfileName: row.related_profile_name || undefined,
      };
    });
  },

  // 獲取單個帖子
  getPostById: async (id: string): Promise<ForumPost | null> => {
    // 增加瀏覽數
    await query('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [id]);
    
    const result = await query(`
      SELECT p.*, 
             u.user_name, 
             u.avatar_url, 
             u.membership_level,
             u.role as user_role,
             pr.name as related_profile_name,
             s.is_active as subscription_active,
             s.expires_at as subscription_expires_at
      FROM forum_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles pr ON p.related_profile_id = pr.id
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    const subscriptionExpiresAt = row.subscription_expires_at ? new Date(row.subscription_expires_at) : null;
    const isVip = row.subscription_active && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date());
    
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        images: row.images ? JSON.parse(row.images) : undefined,
        videos: row.videos ? JSON.parse(row.videos) : undefined,
        views: row.views || 0,
        likesCount: row.likes_count || 0,
        repliesCount: row.replies_count || 0,
        favoritesCount: row.favorites_count || 0,
        isPinned: Boolean(row.is_pinned),
        isLocked: Boolean(row.is_locked),
        isFeatured: Boolean(row.is_featured),
        relatedProfileId: row.related_profile_id || undefined,
        relatedReviewId: row.related_review_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userName: row.user_name || undefined,
        avatarUrl: row.avatar_url || undefined,
        membershipLevel: row.membership_level || 'tea_guest',
        isVip: Boolean(isVip),
        userRole: row.user_role || undefined,
        relatedProfileName: row.related_profile_name || undefined,
      };
  },

  // 創建回覆
  createReply: async (data: CreateReplyData): Promise<ForumReply> => {
    const { v4: uuidv4 } = await import('uuid');
    const id = `reply_${Date.now()}_${uuidv4().substring(0, 9)}`;
    
    await query(`
      INSERT INTO forum_replies (id, post_id, user_id, parent_reply_id, content)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      data.postId,
      data.userId,
      data.parentReplyId || null,
      data.content,
    ]);
    
    // 更新帖子回覆數
    await query(`
      UPDATE forum_posts 
      SET replies_count = replies_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [data.postId]);
    
    const reply = await forumModel.getReplyById(id);
    if (!reply) throw new Error('Failed to create reply');
    return reply;
  },

  // 獲取回覆列表
  getRepliesByPostId: async (postId: string): Promise<ForumReply[]> => {
    const result = await query(`
      SELECT r.*, 
             u.user_name, 
             u.avatar_url, 
             u.membership_level,
             u.role as user_role,
             (SELECT is_active FROM subscriptions 
              WHERE user_id = u.id AND is_active = true 
              ORDER BY expires_at DESC NULLS LAST LIMIT 1) as subscription_active,
             (SELECT expires_at FROM subscriptions 
              WHERE user_id = u.id AND is_active = true 
              ORDER BY expires_at DESC NULLS LAST LIMIT 1) as subscription_expires_at
      FROM forum_replies r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.post_id = $1
      ORDER BY r.created_at ASC
    `, [postId]);
    
    const replies = result.rows.map(row => {
      const subscriptionExpiresAt = row.subscription_expires_at ? new Date(row.subscription_expires_at) : null;
      const isVip = row.subscription_active && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date());
      
      return {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        parentReplyId: row.parent_reply_id || undefined,
        content: row.content,
        likesCount: row.likes_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userName: row.user_name || undefined,
        avatarUrl: row.avatar_url || undefined,
        membershipLevel: row.membership_level || 'tea_guest',
        isVip: Boolean(isVip),
        userRole: row.user_role || undefined,
        replies: [] as ForumReply[],
      };
    });
    
    // 構建嵌套結構
    const replyMap = new Map<string, ForumReply>();
    const rootReplies: ForumReply[] = [];
    
    replies.forEach(reply => {
      replyMap.set(reply.id, reply);
    });
    
    replies.forEach(reply => {
      if (reply.parentReplyId) {
        const parent = replyMap.get(reply.parentReplyId);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(reply);
        }
      } else {
        rootReplies.push(reply);
      }
    });
    
    return rootReplies;
  },

  // 獲取單個回覆
  getReplyById: async (id: string): Promise<ForumReply | null> => {
    const result = await query(`
      SELECT r.*, 
             u.user_name, 
             u.avatar_url, 
             u.membership_level,
             u.role as user_role,
             s.is_active as subscription_active,
             s.expires_at as subscription_expires_at
      FROM forum_replies r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = true
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    const subscriptionExpiresAt = row.subscription_expires_at ? new Date(row.subscription_expires_at) : null;
    const isVip = row.subscription_active && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date());
    
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      parentReplyId: row.parent_reply_id || undefined,
      content: row.content,
      likesCount: row.likes_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userName: row.user_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      membershipLevel: row.membership_level || 'tea_guest',
      isVip: Boolean(isVip),
      userRole: row.user_role || undefined,
    };
  },

  // 切換點讚
  toggleLike: async (userId: string, targetType: 'post' | 'reply', targetId: string): Promise<{ liked: boolean; authorId?: string }> => {
    // 檢查是否已點讚
    const checkResult = await query(`
      SELECT id FROM forum_likes 
      WHERE user_id = $1 AND target_type = $2 AND target_id = $3
    `, [userId, targetType, targetId]);
    
    if (checkResult.rows.length > 0) {
      // 取消點讚
      await query(`
        DELETE FROM forum_likes 
        WHERE user_id = $1 AND target_type = $2 AND target_id = $3
      `, [userId, targetType, targetId]);
      
      // 更新點讚數
      const table = targetType === 'post' ? 'forum_posts' : 'forum_replies';
      const countColumn = targetType === 'post' ? 'likes_count' : 'likes_count';
      await query(`
        UPDATE ${table} 
        SET ${countColumn} = ${countColumn} - 1
        WHERE id = $1
      `, [targetId]);
      
      return { liked: false };
    } else {
      // 獲取被點讚者的ID
      const authorResult = await query(`
        SELECT user_id FROM ${targetType === 'post' ? 'forum_posts' : 'forum_replies'}
        WHERE id = $1
      `, [targetId]);
      
      const authorId = authorResult.rows.length > 0 ? authorResult.rows[0].user_id : undefined;
      
      // 添加點讚
      const { v4: uuidv4 } = await import('uuid');
      const id = `like_${Date.now()}_${uuidv4().substring(0, 9)}`;
      
      await query(`
        INSERT INTO forum_likes (id, user_id, target_type, target_id)
        VALUES ($1, $2, $3, $4)
      `, [id, userId, targetType, targetId]);
      
      // 更新點讚數
      const table = targetType === 'post' ? 'forum_posts' : 'forum_replies';
      const countColumn = 'likes_count';
      await query(`
        UPDATE ${table} 
        SET ${countColumn} = ${countColumn} + 1
        WHERE id = $1
      `, [targetId]);
      
      return { liked: true, authorId };
    }
  },

  // 檢查是否已點讚
  isLiked: async (userId: string, targetType: 'post' | 'reply', targetId: string): Promise<boolean> => {
    const result = await query(`
      SELECT id FROM forum_likes 
      WHERE user_id = $1 AND target_type = $2 AND target_id = $3
    `, [userId, targetType, targetId]);
    
    return result.rows.length > 0;
  },

  // 刪除帖子（僅管理員）
  deletePost: async (postId: string): Promise<boolean> => {
    // 先刪除相關的回覆和點讚
    await query('DELETE FROM forum_likes WHERE target_type = $1 AND target_id = $2', ['post', postId]);
    await query('DELETE FROM forum_replies WHERE post_id = $1', [postId]);
    
    // 刪除帖子
    const result = await query('DELETE FROM forum_posts WHERE id = $1', [postId]);
    return (result.rowCount || 0) > 0;
  },

  // 刪除回覆（僅管理員）
  deleteReply: async (replyId: string): Promise<boolean> => {
    // 先刪除相關的子回覆和點讚
    await query('DELETE FROM forum_likes WHERE target_type = $1 AND target_id = $2', ['reply', replyId]);
    await query('DELETE FROM forum_replies WHERE parent_reply_id = $1', [replyId]);
    
    // 獲取帖子ID以更新回覆數
    const postResult = await query('SELECT post_id FROM forum_replies WHERE id = $1', [replyId]);
    const postId = postResult.rows.length > 0 ? postResult.rows[0].post_id : null;
    
    // 刪除回覆
    const result = await query('DELETE FROM forum_replies WHERE id = $1', [replyId]);
    
    // 更新帖子的回覆數
    if (postId && (result.rowCount || 0) > 0) {
      await query(`
        UPDATE forum_posts 
        SET replies_count = GREATEST(0, replies_count - 1)
        WHERE id = $1
      `, [postId]);
    }
    
    return (result.rowCount || 0) > 0;
  },

  // 切換收藏
  toggleFavorite: async (userId: string, postId: string): Promise<{ favorited: boolean }> => {
    // 檢查是否已收藏
    const checkResult = await query(`
      SELECT id FROM forum_favorites 
      WHERE user_id = $1 AND post_id = $2
    `, [userId, postId]);
    
    if (checkResult.rows.length > 0) {
      // 取消收藏
      await query(`
        DELETE FROM forum_favorites 
        WHERE user_id = $1 AND post_id = $2
      `, [userId, postId]);
      
      // 更新收藏數
      await query(`
        UPDATE forum_posts 
        SET favorites_count = GREATEST(0, favorites_count - 1)
        WHERE id = $1
      `, [postId]);
      
      return { favorited: false };
    } else {
      // 添加收藏
      const { v4: uuidv4 } = await import('uuid');
      const id = `fav_${Date.now()}_${uuidv4().substring(0, 9)}`;
      
      await query(`
        INSERT INTO forum_favorites (id, user_id, post_id)
        VALUES ($1, $2, $3)
      `, [id, userId, postId]);
      
      // 更新收藏數
      await query(`
        UPDATE forum_posts 
        SET favorites_count = favorites_count + 1
        WHERE id = $1
      `, [postId]);
      
      return { favorited: true };
    }
  },

  // 檢查是否已收藏
  isFavorited: async (userId: string, postId: string): Promise<boolean> => {
    const result = await query(`
      SELECT id FROM forum_favorites 
      WHERE user_id = $1 AND post_id = $2
    `, [userId, postId]);
    
    return result.rows.length > 0;
  },

  // 批量獲取收藏狀態（優化性能，避免 N+1 查詢）
  getFavoritesByPostIds: async (userId: string, postIds: string[]): Promise<string[]> => {
    if (postIds.length === 0) return [];
    
    // 使用 ANY 或 IN 子句批量查詢
    const result = await query(`
      SELECT post_id FROM forum_favorites 
      WHERE user_id = $1 AND post_id = ANY($2::text[])
    `, [userId, postIds]);
    
    return result.rows.map(row => row.post_id);
  },

  // 獲取用戶收藏的帖子列表
  getFavoritesByUserId: async (userId: string, limit?: number, offset?: number): Promise<ForumPost[]> => {
    let sql = `
      SELECT p.*, 
             u.user_name, 
             u.avatar_url, 
             u.membership_level,
             u.role as user_role,
             pr.name as related_profile_name,
             (SELECT is_active FROM subscriptions 
              WHERE user_id = u.id AND is_active = true 
              ORDER BY expires_at DESC NULLS LAST LIMIT 1) as subscription_active,
             (SELECT expires_at FROM subscriptions 
              WHERE user_id = u.id AND is_active = true 
              ORDER BY expires_at DESC NULLS LAST LIMIT 1) as subscription_expires_at
      FROM forum_favorites f
      JOIN forum_posts p ON f.post_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles pr ON p.related_profile_id = pr.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;
    const params: any[] = [userId];
    let paramIndex = 2;
    
    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit);
      if (offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }
    }
    
    const result = await query(sql, params);
    return result.rows.map(row => {
      const subscriptionExpiresAt = row.subscription_expires_at ? new Date(row.subscription_expires_at) : null;
      const isVip = row.subscription_active && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date());
      
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        images: row.images ? JSON.parse(row.images) : undefined,
        videos: row.videos ? JSON.parse(row.videos) : undefined,
        views: row.views || 0,
        likesCount: row.likes_count || 0,
        repliesCount: row.replies_count || 0,
        favoritesCount: row.favorites_count || 0,
        isPinned: Boolean(row.is_pinned),
        isLocked: Boolean(row.is_locked),
        isFeatured: Boolean(row.is_featured),
        relatedProfileId: row.related_profile_id || undefined,
        relatedReviewId: row.related_review_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userName: row.user_name || undefined,
        avatarUrl: row.avatar_url || undefined,
        membershipLevel: row.membership_level || 'tea_guest',
        isVip: Boolean(isVip),
        userRole: row.user_role || undefined,
        relatedProfileName: row.related_profile_name || undefined,
      };
    });
  },

  // 創建舉報
  createReport: async (data: {
    reporterId: string;
    postId?: string;
    replyId?: string;
    reason: string;
  }): Promise<{ id: string }> => {
    const { v4: uuidv4 } = await import('uuid');
    const id = `report_${Date.now()}_${uuidv4().substring(0, 9)}`;
    
    await query(`
      INSERT INTO forum_reports (id, reporter_id, post_id, reply_id, reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      data.reporterId,
      data.postId || null,
      data.replyId || null,
      data.reason,
    ]);
    
    return { id };
  },
};



