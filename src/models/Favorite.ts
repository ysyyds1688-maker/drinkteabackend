import { query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface Favorite {
  id: string;
  userId: string;
  profileId: string;
  createdAt: string;
}

export const favoriteModel = {
  // 添加收藏
  create: async (userId: string, profileId: string): Promise<Favorite> => {
    const id = uuidv4();
    
    await query(`
      INSERT INTO favorites (id, user_id, profile_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, profile_id) DO NOTHING
    `, [id, userId, profileId]);
    
    const result = await query('SELECT * FROM favorites WHERE user_id = $1 AND profile_id = $2', [userId, profileId]);
    if (result.rows.length === 0) {
      throw new Error('Failed to create favorite');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      profileId: row.profile_id,
      createdAt: row.created_at,
    };
  },

  // 删除收藏
  delete: async (userId: string, profileId: string): Promise<boolean> => {
    const result = await query('DELETE FROM favorites WHERE user_id = $1 AND profile_id = $2', [userId, profileId]);
    return (result.rowCount || 0) > 0;
  },

  // 检查是否已收藏
  isFavorited: async (userId: string, profileId: string): Promise<boolean> => {
    const result = await query('SELECT 1 FROM favorites WHERE user_id = $1 AND profile_id = $2 LIMIT 1', [userId, profileId]);
    return result.rows.length > 0;
  },

  // 获取用户的所有收藏
  getByUserId: async (userId: string): Promise<Favorite[]> => {
    const result = await query(`
      SELECT * FROM favorites 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      profileId: row.profile_id,
      createdAt: row.created_at,
    }));
  },
};

