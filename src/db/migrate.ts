// Migration script to seed initial data
import { initDatabase } from './database.js';
import { profileModel } from '../models/Profile.js';
import { articleModel } from '../models/Article.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read constants from frontend
const constantsPath = join(__dirname, '../../../constants.ts');
const constantsContent = readFileSync(constantsPath, 'utf-8');

// Simple extraction of MOCK_PROFILES and MOCK_ARTICLES
// In production, you might want to use a proper TypeScript loader or convert to JSON
// For now, we'll create a simple seed data
const MOCK_PROFILES = [
  {
    id: '1',
    name: '小愛',
    nationality: '🇹🇼',
    age: 23,
    height: 165,
    weight: 48,
    cup: 'D',
    location: '台北市',
    type: 'outcall' as const,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600'
    ],
    albums: [{ category: '生活照', images: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600'] }],
    price: 6000,
    prices: {
      oneShot: { price: 6000, desc: '一節/50min/1S' },
      twoShot: { price: 11000, desc: '兩節/100min/2S' }
    },
    tags: ['氣質高雅', '鄰家清新'],
    basicServices: ['聊天', '按摩', '殘廢澡'],
    addonServices: [],
    isNew: true,
    isAvailable: true,
    availableTimes: {
      today: '14:00~02:00',
      tomorrow: '14:00~02:00'
    }
  }
];

const MOCK_ARTICLES = [
  {
    id: '1',
    tag: '高端服務',
    title: '為什麼選擇 茶王？重新定義高端社交',
    summary: '在繁忙的都市生活中，尋求一處心靈的避風港。茶王嚴格篩選，確保每一次的相遇都充滿質感...',
    date: '2025-12-15',
    views: 1205,
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop',
    content: '茶王致力於提供最高品質的服務體驗...'
  }
];

(async () => {
  try {
    await initDatabase();

console.log('🌱 Seeding database with initial data...');

// Seed profiles
    const existingProfiles = await profileModel.getAll();
if (existingProfiles.length === 0) {
  console.log('📝 Adding mock profiles...');
      for (const profile of MOCK_PROFILES) {
    try {
          await profileModel.create(profile);
      console.log(`  ✓ Added profile: ${profile.name}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to add profile ${profile.name}:`, error.message);
    }
      }
} else {
  console.log(`ℹ️  ${existingProfiles.length} profiles already exist, skipping seed`);
}

// Seed articles
    const existingArticles = await articleModel.getAll();
if (existingArticles.length === 0) {
  console.log('📝 Adding mock articles...');
      for (const article of MOCK_ARTICLES) {
    try {
          await articleModel.create(article);
      console.log(`  ✓ Added article: ${article.title}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to add article ${article.title}:`, error.message);
    }
      }
} else {
  console.log(`ℹ️  ${existingArticles.length} articles already exist, skipping seed`);
}

console.log('✅ Database migration completed!');
process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();
