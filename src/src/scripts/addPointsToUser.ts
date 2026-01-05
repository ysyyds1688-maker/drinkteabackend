import { userModel } from '../models/User.js';
import { userStatsModel } from '../models/UserStats.js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

async function addPointsToUser() {
  try {
    const email = process.argv[2] || 'provider@test.com';
    const points = parseInt(process.argv[3] || '5000', 10);

    console.log(`正在為 ${email} 補充 ${points} 積分...`);

    // 查找用戶
    const user = await userModel.findByEmailOrPhone(email);
    if (!user) {
      console.error(`❌ 找不到用戶: ${email}`);
      process.exit(1);
    }

    console.log(`✅ 找到用戶: ${user.userName || user.email} (ID: ${user.id})`);

    // 獲取當前統計
    const stats = await userStatsModel.getOrCreate(user.id);
    console.log(`📊 當前積分: ${stats.currentPoints}`);

    // 添加積分
    const result = await userStatsModel.addPoints(user.id, points, 0);
    
    console.log(`✅ 成功補充 ${points} 積分！`);
    console.log(`📊 新積分: ${result.stats.currentPoints}`);
    console.log(`📈 總積分: ${result.stats.totalPoints}`);
    
    if (result.levelUp) {
      console.log(`🎉 等級提升！新等級: ${result.newLevel}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addPointsToUser();
