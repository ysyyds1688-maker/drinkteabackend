// 必須在導入其他模組之前載入環境變數
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入 .env 文件（從 backend 目錄）
// 編譯後在 dist/scripts/，所以需要 ../../../.env 到達 backend/
let envPath = join(__dirname, '../../../.env');
if (!existsSync(envPath)) {
  // 開發時在 src/scripts/，所以需要 ../../.env
  envPath = join(__dirname, '../../.env');
}
dotenv.config({ path: envPath });
console.log('Loading .env from:', envPath);

// 確認環境變數已載入
if (!process.env.DATABASE_URL) {
  console.error('❌ 無法載入 DATABASE_URL。檢查 .env 文件路徑:', envPath);
  process.exit(1);
}

import { initDatabase } from '../db/database.js';
import { userModel } from '../models/User.js';
import { userStatsModel } from '../models/UserStats.js';
import { achievementModel } from '../models/Achievement.js';

// 為指定用戶解鎖「初次獻帖」成就
async function unlockFirstPostAchievement(email: string) {
  try {
    console.log(`🔄 開始為用戶 ${email} 解鎖「初次獻帖」成就...\n`);

    // 初始化資料庫
    await initDatabase();

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${email} (ID: ${user.id})`);

    // 檢查是否已有此成就
    const existingAchievements = await achievementModel.getUserAchievements(user.id);
    const hasFirstPostAchievement = existingAchievements.some(
      a => a.achievementType === 'forum_first_post'
    );

    if (hasFirstPostAchievement) {
      console.log(`ℹ️  用戶已經擁有「初次獻帖」成就`);
      return;
    }

    // 獲取當前統計
    const stats = await userStatsModel.getOrCreate(user.id);
    console.log(`📊 當前帖子數: ${stats.postsCount}`);

    // 如果帖子數為 0，先增加帖子數統計
    if (stats.postsCount === 0) {
      await userStatsModel.updateCounts(user.id, { postsCount: 1 });
      console.log(`✅ 已增加帖子數統計`);
    }

    // 檢查並解鎖成就（會自動檢查條件並解鎖）
    const unlocked = await achievementModel.checkAndUnlockAchievements(user.id);
    
    const firstPostAchievement = unlocked.find(a => a.achievementType === 'forum_first_post');
    
    if (firstPostAchievement) {
      console.log(`\n🎉 成功解鎖「初次獻帖」成就！`);
      console.log(`📝 成就名稱: ${firstPostAchievement.achievementName}`);
      console.log(`💰 獲得積分: ${firstPostAchievement.pointsEarned}`);
      console.log(`⭐ 獲得經驗: ${firstPostAchievement.experienceEarned}`);
      
      // 獲取更新後的統計
      const updatedStats = await userStatsModel.getOrCreate(user.id);
      console.log(`\n📊 更新後積分: ${updatedStats.currentPoints}`);
      console.log(`📊 更新後經驗: ${updatedStats.experiencePoints}`);
    } else {
      console.log(`\n⚠️  未能解鎖成就，可能條件未滿足`);
      console.log(`📊 當前帖子數: ${stats.postsCount}`);
    }

    console.log('\n✅ 完成！');
  } catch (error: any) {
    console.error('❌ 解鎖成就失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('unlockFirstPostAchievement')) {
  const email = process.argv[2] || 'client@test.com';

  unlockFirstPostAchievement(email)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { unlockFirstPostAchievement };

