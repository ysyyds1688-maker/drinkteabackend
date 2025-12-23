import db from '../db/database.js';
export const profileModel = {
    getAll: () => {
        const rows = db.prepare('SELECT * FROM profiles ORDER BY createdAt DESC').all();
        return rows.map(row => ({
            ...row,
            gallery: JSON.parse(row.gallery || '[]'),
            albums: JSON.parse(row.albums || '[]'),
            prices: JSON.parse(row.prices || '{}'),
            tags: JSON.parse(row.tags || '[]'),
            basicServices: JSON.parse(row.basicServices || '[]'),
            addonServices: JSON.parse(row.addonServices || '[]'),
            availableTimes: JSON.parse(row.availableTimes || '{}'),
            isNew: Boolean(row.isNew),
            isAvailable: Boolean(row.isAvailable),
        }));
    },
    getById: (id) => {
        const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
        if (!row)
            return null;
        return {
            ...row,
            gallery: JSON.parse(row.gallery || '[]'),
            albums: JSON.parse(row.albums || '[]'),
            prices: JSON.parse(row.prices || '{}'),
            tags: JSON.parse(row.tags || '[]'),
            basicServices: JSON.parse(row.basicServices || '[]'),
            addonServices: JSON.parse(row.addonServices || '[]'),
            availableTimes: JSON.parse(row.availableTimes || '{}'),
            isNew: Boolean(row.isNew),
            isAvailable: Boolean(row.isAvailable),
        };
    },
    create: (profile) => {
        const stmt = db.prepare(`
      INSERT INTO profiles (
        id, name, nationality, age, height, weight, cup, location, district,
        type, imageUrl, gallery, albums, price, prices, tags,
        basicServices, addonServices, isNew, isAvailable, availableTimes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(profile.id, profile.name, profile.nationality, profile.age, profile.height, profile.weight, profile.cup, profile.location, profile.district || null, profile.type, profile.imageUrl, JSON.stringify(profile.gallery || []), JSON.stringify(profile.albums || []), profile.price, JSON.stringify(profile.prices || {}), JSON.stringify(profile.tags || []), JSON.stringify(profile.basicServices || []), JSON.stringify(profile.addonServices || []), profile.isNew ? 1 : 0, profile.isAvailable !== false ? 1 : 0, JSON.stringify(profile.availableTimes || {}));
        return profileModel.getById(profile.id);
    },
    update: (id, profile) => {
        const existing = profileModel.getById(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...profile };
        const stmt = db.prepare(`
      UPDATE profiles SET
        name = ?, nationality = ?, age = ?, height = ?, weight = ?, cup = ?,
        location = ?, district = ?, type = ?, imageUrl = ?, gallery = ?,
        albums = ?, price = ?, prices = ?, tags = ?, basicServices = ?,
        addonServices = ?, isNew = ?, isAvailable = ?, availableTimes = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(updated.name, updated.nationality, updated.age, updated.height, updated.weight, updated.cup, updated.location, updated.district || null, updated.type, updated.imageUrl, JSON.stringify(updated.gallery || []), JSON.stringify(updated.albums || []), updated.price, JSON.stringify(updated.prices || {}), JSON.stringify(updated.tags || []), JSON.stringify(updated.basicServices || []), JSON.stringify(updated.addonServices || []), updated.isNew ? 1 : 0, updated.isAvailable !== false ? 1 : 0, JSON.stringify(updated.availableTimes || {}), id);
        return profileModel.getById(id);
    },
    delete: (id) => {
        const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
        return result.changes > 0;
    },
};
//# sourceMappingURL=Profile.js.map