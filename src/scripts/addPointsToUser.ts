// 必須在導入其他模組之前載入環境變數
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入 .env 文件（從 backend 目錄）
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// 確認環境變數已載入
if (!process.env.DATABASE_URL) {
  console.error('❌ 無法載入 DATABASE_URL。檢查 .env 文件路徑:', envPath);
  process.exit(1);
}

import { initDatabase } from '../db/database.js';
import { userModel } from '../models/User.js';
import { userStatsModel } from '../models/UserStats.js';

// 為指定用戶增加積分
async function addPointsToUser(email: string, points: number) {
  try {
    console.log(`🔄 開始為用戶 ${email} 增加 ${points} 積分...\n`);

    // 初始化資料庫（確保表存在）
    await initDatabase();

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${email} (ID: ${user.id})`);

    // 獲取當前統計
    const beforeStats = await userStatsModel.getOrCreate(user.id);
    console.log(`📊 當前積分: ${beforeStats.currentPoints}`);

    // 增加積分
    const result = await userStatsModel.addPoints(user.id, points, 0);
    
    console.log(`✅ 成功增加 ${points} 積分！`);
    console.log(`📊 更新後積分: ${result.stats.currentPoints}`);
    console.log(`📊 總積分: ${result.stats.totalPoints}`);
    
    if (result.levelUp && result.newLevel) {
      console.log(`🎉 等級提升: ${result.newLevel}`);
    }

    console.log('\n🎉 完成！');
  } catch (error: any) {
    console.error('❌ 增加積分失敗:', error);
    throw error;
  }
}

// 如果直接運行此腳本
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('addPointsToUser')) {
  const email = process.argv[2] || 'client@test.com';
  const points = parseInt(process.argv[3] || '10000', 10);

  addPointsToUser(email, points)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 錯誤:', error);
      process.exit(1);
    });
}

export { addPointsToUser };

