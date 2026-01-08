import { query } from '../db/database.js';
import { Profile } from '../types.js';
import { cacheService } from '../services/redisService.js';

// 輔助函數：清除相關緩存並刷新物化視圖
export async function clearProfileCachesAndRefreshView(profileId?: string) {
  console.log('[Cache Invalidation] 清除 profiles 列表緩存...');
  await cacheService.deletePattern('cache:profiles:*');
  if (profileId) {
    console.log(`[Cache Invalidation] 清除 profile 詳情緩存: cache:profile:${profileId}`);
    await cacheService.delete(`cache:profile:${profileId}`);
  }
  console.log('[Materialized View Refresh] 刷新 profiles_materialized_view...');
  await query('REFRESH MATERIALIZED VIEW profiles_materialized_view;');
}
export const profileModel = {
  getAll: async (userId?: string, options?: { limit?: number; offset?: number }): Promise<{ profiles: Profile[]; total: number }> => {
    const cacheKey = `cache:profiles:${userId || 'all'}:${options?.limit || 'no_limit'}:${options?.offset || 'no_offset'}`;
    const cachedData = await cacheService.get<{ profiles: Profile[]; total: number }>(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Profile.getAll: ${cacheKey}`);
      return cachedData;
    }

    try {
      console.log('[Profile.getAll] 開始查詢數據庫...', options);
      const queryStartTime = Date.now();
      
      // 先獲取總數
      let countSql = `SELECT COUNT(*) as total FROM profiles_materialized_view`;
      const countParams: any[] = [];
      
      if (userId) {
        countSql += ' WHERE "userId" = $1';
        countParams.push(userId);
      }
      
      const countResult = await query(countSql, countParams);
      const total = parseInt(countResult.rows[0].total, 10);
      
      let sql = `
        SELECT *
        FROM profiles_materialized_view
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (userId) {
        sql += ` WHERE "userId" = $${paramIndex++}`;
        params.push(userId);
      }
      
      sql += `
        ORDER BY exposure_score DESC, "createdAt" DESC
      `;
      
      // 添加分頁
      if (options?.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(options.limit);
      }
      
      if (options?.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(options.offset);
      }
      
      const result = await query(sql, params);
      const queryDuration = Date.now() - queryStartTime;
      console.log(`[Profile.getAll] 數據庫查詢完成，返回 ${result.rows.length} 行（總共 ${total} 行），耗時 ${queryDuration}ms`);
      
      const parsedProfiles = result.rows.map((row: any) => {
        // PostgreSQL 列名大小写敏感，明确使用 row["userId"] 获取
        const rawUserId = row["userId"];
        // 将 null、空字符串转换为 undefined（高级茶）
        const finalUserId = (rawUserId === null || rawUserId === '' || rawUserId === undefined) ? undefined : rawUserId;
        try {
          return {
            ...row,
            userId: finalUserId,
            gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : (row.gallery || []),
            albums: typeof row.albums === 'string' ? JSON.parse(row.albums || '[]') : (row.albums || []),
            prices: typeof row.prices === 'string' ? JSON.parse(row.prices || '{}') : (row.prices || {}),
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
            basicServices: typeof row.basicServices === 'string' ? JSON.parse(row.basicServices || '[]') : (row.basicServices || []),
            addonServices: typeof row.addonServices === 'string' ? JSON.parse(row.addonServices || '[]') : (row.addonServices || []),
            contactInfo: typeof row.contactInfo === 'string' ? JSON.parse(row.contactInfo || '{}') : (row.contactInfo || {}),
            remarks: row.remarks || undefined,
            videos: typeof row.videos === 'string' ? JSON.parse(row.videos || '[]') : (row.videos || []),
            bookingProcess: row.bookingProcess || undefined,
            availableTimes: typeof row.availableTimes === 'string' ? JSON.parse(row.availableTimes || '{}') : (row.availableTimes || {}),
            isNew: Boolean(row.isNew),
            isAvailable: Boolean(row.isAvailable),
            views: row.views || 0,
            contactCount: row.contact_count || 0,
            // Provider 相關資訊（僅特選魚市）
            isVip: Boolean(row.is_vip_value === 1),
            providerEmailVerified: row.provider_email_verified ? Boolean(row.provider_email_verified) : undefined,
          };
        } catch (parseError: any) {
          console.error('Error parsing profile row:', row.id, parseError);
          // 返回基本資料，避免整個查詢失敗
          const rawUserId = row["userId"];
          const finalUserId = (rawUserId === null || rawUserId === '' || rawUserId === undefined) ? undefined : rawUserId;
          return {
            ...row,
            userId: finalUserId,
            gallery: [],
            albums: [],
            prices: { oneShot: { price: row.price || 0, desc: '一節/50min/1S' }, twoShot: { price: (row.price || 0) * 2 - 500, desc: '兩節/100min/2S' } },
            tags: [],
            basicServices: [],
            addonServices: [],
            availableTimes: { today: '12:00~02:00', tomorrow: '12:00~02:00' },
            isNew: Boolean(row.isNew),
            isAvailable: Boolean(row.isAvailable),
            // Provider 相關資訊（僅特選魚市）
            isVip: Boolean(row.is_vip_value === 1),
            providerEmailVerified: row.provider_email_verified ? Boolean(row.provider_email_verified) : undefined,
          };
        }
      });
      
      const resultData = { profiles: parsedProfiles, total };
      await cacheService.set(cacheKey, resultData, 600); // 緩存 10 分鐘
      return resultData;
    } catch (error: any) {
      console.error('Profile.getAll error:', error);
      throw new Error(`取得 Profiles 失敗: ${error.message || '資料庫錯誤'}`);
    }
  },

  getById: async (id: string, incrementViews: boolean = false): Promise<Profile | null> => {
    const cacheKey = `cache:profile:${id}`;
    if (!incrementViews) { // 只在不增加瀏覽次數時檢查緩存
      const cachedProfile = await cacheService.get<Profile>(cacheKey);
      if (cachedProfile) {
        console.log(`[Cache Hit] Profile.getById: ${id}`);
        return cachedProfile;
      }
    }
    try {
      // 如果 incrementViews 為 true，先增加瀏覽次數
      if (incrementViews) {
        await query(`UPDATE profiles SET views = COALESCE(views, 0) + 1 WHERE id = $1`, [id]);
        await clearProfileCachesAndRefreshView(id); // 清除緩存並刷新物化視圖，因為 views 改變了
      }
      
      // 明确指定所有列名，确保正确获取userId字段
      const result = await query(`
        SELECT 
          id, "userId", name, nationality, age, height, weight, cup, location, district, 
          type, "imageUrl", gallery, albums, price, prices, tags, 
          "basicServices", "addonServices", "contactInfo", remarks, videos, "bookingProcess", "isNew", "isAvailable", "availableTimes", 
          views, contact_count, "createdAt", "updatedAt",
          is_vip_value AS is_vip,
          provider_email_verified,
          exposure_score,
          level_value,
          avg_rating
        FROM profiles_materialized_view
        WHERE id = $1
      `, [id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      // PostgreSQL 列名大小写敏感，明确使用 row["userId"] 获取
      const rawUserId = row["userId"];
      const finalUserId = (rawUserId === null || rawUserId === '' || rawUserId === undefined) ? undefined : rawUserId;
      try {
        const profileData = {
          ...row,
          userId: finalUserId,
          isVip: Boolean(row.is_vip),
          providerEmailVerified: Boolean(row.provider_email_verified),
          gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : (row.gallery || []),
          albums: typeof row.albums === 'string' ? JSON.parse(row.albums || '[]') : (row.albums || []),
          prices: typeof row.prices === 'string' ? JSON.parse(row.prices || '{}') : (row.prices || {}),
          tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
          basicServices: typeof row.basicServices === 'string' ? JSON.parse(row.basicServices || '[]') : (row.basicServices || []),
          addonServices: typeof row.addonServices === 'string' ? JSON.parse(row.addonServices || '[]') : (row.addonServices || []),
          contactInfo: typeof row.contactInfo === 'string' ? JSON.parse(row.contactInfo || '{}') : (row.contactInfo || {}),
          remarks: row.remarks || undefined,
          videos: typeof row.videos === 'string' ? JSON.parse(row.videos || '[]') : (row.videos || []),
          bookingProcess: row.bookingProcess || undefined,
          availableTimes: typeof row.availableTimes === 'string' ? JSON.parse(row.availableTimes || '{}') : (row.availableTimes || {}),
          isNew: Boolean(row.isNew),
          isAvailable: Boolean(row.isAvailable),
          views: row.views || 0,
          contactCount: row.contact_count || 0,
        };
        await cacheService.set(cacheKey, profileData, 3600); // 緩存 1 小時
        return profileData;
      } catch (parseError: any) {
        console.error('Error parsing profile:', id, parseError);
        // 返回基本資料
        const rawUserId = row["userId"] || row.userId;
        const finalUserId = (rawUserId === null || rawUserId === '' || rawUserId === undefined) ? undefined : rawUserId;
        const profileData = {
          ...row,
          userId: finalUserId,
          isVip: Boolean(row.is_vip),
          providerEmailVerified: Boolean(row.provider_email_verified),
          gallery: [],
          albums: [],
          prices: { oneShot: { price: row.price || 0, desc: '一節/50min/1S' }, twoShot: { price: (row.price || 0) * 2 - 500, desc: '兩節/100min/2S' } },
          tags: [],
          basicServices: [],
          addonServices: [],
          contactInfo: {},
          remarks: undefined,
          videos: [],
          bookingProcess: undefined,
          availableTimes: { today: '12:00~02:00', tomorrow: '12:00~02:00' },
          isNew: Boolean(row.isNew),
          isAvailable: Boolean(row.isAvailable),
          views: row.views || 0,
          contactCount: row.contact_count || 0,
        };
        await cacheService.set(cacheKey, profileData, 3600); // 緩存 1 小時
        return profileData;
      }
    } catch (error: any) {
      console.error('Profile.getById error:', id, error);
      throw new Error(`取得 Profile 失敗: ${error.message || '資料庫錯誤'}`);
    }
  },

  create: async (profile: Profile): Promise<Profile> => {
    await query(`
      INSERT INTO profiles (
        id, "userId", name, nationality, age, height, weight, cup, location, district,
        type, "imageUrl", gallery, albums, price, prices, tags,
        "basicServices", "addonServices", "contactInfo", remarks, videos, "bookingProcess", "isNew", "isAvailable", "availableTimes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
    `, [
      profile.id,
      (profile.userId && profile.userId !== '' && profile.userId !== null) ? profile.userId : null, // Convert undefined to null for PostgreSQL
      profile.name,
      profile.nationality,
      profile.age,
      profile.height,
      profile.weight,
      profile.cup,
      profile.location,
      profile.district || null,
      profile.type,
      profile.imageUrl,
      JSON.stringify(profile.gallery || []),
      JSON.stringify(profile.albums || []),
      profile.price,
      JSON.stringify(profile.prices || {}),
      JSON.stringify(profile.tags || []),
      JSON.stringify(profile.basicServices || []),
      JSON.stringify(profile.addonServices || []),
      JSON.stringify(profile.contactInfo || {}),
      profile.remarks || null,
      JSON.stringify(profile.videos || []),
      profile.bookingProcess || null,
      profile.isNew ? 1 : 0,
      profile.isAvailable !== false ? 1 : 0,
      JSON.stringify(profile.availableTimes || {})
    ]);

    const created = await profileModel.getById(profile.id);
    if (!created) throw new Error('Failed to create profile');
    await clearProfileCachesAndRefreshView(profile.id); // 清除緩存並刷新物化視圖
    return created;
  },

  update: async (id: string, profile: Partial<Profile>): Promise<Profile | null> => {
    const existing = await profileModel.getById(id);
    if (!existing) return null;

    // 確保所有必要欄位都有值，使用現有資料作為預設值
    const updated: Profile = {
      ...existing,
      ...profile,
      // 確保這些欄位不會是 undefined
      userId: profile.userId ?? existing.userId,
      name: profile.name ?? existing.name,
      nationality: profile.nationality ?? existing.nationality,
      age: profile.age ?? existing.age,
      height: profile.height ?? existing.height,
      weight: profile.weight ?? existing.weight,
      cup: profile.cup ?? existing.cup,
      location: profile.location ?? existing.location,
      type: profile.type ?? existing.type,
      imageUrl: profile.imageUrl ?? existing.imageUrl,
      price: profile.price ?? existing.price,
      gallery: profile.gallery ?? existing.gallery ?? [],
      albums: profile.albums ?? existing.albums ?? [],
      prices: profile.prices ?? existing.prices ?? { oneShot: { price: existing.price, desc: '一節/50min/1S' }, twoShot: { price: existing.price * 2 - 500, desc: '兩節/100min/2S' } },
      tags: profile.tags ?? existing.tags ?? [],
      basicServices: profile.basicServices ?? existing.basicServices ?? [],
      addonServices: profile.addonServices ?? existing.addonServices ?? [],
      availableTimes: profile.availableTimes ?? existing.availableTimes ?? { today: '12:00~02:00', tomorrow: '12:00~02:00' },
      isNew: profile.isNew ?? existing.isNew ?? false,
      isAvailable: profile.isAvailable ?? existing.isAvailable ?? true,
    };

    try {
      await query(`
        UPDATE profiles SET
          "userId" = $1, name = $2, nationality = $3, age = $4, height = $5, weight = $6, cup = $7,
          location = $8, district = $9, type = $10, "imageUrl" = $11, gallery = $12,
          albums = $13, price = $14, prices = $15, tags = $16, "basicServices" = $17,
          "addonServices" = $18, "contactInfo" = $19, remarks = $20, videos = $21, "bookingProcess" = $22, "isNew" = $23, "isAvailable" = $24, "availableTimes" = $25,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $26
      `, [
        updated.userId || null,
        updated.name,
        updated.nationality,
        updated.age,
        updated.height,
        updated.weight,
        updated.cup,
        updated.location,
        updated.district || null,
        updated.type,
        updated.imageUrl,
        JSON.stringify(updated.gallery || []),
        JSON.stringify(updated.albums || []),
        updated.price,
        JSON.stringify(updated.prices || {}),
        JSON.stringify(updated.tags || []),
        JSON.stringify(updated.basicServices || []),
        JSON.stringify(updated.addonServices || []),
        JSON.stringify(updated.contactInfo || {}),
        updated.remarks || null,
        JSON.stringify(updated.videos || []),
        updated.bookingProcess || null,
        updated.isNew ? 1 : 0,
        updated.isAvailable !== false ? 1 : 0,
        JSON.stringify(updated.availableTimes || {}),
        id
      ]);

      await clearProfileCachesAndRefreshView(id); // 清除緩存並刷新物化視圖
      return await profileModel.getById(id);
    } catch (error: any) {
      console.error('Profile update error:', error);
      console.error('Update data:', JSON.stringify(updated, null, 2));
      throw new Error(`更新失敗: ${error.message || '資料庫錯誤'}`);
    }
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await query('DELETE FROM profiles WHERE id = $1', [id]);
    if ((result.rowCount || 0) > 0) {
      await clearProfileCachesAndRefreshView(id); // 清除緩存並刷新物化視圖
      return true;
    }
    return false;
  },

  // 查找相似的 Profile
  findSimilar: async (profile: Partial<Profile>): Promise<Profile[]> => {
    try {
      if (!profile.name || !profile.nationality) {
        return [];
      }

      const sql = `
        SELECT id, "userId", name, nationality, age, height, weight, cup, location, district,
               type, "imageUrl", price, "createdAt",
               similarity(name, $3) AS name_similarity
        FROM profiles
        WHERE 
          -- 精确匹配：姓名 + 国籍
          (LOWER(name) = LOWER($1) AND nationality = $2)
          OR
          -- 相似匹配：姓名相似 + 關鍵信息匹配 (利用 pg_trgm 索引)
          (
            name % $3 AND -- 使用 % 運算符，利用 pg_trgm GIN 索引進行模糊匹配
            nationality = $2 AND
            ABS(age - $4) <= 2 AND
            ABS(height - $5) <= 5 AND
            ABS(weight - $6) <= 5
          )
        ORDER BY name_similarity DESC, "createdAt" DESC
        LIMIT 10
      `;
      
      const result = await query(sql, [
        profile.name,
        profile.nationality,
        profile.name, // 使用原始姓名進行 pg_trgm 模糊匹配
        profile.age || 0,
        profile.height || 0,
        profile.weight || 0
      ]);
      
      return result.rows.map((row: any) => ({
        ...row,
        userId: row["userId"] || undefined,
      })) as Profile[];
    } catch (error: any) {
      console.error('查找相似 Profile 失敗:', error);
      return [];
    }
  },

  // 计算相似度分数（0-100）
  calculateSimilarity: (profile1: Partial<Profile>, profile2: Partial<Profile>): number => {
    let score = 0;
    let totalWeight = 0;

    // 姓名相似度（权重：40%）
    if (profile1.name && profile2.name) {
      const name1 = profile1.name.toLowerCase().trim();
      const name2 = profile2.name.toLowerCase().trim();
      if (name1 === name2) {
        score += 40;
      } else if (name1.includes(name2) || name2.includes(name1)) {
        score += 30;
      }
      totalWeight += 40;
    }

    // 国籍匹配（权重：20%）
    if (profile1.nationality && profile2.nationality) {
      if (profile1.nationality === profile2.nationality) {
        score += 20;
      }
      totalWeight += 20;
    }

    // 年龄相似度（权重：15%）
    if (profile1.age && profile2.age) {
      const ageDiff = Math.abs(profile1.age - profile2.age);
      if (ageDiff === 0) {
        score += 15;
      } else if (ageDiff <= 2) {
        score += 10;
      } else if (ageDiff <= 5) {
        score += 5;
      }
      totalWeight += 15;
    }

    // 身高相似度（权重：15%）
    if (profile1.height && profile2.height) {
      const heightDiff = Math.abs(profile1.height - profile2.height);
      if (heightDiff === 0) {
        score += 15;
      } else if (heightDiff <= 3) {
        score += 10;
      } else if (heightDiff <= 5) {
        score += 5;
      }
      totalWeight += 15;
    }

    // 体重相似度（权重：10%）
    if (profile1.weight && profile2.weight) {
      const weightDiff = Math.abs(profile1.weight - profile2.weight);
      if (weightDiff === 0) {
        score += 10;
      } else if (weightDiff <= 3) {
        score += 7;
      } else if (weightDiff <= 5) {
        score += 4;
      }
      totalWeight += 10;
    }

    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  },

  // 增加聯繫客服次數
  incrementContactCount: async (profileId: string): Promise<void> => {
    try {
      await query(
        `UPDATE profiles SET contact_count = COALESCE(contact_count, 0) + 1 WHERE id = $1`,
        [profileId]
      );
      await clearProfileCachesAndRefreshView(profileId); // 清除緩存並刷新物化視圖
    } catch (error: any) {
      console.error('Error incrementing contact count:', error);
      throw new Error(`增加聯繫次數失敗: ${error.message || '資料庫錯誤'}`);
    }
  },
};
