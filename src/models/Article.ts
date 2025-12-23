import { query } from '../db/database.js';
import { Article } from '../types.js';

export const articleModel = {
  getAll: async (): Promise<Article[]> => {
    const result = await query('SELECT * FROM articles ORDER BY date DESC, "createdAt" DESC');
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      imageUrl: row.imageUrl,
      tag: row.tag,
      date: row.date,
      views: row.views || 0,
      content: row.content || undefined,
    }));
  },

  getById: async (id: string): Promise<Article | null> => {
    const result = await query('SELECT * FROM articles WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      imageUrl: row.imageUrl,
      tag: row.tag,
      date: row.date,
      views: row.views || 0,
      content: row.content || undefined,
    };
  },

  create: async (article: Article): Promise<Article> => {
    await query(`
      INSERT INTO articles (id, title, summary, "imageUrl", tag, date, views, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      article.id,
      article.title,
      article.summary,
      article.imageUrl,
      article.tag,
      article.date,
      article.views || 0,
      article.content || null
    ]);

    const created = await articleModel.getById(article.id);
    if (!created) throw new Error('Failed to create article');
    return created;
  },

  update: async (id: string, article: Partial<Article>): Promise<Article | null> => {
    const existing = await articleModel.getById(id);
    if (!existing) return null;

    const updated = { ...existing, ...article };
    await query(`
      UPDATE articles SET
        title = $1, summary = $2, "imageUrl" = $3, tag = $4, date = $5,
        views = $6, content = $7, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [
      updated.title,
      updated.summary,
      updated.imageUrl,
      updated.tag,
      updated.date,
      updated.views || 0,
      updated.content || null,
      id
    ]);

    return await articleModel.getById(id);
  },

  incrementViews: async (id: string): Promise<void> => {
    await query('UPDATE articles SET views = views + 1 WHERE id = $1', [id]);
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await query('DELETE FROM articles WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },
};
