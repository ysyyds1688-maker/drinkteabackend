import db from '../db/database.js';
import { Article } from '../types.js';

export const articleModel = {
  getAll: (): Article[] => {
    const rows = db.prepare('SELECT * FROM articles ORDER BY date DESC, createdAt DESC').all() as any[];
    return rows.map(row => ({
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

  getById: (id: string): Article | null => {
    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
    if (!row) return null;
    
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

  create: (article: Article): Article => {
    const stmt = db.prepare(`
      INSERT INTO articles (id, title, summary, imageUrl, tag, date, views, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      article.id,
      article.title,
      article.summary,
      article.imageUrl,
      article.tag,
      article.date,
      article.views || 0,
      article.content || null
    );

    return articleModel.getById(article.id)!;
  },

  update: (id: string, article: Partial<Article>): Article | null => {
    const existing = articleModel.getById(id);
    if (!existing) return null;

    const updated = { ...existing, ...article };
    const stmt = db.prepare(`
      UPDATE articles SET
        title = ?, summary = ?, imageUrl = ?, tag = ?, date = ?,
        views = ?, content = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      updated.title,
      updated.summary,
      updated.imageUrl,
      updated.tag,
      updated.date,
      updated.views || 0,
      updated.content || null,
      id
    );

    return articleModel.getById(id);
  },

  incrementViews: (id: string): void => {
    db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(id);
  },

  delete: (id: string): boolean => {
    const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
