import { query } from '../db/database.js';
import { Profile } from '../types.js';

export const profileModel = {
  getAll: async (): Promise<Profile[]> => {
    const result = await query('SELECT * FROM profiles ORDER BY createdAt DESC');
    return result.rows.map((row: any) => ({
      ...row,
      gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : (row.gallery || []),
      albums: typeof row.albums === 'string' ? JSON.parse(row.albums || '[]') : (row.albums || []),
      prices: typeof row.prices === 'string' ? JSON.parse(row.prices || '{}') : (row.prices || {}),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
      basicServices: typeof row.basicServices === 'string' ? JSON.parse(row.basicServices || '[]') : (row.basicServices || []),
      addonServices: typeof row.addonServices === 'string' ? JSON.parse(row.addonServices || '[]') : (row.addonServices || []),
      availableTimes: typeof row.availableTimes === 'string' ? JSON.parse(row.availableTimes || '{}') : (row.availableTimes || {}),
      isNew: Boolean(row.isnew),
      isAvailable: Boolean(row.isavailable),
    }));
  },

  getById: async (id: string): Promise<Profile | null> => {
    const result = await query('SELECT * FROM profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : (row.gallery || []),
      albums: typeof row.albums === 'string' ? JSON.parse(row.albums || '[]') : (row.albums || []),
      prices: typeof row.prices === 'string' ? JSON.parse(row.prices || '{}') : (row.prices || {}),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
      basicServices: typeof row.basicServices === 'string' ? JSON.parse(row.basicServices || '[]') : (row.basicServices || []),
      addonServices: typeof row.addonServices === 'string' ? JSON.parse(row.addonServices || '[]') : (row.addonServices || []),
      availableTimes: typeof row.availableTimes === 'string' ? JSON.parse(row.availableTimes || '{}') : (row.availableTimes || {}),
      isNew: Boolean(row.isnew),
      isAvailable: Boolean(row.isavailable),
    };
  },

  create: async (profile: Profile): Promise<Profile> => {
    await query(`
      INSERT INTO profiles (
        id, name, nationality, age, height, weight, cup, location, district,
        type, "imageUrl", gallery, albums, price, prices, tags,
        "basicServices", "addonServices", "isNew", "isAvailable", "availableTimes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      profile.id,
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

    const updated = { ...existing, ...profile };
    await query(`
      UPDATE profiles SET
        name = $1, nationality = $2, age = $3, height = $4, weight = $5, cup = $6,
        location = $7, district = $8, type = $9, "imageUrl" = $10, gallery = $11,
        albums = $12, price = $13, prices = $14, tags = $15, "basicServices" = $16,
        "addonServices" = $17, "isNew" = $18, "isAvailable" = $19, "availableTimes" = $20,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $21
    `, [
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
      updated.isNew ? 1 : 0,
      updated.isAvailable !== false ? 1 : 0,
      JSON.stringify(updated.availableTimes || {}),
      id
    ]);

    return await profileModel.getById(id);
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await query('DELETE FROM profiles WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },
};
