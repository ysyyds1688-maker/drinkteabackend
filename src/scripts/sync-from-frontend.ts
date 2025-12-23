// 從前端網站同步資料到後端的腳本
// 這個腳本需要手動執行，因為需要從前端網站的 localStorage 或實際資料中獲取

import dotenv from 'dotenv';
dotenv.config();

import { initDatabase } from '../db/database.js';
import { profileModel } from '../models/Profile.js';
import { articleModel } from '../models/Article.js';
import { Profile, Article } from '../types.js';

// 根據前端網站顯示的資料，添加相馬芊和水色乃亞
const ADDITIONAL_PROFILES: Profile[] = [
  {
    id: '4',
    name: '相馬芊',
    nationality: '🇹🇼',
    age: 24,
    height: 165,
    weight: 48,
    cup: 'E',
    location: '台中市',
    type: 'outcall',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600'
    ],
    albums: [],
    price: 0, // 根據截圖顯示為 $0，可能需要確認實際價格
    prices: {
      oneShot: { price: 0, desc: '一節/50min/1S' },
      twoShot: { price: 0, desc: '兩節/100min/2S' }
    },
    tags: [],
    basicServices: ['聊天', '按摩'],
    addonServices: [],
    isNew: true,
    isAvailable: true,
    availableTimes: {
      today: '12:00~02:00',
      tomorrow: '12:00~02:00'
    }
  },
  {
    id: '5',
    name: '水色乃亞',
    nationality: '🇹🇼',
    age: 28,
    height: 165,
    weight: 50,
    cup: 'D',
    location: '台北市',
    type: 'outcall',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600'
    ],
    albums: [],
    price: 5000,
    prices: {
      oneShot: { price: 5000, desc: '一節/50min/1S' },
      twoShot: { price: 9500, desc: '兩節/100min/2S' }
    },
    tags: [],
    basicServices: ['聊天', '按摩'],
    addonServices: [],
    isNew: false,
    isAvailable: true,
    availableTimes: {
      today: '12:00~02:00',
      tomorrow: '12:00~02:00'
    }
  }
];

// 同步資料
async function syncAdditionalProfiles() {
  console.log('🔄 開始同步前端網站的額外 Profiles...\n');

  // 初始化資料庫
  await initDatabase();

  // 同步額外的 Profiles
  console.log('📝 同步額外 Profiles...');
  let profilesAdded = 0;
  let profilesUpdated = 0;

  for (const profile of ADDITIONAL_PROFILES) {
    const existing = await profileModel.getById(profile.id);
    if (existing) {
      await profileModel.update(profile.id, profile);
      profilesUpdated++;
      console.log(`  ✓ 更新 Profile: ${profile.name} (ID: ${profile.id})`);
    } else {
      await profileModel.create(profile);
      profilesAdded++;
      console.log(`  ✓ 新增 Profile: ${profile.name} (ID: ${profile.id})`);
    }
  }

  console.log(`\n✅ 額外 Profiles 同步完成: 新增 ${profilesAdded} 筆, 更新 ${profilesUpdated} 筆\n`);
  console.log('🎉 所有資料同步完成！');
}

// 執行同步
syncAdditionalProfiles().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ 同步失敗:', error);
  process.exit(1);
});

