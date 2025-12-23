import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.db');
const dbDir = path.dirname(dbPath);
// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);
// Enable foreign keys
db.pragma('foreign_keys = ON');
// Initialize database schema
export const initDatabase = () => {
    // Profiles table
    db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nationality TEXT NOT NULL,
      age INTEGER NOT NULL,
      height INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      cup TEXT NOT NULL,
      location TEXT NOT NULL,
      district TEXT,
      type TEXT NOT NULL CHECK(type IN ('outcall', 'incall')),
      imageUrl TEXT NOT NULL,
      gallery TEXT, -- JSON array
      albums TEXT, -- JSON array
      price INTEGER NOT NULL,
      prices TEXT NOT NULL, -- JSON object
      tags TEXT, -- JSON array
      basicServices TEXT, -- JSON array
      addonServices TEXT, -- JSON array
      isNew INTEGER DEFAULT 0,
      isAvailable INTEGER DEFAULT 1,
      availableTimes TEXT, -- JSON object
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Articles table
    db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      tag TEXT NOT NULL,
      date TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      content TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Create indexes
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
    CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);
    CREATE INDEX IF NOT EXISTS idx_profiles_available ON profiles(isAvailable);
    CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date);
  `);
    console.log('✅ Database initialized successfully');
};
export default db;
//# sourceMappingURL=database.js.map