import { query } from '../db/database.js';
import { Profile } from '../types.js';

export const profileModel = {
  getAll: async (userId?: string): Promise<Profile[]> => {
    try {
      // 明确指定所有列名，确保正确获取userId字段
      let sql = `SELECT id, "userId", name, nationality, age, height, weight, cup, location, district, 
                 type, "imageUrl", gallery, albums, price, prices, tags, 
                 "basicServices", "addonServices", "contactInfo", remarks, videos, "bookingProcess", "isNew", "isAvailable", "availableTimes", 
                 "createdAt", "updatedAt" FROM profiles`;
      const params: any[] = [];
      
      if (userId) {
        sql += ' WHERE "userId" = $1';
        params.push(userId);
      }
      
      sql += ' ORDER BY "createdAt" DESC';
      
      const result = await query(sql, params);
      return result.rows.map((row: any) => {
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
          };
        }
      });
    } catch (error: any) {
      console.error('Profile.getAll error:', error);
      throw new Error(`取得 Profiles 失敗: ${error.message || '資料庫錯誤'}`);
    }
  },

  getById: async (id: string): Promise<Profile | null> => {
    try {
      // 明确指定所有列名，确保正确获取userId字段
      const result = await query(`SELECT id, "userId", name, nationality, age, height, weight, cup, location, district, 
                                  type, "imageUrl", gallery, albums, price, prices, tags, 
                                  "basicServices", "addonServices", "contactInfo", remarks, videos, "bookingProcess", "isNew", "isAvailable", "availableTimes", 
                                  "createdAt", "updatedAt" FROM profiles WHERE id = $1`, [id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      // PostgreSQL 列名大小写敏感，明确使用 row["userId"] 获取
      const rawUserId = row["userId"];
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
        };
      } catch (parseError: any) {
        console.error('Error parsing profile:', id, parseError);
        // 返回基本資料
        const rawUserId = row["userId"] || row.userId;
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
          contactInfo: {},
          remarks: undefined,
          videos: [],
          bookingProcess: undefined,
          availableTimes: { today: '12:00~02:00', tomorrow: '12:00~02:00' },
          isNew: Boolean(row.isNew),
          isAvailable: Boolean(row.isAvailable),
        };
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

      return await profileModel.getById(id);
    } catch (error: any) {
      console.error('Profile update error:', error);
      console.error('Update data:', JSON.stringify(updated, null, 2));
      throw new Error(`更新失敗: ${error.message || '資料庫錯誤'}`);
    }
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await query('DELETE FROM profiles WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },

  // 查找相似的 Profile
  findSimilar: async (profile: Partial<Profile>): Promise<Profile[]> => {
    try {
      if (!profile.name || !profile.nationality) {
        return [];
      }

      const sql = `
        SELECT id, "userId", name, nationality, age, height, weight, cup, location, district,
               type, "imageUrl", price, "createdAt"
        FROM profiles
        WHERE 
          -- 精确匹配：姓名 + 国籍
          (LOWER(name) = LOWER($1) AND nationality = $2)
          OR
          -- 相似匹配：姓名相似 + 关键信息匹配
          (
            LOWER(name) LIKE LOWER($3) AND
            nationality = $2 AND
            ABS(age - $4) <= 2 AND
            ABS(height - $5) <= 5 AND
            ABS(weight - $6) <= 5
          )
        ORDER BY "createdAt" DESC
        LIMIT 10
      `;
      
      const namePattern = `%${profile.name}%`;
      const result = await query(sql, [
        profile.name,
        profile.nationality,
        namePattern,
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
};
